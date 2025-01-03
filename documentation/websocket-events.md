# WebSocket Events Documentation

## Overview
This document describes the WebSocket events used for real-time communication in the EyeNet system. The WebSocket server runs on the same port as the REST API and uses the `/ws` endpoint for connections.

## Connection Setup

### Establishing Connection
```javascript
const socket = io('ws://localhost:5000/ws', {
  auth: {
    token: 'your_jwt_token'  // JWT token required for authentication
  }
});
```

## Event Types

### 1. Device Status Events

#### device:status
Emitted when a device's status changes.
```javascript
// Server -> Client
{
  "type": "device:status",
  "data": {
    "deviceId": "device_id",
    "status": "up|down|degraded",
    "timestamp": "2025-01-03T07:12:55+08:00",
    "metrics": {
      "uptime": 1234567,
      "lastSeen": "2025-01-03T07:12:55+08:00"
    }
  }
}
```

#### device:metrics
Real-time device metrics updates.
```javascript
// Server -> Client
{
  "type": "device:metrics",
  "data": {
    "deviceId": "device_id",
    "metrics": {
      "cpu": 45.2,
      "memory": 78.5,
      "bandwidth": {
        "in": 1024,
        "out": 2048
      }
    },
    "timestamp": "2025-01-03T07:12:55+08:00"
  }
}
```

### 2. Alert Events

#### alert:new
Emitted when a new alert is triggered.
```javascript
// Server -> Client
{
  "type": "alert:new",
  "data": {
    "alertId": "alert_id",
    "severity": "critical|warning|info",
    "deviceId": "device_id",
    "message": "CPU usage exceeded threshold",
    "timestamp": "2025-01-03T07:12:55+08:00",
    "metrics": {
      "value": 95.5,
      "threshold": 90
    }
  }
}
```

#### alert:update
Emitted when an alert status changes.
```javascript
// Server -> Client
{
  "type": "alert:update",
  "data": {
    "alertId": "alert_id",
    "status": "acknowledged|resolved",
    "updatedBy": "user_id",
    "timestamp": "2025-01-03T07:12:55+08:00"
  }
}
```

### 3. Network Topology Events

#### topology:update
Emitted when network topology changes.
```javascript
// Server -> Client
{
  "type": "topology:update",
  "data": {
    "changeType": "device_added|device_removed|link_change",
    "devices": [{
      "id": "device_id",
      "type": "router|switch|endpoint",
      "connections": ["device_id_1", "device_id_2"]
    }],
    "timestamp": "2025-01-03T07:12:55+08:00"
  }
}
```

### 4. ML Processing Events

#### ml:prediction
Emitted when ML prediction is completed.
```javascript
// Server -> Client
{
  "type": "ml:prediction",
  "data": {
    "jobId": "job_id",
    "status": "completed|failed",
    "results": [{
      "label": "anomaly_type",
      "confidence": 0.95
    }],
    "timestamp": "2025-01-03T07:12:55+08:00"
  }
}
```

## Client Events

### Subscribing to Events

#### subscribe
Subscribe to specific device or topic events.
```javascript
// Client -> Server
socket.emit('subscribe', {
  type: 'device',
  id: 'device_id'
});

// Server -> Client (Acknowledgment)
{
  "status": "subscribed",
  "channel": "device:device_id"
}
```

### Error Handling

#### error
Emitted when an error occurs.
```javascript
// Server -> Client
{
  "type": "error",
  "data": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "timestamp": "2025-01-03T07:12:55+08:00"
  }
}
```

## Best Practices

1. **Reconnection Strategy**
```javascript
socket.io.on("reconnect_attempt", (attempt) => {
  if (attempt > 5) {
    // Switch to long-polling or show user error
  }
});
```

2. **Event Buffering**
```javascript
// Buffer events when processing multiple updates
let eventBuffer = [];
socket.on('device:metrics', (data) => {
  eventBuffer.push(data);
  if (eventBuffer.length >= 10) {
    processMetricsBatch(eventBuffer);
    eventBuffer = [];
  }
});
```

3. **Error Recovery**
```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server initiated disconnect, cleanup and reconnect
    socket.connect();
  }
});
```

## Rate Limiting
- Maximum 100 subscriptions per client
- Event throttling: 1000 events per minute per client
- Automatic disconnect on exceeding limits

## Security Considerations
1. All connections require valid JWT token
2. Token expiration leads to automatic disconnect
3. Role-based event filtering
4. Event payload encryption for sensitive data
