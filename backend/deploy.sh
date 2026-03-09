#!/bin/bash
# Hive Backend One-click Deployment Script
# As per project user rules, this script should be placed in /opt/hive_work/

APP_NAME="hive-backend"
IMAGE_NAME="hive-backend:latest"
PORT=8000

echo ">>> Starting deployment for $APP_NAME..."

# 1. Pull latest code (if not already handled by CI/CD)
# git pull origin main

# 2. Build the Docker image
echo ">>> Building Docker image: $IMAGE_NAME..."
docker build -t $IMAGE_NAME .

# 3. Stop and remove existing container
if [ "$(docker ps -aq -f name=$APP_NAME)" ]; then
    echo ">>> Stopping and removing old container..."
    docker stop $APP_NAME
    docker rm $APP_NAME
fi

# 4. Run the new container
echo ">>> Starting new container on port $PORT..."
docker run -d \
    --name $APP_NAME \
    --restart unless-stopped \
    -p $PORT:8000 \
    --env-file .env \
    $IMAGE_NAME

echo ">>> Deployment completed successfully!"
docker ps | grep $APP_NAME
