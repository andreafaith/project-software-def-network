import xss from 'xss';

const XSS_PATTERNS = [
  /<script\b[^>]*>(.*?)<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>(.*?)<\/iframe>/gi,
  /<embed\b[^>]*>(.*?)<\/embed>/gi,
  /<object\b[^>]*>(.*?)<\/object>/gi,
  /data:/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi
];

const containsXSS = (value) => {
  if (typeof value !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(value));
};

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return xss(value, {
      whiteList: {}, // Disable all tags
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }
  return value;
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  
  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }
  
  return sanitized;
};

const checkObject = (obj) => {
  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      if (checkObject(value)) return true;
    } else if (containsXSS(value)) {
      return true;
    }
  }
  return false;
};

export const xssPrevention = (req, res, next) => {
  try {
    // Check and sanitize query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      if (checkObject(req.query)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Potential XSS attack detected in query parameters'
        });
      }
      req.query = sanitizeObject(req.query);
    }

    // Check and sanitize request body
    if (req.body && Object.keys(req.body).length > 0) {
      if (checkObject(req.body)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Potential XSS attack detected in request body'
        });
      }
      req.body = sanitizeObject(req.body);
    }

    // Check and sanitize URL parameters
    if (req.params && Object.keys(req.params).length > 0) {
      if (checkObject(req.params)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Potential XSS attack detected in URL parameters'
        });
      }
      req.params = sanitizeObject(req.params);
    }

    // Add security headers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      message: 'Error processing request'
    });
  }
};
