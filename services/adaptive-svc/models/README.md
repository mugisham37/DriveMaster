# ML Models Directory

This directory contains the machine learning models used by the adaptive learning service.

## Model Structure

Each model should be organized in its own subdirectory with the following structure:

```
models/
├── learning-outcome-predictor/
│   ├── model.json          # TensorFlow.js model architecture
│   ├── weights.bin         # Model weights
│   └── metadata.json       # Model metadata and feature info
├── difficulty-optimizer/
│   ├── model.json
│   ├── weights.bin
│   └── metadata.json
└── dropout-predictor/
    ├── model.json
    ├── weights.bin
    └── metadata.json
```

## Model Types

### 1. Learning Outcome Predictor
- **Purpose**: Predicts the probability of successful learning outcome for a given user-content pair
- **Type**: Binary classification
- **Input Features**: 15 features including mastery, velocity, temporal, and contextual features
- **Output**: Probability of success (0-1)

### 2. Difficulty Optimizer
- **Purpose**: Predicts the optimal difficulty level for maximum learning efficiency
- **Type**: Regression
- **Input Features**: 15 features similar to learning outcome predictor
- **Output**: Optimal difficulty level (0-1)

### 3. Dropout Predictor
- **Purpose**: Predicts the risk of user dropout within the next 7 days
- **Type**: Binary classification
- **Input Features**: 18 features including engagement, activity patterns, and social features
- **Output**: Dropout risk probability (0-1)

## Model Training

Models should be trained using the following process:

1. **Data Collection**: Gather historical learning events, user interactions, and outcomes
2. **Feature Engineering**: Extract relevant features using the feature extraction pipeline
3. **Model Training**: Train using TensorFlow/Keras with proper validation splits
4. **Model Conversion**: Convert to TensorFlow.js format using `tensorflowjs_converter`
5. **Model Validation**: Test accuracy and performance on held-out test set
6. **Model Deployment**: Place in appropriate directory with metadata

## Model Metadata Format

Each model should include a `metadata.json` file with the following structure:

```json
{
  "name": "Learning Outcome Predictor",
  "version": "1.0.0",
  "type": "classification",
  "accuracy": 0.87,
  "f1Score": 0.84,
  "trainingDate": "2024-01-15T00:00:00Z",
  "features": [
    "currentMastery",
    "learningVelocity",
    "totalInteractions",
    "accuracyRate",
    "pL0", "pT", "pG", "pS",
    "decayRate",
    "timeOfDay",
    "dayOfWeek",
    "hoursSinceLastInteraction",
    "fatigueLevel",
    "studyStreak",
    "sessionLength"
  ],
  "description": "Predicts probability of successful learning outcome based on user knowledge state and contextual factors",
  "trainingDataSize": 100000,
  "validationAccuracy": 0.85,
  "testAccuracy": 0.87
}
```

## Model Updates

Models should be updated regularly based on:

1. **Performance Monitoring**: Track accuracy and drift metrics
2. **New Data**: Retrain with fresh user interaction data
3. **Feature Evolution**: Add new features as the system evolves
4. **A/B Testing**: Compare new model versions against existing ones

## Fallback Behavior

If models fail to load or perform inference, the system will fall back to:

1. **Algorithmic Approaches**: Use BKT, MAB, and spaced repetition algorithms
2. **Rule-Based Logic**: Apply heuristic rules for recommendations
3. **Default Values**: Return reasonable default predictions

This ensures the system remains functional even without ML models.