# Accessing Database UIs Locally

## MongoDB UI (Mongo Express)

### 1. Using Docker (Recommended)

```bash
# Start Mongo Express container
docker run -d \
  --name mongo-express \
  --network eyenet-network \
  -p 8081:8081 \
  -e ME_CONFIG_MONGODB_SERVER=mongodb \
  -e ME_CONFIG_MONGODB_PORT=27017 \
  -e ME_CONFIG_BASICAUTH_USERNAME=admin \
  -e ME_CONFIG_BASICAUTH_PASSWORD=pass \
  mongo-express
```

Access at: http://localhost:8081

### 2. Manual Installation

```bash
# Install Mongo Express globally
npm install -g mongo-express

# Create config.js
mkdir ~/mongo-express-config
cd ~/mongo-express-config

# Create configuration file
cat > config.js << EOL
module.exports = {
  mongodb: {
    server: 'localhost',
    port: 27017,
    useBasicAuth: true,
    basicAuth: {
      username: 'admin',
      password: 'pass'
    }
  },
  site: {
    baseUrl: '/',
    port: 8081,
    host: '0.0.0.0'
  }
};
EOL

# Start Mongo Express
mongo-express -c config.js
```

Access at: http://localhost:8081

### 3. Alternative Tools

#### MongoDB Compass
1. Download [MongoDB Compass](https://www.mongodb.com/try/download/compass)
2. Install and launch
3. Connect using: `mongodb://localhost:27017`

## Redis UI (Redis Commander)

### 1. Using Docker (Recommended)

```bash
# Start Redis Commander container
docker run -d \
  --name redis-commander \
  --network eyenet-network \
  -p 8082:8081 \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  rediscommander/redis-commander
```

Access at: http://localhost:8082

### 2. Manual Installation

```bash
# Install Redis Commander globally
npm install -g redis-commander

# Start Redis Commander
redis-commander \
  --redis-host localhost \
  --redis-port 6379 \
  --port 8082
```

Access at: http://localhost:8082

### 3. Alternative Tools

#### Another Redis Desktop Manager
1. Download [Another Redis Desktop Manager](https://github.com/qishibo/AnotherRedisDesktopManager/releases)
2. Install and launch
3. Connect using:
   - Host: localhost
   - Port: 6379

## Troubleshooting

### MongoDB UI Issues

1. **Connection Refused**
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Verify MongoDB port
netstat -an | findstr "27017"

# Test MongoDB connection
mongo --eval "db.runCommand({ping: 1})"
```

2. **Authentication Failed**
```bash
# Check MongoDB users
mongo admin --eval "db.system.users.find()"

# Create new admin user
mongo admin --eval 'db.createUser({
  user: "admin",
  pwd: "password",
  roles: ["root"]
})'
```

### Redis UI Issues

1. **Connection Refused**
```bash
# Check if Redis is running
docker ps | grep redis

# Verify Redis port
netstat -an | findstr "6379"

# Test Redis connection
redis-cli ping
```

2. **Authentication Failed**
```bash
# Check Redis configuration
docker exec -it redis redis-cli CONFIG GET requirepass

# Set Redis password
docker exec -it redis redis-cli CONFIG SET requirepass "your_password"
```

## Security Considerations

### MongoDB
- Always set strong passwords
- Use authentication
- Limit network access
- Enable SSL/TLS
- Regular security audits

### Redis
- Set strong Redis password
- Enable protected mode
- Configure maxmemory
- Regular security updates
- Monitor access logs

## Quick Commands

### MongoDB
```bash
# Start MongoDB (local)
mongod --dbpath /data/db

# Connect to MongoDB
mongo "mongodb://localhost:27017"

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "secure_password",
  roles: ["root"]
})
```

### Redis
```bash
# Start Redis (local)
redis-server

# Connect to Redis CLI
redis-cli

# Monitor Redis
redis-cli monitor

# Set password
redis-cli CONFIG SET requirepass "your_password"
```

## Environment Variables

### MongoDB UI
```env
ME_CONFIG_MONGODB_SERVER=localhost
ME_CONFIG_MONGODB_PORT=27017
ME_CONFIG_BASICAUTH_USERNAME=admin
ME_CONFIG_BASICAUTH_PASSWORD=pass
```

### Redis UI
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```
