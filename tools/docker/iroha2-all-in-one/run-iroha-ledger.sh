#!/bin/bash

# Wait for docker
while ! docker ps &> /dev/null
do
  echo "Wait for dockerd to start..."
  sleep 3
done

# Load frozen images

for img in `find "${FREEZE_TMP_DIR}" -name "*.tar.gz"`
do
  echo "Load frozen image '${img}'"
  tar -zxf "${img}" -O | docker load
done

echo "Frozen images loaded"

# Run
docker compose -f "${APP_ROOT}/docker-compose.yml" up
