# Security Practices & Standards
## Docker Dashboard - Comprehensive Security Guide

**Version**: 1.0  
**Last Updated**: 2025-08-06  
**Classification**: Internal Security Guidelines

---

## Table of Contents

1. [Overview](#overview)
2. [Secret Management Standards](#secret-management-standards)
3. [Environment Configuration](#environment-configuration)
4. [API Key & Token Security](#api-key--token-security)
5. [Database Security](#database-security)
6. [Authentication & Authorization](#authentication--authorization)
7. [Network & Transport Security](#network--transport-security)
8. [Development Security Practices](#development-security-practices)
9. [Deployment Security](#deployment-security)
10. [Monitoring & Auditing](#monitoring--auditing)
11. [Incident Response](#incident-response)
12. [Security Checklist](#security-checklist)

---

## Overview

This document establishes comprehensive security standards for the Docker Dashboard project. All development, configuration, and deployment activities must adhere to these practices to ensure system security and data protection.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access rights for users and systems
3. **Zero Trust**: Never trust, always verify
4. **Fail Secure**: System should fail to a secure state
5. **Security by Design**: Security integrated from the beginning

---

## Secret Management Standards

### 🔐 Critical Rules for Secrets

#### ❌ NEVER DO
- Hardcode secrets, API keys, passwords, or tokens in source code
- Commit `.env` files or similar configuration files with secrets to version control
- Store secrets in plain text files within the repository
- Use predictable or weak default secrets
- Share secrets via insecure channels (email, chat, etc.)
- Log secrets in application logs or error messages

#### ✅ ALWAYS DO
- Use environment variables for all secrets
- Implement proper secret rotation procedures
- Use secure secret management solutions
- Generate cryptographically strong secrets
- Encrypt secrets at rest and in transit
- Implement proper access controls for secrets

### Secret Classification

| Type | Examples | Minimum Security Requirements |
|------|----------|------------------------------|
| **Critical** | JWT secrets, database passwords, private keys | External secret manager, encryption at rest, rotation every 30 days |
| **High** | API keys, service tokens | Environment variables, encryption at rest, rotation every 90 days |
| **Medium** | Session secrets, cache passwords | Environment variables, secure generation, rotation every 180 days |
| **Low** | Non-sensitive configuration | Environment variables, proper access controls |

### Secret Generation Standards

```bash
# JWT Secrets (256-bit minimum)
openssl rand -base64 32

# Database Passwords (192-bit minimum)
openssl rand -base64 24

# Session Secrets (256-bit minimum)
openssl rand -base64 32

# API Keys (custom format, high entropy)
openssl rand -hex 32
```

### Environment Variable Naming Convention

```bash
# Database secrets
DB_PASSWORD=
DB_ENCRYPTION_KEY=

# Authentication secrets
JWT_SECRET=
SESSION_SECRET=
ENCRYPTION_KEY=

# Service API keys
SERVICE_NAME_API_KEY=
SERVICE_NAME_SECRET=

# Infrastructure secrets
REDIS_PASSWORD=
SSL_PRIVATE_KEY_PATH=
```

---

## Environment Configuration

### Environment Files Security

#### Production Environment (`.env.production`)
```bash
# NEVER commit to version control
# Use external secret management
# Strong, unique secrets for each deployment

# Database Configuration
POSTGRES_PASSWORD=${SECRET_MANAGER:db_password}
POSTGRES_ENCRYPTION_KEY=${SECRET_MANAGER:db_encryption_key}

# Authentication Secrets
JWT_SECRET=${SECRET_MANAGER:jwt_secret}
SESSION_SECRET=${SECRET_MANAGER:session_secret}

# Service Configuration
API_URL=https://your-production-domain.com
CORS_ORIGIN=https://your-production-domain.com
```

#### Development Environment (`.env.development.example`)
```bash
# Commit ONLY the example file
# Developers copy and populate with dev secrets

# Database Configuration
POSTGRES_PASSWORD=dev_password_change_me
REDIS_PASSWORD=dev_redis_password

# Authentication Secrets (dev-only)
JWT_SECRET=dev_jwt_secret_32_chars_minimum
SESSION_SECRET=dev_session_secret_32_chars

# Development-specific settings
NODE_ENV=development
LOG_LEVEL=debug
```

### Required `.gitignore` Entries
```gitignore
# Environment files
.env
.env.local
.env.production
.env.production.local

# SSL certificates and keys
*.pem
*.key
*.crt
*.p12
*.pfx

# Secret files
secrets/
config/secrets.json
**/secrets/**

# Database files
*.db
*.sqlite
*.sqlite3

# Log files with potential secrets
logs/
*.log
```

---

## API Key & Token Security

### API Key Management

#### Secure API Key Storage
```javascript
// ❌ NEVER - Hardcoded API key
const apiKey = '993ef601cb3ad31dfbefcf08a811f47cdbeb1694fd2987fc170727d1ada896ad';

// ✅ CORRECT - Environment variable
const apiKey = process.env.SERVICE_API_KEY;
if (!apiKey) {
  throw new Error('SERVICE_API_KEY environment variable is required');
}
```

#### API Key Configuration Pattern
```javascript
class ServiceConfig {
  constructor() {
    this.apiKey = this.getRequiredEnvVar('SERVICE_API_KEY');
    this.baseUrl = this.getRequiredEnvVar('SERVICE_BASE_URL');
  }

  getRequiredEnvVar(name) {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  // Secure API key validation
  validateApiKey() {
    if (this.apiKey.length < 32) {
      throw new Error('API key must be at least 32 characters');
    }
    return true;
  }
}
```

### JWT Token Security

#### Secure JWT Configuration
```javascript
class JWTService {
  constructor() {
    this.jwtSecret = this.getRequiredSecret('JWT_SECRET');
    this.validateSecretStrength(this.jwtSecret);
  }

  validateSecretStrength(secret) {
    if (secret.length < 32) {
      throw new Error('JWT secret must be at least 256 bits (32 characters)');
    }
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      {
        expiresIn: '7d',
        issuer: 'taylordx-dashboard',
        audience: 'taylordx-users',
        algorithm: 'HS256'
      }
    );
  }
}
```

---

## Database Security

### Connection Security

#### Secure Database Configuration
```javascript
// ❌ NEVER - Hardcoded connection string
const connectionString = 'postgresql://user:password@localhost:5432/db';

// ✅ CORRECT - Environment variables with validation
class DatabaseConfig {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = parseInt(process.env.DB_PORT) || 5432;
    this.database = process.env.DB_NAME || this.getRequiredEnvVar('POSTGRES_DB');
    this.username = this.getRequiredEnvVar('POSTGRES_USER');
    this.password = this.getRequiredEnvVar('POSTGRES_PASSWORD');
    
    // SSL configuration for production
    this.ssl = process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA
    } : false;
  }

  getConnectionConfig() {
    return {
      host: this.host,
      port: this.port,
      database: this.database,
      user: this.username,
      password: this.password,
      ssl: this.ssl,
      // Security settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
}
```

### Password Security

#### Secure Password Hashing
```javascript
class PasswordService {
  constructor() {
    this.saltRounds = 12; // Minimum for production
    this.minPasswordLength = 12;
  }

  async hashPassword(password) {
    this.validatePasswordStrength(password);
    return await bcrypt.hash(password, this.saltRounds);
  }

  validatePasswordStrength(password) {
    if (password.length < this.minPasswordLength) {
      throw new Error(`Password must be at least ${this.minPasswordLength} characters`);
    }
    
    // Additional complexity checks
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
    }
  }
}
```

---

## Authentication & Authorization

### Session Security

#### Secure Session Configuration
```javascript
// Production session configuration
app.use(session({
  secret: process.env.SESSION_SECRET, // Required, no fallback
  name: 'taylordx.sid', // Custom session name
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 24 * 60 * 60 // 24 hours
  })
}));
```

### Role-Based Access Control

#### Secure RBAC Implementation
```javascript
class RBACService {
  constructor() {
    this.roleHierarchy = {
      'readonly': 1,
      'user': 2,
      'admin': 3
    };
    
    this.permissions = {
      'readonly': ['read'],
      'user': ['read', 'write'],
      'admin': ['read', 'write', 'delete', 'manage']
    };
  }

  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!req.user) {
        return this.sendSecureError(res, 401, 'AUTHENTICATION_REQUIRED');
      }

      const userLevel = this.roleHierarchy[req.user.role] || 0;
      const requiredLevel = this.roleHierarchy[requiredRole] || 999;

      if (userLevel < requiredLevel) {
        return this.sendSecureError(res, 403, 'INSUFFICIENT_PRIVILEGES');
      }

      next();
    };
  }

  sendSecureError(res, status, code) {
    res.status(status).json({
      success: false,
      error: 'Access denied',
      code: code
      // No detailed error messages to prevent information disclosure
    });
  }
}
```

---

## Network & Transport Security

### HTTPS Configuration

#### SSL/TLS Security
```javascript
// HTTPS enforcement middleware
const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

// Security headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### CORS Security

#### Secure CORS Configuration
```javascript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    
    // Allow same-origin requests
    if (!origin) return callback(null, true);
    
    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};
```

---

## Development Security Practices

### Code Security Guidelines

#### Secure Coding Patterns

```javascript
// ❌ AVOID - Information disclosure in errors
catch (error) {
  res.status(500).json({
    error: error.message, // May expose sensitive information
    stack: error.stack    // Definitely exposes sensitive information
  });
}

// ✅ CORRECT - Secure error handling
catch (error) {
  logger.error('Operation failed', { 
    error: error.message, 
    stack: error.stack,
    user: req.user?.id,
    action: 'operation_name'
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'OPERATION_FAILED'
    // No sensitive details exposed to client
  });
}
```

#### Input Validation & Sanitization
```javascript
const { body, validationResult } = require('express-validator');

// Secure input validation
const validateUserInput = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-50 characters, alphanumeric, underscore, or hyphen only'),
  
  body('password')
    .isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must meet complexity requirements'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address required')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'INVALID_INPUT'
      // Don't expose detailed validation errors
    });
  }
  next();
};
```

### Dependency Security

#### Package Security Management
```json
{
  "scripts": {
    "audit": "npm audit",
    "audit-fix": "npm audit fix",
    "security-check": "npm audit --audit-level moderate",
    "outdated": "npm outdated"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

---

## Deployment Security

### Container Security

#### Secure Dockerfile Practices
```dockerfile
# Use specific, minimal base image
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . .

# Remove unnecessary files
RUN rm -rf docs/ tests/ *.md

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "index.js"]
```

#### Docker Compose Security
```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DB_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - jwt_secret
      - db_password
    networks:
      - app_internal
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app_internal

secrets:
  jwt_secret:
    external: true
  db_password:
    external: true

networks:
  app_internal:
    driver: bridge
    internal: true

volumes:
  db_data:
    driver: local
```

---

## Monitoring & Auditing

### Security Logging

#### Comprehensive Security Logging
```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'security.log',
      level: 'warn' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security event logging
const logSecurityEvent = (event, req, additionalData = {}) => {
  securityLogger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    username: req.user?.username,
    url: req.originalUrl,
    method: req.method,
    ...additionalData
  });
};

// Usage examples
logSecurityEvent('FAILED_LOGIN_ATTEMPT', req, { username });
logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', req, { requiredRole, userRole });
logSecurityEvent('SUSPICIOUS_ACTIVITY', req, { reason: 'Multiple failed attempts' });
```

### Security Metrics

#### Key Security Metrics to Monitor
```javascript
const securityMetrics = {
  // Authentication metrics
  loginAttempts: new Map(),
  failedLogins: new Map(),
  suspiciousIPs: new Set(),
  
  // Authorization metrics
  unauthorizedAccess: new Map(),
  privilegeEscalationAttempts: 0,

  // System metrics
  secretRotationDue: new Date(),
  certificateExpiry: new Date(),
  lastSecurityAudit: new Date()
};

// Rate limiting for security
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## Incident Response

### Security Incident Response Plan

#### Immediate Response Actions
1. **Detection**: Monitor security logs and alerts
2. **Assessment**: Determine severity and scope
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze attack vectors and impact
5. **Recovery**: Restore systems securely
6. **Lessons Learned**: Update security practices

#### Emergency Procedures
```bash
# Immediate secret rotation script
#!/bin/bash
echo "🚨 SECURITY INCIDENT - ROTATING SECRETS 🚨"

# Generate new secrets
NEW_JWT_SECRET=$(openssl rand -base64 32)
NEW_SESSION_SECRET=$(openssl rand -base64 32)
NEW_DB_PASSWORD=$(openssl rand -base64 24)

# Update environment
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret="$NEW_JWT_SECRET" \
  --from-literal=session-secret="$NEW_SESSION_SECRET" \
  --from-literal=db-password="$NEW_DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart all pods
kubectl rollout restart deployment/app

echo "✅ Secrets rotated and services restarted"
```

---

## Security Checklist

### Pre-Deployment Security Checklist

#### Code Security
- [ ] No hardcoded secrets, passwords, or API keys
- [ ] All secrets use environment variables
- [ ] Input validation implemented for all user inputs
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection implemented
- [ ] CSRF protection enabled
- [ ] Secure error handling (no information disclosure)
- [ ] Dependencies updated and audited
- [ ] Security linting passed

#### Configuration Security
- [ ] Strong, unique secrets generated
- [ ] `.env` files not committed to version control
- [ ] HTTPS enforced in production
- [ ] Secure CORS configuration
- [ ] Security headers configured
- [ ] Session security properly configured
- [ ] Database connections secured with SSL
- [ ] Rate limiting implemented

#### Infrastructure Security
- [ ] Containers run as non-root user
- [ ] Minimal base images used
- [ ] Security updates applied
- [ ] Network segmentation implemented
- [ ] Secrets management solution configured
- [ ] Monitoring and logging enabled
- [ ] Backup and recovery procedures tested
- [ ] SSL certificates valid and not expiring soon

#### Access Control
- [ ] Role-based access control implemented
- [ ] Principle of least privilege applied
- [ ] Authentication required for all sensitive operations
- [ ] Admin access properly secured
- [ ] Service accounts use minimal permissions
- [ ] API endpoints properly protected

---

## Conclusion

Security is everyone's responsibility. These practices must be followed consistently across all aspects of the Docker Dashboard project. Regular security reviews, updates to these practices, and team training are essential for maintaining a strong security posture.

### Key Takeaways

1. **Never hardcode secrets** - Always use environment variables
2. **Generate strong secrets** - Use cryptographically secure random generation
3. **Rotate secrets regularly** - Implement automated rotation where possible
4. **Monitor and log security events** - Early detection is crucial
5. **Keep dependencies updated** - Regular security updates are essential
6. **Follow the principle of least privilege** - Minimize access rights
7. **Implement defense in depth** - Multiple layers of security

### Resources

- [OWASP Top 10 Application Security Risks](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Document Status**: Active  
**Next Review**: 2025-11-06  
**Approved By**: Security Team  
**Version History**: v1.0 - Initial creation