#!/bin/bash

# TaylorDx Production Deployment Script
set -e

echo "🚀 Starting TaylorDx deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Please create one based on .env.example"
    if [ -f .env.example ]; then
        print_status "Copying .env.example to .env..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before continuing"
        exit 1
    else
        print_error ".env.example not found. Please create .env file manually"
        exit 1
    fi
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "SESSION_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    print_error "Please update your .env file and try again"
    exit 1
fi

print_success "Environment variables validated"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again"
    exit 1
fi

print_success "Docker is running"

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose is not installed. Please install it and try again"
    exit 1
fi

print_success "Docker Compose is available"

# Create necessary directories
print_status "Creating directories..."
mkdir -p nginx/ssl
mkdir -p logs

# Generate self-signed SSL certificate if not exists (for development)
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    print_warning "SSL certificates not found. Generating self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    print_success "Self-signed SSL certificates generated"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check service health
services=("postgres" "redis" "backend" "frontend")
for service in "${services[@]}"; do
    print_status "Checking $service health..."
    if docker-compose -f docker-compose.prod.yml ps $service | grep -q "healthy"; then
        print_success "$service is healthy"
    else
        print_warning "$service health check failed, checking logs..."
        docker-compose -f docker-compose.prod.yml logs --tail=20 $service
    fi
done

# Run database migrations if needed
print_status "Ensuring database schema is up to date..."
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${POSTGRES_USER:-taylordx} -d ${POSTGRES_DB:-taylordx} -f /docker-entrypoint-initdb.d/schema.sql || true

print_success "🎉 TaylorDx deployment completed!"
print_status "Services are running:"
print_status "• Frontend: https://localhost (or your configured domain)"
print_status "• Backend API: https://localhost/api"
print_status "• Health Check: https://localhost/health"

print_status "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
print_status "To stop services: docker-compose -f docker-compose.prod.yml down"

# Show first-run setup information
print_warning "📋 First-Run Setup:"
print_status "1. Visit https://localhost to access the dashboard"
print_status "2. Complete the initial admin setup at: https://localhost/api/auth/setup"
print_status "3. Use the admin credentials to log in"

echo ""
print_success "✅ Deployment complete! Happy monitoring! 🏠"