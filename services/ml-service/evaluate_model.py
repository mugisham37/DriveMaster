#!/usr/bin/env python3
"""Evaluation script for DKT model."""

import argparse
import sys
import torch
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.models.dkt_model import DKTModel
from app.training.evaluation import ModelEvaluator
from app.training.dataset import create_data_loaders, generate_synthetic_data
from app.core.logging import configure_logging, get_logger
import pandas as pd

configure_logging()
logger = get_logger(__name__)


def main():
    """Main evaluation function."""
    parser = argparse.ArgumentParser(description="Evaluate DKT model")
    
    parser.add_argument(
        "--model-path",
        type=str,
        required=True,
        help="Path to trained model checkpoint"
    )
    parser.add_argument(
        "--data-path",
        type=str,
        help="Path to evaluation data CSV file"
    )
    parser.add_argument(
        "--use-synthetic",
        action="store_true",
        help="Use synthetic data for evaluation"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./evaluation_results",
        help="Directory to save evaluation results"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for evaluation"
    )
    
    args = parser.parse_args()
    
    logger.info(
        "Starting model evaluation",
        model_path=args.model_path,
        data_path=args.data_path,
        use_synthetic=args.use_synthetic,
        output_dir=args.output_dir
    )
    
    try:
        # Load model checkpoint
        checkpoint = torch.load(args.model_path, map_location="cpu")
        model_config = checkpoint.get("model_config", {})
        
        # Create model
        model = DKTModel(
            num_items=model_config.get("num_items", 1000),
            num_topics=model_config.get("num_topics", 50),
            hidden_size=model_config.get("hidden_size", 128),
            num_layers=model_config.get("num_layers", 2),
            architecture=model_config.get("architecture", "lstm")
        )
        
        # Load model weights
        model.load_state_dict(checkpoint["model_state_dict"])
        
        logger.info(
            "Model loaded",
            num_items=model.num_items,
            num_topics=model.num_topics,
            hidden_size=model.hidden_size,
            num_layers=model.num_layers,
            architecture=model.architecture
        )
        
        # Load or generate evaluation data
        if args.use_synthetic or args.data_path is None:
            logger.info("Generating synthetic evaluation data")
            eval_df = generate_synthetic_data(
                num_users=500,
                num_items=model.num_items,
                num_topics=model.num_topics,
                avg_sequence_length=25
            )
        else:
            logger.info("Loading evaluation data", path=args.data_path)
            eval_df = pd.read_csv(args.data_path)
        
        # Create data loader
        # For evaluation, we'll use the entire dataset as "validation"
        _, eval_loader, _ = create_data_loaders(
            train_df=eval_df.sample(n=1),  # Dummy train set
            val_df=eval_df,
            batch_size=args.batch_size
        )
        
        # Create evaluator
        evaluator = ModelEvaluator(model)
        
        # Perform comprehensive evaluation
        logger.info("Starting comprehensive evaluation")
        results = evaluator.evaluate_comprehensive(
            eval_loader,
            save_results=True,
            output_dir=args.output_dir
        )
        
        # Print key results
        logger.info(
            "Evaluation completed",
            auc=results.get("auc", 0),
            accuracy=results.get("accuracy", 0),
            f1_score=results.get("f1_score", 0),
            num_predictions=results.get("num_predictions", 0),
            output_dir=args.output_dir
        )
        
        # Perform calibration evaluation
        logger.info("Evaluating prediction calibration")
        calibration_results = evaluator.evaluate_prediction_calibration(eval_loader)
        
        logger.info(
            "Calibration results",
            expected_calibration_error=calibration_results.get("expected_calibration_error", 0),
            maximum_calibration_error=calibration_results.get("maximum_calibration_error", 0)
        )
        
        print("\n" + "="*50)
        print("EVALUATION SUMMARY")
        print("="*50)
        print(f"AUC: {results.get('auc', 0):.4f}")
        print(f"Accuracy: {results.get('accuracy', 0):.4f}")
        print(f"Precision: {results.get('precision', 0):.4f}")
        print(f"Recall: {results.get('recall', 0):.4f}")
        print(f"F1 Score: {results.get('f1_score', 0):.4f}")
        print(f"Log Loss: {results.get('log_loss', 0):.4f}")
        print(f"Expected Calibration Error: {calibration_results.get('expected_calibration_error', 0):.4f}")
        print(f"Number of Predictions: {results.get('num_predictions', 0)}")
        print(f"Results saved to: {args.output_dir}")
        print("="*50)
        
    except Exception as e:
        logger.error("Evaluation failed", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()