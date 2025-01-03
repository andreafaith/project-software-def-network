# Alert Configuration Guide

## Overview
This guide explains how to configure and manage alerts in the EyeNet system. The alert system provides real-time monitoring and notification of network events, performance issues, and security concerns.

## Alert Components

### 1. Alert Rules
Alert rules define the conditions that trigger notifications.

#### Rule Components:
- Conditions (thresholds, patterns)
- Device/Service scope
- Time windows
- Severity levels
- Response actions

Example Configuration:
```javascript
{
  "name": "Critical CPU Usage",
  "description": "Alert when CPU usage exceeds 90% for 5 minutes",
  "enabled": true,
  "severity": "critical",
  "conditions": {
    "metric": "cpu_usage",
    "operator": "gt",
    "value": 90,
    "duration": 300
  },
  "scope": {
    "deviceTypes": ["router", "switch", "server"],
    "locations": ["datacenter-1", "datacenter-2"]
  }
}
```

### 2. Notification Channels

#### Available Channels:
1. Email
2. SMS
3. Slack
4. Webhook
5. In-app notifications

Example Configuration:
```javascript
{
  "channels": [{
    "type": "email",
    "name": "NOC Team",
    "config": {
      "recipients": ["noc@company.com"],
      "includeMetrics": true,
      "format": "html"
    }
  }, {
    "type": "slack",
    "name": "NOC Channel",
    "config": {
      "webhook": "https://hooks.slack.com/...",
      "channel": "#noc-alerts",
      "mention": "@oncall"
    }
  }]
}
```

## Alert Types

### 1. Performance Alerts
- CPU utilization
- Memory usage
- Disk space
- Network bandwidth
- Latency thresholds

### 2. Status Alerts
- Device up/down
- Service availability
- Interface status
- Link state changes

### 3. Security Alerts
- Authentication failures
- Configuration changes
- Access violations
- Unusual traffic patterns

### 4. Threshold Alerts
- Metric-based thresholds
- Trend analysis
- Anomaly detection
- Composite conditions

## Configuration Steps

### 1. Define Alert Rules

```javascript
POST /api/alerts/rules
{
  "name": "High Memory Usage",
  "description": "Memory usage exceeds threshold",
  "conditions": [{
    "metric": "memory_usage",
    "operator": "gt",
    "value": 85,
    "duration": 300
  }],
  "severity": "warning",
  "notifications": ["email-noc", "slack-alerts"]
}
```

### 2. Configure Notification Channels

```javascript
POST /api/alerts/channels
{
  "name": "email-noc",
  "type": "email",
  "config": {
    "recipients": ["noc@company.com"],
    "format": "html",
    "includeDetails": true
  }
}
```

### 3. Set Up Alert Policies

```javascript
POST /api/alerts/policies
{
  "name": "Business Hours Policy",
  "schedule": {
    "timezone": "UTC",
    "workdays": ["MON", "TUE", "WED", "THU", "FRI"],
    "hours": ["09:00-17:00"]
  },
  "escalation": {
    "levels": [{
      "wait": 300,
      "channels": ["slack-alerts"]
    }, {
      "wait": 900,
      "channels": ["email-noc", "sms-oncall"]
    }]
  }
}
```

## Alert Management

### 1. Alert Lifecycle
1. Detection
2. Notification
3. Acknowledgment
4. Resolution
5. Post-mortem

### 2. Alert Actions
- Acknowledge
- Escalate
- Suppress
- Close
- Add notes

Example:
```javascript
POST /api/alerts/{alertId}/actions
{
  "action": "acknowledge",
  "comment": "Investigating high CPU usage",
  "user": "john.doe"
}
```

## Best Practices

### 1. Alert Design
- Set meaningful thresholds
- Avoid alert fatigue
- Use appropriate severity levels
- Configure proper time windows
- Include relevant context

### 2. Notification Strategy
- Define clear escalation paths
- Use appropriate channels
- Include actionable information
- Set up redundant notifications
- Configure notification hours

### 3. Alert Response
- Document response procedures
- Define ownership and responsibilities
- Set up tracking and metrics
- Implement post-mortem process
- Maintain alert history

## Maintenance

### 1. Regular Reviews
- Review alert effectiveness
- Update thresholds
- Adjust notification settings
- Clean up obsolete alerts
- Update contact information

### 2. Performance Tuning
- Monitor alert system load
- Optimize alert conditions
- Adjust polling intervals
- Review alert volumes
- Fine-tune thresholds

## Troubleshooting

### Common Issues
1. **Missing Alerts**
   - Check alert conditions
   - Verify notification channels
   - Review alert policies
   - Check system connectivity

2. **False Positives**
   - Adjust thresholds
   - Review time windows
   - Update alert conditions
   - Configure better filters

3. **Delayed Notifications**
   - Check system load
   - Verify notification services
   - Review network connectivity
   - Check queue status

## Integration

### 1. External Systems
- Ticket systems
- Monitoring tools
- Chat platforms
- Phone systems

### 2. API Integration
```javascript
POST /api/alerts/integrations
{
  "type": "jira",
  "config": {
    "url": "https://jira.company.com",
    "project": "NOC",
    "issueType": "Incident",
    "credentials": {
      "username": "api-user",
      "apiKey": "****"
    }
  }
}
```
