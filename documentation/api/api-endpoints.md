# EyeNet API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "role": "string (optional)"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "message": "User registered successfully",
    "tokens": {
      "accessToken": "string",
      "refreshToken": "string"
    }
  }
  ```

### Login
- **POST** `/auth/login`
- **Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "tokens": {
      "accessToken": "string",
      "refreshToken": "string"
    },
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "string"
    }
  }
  ```

### Refresh Token
- **POST** `/auth/refresh-token`
- **Body**:
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string"
  }
  ```

## Network Management Endpoints

### Get Network Topology
- **GET** `/network/topology`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "nodes": [
      {
        "id": "string",
        "type": "switch|router|host",
        "status": "active|inactive",
        "ports": [
          {
            "id": "number",
            "status": "active|inactive",
            "speed": "number"
          }
        ]
      }
    ],
    "links": [
      {
        "id": "string",
        "source": "string",
        "target": "string",
        "sourcePort": "number",
        "targetPort": "number",
        "status": "active|inactive",
        "metrics": {
          "bandwidth": "number",
          "latency": "number",
          "utilization": "number"
        }
      }
    ]
  }
  ```

### Get Device Status
- **GET** `/network/devices/{deviceId}`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "id": "string",
    "type": "string",
    "status": "string",
    "ports": [],
    "metrics": {
      "cpu": "number",
      "memory": "number",
      "throughput": "number"
    }
  }
  ```

## Analytics Endpoints

### Get Real-time Metrics
- **GET** `/analytics/realtime/metrics`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `metricType`: string
  - `duration`: number (seconds)
- **Response**: `200 OK`
  ```json
  {
    "metrics": [
      {
        "timestamp": "string",
        "type": "string",
        "value": "number",
        "deviceId": "string"
      }
    ]
  }
  ```

### Get Historical Analysis
- **GET** `/analytics/historical/trends`
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `metric`: string
  - `startTime`: string
  - `endTime`: string
- **Response**: `200 OK`
  ```json
  {
    "trends": [
      {
        "metric": "string",
        "period": "string",
        "values": [
          {
            "timestamp": "string",
            "value": "number"
          }
        ],
        "statistics": {
          "mean": "number",
          "median": "number",
          "stdDev": "number"
        }
      }
    ]
  }
  ```

### Generate Report
- **POST** `/analytics/reports/generate/{templateId}`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "startDate": "string",
    "endDate": "string",
    "metrics": ["string"],
    "format": "pdf|csv|json"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "reportId": "string",
    "status": "generating|completed",
    "downloadUrl": "string"
  }
  ```

## QoS Management Endpoints

### Create QoS Policy
- **POST** `/network/qos/policies`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "string",
    "type": "rate-limiting|priority-queuing|dscp-marking",
    "match": {
      "ipProto": "number",
      "ipv4Src": "string",
      "ipv4Dst": "string",
      "tcpSrcPort": "number",
      "tcpDstPort": "number",
      "dscp": "number"
    },
    "actions": [
      {
        "type": "string",
        "rate": "number",
        "burst": "number",
        "priority": "number",
        "queue": "number",
        "dscp": "number"
      }
    ]
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": "string",
    "status": "active",
    "message": "QoS policy created successfully"
  }
  ```

### Get QoS Policies
- **GET** `/network/qos/policies`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
  ```json
  {
    "policies": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "match": {},
        "actions": [],
        "status": "string"
      }
    ]
  }
  ```

## WebSocket Events

### Connection
```javascript
socket.connect({
  auth: {
    token: "Bearer <token>"
  }
});
```

### Subscribe to Events
```javascript
// Subscribe to device metrics
socket.emit('subscribe:metrics', deviceId);

// Subscribe to alerts
socket.emit('subscribe:alerts');

// Subscribe to device status updates
socket.emit('subscribe:device-status', deviceId);

// Subscribe to network events
socket.emit('subscribe:network-events');
```

### Event Listeners
```javascript
// Metric updates
socket.on('metric:update', (data) => {
  // Handle metric update
});

// New alerts
socket.on('alert:new', (alert) => {
  // Handle new alert
});

// Device status updates
socket.on('device:status-update', (status) => {
  // Handle device status update
});

// Network events
socket.on('network:event', (event) => {
  // Handle network event
});
```

## Error Responses

### Common Error Structure
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

### Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

## Rate Limiting
- Rate limit: 100 requests per minute per IP
- Rate limit headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Security
- All endpoints require HTTPS
- Authentication using JWT tokens
- CORS enabled for specified origins
- Request size limits:
  - JSON payload: 50mb
  - File upload: 50mb
