#!/bin/bash
# Hive Backend One-click Deployment Script
# As per project user rules, this script should be placed in /opt/hive_work/

APP_NAME="hive-backend"
IMAGE_NAME="hive-backend:latest"
PORT=8000

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Starting deployment for $APP_NAME...${NC}"

# 1. Build the Docker image
echo -e "${BLUE}>>> Building Docker image: $IMAGE_NAME...${NC}"
docker build -t $IMAGE_NAME .

# 2. Stop and remove existing container
if [ "$(docker ps -aq -f name=$APP_NAME)" ]; then
    echo -e "${BLUE}>>> Stopping and removing old container...${NC}"
    docker stop $APP_NAME
    docker rm $APP_NAME
fi

# 3. Run the new container
echo -e "${BLUE}>>> Starting new container on port $PORT...${NC}"
docker run -d \
    --name $APP_NAME \
    --restart unless-stopped \
    -p $PORT:8000 \
    --env-file .env \
    $IMAGE_NAME

# 4. Health Check
echo -e "${BLUE}>>> Waiting for container to stabilize...${NC}"
sleep 5
if [ "$(docker ps -q -f name=$APP_NAME -f status=running)" ]; then
    echo -e "${GREEN}>>> Deployment completed successfully!${NC}"
    docker ps | grep $APP_NAME
else
    echo -e "${RED}>>> Deployment FAILED! Check logs with: docker logs $APP_NAME${NC}"
    exit 1
fi
