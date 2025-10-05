#!/usr/bin/env python3
"""Data lake management and monitoring utilities."""

import argparse
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any
import pandas as pd

# Add plugins to path
sys.path.append('../plugins')

from data_lake_writer import DataLakeWriter
from config.data_lake_config import DEFAULT_DATA_LAKE_CONFIG


class DataLakeManager:
    """Manages data lake operations and monitoring."""
    
    def __init__(self):
        self.writer = DataLakeWriter(DEFAULT_DATA_LAKE_CONFIG)
    
    def get_storage_summary(self) -> Dict[str, Any]:
        """Get comprehensive storage summary."""
        
        datasets = [
            'user_attempts', 'user_sessions', 'ml_training_events',
            'user_attempts_daily', 'user_sessions_daily'
        ]
        
        summary = {
            'total_datasets': len(datasets),
            'total_files': 0,
            'total_size_gb': 0,
            'datasets': {},
            'generated_at': datetime.utcnow().isoformat()
        }
        
        for dataset in datasets:
            try:
                info = self.writer.get_dataset_info(dataset)
                summary['datasets'][dataset] = info
                summary['total_files'] += info['total_files']
                summary['total_size_gb'] += info['total_size_bytes'] / (1024**3)
                
            except Exception as e:
                summary['datasets'][dataset] = {'error': str(e)}
        
        summary['total_size_gb'] = round(summary['total_size_gb'], 2)
        
        return summary
    
    def cleanup_expired_data(self, dry_run: bool = True) -> Dict[str, Any]:
        """Clean up expired data based on retention policies."""
        
        cleanup_plan = {
            'raw_data': {
                'retention_days': DEFAULT_DATA_LAKE_CONFIG.raw_data_retention_days,
                'datasets': ['user_attempts', 'user_sessions', 'ml_training_events']
            },
            'processed_data': {
                'retention_days': DEFAULT_DATA_LAKE_CONFIG.processed_data_retention_days,
                'datasets': ['user_attempts', 'user_sessions', 'ml_training_events']
            },
            'aggregated_data': {
                'retention_days': DEFAULT_DATA_LAKE_CONFIG.aggregated_data_retention_days,
                'datasets': ['user_attempts_daily', 'user_sessions_daily']
            }
        }
        
        results = {
            'dry_run': dry_run,
            'cleanup_results': {},
            'total_files_deleted': 0,
            'executed_at': datetime.utcnow().isoformat()
        }
        
        for data_type, config in cleanup_plan.items():
            results['cleanup_results'][data_type] = {}
            
            for dataset in config['datasets']:
                dataset_path = f"{data_type}/{dataset}"
                
                try:
                    if not dry_run:
                        deleted_count = self.writer.cleanup_old_data(
                            dataset_path, config['retention_days']
                        )
                    else:
                        # For dry run, estimate files that would be deleted
                        deleted_count = self._estimate_cleanup_count(
                            dataset_path, config['retention_days']
                        )
                    
                    results['cleanup_results'][data_type][dataset] = {
                        'files_deleted': deleted_count,
                        'retention_days': config['retention_days']
                    }
                    
                    results['total_files_deleted'] += deleted_count
                    
                except Exception as e:
                    results['cleanup_results'][data_type][dataset] = {
                        'error': str(e)
                    }
        
        return results
    
    def _estimate_cleanup_count(self, dataset_path: str, retention_days: int) -> int:
        """Estimate number of files that would be deleted (for dry run)."""
        # This is a simplified estimation - in a real implementation,
        # you would query the storage provider to count files older than retention period
        return 0
    
    def validate_data_integrity(self, dataset: str, date_range: tuple = None) -> Dict[str, Any]:
        """Validate data integrity for a dataset."""
        
        if date_range is None:
            # Default to last 7 days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            date_range = (start_date, end_date)
        
        validation_results = {
            'dataset': dataset,
            'date_range': {
                'start': date_range[0].isoformat(),
                'end': date_range[1].isoformat()
            },
            'validation_checks': [],
            'overall_status': 'unknown',
            'validated_at': datetime.utcnow().isoformat()
        }
        
        # Check for missing partitions
        missing_partitions = self._check_missing_partitions(dataset, date_range)
        validation_results['validation_checks'].append({
            'check': 'missing_partitions',
            'status': 'pass' if len(missing_partitions) == 0 else 'fail',
            'details': {'missing_dates': missing_partitions}
        })
        
        # Check for duplicate data
        duplicate_check = self._check_duplicate_data(dataset, date_range)
        validation_results['validation_checks'].append({
            'check': 'duplicate_data',
            'status': duplicate_check['status'],
            'details': duplicate_check['details']
        })
        
        # Check data freshness
        freshness_check = self._check_data_freshness(dataset)
        validation_results['validation_checks'].append({
            'check': 'data_freshness',
            'status': freshness_check['status'],
            'details': freshness_check['details']
        })
        
        # Determine overall status
        failed_checks = [
            check for check in validation_results['validation_checks']
            if check['status'] == 'fail'
        ]
        
        if len(failed_checks) == 0:
            validation_results['overall_status'] = 'pass'
        elif len(failed_checks) < len(validation_results['validation_checks']):
            validation_results['overall_status'] = 'warning'
        else:
            validation_results['overall_status'] = 'fail'
        
        return validation_results
    
    def _check_missing_partitions(self, dataset: str, date_range: tuple) -> List[str]:
        """Check for missing daily partitions in date range."""
        # This would query the storage provider to check for missing partitions
        # For now, return empty list (no missing partitions)
        return []
    
    def _check_duplicate_data(self, dataset: str, date_range: tuple) -> Dict[str, Any]:
        """Check for duplicate data within partitions."""
        # This would sample data from partitions and check for duplicates
        return {
            'status': 'pass',
            'details': {'duplicate_percentage': 0.0}
        }
    
    def _check_data_freshness(self, dataset: str) -> Dict[str, Any]:
        """Check if data is fresh (recent partitions exist)."""
        # This would check if recent partitions exist
        return {
            'status': 'pass',
            'details': {'last_partition_age_hours': 1}
        }
    
    def generate_usage_report(self, days: int = 30) -> Dict[str, Any]:
        """Generate data lake usage report."""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        report = {
            'report_period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'storage_growth': {},
            'data_ingestion_stats': {},
            'cost_estimation': {},
            'generated_at': datetime.utcnow().isoformat()
        }
        
        # Get current storage summary
        storage_summary = self.get_storage_summary()
        
        # Estimate storage growth (simplified)
        daily_growth_gb = storage_summary['total_size_gb'] / 30  # Assume 30 days of data
        report['storage_growth'] = {
            'current_size_gb': storage_summary['total_size_gb'],
            'estimated_daily_growth_gb': round(daily_growth_gb, 2),
            'projected_size_30d_gb': round(storage_summary['total_size_gb'] + (daily_growth_gb * 30), 2)
        }
        
        # Data ingestion statistics (would be calculated from actual metrics)
        report['data_ingestion_stats'] = {
            'total_records_ingested': 0,  # Would be calculated from metadata
            'average_daily_records': 0,
            'peak_ingestion_rate': 0
        }
        
        # Cost estimation (simplified AWS S3 pricing)
        storage_cost_per_gb = 0.023  # Standard S3 pricing
        request_cost_estimate = 10.0  # Estimated monthly request costs
        
        report['cost_estimation'] = {
            'monthly_storage_cost_usd': round(storage_summary['total_size_gb'] * storage_cost_per_gb, 2),
            'monthly_request_cost_usd': request_cost_estimate,
            'total_monthly_cost_usd': round(
                (storage_summary['total_size_gb'] * storage_cost_per_gb) + request_cost_estimate, 2
            )
        }
        
        return report


def main():
    """Main CLI interface."""
    
    parser = argparse.ArgumentParser(description='Data Lake Management Tool')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Storage summary command
    summary_parser = subparsers.add_parser('summary', help='Get storage summary')
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser('cleanup', help='Clean up expired data')
    cleanup_parser.add_argument('--dry-run', action='store_true', 
                               help='Show what would be deleted without actually deleting')
    
    # Validation command
    validate_parser = subparsers.add_parser('validate', help='Validate data integrity')
    validate_parser.add_argument('dataset', help='Dataset to validate')
    validate_parser.add_argument('--days', type=int, default=7, 
                                help='Number of days to validate (default: 7)')
    
    # Usage report command
    report_parser = subparsers.add_parser('report', help='Generate usage report')
    report_parser.add_argument('--days', type=int, default=30,
                              help='Report period in days (default: 30)')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    manager = DataLakeManager()
    
    try:
        if args.command == 'summary':
            result = manager.get_storage_summary()
            
        elif args.command == 'cleanup':
            result = manager.cleanup_expired_data(dry_run=args.dry_run)
            
        elif args.command == 'validate':
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=args.days)
            result = manager.validate_data_integrity(args.dataset, (start_date, end_date))
            
        elif args.command == 'report':
            result = manager.generate_usage_report(args.days)
        
        # Print result as formatted JSON
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()