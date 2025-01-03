# Data Format Specifications

## Network Metrics Schema

### Basic Metric Data Point
```json
{
  "value": "number (required)",
  "timestamp": "Date (ISO 8601)",
  "quality": "enum ['high', 'medium', 'low']"
}
```

### Network Metrics Document
```json
{
  "deviceId": "ObjectId (required)",
  "interfaceName": "string (required)",
  "metrics": {
    "bandwidth": {
      "inbound": MetricDataPoint,
      "outbound": MetricDataPoint,
      "total": MetricDataPoint,
      "utilization": MetricDataPoint
    },
    "latency": {
      "value": "number",
      "timestamp": "Date",
      "quality": "string",
      "distribution": {
        "min": "number",
        "max": "number",
        "mean": "number",
        "median": "number",
        "percentile95": "number",
        "standardDeviation": "number"
      }
    },
    "packetLoss": {
      "value": "number",
      "timestamp": "Date",
      "quality": "string",
      "details": {
        "totalPackets": "number",
        "lostPackets": "number",
        "errorType": "enum ['collision', 'congestion', 'corruption', 'unknown']"
      }
    }
  },
  "aggregation": "enum ['raw', '1min', '5min', '15min', '1hour', '1day']",
  "metadata": {
    "source": "enum ['snmp', 'api', 'agent', 'manual']",
    "reliability": "number (0-1)",
    "collectionMethod": "string",
    "processingDelay": "number",
    "version": "string"
  }
}
```

## Time-Series Format

### Single Time-Series Entry
```json
{
  "timestamp": "ISO 8601 date string",
  "value": "number",
  "metadata": {
    "quality": "string",
    "source": "string",
    "confidence": "number"
  }
}
```

### Time-Series Collection
```json
{
  "metric": "string",
  "deviceId": "string",
  "interval": "string",
  "startTime": "ISO 8601 date string",
  "endTime": "ISO 8601 date string",
  "data": [
    {
      "timestamp": "ISO 8601 date string",
      "value": "number",
      "metadata": {}
    }
  ]
}
```

## Batch Processing Format

### Batch Job Request
```json
{
  "jobId": "string",
  "type": "string",
  "priority": "enum ['low', 'medium', 'high']",
  "items": [
    {
      "id": "string",
      "type": "string",
      "data": "object"
    }
  ],
  "options": {
    "parallel": "boolean",
    "maxRetries": "number",
    "timeout": "number"
  }
}
```

### Batch Job Response
```json
{
  "jobId": "string",
  "status": "enum ['queued', 'processing', 'completed', 'failed']",
  "progress": {
    "total": "number",
    "processed": "number",
    "failed": "number"
  },
  "results": [
    {
      "id": "string",
      "status": "string",
      "data": "object",
      "error": "string?"
    }
  ],
  "timing": {
    "startTime": "ISO 8601 date string",
    "endTime": "ISO 8601 date string",
    "duration": "number"
  }
}
```

## API Response Templates

### Success Response
```json
{
  "success": true,
  "data": "object | array",
  "metadata": {
    "timestamp": "ISO 8601 date string",
    "version": "string",
    "pagination": {
      "page": "number",
      "limit": "number",
      "total": "number"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object?",
    "timestamp": "ISO 8601 date string"
  }
}
```

### Batch Operation Response
```json
{
  "success": true,
  "results": [
    {
      "id": "string",
      "success": "boolean",
      "data": "object?",
      "error": "object?"
    }
  ],
  "metadata": {
    "totalProcessed": "number",
    "successCount": "number",
    "failureCount": "number"
  }
}
```
