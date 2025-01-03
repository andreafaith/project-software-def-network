# Network Monitoring Guide

## Overview
This guide explains how to use EyeNet's network monitoring capabilities effectively. EyeNet provides comprehensive network monitoring through both REST APIs and real-time WebSocket events.

## Key Features
1. Device Discovery
2. Topology Mapping
3. Performance Monitoring
4. Alert Management
5. Real-time Updates

## Device Discovery

### Automatic Discovery
EyeNet automatically discovers network devices using various methods:
1. SNMP scanning
2. ARP table analysis
3. Network range scanning
4. LLDP/CDP protocol analysis

```javascript
// Example: Initiate network discovery
POST /api/network/discovery
{
  "subnet": "192.168.1.0/24",
  "methods": ["snmp", "arp", "ping"],
  "credentials": {
    "snmp": {
      "community": "public",
      "version": "2c"
    }
  }
}
```

### Manual Device Addition
For devices that can't be discovered automatically:
```javascript
POST /api/network/devices
{
  "name": "Core-Router-1",
  "type": "router",
  "ipAddress": "192.168.1.1",
  "location": {
    "building": "HQ",
    "floor": "1",
    "room": "Server Room"
  }
}
```

## Topology Mapping

### Automatic Topology Discovery
The system builds network topology by:
1. Analyzing device connections
2. Processing LLDP/CDP information
3. Tracing network routes
4. Monitoring traffic patterns

### Visualization
Access topology visualization through:
1. REST API: `GET /api/network/topology`
2. WebSocket updates: Subscribe to `topology:update` events
3. Interactive web interface

## Performance Monitoring

### Key Metrics
1. **Device Health**
   - CPU usage
   - Memory utilization
   - Temperature
   - Fan status

2. **Network Performance**
   - Bandwidth utilization
   - Packet loss
   - Latency
   - Error rates

3. **Interface Statistics**
   - Input/Output rates
   - Error counts
   - Packet counts
   - Queue length

### Collecting Metrics
```javascript
// Get device metrics
GET /api/network/devices/{deviceId}/metrics?metrics=cpu,memory,bandwidth

// Get interface metrics
GET /api/network/devices/{deviceId}/interfaces/{interfaceId}/metrics
```

### Real-time Monitoring
Subscribe to real-time metrics:
```javascript
socket.emit('subscribe', {
  type: 'device:metrics',
  id: 'device_id',
  metrics: ['cpu', 'memory', 'bandwidth']
});
```

## Alert Configuration

### Setting Up Alerts
1. Define thresholds
2. Configure notification channels
3. Set up alert rules
4. Specify alert severity levels

Example:
```javascript
POST /api/alerts/config
{
  "name": "High CPU Usage",
  "deviceTypes": ["router", "switch"],
  "thresholds": [{
    "metric": "cpu_usage",
    "operator": "gt",
    "value": 90,
    "duration": 300  // 5 minutes
  }],
  "severity": "critical",
  "notifications": [{
    "type": "email",
    "recipients": ["admin@example.com"]
  }]
}
```

## Best Practices

### 1. Device Discovery
- Schedule regular network scans
- Maintain SNMP credential database
- Document manual device additions
- Verify discovered devices

### 2. Performance Monitoring
- Set appropriate polling intervals
- Use event-based monitoring when possible
- Configure metric retention policies
- Implement metric aggregation

### 3. Alert Management
- Define clear alert severity levels
- Set up escalation paths
- Configure alert correlation
- Document alert response procedures

### 4. Network Documentation
- Maintain topology diagrams
- Document device configurations
- Keep credential database secure
- Update network changes

## Troubleshooting

### Common Issues

1. **Device Discovery Failures**
   - Check network connectivity
   - Verify SNMP credentials
   - Ensure device accessibility
   - Check firewall rules

2. **Performance Monitoring Issues**
   - Verify polling intervals
   - Check metric collection methods
   - Validate device responses
   - Monitor system resources

3. **Alert Problems**
   - Validate threshold configurations
   - Check notification settings
   - Verify alert conditions
   - Test notification channels

## Security Considerations

1. **Access Control**
   - Use role-based access
   - Implement least privilege
   - Secure credential storage
   - Audit access logs

2. **Network Security**
   - Use SNMPv3 when possible
   - Encrypt management traffic
   - Implement access lists
   - Monitor security events

3. **Data Protection**
   - Encrypt sensitive data
   - Secure backup configurations
   - Protect monitoring data
   - Implement data retention policies
