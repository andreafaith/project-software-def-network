import { v4 as uuidv4 } from 'uuid';
import DeviceDetector from 'device-detector-js';
import Session from '../models/Session.js';
import logger from '../utils/logger.js';

class SessionManager {
    constructor() {
        this.deviceDetector = new DeviceDetector();
    }

    generateSessionId() {
        return uuidv4();
    }

    async createSession(user, req) {
        try {
            const sessionId = this.generateSessionId();
            const userAgent = req.headers['user-agent'];
            const deviceInfo = this.deviceDetector.parse(userAgent);
            const ip = req.ip;

            const sessionData = {
                userId: user._id,
                sessionId,
                email: user.email,
                role: user.role,
                deviceInfo: {
                    client: deviceInfo.client,
                    os: deviceInfo.os,
                    device: deviceInfo.device
                },
                ip,
                lastActivity: new Date(),
                createdAt: new Date()
            };

            // Create new session in MongoDB
            const session = new Session(sessionData);
            await session.save();

            return { sessionId, sessionData };
        } catch (error) {
            logger.error('Session Creation Error:', error);
            throw error;
        }
    }

    async validateSession(sessionId) {
        try {
            const session = await Session.findOne({ sessionId });
            if (!session) return null;

            // Update last activity
            session.lastActivity = new Date();
            await session.save();

            return session;
        } catch (error) {
            logger.error('Session Validation Error:', error);
            throw error;
        }
    }

    async terminateSession(userId, sessionId) {
        try {
            await Session.deleteOne({ userId, sessionId });
            return true;
        } catch (error) {
            logger.error('Session Termination Error:', error);
            throw error;
        }
    }

    async getUserSessions(userId) {
        try {
            return await Session.find({ userId }).sort({ createdAt: -1 });
        } catch (error) {
            logger.error('Get User Sessions Error:', error);
            throw error;
        }
    }

    async terminateAllUserSessions(userId, exceptSessionId = null) {
        try {
            const query = exceptSessionId 
                ? { userId, sessionId: { $ne: exceptSessionId } }
                : { userId };
                
            await Session.deleteMany(query);
            return true;
        } catch (error) {
            logger.error('Terminate All Sessions Error:', error);
            throw error;
        }
    }
}

export default new SessionManager();
