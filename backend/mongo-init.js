db.auth('admin', 'secure_password123')

db = db.getSiblingDB('eyenet')

// Create application user
db.createUser({
  user: 'eyenet_user',
  pwd: 'eyenet_pass123',
  roles: [
    {
      role: 'readWrite',
      db: 'eyenet'
    }
  ]
})

// Create collections with validation
db.createCollection('devices', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'ip'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Device name - required string'
        },
        type: {
          bsonType: 'string',
          description: 'Device type - required string'
        },
        ip: {
          bsonType: 'string',
          description: 'Device IP address - required string'
        },
        location: {
          bsonType: 'string',
          description: 'Device location - optional string'
        },
        status: {
          bsonType: 'object',
          description: 'Device status - optional object'
        }
      }
    }
  }
})

db.createCollection('metrics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['deviceId', 'type', 'value', 'timestamp'],
      properties: {
        deviceId: {
          bsonType: 'objectId',
          description: 'Device ID reference - required ObjectId'
        },
        type: {
          bsonType: 'string',
          description: 'Metric type - required string'
        },
        value: {
          bsonType: 'number',
          description: 'Metric value - required number'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp - required date'
        }
      }
    }
  }
})

db.createCollection('alerts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['deviceId', 'type', 'severity', 'message', 'timestamp'],
      properties: {
        deviceId: {
          bsonType: 'objectId',
          description: 'Device ID reference - required ObjectId'
        },
        type: {
          bsonType: 'string',
          description: 'Alert type - required string'
        },
        severity: {
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Alert severity - required enum'
        },
        message: {
          bsonType: 'string',
          description: 'Alert message - required string'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp - required date'
        }
      }
    }
  }
})

// Create indexes
db.devices.createIndex({ name: 1 }, { unique: true })
db.devices.createIndex({ ip: 1 }, { unique: true })
db.metrics.createIndex({ deviceId: 1, timestamp: -1 })
db.metrics.createIndex({ type: 1, timestamp: -1 })
db.alerts.createIndex({ deviceId: 1, timestamp: -1 })
db.alerts.createIndex({ severity: 1, timestamp: -1 })
