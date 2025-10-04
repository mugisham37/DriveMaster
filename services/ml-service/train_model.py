#!/usr/bin/env python3
"""Training script for DKT model."""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.training.trainer import train_dkt_model
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description="Train DKT model")
    
    parser.add_argument(
        "--data-path",
        type=str,
        help="Path to training data CSV file"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for training"
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=0.001,
        help="Learning rate"
    )
    parser.add_argument(
        "--use-synthetic",
        action="store_true",
        help="Use synthetic data for training"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./model_output",
        help="Directory to save trained model"
    )
    
    args = parser.parse_args()
    
    logger.info(
        "Starting DKT model training",
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        use_synthetic=args.use_synthetic,
        data_path=args.data_path
    )
    
    try:
        # Train the model
        trainer = train_dkt_model(
            data_path=args.data_path,
            num_epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            use_synthetic_data=args.use_synthetic
        )
        
        # Save the final model
        os.makedirs(args.output_dir, exist_ok=True)
        final_model_path = os.path.join(args.output_dir, "final_model.pt")
        trainer.save_checkpoint(final_model_path, is_best=True)
        
        # Evaluate on test set if available
        if trainer.test_loader:
            test_results = trainer.evaluate(trainer.test_loader)
            logger.info("Final test results", **test_results)
        
        logger.info(
            "Training completed successfully",
            output_dir=args.output_dir,
            best_val_auc=trainer.best_val_auc
        )
        
    except Exception as e:
        logger.error("Training failed", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()