# Machine Learning Pipeline Documentation

## Overview
The ML Pipeline is a core component of the EyeNet system that provides machine learning capabilities for network analysis, anomaly detection, and traffic prediction. Built on TensorFlow.js, it supports model training, inference, and management.

## Architecture

### Components
1. **ML Pipeline Service**
   - Singleton service managing ML models and operations
   - Built on TensorFlow.js for model training and inference
   - Supports multiple model types and versioning

2. **Model Types**
   - Anomaly Detection Model
   - Traffic Prediction Model
   - Extensible architecture for adding new model types

3. **Data Processing**
   - Preprocessing utilities for different data types
   - Tensor conversion and management
   - Feature engineering capabilities

## API Endpoints

### Predictions
```http
POST /api/ml/predict/:modelType
```
Get predictions from trained models.

#### Parameters
- `modelType` (string): Type of model to use ('anomaly' or 'traffic')

#### Request Body
```json
{
    "data": [
        {
            "value": number,
            "timestamp": string,
            // Additional features based on model type
        }
    ]
}
```

#### Response
```json
{
    "prediction": boolean | number[]
}
```

### Model Training
```http
POST /api/ml/train/:modelType
```
Train a model with new data. Requires admin privileges.

#### Parameters
- `modelType` (string): Type of model to train

#### Request Body
```json
{
    "trainingData": [
        {
            "input": {
                "value": number,
                "timestamp": string
                // Additional features
            },
            "label": number | boolean
        }
    ]
}
```

#### Response
```json
{
    "message": "Model [modelType] trained successfully"
}
```

### Model Evaluation
```http
POST /api/ml/evaluate/:modelType
```
Evaluate model performance. Requires admin privileges.

#### Parameters
- `modelType` (string): Type of model to evaluate

#### Request Body
```json
{
    "testData": [
        {
            "input": {
                "value": number,
                "timestamp": string
                // Additional features
            },
            "label": number | boolean
        }
    ]
}
```

#### Response
```json
{
    "evaluation": {
        "loss": number,
        "accuracy": number,
        // Additional metrics based on model type
    }
}
```

### Save Model
```http
POST /api/ml/save/:modelType
```
Save a trained model. Requires admin privileges.

#### Parameters
- `modelType` (string): Type of model to save

#### Response
```json
{
    "message": "Model [modelType] saved successfully"
}
```

## Model Types

### Anomaly Detection Model
- **Purpose**: Detect network anomalies and potential security threats
- **Input Features**:
  - Metric values
  - Timestamps
  - Network flow statistics
- **Output**: Boolean indicating anomaly presence
- **Architecture**: Dense Neural Network with binary classification

### Traffic Prediction Model
- **Purpose**: Predict network traffic patterns and bandwidth usage
- **Input Features**:
  - Historical traffic data
  - Time-based features
  - Network metrics
- **Output**: Array of predicted traffic values
- **Architecture**: LSTM/RNN for time series prediction

## Usage Examples

### Anomaly Detection
```typescript
// Example request for anomaly detection
const response = await fetch('/api/ml/predict/anomaly', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <token>'
    },
    body: JSON.stringify({
        data: [
            {
                value: 156.7,
                timestamp: '2024-12-27T04:07:13.000Z'
            }
        ]
    })
});

const result = await response.json();
// result.prediction: true/false indicating anomaly
```

### Traffic Prediction
```typescript
// Example request for traffic prediction
const response = await fetch('/api/ml/predict/traffic', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <token>'
    },
    body: JSON.stringify({
        data: [
            {
                bytesTransferred: 1500000,
                packetsTransferred: 1000,
                timestamp: '2024-12-27T04:07:13.000Z'
            }
        ]
    })
});

const result = await response.json();
// result.prediction: array of predicted traffic values
```

## Error Handling

### Common Error Responses
```json
{
    "error": "Invalid model type",
    "status": 400
}
```
```json
{
    "error": "Failed to make prediction",
    "status": 500
}
```
```json
{
    "error": "Unauthorized",
    "status": 401
}
```

### Error Types
1. **Validation Errors** (400)
   - Invalid model type
   - Invalid input data format
   - Missing required fields

2. **Authentication Errors** (401)
   - Missing or invalid token
   - Insufficient permissions

3. **Server Errors** (500)
   - Model loading failures
   - Training errors
   - Prediction errors

## Security

### Authentication
- All endpoints require valid JWT token
- Admin privileges required for training and model management

### Data Validation
- Input validation for all requests
- Sanitization of training data
- Resource usage limits

## Best Practices

1. **Model Training**
   - Use sufficient training data
   - Include validation set
   - Monitor training metrics
   - Regular model evaluation

2. **Predictions**
   - Batch predictions when possible
   - Monitor prediction latency
   - Implement prediction caching

3. **Model Management**
   - Regular model backups
   - Version control for models
   - Monitor model performance

## Integration Guidelines

1. **Frontend Integration**
   - Use provided TypeScript interfaces
   - Implement error handling
   - Add loading states for predictions

2. **Backend Integration**
   - Follow authentication flow
   - Implement rate limiting
   - Monitor resource usage

## Performance Considerations

1. **Model Size**
   - Optimize model architecture
   - Use quantization when possible
   - Consider model pruning

2. **Inference Speed**
   - Batch predictions
   - Use hardware acceleration
   - Cache common predictions

3. **Resource Usage**
   - Monitor memory usage
   - Implement cleanup routines
   - Use tensor disposal

## Monitoring and Maintenance

1. **Model Monitoring**
   - Track prediction accuracy
   - Monitor resource usage
   - Log prediction patterns

2. **Regular Maintenance**
   - Retrain models periodically
   - Update model versions
   - Clean up old models

3. **Troubleshooting**
   - Check logs for errors
   - Monitor model metrics
   - Validate input data
