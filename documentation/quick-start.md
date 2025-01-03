# EyeNet Quick Start Guide

## 🚀 5-Minute Setup

### 1. Clone & Configure
```bash
# Clone repository
git clone https://github.com/yourusername/eyenet.git
cd eyenet

# Configure environment
cp backend/.env.example backend/.env
```

### 2. Start Services
```bash
# Start with Docker
docker-compose up -d
```

### 3. Verify Installation
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access Services
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs
- MongoDB UI: http://localhost:8081
- Redis UI: http://localhost:8082

## 🎯 First Steps

### 1. Create Admin Account
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "your_secure_password",
    "role": "admin"
  }'
```

### 2. Get Authentication Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_secure_password"
  }'
```

### 3. Add Your First Device
```bash
curl -X POST http://localhost:5000/api/devices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Router",
    "ip": "192.168.1.1",
    "type": "router",
    "location": "HQ"
  }'
```

### 4. Set Up WebSocket Connection
```javascript
// Connect to WebSocket
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'YOUR_TOKEN'
  }
});

// Subscribe to device metrics
socket.emit('subscribe', {
  type: 'device:metrics',
  id: 'YOUR_DEVICE_ID'
});

// Listen for updates
socket.on('device:metrics', (data) => {
  console.log('Received metrics:', data);
});
```

### 5. Create Your First Alert Rule
```bash
curl -X POST http://localhost:5000/api/alerts/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High CPU Usage",
    "condition": {
      "metric": "cpu_usage",
      "operator": ">",
      "threshold": 90
    },
    "severity": "high",
    "notification": {
      "type": "email",
      "recipients": ["admin@example.com"]
    }
  }'
```

## 📱 Sample API Calls

### Device Management
```bash
# List all devices
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/devices

# Get device details
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/devices/YOUR_DEVICE_ID

# Update device
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/devices/YOUR_DEVICE_ID \
  -d '{
    "name": "Updated Router Name",
    "location": "New Location"
  }'
```

### Metrics & Monitoring
```bash
# Get device metrics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/metrics/YOUR_DEVICE_ID

# Get network topology
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/network/topology
```

### Alert Management
```bash
# List active alerts
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/alerts

# Acknowledge alert
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/alerts/YOUR_ALERT_ID/acknowledge
```

## 🔍 Quick Troubleshooting

### Common Issues

1. **Services Not Starting**
```bash
# Check Docker logs
docker-compose logs

# Verify environment variables
cat backend/.env

# Check service status
docker-compose ps
```

2. **Connection Issues**
```bash
# Test MongoDB connection
docker-compose exec mongodb mongo --eval "db.runCommand({ping: 1})"

# Test Redis connection
docker-compose exec redis redis-cli ping
```

3. **API Not Responding**
```bash
# Check API status
curl http://localhost:5000/api/health

# Check API logs
docker-compose logs backend
```

## 📊 Basic Monitoring

### 1. View Service Metrics
```bash
# Container stats
docker stats

# Application metrics
curl http://localhost:5000/api/metrics
```

### 2. Check Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs mongodb
docker-compose logs redis
```

## 🎮 Next Steps

1. **Explore API Documentation**
   - Visit http://localhost:5000/api-docs
   - Try out different API endpoints
   - Understand available parameters

2. **Set Up Monitoring**
   - Configure alert rules
   - Set up notification channels
   - Monitor system health

3. **Integrate ML Features**
   - Enable anomaly detection
   - Configure prediction models
   - Set up automated responses

4. **Scale Your Setup**
   - Add more devices
   - Configure high availability
   - Set up backup strategies
