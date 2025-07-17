# Security Improvements for Realm Rivalry

## Priority 1: Critical Fixes (Implement Immediately)

### 1. Fix CORS Configuration
**Current Risk**: Wildcard CORS allows any domain access
**Location**: `server/index.ts` line 25

```javascript
// REPLACE THIS:
res.header('Access-Control-Allow-Origin', '*');

// WITH THIS:
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://your-domain.replit.app'] 
  : ['http://localhost:5000', 'https://*.replit.dev'];
  
const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.header('Access-Control-Allow-Origin', origin);
}
```

### 2. Implement Rate Limiting
**Risk**: API abuse and DDoS attacks
**Solution**: Add rate limiting middleware

```javascript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
```

### 3. Remove Production Console Logs
**Risk**: Sensitive data exposure
**Solution**: Use environment-based logging

```javascript
// Create logger utility
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, data);
    }
  },
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(message, error);
    }
    // In production, send to error tracking service
  }
};
```

## Priority 2: Important Improvements

### 4. Add XSS Protection
**Risk**: Cross-site scripting attacks
**Solution**: Sanitize user inputs

```javascript
// Install: npm install dompurify jsdom
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input);
};
```

### 5. Enhanced Error Handling
**Risk**: Information disclosure
**Solution**: Generic error messages for users

```javascript
// In production, return generic errors
const handleError = (error: Error, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: error.message });
  }
  // Log detailed error securely
  logger.error('Server error:', error);
};
```

### 6. Add Security Headers
**Risk**: Various web vulnerabilities
**Solution**: Use helmet middleware

```javascript
// Install: npm install helmet
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## Priority 3: Additional Security Measures

### 7. Input Validation Enhancement
Add validation for all user inputs:

```javascript
// Add to existing Zod schemas
const secureStringSchema = z.string()
  .min(1)
  .max(1000)
  .regex(/^[a-zA-Z0-9\s\-_.,!?]+$/, 'Invalid characters detected');
```

### 8. Database Security
- ✅ Already using Prisma (prevents SQL injection)
- ✅ Environment variables for connection
- Consider: Database connection pooling limits

### 9. Authentication Security
- ✅ Using Replit Auth (OAuth)
- ✅ Session management with PostgreSQL
- Consider: Session timeout and rotation

### 10. Monitoring and Logging
Implement security monitoring:

```javascript
// Track failed authentication attempts
// Monitor unusual API usage patterns  
// Log security events
```

## Implementation Timeline

**Week 1**: 
- Fix CORS configuration
- Add rate limiting
- Remove production console logs

**Week 2**:
- Add XSS protection
- Implement security headers
- Enhanced error handling

**Week 3**:
- Security monitoring
- Code review for additional vulnerabilities
- Penetration testing

## Security Checklist

- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Production logging secured
- [ ] XSS protection added
- [ ] Security headers enabled
- [ ] Error handling improved
- [ ] Input validation enhanced
- [ ] Database security verified
- [ ] Authentication security reviewed
- [ ] Monitoring implemented

## Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)