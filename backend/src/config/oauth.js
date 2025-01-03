import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Update OAuth info if user exists
            user.oauth = {
                provider: 'google',
                id: profile.id,
                lastLogin: new Date()
            };
            await user.save();
            return done(null, user);
        }

        // Create new user if doesn't exist
        user = await User.create({
            email: profile.emails[0].value,
            name: profile.displayName,
            oauth: {
                provider: 'google',
                id: profile.id,
                lastLogin: new Date()
            }
        });

        done(null, user);
    } catch (error) {
        logger.error('Google OAuth error:', error);
        done(error, null);
    }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Update OAuth info if user exists
            user.oauth = {
                provider: 'github',
                id: profile.id,
                lastLogin: new Date()
            };
            await user.save();
            return done(null, user);
        }

        // Create new user if doesn't exist
        user = await User.create({
            email: profile.emails[0].value,
            name: profile.displayName || profile.username,
            oauth: {
                provider: 'github',
                id: profile.id,
                lastLogin: new Date()
            }
        });

        done(null, user);
    } catch (error) {
        logger.error('GitHub OAuth error:', error);
        done(error, null);
    }
}));

export default passport;
