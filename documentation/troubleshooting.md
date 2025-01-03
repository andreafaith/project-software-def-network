# EyeNet Troubleshooting Guide

## 🔍 Common Issues and Solutions

### 1. Installation Issues

#### Docker Services Not Starting
```bash
Problem: Services fail to start or are not accessible
Solution:
1. Check Docker status:
   docker info
   
2. Verify port availability:
   netstat -ano | findstr "5000"
   
3. Check service logs:
   docker-compose logs backend
   
4. Verify environment variables:
   docker-compose config
```

#### MongoDB Connection Errors
```bash
Problem: Backend can't connect to MongoDB
Solution:
1. Check MongoDB status:
   docker-compose exec mongodb mongo --eval "db.runCommand({ping: 1})"
   
2. Verify MongoDB URL:
   echo $MONGODB_URI
   
3. Check MongoDB logs:
   docker-compose logs mongodb
   
4. Verify network connectivity:
   docker network inspect eyenet-network
```

#### Redis Connection Issues
```bash
Problem: Cache operations failing or WebSocket rooms not working
Solution:
1. Test Redis connection:
   docker-compose exec redis redis-cli ping
   
2. Check Redis memory:
   docker-compose exec redis redis-cli info memory
   
3. Monitor Redis operations:
   docker-compose exec redis redis-cli monitor
   
4. Clear Redis data if needed:
   docker-compose exec redis redis-cli flushall
```

### 2. API Issues

#### Authentication Problems
```bash
Problem: JWT token issues or authentication failures
Solution:
1. Verify token format:
   echo "YOUR_TOKEN" | jwt decode
   
2. Check token expiration:
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/auth/verify
     
3. Regenerate token:
   curl -X POST http://localhost:5000/api/auth/refresh \
     -H "Authorization: Bearer YOUR_REFRESH_TOKEN"
```

#### Rate Limiting
```bash
Problem: Too many requests error (429)
Solution:
1. Check current rate limit status:
   curl -I -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/any-endpoint
     
2. View Redis rate limit data:
   docker-compose exec redis redis-cli keys "ratelimit:*"
   
3. Reset rate limit if needed:
   docker-compose exec redis redis-cli del "ratelimit:YOUR_IP"
```

#### API Performance Issues
```bash
Problem: Slow API responses or timeouts
Solution:
1. Check API health:
   curl http://localhost:5000/api/health
   
2. Monitor response times:
   curl -w "\nTime: %{time_total}s\n" \
     http://localhost:5000/api/health
     
3. View backend metrics:
   curl http://localhost:5000/api/metrics
   
4. Check system resources:
   docker stats
```

### 3. WebSocket Issues

#### Connection Problems
```bash
Problem: WebSocket connections failing or disconnecting
Solution:
1. Test WebSocket connection:
   wscat -c ws://localhost:5000
   
2. Check WebSocket logs:
   docker-compose logs backend | grep "socket"
   
3. Verify Redis adapter:
   docker-compose exec redis redis-cli keys "socket.io*"
   
4. Monitor WebSocket events:
   socket.on('connect_error', (error) => {
     console.error('Connection Error:', error);
   });
```

#### Event Subscription Issues
```bash
Problem: Not receiving real-time updates
Solution:
1. Verify subscription:
   socket.emit('subscribe', {
     type: 'device:metrics',
     id: 'YOUR_DEVICE_ID'
   }, (response) => {
     console.log('Subscription response:', response);
   });
   
2. Debug event listeners:
   socket.onAny((event, ...args) => {
     console.log('Event:', event, 'Args:', args);
   });
   
3. Check room membership:
   docker-compose exec redis redis-cli keys "socket.io#*"
```

### 4. Database Issues

#### Data Consistency
```bash
Problem: Missing or incorrect data
Solution:
1. Check MongoDB collections:
   docker-compose exec mongodb mongo eyenet --eval \
     "db.getCollectionNames().forEach(c => print(c, db[c].count()))"
     
2. Verify indexes:
   docker-compose exec mongodb mongo eyenet --eval \
     "db.getCollectionNames().forEach(c => print(c, db[c].getIndexes()))"
     
3. Check for orphaned data:
   db.devices.aggregate([
     {
       $lookup: {
         from: "metrics",
         localField: "_id",
         foreignField: "deviceId",
         as: "metrics"
       }
     },
     {
       $match: {
         metrics: { $size: 0 }
       }
     }
   ])
```

#### Performance Issues
```bash
Problem: Slow queries or high database load
Solution:
1. Check slow queries:
   docker-compose exec mongodb mongo eyenet --eval \
     "db.currentOp()"
     
2. Analyze indexes:
   docker-compose exec mongodb mongo eyenet --eval \
     "db.devices.aggregate([{$indexStats: {}}])"
     
3. View collection stats:
   docker-compose exec mongodb mongo eyenet --eval \
     "db.devices.stats()"
```

### 5. ML Service Issues

#### Model Loading Problems
```bash
Problem: ML models not loading or predictions failing
Solution:
1. Check model files:
   ls -l ml_models/
   
2. Verify model versions:
   curl http://localhost:5000/api/ml/models
   
3. Test model inference:
   curl -X POST http://localhost:5000/api/ml/predict \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "anomaly_detection",
       "data": {
         "metrics": [...]
       }
     }'
```

#### Prediction Accuracy
```bash
Problem: Poor ML prediction results
Solution:
1. Check model metrics:
   curl http://localhost:5000/api/ml/metrics
   
2. View prediction logs:
   docker-compose logs backend | grep "prediction"
   
3. Analyze feature importance:
   curl http://localhost:5000/api/ml/features/importance
```

## 📊 Monitoring Tools

### System Monitoring
```bash
# Container resource usage
docker stats

# System metrics
curl http://localhost:5000/api/metrics

# Application logs
docker-compose logs -f --tail=100
```

### Database Monitoring
```bash
# MongoDB status
docker-compose exec mongodb mongo --eval "db.serverStatus()"

# Redis status
docker-compose exec redis redis-cli info
```

### API Monitoring
```bash
# API health check
curl http://localhost:5000/api/health

# Active connections
curl http://localhost:5000/api/metrics/connections

# Request rate
curl http://localhost:5000/api/metrics/requests
```

## 🔄 Recovery Procedures

### 1. Service Recovery
```bash
# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Full system restart
docker-compose down
docker-compose up -d
```

### 2. Data Recovery
```bash
# Backup MongoDB
docker-compose exec mongodb mongodump \
  --out /data/backup/$(date +%Y%m%d)

# Restore MongoDB
docker-compose exec mongodb mongorestore \
  /data/backup/YYYYMMDD

# Export collection
docker-compose exec mongodb mongoexport \
  --collection devices \
  --out /data/backup/devices.json
```

### 3. Cache Recovery
```bash
# Clear Redis cache
docker-compose exec redis redis-cli flushall

# Reset rate limits
docker-compose exec redis redis-cli del "ratelimit:*"

# Clear WebSocket data
docker-compose exec redis redis-cli del "socket.io*"
```

## 📝 Logging

### Enable Debug Logging
```bash
# Set environment variable
export DEBUG=eyenet:*

# Update log level in .env
LOG_LEVEL=debug

# Restart services
docker-compose restart
```

### Log Analysis
```bash
# Search logs
docker-compose logs | grep "error"

# Save logs to file
docker-compose logs > logs.txt

# Monitor real-time logs
docker-compose logs -f --tail=100
```

## 🔒 Security Issues

### Reset Authentication
```bash
# Invalidate all tokens
curl -X POST http://localhost:5000/api/auth/invalidate-all \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Reset admin password
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "email": "admin@example.com",
    "newPassword": "secure_password"
  }'
```

### Security Audit
```bash
# View access logs
docker-compose logs | grep "access"

# Check failed login attempts
docker-compose logs | grep "login failed"

# View rate limit blocks
docker-compose logs | grep "rate limit"
```
