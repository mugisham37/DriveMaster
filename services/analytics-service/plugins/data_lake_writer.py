"""Data lake writer utilities for storing processed data."""

import os
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import boto3
from google.cloud import storage as gcs
import structlog

from config.data_lake_config import DataLakeConfig, StorageProvider

logger = structlog.get_logger(__name__)


class DataLakeWriter:
    """Writes processed data to data lake storage."""
    
    def __init__(self, config: DataLakeConfig):
        self.config = config
        self.client = self._initialize_client()
        
    def _initialize_client(self):
        """Initialize storage client based on provider."""
        if self.config.provider == StorageProvider.S3:
            return boto3.client('s3', region_name=self.config.region)
        elif self.config.provider == StorageProvider.GCS:
            return gcs.Client()
        else:
            raise ValueError(f"Unsupported storage provider: {self.config.provider}")
    
    def write_dataset(
        self,
        df: pd.DataFrame,
        dataset_name: str,
        partition_date: datetime,
        data_type: str = "raw"  # raw, processed, aggregated
    ) -> str:
        """
        Write dataset to data lake with proper partitioning.
        
        Args:
            df: DataFrame to write
            dataset_name: Name of the dataset (e.g., 'user_attempts')
            partition_date: Date for partitioning
            data_type: Type of data (raw, processed, aggregated)
            
        Returns:
            Path where data was written
        """
        if df.empty:
            logger.warning("Attempting to write empty dataset", dataset=dataset_name)
            return ""
        
        try:
            # Generate partition path
            partition_path = self._generate_partition_path(
                dataset_name, partition_date, data_type
            )
            
            # Convert to Parquet format
            table = self._prepare_parquet_table(df)
            
            # Write to storage
            if self.config.provider == StorageProvider.S3:
                full_path = self._write_to_s3(table, partition_path)
            elif self.config.provider == StorageProvider.GCS:
                full_path = self._write_to_gcs(table, partition_path)
            else:
                raise ValueError(f"Unsupported provider: {self.config.provider}")
            
            logger.info(
                "Successfully wrote dataset to data lake",
                dataset=dataset_name,
                records=len(df),
                path=full_path,
                size_mb=round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2)
            )
            
            return full_path
            
        except Exception as e:
            logger.error(
                "Failed to write dataset to data lake",
                dataset=dataset_name,
                error=str(e)
            )
            raise
    
    def _generate_partition_path(
        self,
        dataset_name: str,
        partition_date: datetime,
        data_type: str
    ) -> str:
        """Generate partitioned path for data storage."""
        
        # Base path structure: base_path/data_type/dataset/year=YYYY/month=MM/day=DD/
        year = partition_date.year
        month = partition_date.month
        day = partition_date.day
        
        path_parts = [
            self.config.base_path,
            data_type,
            dataset_name,
            f"year={year}",
            f"month={month:02d}",
            f"day={day:02d}"
        ]
        
        return "/".join(path_parts)
    
    def _prepare_parquet_table(self, df: pd.DataFrame) -> pa.Table:
        """Prepare DataFrame for Parquet storage with optimizations."""
        
        # Optimize data types
        df_optimized = self._optimize_dtypes(df.copy())
        
        # Convert to PyArrow table
        table = pa.Table.from_pandas(df_optimized, preserve_index=False)
        
        return table
    
    def _optimize_dtypes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Optimize DataFrame data types for storage efficiency."""
        
        # Convert object columns to category where appropriate
        for col in df.select_dtypes(include=['object']).columns:
            if df[col].nunique() / len(df) < 0.5:  # Less than 50% unique values
                df[col] = df[col].astype('category')
        
        # Optimize integer columns
        for col in df.select_dtypes(include=['int64']).columns:
            col_min = df[col].min()
            col_max = df[col].max()
            
            if col_min >= 0:  # Unsigned integers
                if col_max < 255:
                    df[col] = df[col].astype('uint8')
                elif col_max < 65535:
                    df[col] = df[col].astype('uint16')
                elif col_max < 4294967295:
                    df[col] = df[col].astype('uint32')
            else:  # Signed integers
                if col_min >= -128 and col_max <= 127:
                    df[col] = df[col].astype('int8')
                elif col_min >= -32768 and col_max <= 32767:
                    df[col] = df[col].astype('int16')
                elif col_min >= -2147483648 and col_max <= 2147483647:
                    df[col] = df[col].astype('int32')
        
        # Optimize float columns
        for col in df.select_dtypes(include=['float64']).columns:
            df[col] = pd.to_numeric(df[col], downcast='float')
        
        return df
    
    def _write_to_s3(self, table: pa.Table, partition_path: str) -> str:
        """Write Parquet table to S3."""
        
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"data_{timestamp}.parquet"
        full_path = f"{partition_path}/{filename}"
        
        # Write to buffer first
        buffer = pa.BufferOutputStream()
        pq.write_table(
            table,
            buffer,
            compression=self.config.compression,
            use_dictionary=True,
            row_group_size=50000
        )
        
        # Upload to S3
        self.client.put_object(
            Bucket=self.config.bucket_name,
            Key=full_path,
            Body=buffer.getvalue().to_pybytes(),
            ContentType='application/octet-stream'
        )
        
        return f"s3://{self.config.bucket_name}/{full_path}"
    
    def _write_to_gcs(self, table: pa.Table, partition_path: str) -> str:
        """Write Parquet table to Google Cloud Storage."""
        
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"data_{timestamp}.parquet"
        full_path = f"{partition_path}/{filename}"
        
        # Get bucket
        bucket = self.client.bucket(self.config.bucket_name)
        blob = bucket.blob(full_path)
        
        # Write to buffer first
        buffer = pa.BufferOutputStream()
        pq.write_table(
            table,
            buffer,
            compression=self.config.compression,
            use_dictionary=True,
            row_group_size=50000
        )
        
        # Upload to GCS
        blob.upload_from_string(
            buffer.getvalue().to_pybytes(),
            content_type='application/octet-stream'
        )
        
        return f"gs://{self.config.bucket_name}/{full_path}"
    
    def write_metadata(
        self,
        dataset_name: str,
        partition_date: datetime,
        metadata: Dict[str, Any]
    ) -> str:
        """Write metadata file alongside data."""
        
        metadata_path = self._generate_partition_path(
            f"{dataset_name}_metadata",
            partition_date,
            "metadata"
        )
        
        # Add timestamp to metadata
        metadata['written_at'] = datetime.utcnow().isoformat()
        metadata['partition_date'] = partition_date.isoformat()
        
        # Convert to JSON string
        import json
        metadata_json = json.dumps(metadata, indent=2, default=str)
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"metadata_{timestamp}.json"
        full_path = f"{metadata_path}/{filename}"
        
        if self.config.provider == StorageProvider.S3:
            self.client.put_object(
                Bucket=self.config.bucket_name,
                Key=full_path,
                Body=metadata_json.encode('utf-8'),
                ContentType='application/json'
            )
            return f"s3://{self.config.bucket_name}/{full_path}"
        
        elif self.config.provider == StorageProvider.GCS:
            bucket = self.client.bucket(self.config.bucket_name)
            blob = bucket.blob(full_path)
            blob.upload_from_string(
                metadata_json,
                content_type='application/json'
            )
            return f"gs://{self.config.bucket_name}/{full_path}"
    
    def cleanup_old_data(self, dataset_name: str, retention_days: int) -> int:
        """Clean up old data based on retention policy."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        deleted_count = 0
        
        try:
            if self.config.provider == StorageProvider.S3:
                deleted_count = self._cleanup_s3_data(dataset_name, cutoff_date)
            elif self.config.provider == StorageProvider.GCS:
                deleted_count = self._cleanup_gcs_data(dataset_name, cutoff_date)
            
            logger.info(
                "Completed data cleanup",
                dataset=dataset_name,
                retention_days=retention_days,
                deleted_files=deleted_count
            )
            
        except Exception as e:
            logger.error(
                "Failed to cleanup old data",
                dataset=dataset_name,
                error=str(e)
            )
            raise
        
        return deleted_count
    
    def _cleanup_s3_data(self, dataset_name: str, cutoff_date: datetime) -> int:
        """Clean up old S3 data."""
        
        prefix = f"{self.config.base_path}/{dataset_name}/"
        deleted_count = 0
        
        # List objects with prefix
        paginator = self.client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.config.bucket_name, Prefix=prefix)
        
        objects_to_delete = []
        
        for page in pages:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                    objects_to_delete.append({'Key': obj['Key']})
                    
                    # Delete in batches of 1000 (S3 limit)
                    if len(objects_to_delete) >= 1000:
                        self.client.delete_objects(
                            Bucket=self.config.bucket_name,
                            Delete={'Objects': objects_to_delete}
                        )
                        deleted_count += len(objects_to_delete)
                        objects_to_delete = []
        
        # Delete remaining objects
        if objects_to_delete:
            self.client.delete_objects(
                Bucket=self.config.bucket_name,
                Delete={'Objects': objects_to_delete}
            )
            deleted_count += len(objects_to_delete)
        
        return deleted_count
    
    def _cleanup_gcs_data(self, dataset_name: str, cutoff_date: datetime) -> int:
        """Clean up old GCS data."""
        
        prefix = f"{self.config.base_path}/{dataset_name}/"
        deleted_count = 0
        
        bucket = self.client.bucket(self.config.bucket_name)
        blobs = bucket.list_blobs(prefix=prefix)
        
        for blob in blobs:
            if blob.time_created.replace(tzinfo=None) < cutoff_date:
                blob.delete()
                deleted_count += 1
        
        return deleted_count
    
    def get_dataset_info(self, dataset_name: str, date_range: Optional[tuple] = None) -> Dict[str, Any]:
        """Get information about stored datasets."""
        
        prefix = f"{self.config.base_path}/{dataset_name}/"
        info = {
            'dataset_name': dataset_name,
            'total_files': 0,
            'total_size_bytes': 0,
            'date_range': None,
            'partitions': []
        }
        
        if self.config.provider == StorageProvider.S3:
            info = self._get_s3_dataset_info(prefix, info)
        elif self.config.provider == StorageProvider.GCS:
            info = self._get_gcs_dataset_info(prefix, info)
        
        return info
    
    def _get_s3_dataset_info(self, prefix: str, info: Dict[str, Any]) -> Dict[str, Any]:
        """Get S3 dataset information."""
        
        paginator = self.client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.config.bucket_name, Prefix=prefix)
        
        dates = []
        
        for page in pages:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                info['total_files'] += 1
                info['total_size_bytes'] += obj['Size']
                dates.append(obj['LastModified'])
        
        if dates:
            info['date_range'] = (min(dates), max(dates))
        
        return info
    
    def _get_gcs_dataset_info(self, prefix: str, info: Dict[str, Any]) -> Dict[str, Any]:
        """Get GCS dataset information."""
        
        bucket = self.client.bucket(self.config.bucket_name)
        blobs = bucket.list_blobs(prefix=prefix)
        
        dates = []
        
        for blob in blobs:
            info['total_files'] += 1
            info['total_size_bytes'] += blob.size
            dates.append(blob.time_created)
        
        if dates:
            info['date_range'] = (min(dates), max(dates))
        
        return info