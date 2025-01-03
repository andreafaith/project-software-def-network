# EyeNet: Software-Defined Network Monitoring System

## Project Overview
EyeNet is a comprehensive network management system that leverages Software-Defined Networking (SDN) principles to provide advanced monitoring and analytics capabilities. The system is designed for UPHSL's college building, covering 24 offices, with a focus on network usage monitoring and descriptive analytics.

## System Architecture

### 1. Three-Layer Architecture
1. **Application Layer**
   - Decision Support System
   - User Interfaces (Admin and Staff)
   - Analytics Dashboard

2. **Monitoring Plane**
   - Network Monitoring Components
   - OpenFlow Integration
   - Real-time Data Collection

3. **Data Plane**
   - Physical Network Infrastructure
   - Network Devices Management
   - Data Forwarding

### 2. Key Components
- **Northbound API**: Interface between Application and Monitoring layers
- **Southbound API**: Interface between Monitoring and Data layers
- **OpenFlow Controller**: Core SDN component for network management

## Features and Functionality

### 1. Network Management
- IP Address Management
- Bandwidth Allocation
- Network Speed Monitoring
- Network Usage Scheduling
- Device Performance Monitoring

### 2. User Management
- Role-based Access Control
  - Network Administrator
  - Department Staff
- Password Management
- Department Assignment

### 3. Monitoring and Analytics
- Real-time Network Monitoring
- Usage Statistics Collection
- Performance Metrics
- Analytical Reports Generation
  - Daily Reports
  - Weekly Reports
  - Monthly Reports

### 4. Reporting System
- IP Report Details
- Network Usage Reports
- Performance Reports
- Analytics Reports
- Most Visited Websites
- Department-wise Usage Statistics

## Technical Requirements

### 1. Software Requirements
- **Backend**:
  - Python
  - OpenFlow SDN Controller
  - RESTful API Framework
  - Database Management System

- **Frontend**:
  - Modern Web Framework
  - Real-time Data Visualization
  - Responsive Design

### 2. Hardware Requirements
- PC/Laptop for Development
- Network Infrastructure:
  - Switches
  - Routers
  - Wireless Access Points
  - Servers

## Technical Stack (MERN)
### Frontend
- **React.js**
  - Material-UI/Tailwind CSS for UI components
  - Redux for state management
  - Socket.io-client for real-time updates
  - Chart.js/D3.js for data visualization

### Backend
- **Node.js & Express.js**
  - RESTful API implementation
  - WebSocket server for real-time data
  - Authentication middleware
  - Rate limiting and security features

### Database
- **MongoDB**
  - User management collections
  - Network usage logs
  - Analytics data storage
  - Historical data archival

## Monitoring Parameters

### 1. Time-based Parameters
- Time of Day (hourly data)
- Day of Week patterns
- Monthly/Seasonal trends
- Historical usage patterns

### 2. User/Department Activity
- Department ID tracking
- Active user count
- Activity categorization
- Concurrent application monitoring

### 3. Bandwidth Usage Metrics
- Real-time utilization
- Historical averages
- Peak usage tracking
- Usage trend analysis

### 4. Application Usage Tracking
- Application categorization
- Data consumption metrics
- Usage frequency analysis
- Permitted application monitoring

### 5. Network Performance
- Latency monitoring
- Packet loss tracking
- Connection stability metrics
- Quality of Service (QoS) parameters

### 6. Predictive Analytics
- Usage pattern recognition
- Bandwidth forecast modeling
- Threshold violation tracking
- Trend analysis and predictions

### 7. Policy Management
- Bandwidth allocation rules
- Priority level assignments
- Time-based restrictions
- Department-specific policies

### 8. External Factors
- Environmental conditions
- Special event tracking
- Maintenance schedules
- System upgrade impacts

## Integration Components

### 1. OpenDaylight Integration
- **Purpose**: SDN Controller Implementation
- **Features**:
  - Dynamic traffic management
  - Real-time bandwidth control
  - Network policy enforcement
  - Traffic flow optimization

### 2. pfSense Integration
- **Purpose**: Network Traffic Management
- **Features**:
  - Bandwidth allocation
  - Traffic shaping rules
  - QoS implementation
  - Usage monitoring

### 3. MikroTik RouterOS
- **Purpose**: Device-level Management
- **Features**:
  - Bandwidth control
  - Application prioritization
  - Usage monitoring
  - Device configuration

## Use Cases

### 1. Network Administration
- Real-time bandwidth monitoring
- Department-wise usage tracking
- Policy implementation
- System configuration

### 2. Usage Analytics
- Bandwidth utilization analysis
- Application usage patterns
- Department performance metrics
- Predictive analytics

### 3. Resource Management
- Bandwidth allocation
- Traffic prioritization
- Application control
- User access management

### 4. Reporting System
- Automated report generation
- Custom analytics views
- Usage trend visualization
- Performance metrics tracking

## Development Timeline

### Phase 1: Setup & Infrastructure (Day 1 Morning)
1. **Backend Setup**
   - Environment Configuration
   - Database Schema Design
   - Authentication System
   - Core API Structure

2. **Frontend Foundation**
   - Project Structure Setup
   - Component Architecture
   - Authentication UI
   - Base Dashboard Layout

### Phase 2: Core Features (Day 1 Afternoon - Day 2 Morning)
1. **Network Monitoring**
   - OpenFlow Integration
   - Data Collection System
   - Real-time Monitoring
   - IP Management

2. **User Interface**
   - Dashboard Implementation
   - Network Management Interface
   - User Management System
   - Real-time Updates

### Phase 3: Analytics & Completion (Day 2 Afternoon - Day 3)
1. **Analytics Engine**
   - Data Processing
   - Report Generation
   - Statistical Analysis
   - Performance Metrics

2. **System Integration**
   - Component Integration
   - Testing
   - Deployment
   - Documentation

## Scope and Limitations

### Included
- Network usage monitoring
- IP management
- User access control
- Performance monitoring
- Analytics and reporting
- Real-time monitoring
- Department-wise tracking

### Excluded
- Internet bandwidth control
- Hardware-level network management
- External network monitoring
- Automated network troubleshooting

## Team Roles

1. **Backend Development**
   - Core system implementation
   - Database management
   - API development
   - System integration

2. **Frontend Development (Tadashi)**
   - User interface design
   - Dashboard implementation
   - Real-time updates
   - Data visualization

3. **Machine Learning (Andrea)**
   - Analytics implementation
   - Data processing
   - Statistical analysis
   - Report generation

## Success Metrics
1. System Performance
   - Response time < 2 seconds
   - Real-time data updates
   - Accurate network monitoring
   - Reliable data collection

2. User Experience
   - Intuitive interface
   - Quick access to information
   - Clear visualization
   - Easy report generation

3. Technical Goals
   - Successful SDN implementation
   - Accurate analytics
   - Secure user management
   - Reliable monitoring system
