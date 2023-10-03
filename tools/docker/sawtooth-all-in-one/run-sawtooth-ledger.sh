#!/bin/sh

# Wait for docker
while ! docker ps &> /dev/null
do
  echo "Wait for dockerd to start..."
  sleep 3
done

# Run
docker compose -f "${APP_ROOT}/docker-compose.yaml" up