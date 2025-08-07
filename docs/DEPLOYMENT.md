# TaylorDx Production Deployment Guide

This guide covers deploying TaylorDx in production with proper security, SSL, and monitoring.

## Quick Start

1. **Clone and configure:**
   ```bash
   git clone <repository-url>
   cd docker-dashboard
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Deploy:**
   ```bash
   ./deploy.sh
   ```

3. **Access:** Visit `https://localhost` and complete the first-run setup.

## Prerequisites

- Docker & Docker Compose
- OpenSSL (for SSL certificate generation)
- 2GB+ RAM
- 10GB+ disk space

## Configuration

### Environment Variables (.env)

```bash
# Database
POSTGRES_DB=taylordx
POSTGRES_USER=taylordx
POSTGRES_PASSWORD=your-secure-password-here

# Redis
REDIS_PASSWORD=your-redis-password-here

# Authentication (generate secure 256-bit keys)
JWT_SECRET=your-jwt-secret-256-bits
SESSION_SECRET=your-session-secret-256-bits

# Domain
API_URL=https://your-domain.com
```

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

## SSL Configuration

### Self-Signed Certificates (Development)
The deployment script automatically generates self-signed certificates.

### Production Certificates
Replace the generated certificates with proper SSL certificates:

```bash
# Copy your certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem

# Restart to apply
docker-compose -f docker-compose.prod.yml restart nginx
```

### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*.pem
```

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Internet  │────│    Nginx    │────│  Frontend   │
└─────────────┘    │ (SSL + LB)  │    │  (React)    │
                   └─────────────┘    └─────────────┘
                          │
                   ┌─────────────┐
                   │   Backend   │
                   │  (Node.js)  │
                   └─────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ PostgreSQL  │ │    Redis    │ │ Docker API  │
    │ (Database)  │ │  (Sessions) │ │ (Containers)│
    └─────────────┘ └─────────────┘ └─────────────┘
```

## Security Features

### Network Security
- **Internal network:** Database and Redis isolated
- **External network:** Only nginx exposed to internet
- **Rate limiting:** API and login endpoints protected

### Application Security
- **Authentication:** JWT tokens with secure secrets
- **Password hashing:** bcrypt with 12 salt rounds
- **HTTPS only:** SSL/TLS encryption
- **Security headers:** HSTS, XSS protection, etc.
- **Non-root containers:** All services run as non-root users

### Data Security
- **Encrypted storage:** Database and Redis data encrypted at rest
- **Secure sessions:** HTTP-only, secure cookies
- **Input validation:** All API inputs validated

## Monitoring & Logs

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# With timestamps
docker-compose -f docker-compose.prod.yml logs -f -t
```

### Health Checks
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
curl -k https://localhost/health
curl -k https://localhost/api/health
```

### Performance Monitoring
- **Container stats:** `docker-compose -f docker-compose.prod.yml stats`
- **Disk usage:** `docker system df`
- **Network usage:** Check nginx logs in `nginx/logs/`

## Backup & Recovery

### Database Backup
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U taylordx taylordx > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U taylordx taylordx < backup_file.sql
```

### Volume Backup
```bash
# Backup all volumes
docker run --rm -v docker-dashboard_postgres_data:/data \
  -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

docker run --rm -v docker-dashboard_redis_data:/data \
  -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .
```

## Scaling

### Horizontal Scaling
```yaml
# Add to docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
  
  nginx:
    # Update upstream configuration
```

### Resource Limits
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check environment
docker-compose -f docker-compose.prod.yml config

# Rebuild if needed
docker-compose -f docker-compose.prod.yml build --no-cache service-name
```

**Database connection failed:**
```bash
# Check postgres is healthy
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U taylordx -d taylordx -c "SELECT 1;"
```

**SSL certificate issues:**
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Regenerate self-signed cert
rm nginx/ssl/*.pem
./deploy.sh
```

### Performance Issues

**High memory usage:**
```bash
# Check container stats
docker stats

# Reduce memory if needed
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

**Slow database queries:**
```bash
# Enable query logging
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U taylordx -d taylordx -c "ALTER SYSTEM SET log_statement = 'all';"
```

## Updates

### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Security Updates
```bash
# Update base images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Support

- **Documentation:** Check `/docs` directory
- **Logs:** Use `docker-compose logs` for debugging
- **Health:** Monitor `/health` endpoints
- **Issues:** Report bugs via GitHub issues

---

**⚠️ Security Note:** Always use strong passwords, keep certificates updated, and monitor logs for suspicious activity in production environments.