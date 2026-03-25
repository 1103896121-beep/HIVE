#!/bin/bash
# Hive Backend One-click Deployment Script
# As per project user rules, this script should be placed in /opt/hive_work/

APP_NAME="HIVE"

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Starting deployment for $APP_NAME...${NC}"

# 1. Check for .env file
if [ ! -f .env ]; then
    echo -e "${RED}>>> ERROR: .env file not found. Please create one based on .env.production.sample${NC}"
    exit 1
fi

# 1.5 Safe Guard: Check if ports are already in use on the host
# Extract ports or set defaults
source .env
BACKEND_PORT=${BACKEND_PORT:-7777}
DB_PORT=${DB_PORT:-6666}

check_port() {
    local port=$1
    # Try to use ss or netstat depending on what's available
    if command -v ss &> /dev/null && ss -tuln | grep -q ":$port "; then
        echo -e "${RED}>>> ERROR: Port $port is already in use on this server. Please change it in .env to avoid conflicting with other applications!${NC}"
        exit 1
    elif command -v netstat &> /dev/null && netstat -tuln | grep -q ":$port "; then
        echo -e "${RED}>>> ERROR: Port $port is already in use on this server. Please change it in .env to avoid conflicting with other applications!${NC}"
        exit 1
    fi
}

echo -e "${BLUE}>>> Checking port availability for isolation (Backend: $BACKEND_PORT, DB: $DB_PORT)...${NC}"
check_port $BACKEND_PORT
check_port $DB_PORT

# 2. Deploy using Docker Compose
echo -e "${BLUE}>>> Deploying using docker-compose...${NC}"
# Use standard docker-compose to build and start detached, enforcing project name to avoid conflicts
docker-compose --env-file .env -p $APP_NAME up -d --build

# 3. Health Check
echo -e "${BLUE}>>> Waiting for containers to stabilize...${NC}"
sleep 5
# Check if backend container is up
if docker-compose -p $APP_NAME ps | grep -q "Up"; then
    echo -e "${GREEN}>>> Deployment completed successfully!${NC}"
    docker-compose -p $APP_NAME ps
else
    echo -e "${RED}>>> Deployment FAILED or containers not stable! Check logs with: docker-compose -p $APP_NAME logs${NC}"
    exit 1
fi
