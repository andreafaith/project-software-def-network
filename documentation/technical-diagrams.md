# EyeNet Technical Diagrams

## 1. System Architecture

### High-Level Architecture
```mermaid
graph TB
    subgraph Client Layer
        A[Web Client]
        B[Mobile Client]
        C[API Client]
    end

    subgraph API Gateway Layer
        D[API Gateway]
        E[Load Balancer]
        F[Rate Limiter]
    end

    subgraph Service Layer
        G[Auth Service]
        H[Network Monitor]
        I[ML Service]
        J[Alert Service]
    end

    subgraph Data Layer
        K[(MongoDB)]
        L[(Redis)]
        M[(Time Series DB)]
    end

    A & B & C --> D
    D --> E
    E --> F
    F --> G & H & I & J
    G & H & I & J --> K & L & M
```

### Data Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant A as Auth Service
    participant N as Network Monitor
    participant M as ML Service
    participant AL as Alert Service
    participant D as Database
    participant R as Redis
    participant W as WebSocket

    C->>G: Request
    G->>A: Authenticate
    A->>R: Validate Token
    R-->>A: Token Status
    A-->>G: Auth Result
    G->>N: Process Request
    N->>D: Store Data
    N->>M: Analyze Data
    M->>AL: Generate Alert
    AL->>W: Real-time Update
    W-->>C: Alert Notification
```

## 2. Network Monitoring

### Device Discovery Process
```mermaid
graph LR
    A[Network Scanner] -->|Discover| B[New Device]
    B -->|Validate| C{Device Type}
    C -->|Router| D[Router Config]
    C -->|Switch| E[Switch Config]
    C -->|Server| F[Server Config]
    D & E & F -->|Monitor| G[Metrics Collection]
    G -->|Process| H[Time Series DB]
    H -->|Analyze| I[ML Processing]
```

### Metric Collection Flow
```mermaid
graph TB
    subgraph Device
        A[SNMP Agent]
        B[syslog]
        C[NetFlow]
    end

    subgraph Collector
        D[SNMP Collector]
        E[Log Aggregator]
        F[Flow Collector]
    end

    subgraph Processor
        G[Data Normalizer]
        H[Feature Extractor]
        I[Time Series Processor]
    end

    A --> D
    B --> E
    C --> F
    D & E & F --> G
    G --> H
    H --> I
```

## 3. ML Pipeline

### Training Pipeline
```mermaid
graph LR
    A[Data Collection] -->|Raw Data| B[Preprocessing]
    B -->|Clean Data| C[Feature Engineering]
    C -->|Features| D[Model Training]
    D -->|Model| E[Validation]
    E -->|Metrics| F{Performance Check}
    F -->|Pass| G[Model Registry]
    F -->|Fail| B
```

### Inference Pipeline
```mermaid
graph TB
    A[Input Data] -->|Raw| B[Feature Extraction]
    B -->|Features| C[Model Inference]
    C -->|Predictions| D[Post-processing]
    D -->|Results| E{Threshold Check}
    E -->|Above| F[Alert Generation]
    E -->|Below| G[Normal Operation]
```

## 4. Alert System

### Alert Processing
```mermaid
stateDiagram-v2
    [*] --> New
    New --> Processing
    Processing --> Evaluated
    Evaluated --> Alert
    Evaluated --> Normal
    Alert --> Notification
    Notification --> Acknowledged
    Acknowledged --> Resolved
    Resolved --> [*]
```

### Notification Flow
```mermaid
graph TB
    A[Alert Trigger] -->|New Alert| B{Severity}
    B -->|High| C[Immediate]
    B -->|Medium| D[Batched]
    B -->|Low| E[Digest]
    C & D & E -->|Route| F{Channel}
    F -->|Email| G[Email Service]
    F -->|SMS| H[SMS Service]
    F -->|Slack| I[Slack Bot]
    G & H & I -->|Send| J[Notification]
```

## 5. Authentication Flow

### OAuth Process
```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant A as Auth Service
    participant O as OAuth Provider
    participant D as Database

    U->>C: Login Request
    C->>O: Redirect to OAuth
    U->>O: Authenticate
    O->>A: Authorization Code
    A->>O: Token Request
    O->>A: Access Token
    A->>D: Store User Info
    A->>C: JWT Token
    C->>U: Login Success
```

### Token Refresh
```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant R as Redis
    participant D as Database

    C->>A: Refresh Token
    A->>R: Validate Token
    R-->>A: Token Valid
    A->>D: Update Session
    A->>C: New Access Token
```

## 6. Scaling Architecture

### Horizontal Scaling
```mermaid
graph TB
    subgraph Load Balancer
        LB[HAProxy]
    end

    subgraph API Servers
        A1[API Server 1]
        A2[API Server 2]
        A3[API Server 3]
    end

    subgraph Cache Layer
        R1[(Redis 1)]
        R2[(Redis 2)]
    end

    subgraph Database Layer
        M1[(MongoDB Primary)]
        M2[(MongoDB Secondary 1)]
        M3[(MongoDB Secondary 2)]
    end

    LB --> A1 & A2 & A3
    A1 & A2 & A3 --> R1 & R2
    A1 & A2 & A3 --> M1
    M1 --> M2 & M3
```

### Service Discovery
```mermaid
graph LR
    A[Service Registry] -->|Register| B[New Service]
    C[Client] -->|Lookup| A
    A -->|Endpoint| C
    C -->|Request| B
    B -->|Health Check| A
```

## 7. Data Models

### Device Schema
```mermaid
classDiagram
    class Device {
        +String id
        +String name
        +String type
        +String location
        +String ip
        +Object status
        +Date lastSeen
        +createMetrics()
        +updateStatus()
    }

    class Metric {
        +String id
        +String deviceId
        +String type
        +Number value
        +Date timestamp
        +analyze()
    }

    class Alert {
        +String id
        +String deviceId
        +String type
        +String severity
        +String message
        +Date created
        +notify()
    }

    Device "1" --> "*" Metric
    Device "1" --> "*" Alert
```

### User Schema
```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String email
        +String password
        +Array roles
        +Object preferences
        +authenticate()
        +authorize()
    }

    class Role {
        +String id
        +String name
        +Array permissions
        +checkPermission()
    }

    class Permission {
        +String id
        +String resource
        +String action
        +validate()
    }

    User "*" --> "*" Role
    Role "*" --> "*" Permission
```
