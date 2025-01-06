import logger from '../utils/logger.js';

const SQL_INJECTION_PATTERNS = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /UNION\s+ALL\s+SELECT/i,
    /UNION\s+SELECT/i,
    /;\s*SELECT\s+.*\s+FROM/i,  // Only match if preceded by semicolon
    /;\s*INSERT\s+INTO/i,
    /;\s*DELETE\s+FROM/i,
    /;\s*DROP\s+TABLE/i,
    /;\s*ALTER\s+TABLE/i,
    /;\s*TRUNCATE\s+TABLE/i,
    /;\s*UPDATE\s+.*\s+SET/i
];

const SAFE_PATTERNS = [
    /^[A-Za-z]+\'[A-Za-z]+$/,  // Names like O'Connor, d'Angelo
    /^[A-Za-z]+\'s$/,          // Possessive form
    /^[A-Za-z]+\-[A-Za-z]+$/,  // Hyphenated names
    /^[A-Za-z]+\.[A-Za-z]+$/,  // Abbreviated names
    /^[A-Za-z]+\s+[A-Za-z\']+$/, // Full names with apostrophes
    /^[\w\s\-\'\.]+$/         // General text with safe special chars
];

const checkForSQLInjection = (value) => {
    if (typeof value !== 'string') return false;
    
    // Check if it matches any safe patterns first
    if (SAFE_PATTERNS.some(pattern => pattern.test(value))) {
        return false;
    }
    
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
};

const validateObject = (obj) => {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                if (validateObject(value)) return true;
            } else if (checkForSQLInjection(value)) {
                return true;
            }
        }
    }
    return false;
};

export const sqlInjectionPrevention = (req, res, next) => {
    try {
        // Check URL parameters
        if (validateObject(req.params)) {
            logger.warn(`SQL Injection attempt detected in URL parameters from IP: ${req.ip}`);
            return res.status(400).json({ error: 'Invalid input detected in URL parameters' });
        }

        // Check query parameters
        if (validateObject(req.query)) {
            logger.warn(`SQL Injection attempt detected in query parameters from IP: ${req.ip}`);
            return res.status(400).json({ error: 'Invalid input detected in query parameters' });
        }

        // Check request body
        if (req.body && validateObject(req.body)) {
            logger.warn(`SQL Injection attempt detected in request body from IP: ${req.ip}`);
            return res.status(400).json({ error: 'Invalid input detected in request body' });
        }

        // Check headers (excluding some standard headers)
        const headers = { ...req.headers };
        delete headers['user-agent'];
        delete headers['accept'];
        delete headers['accept-encoding'];
        delete headers['accept-language'];
        delete headers['connection'];
        delete headers['host'];
        delete headers['referer'];
        delete headers['cookie'];

        if (validateObject(headers)) {
            logger.warn(`SQL Injection attempt detected in headers from IP: ${req.ip}`);
            return res.status(400).json({ error: 'Invalid input detected in headers' });
        }

        next();
    } catch (error) {
        logger.error('Error in SQL injection prevention middleware:', error);
        next(error);
    }
};
