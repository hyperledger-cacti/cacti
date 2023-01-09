#!/bin/bash

while ! docker ps &> /dev/null
do
  echo "Wait for dockerd to start..."
  sleep 3
done

# Get list of images from docker-compose
for img in `ls ${FREEZE_TMP_DIR}`
do
  echo "Load frozen image '${img}'"
  tar -cC "${FREEZE_TMP_DIR}/${img}" . | docker load
done

echo "Frozen images loaded"

docker compose -f /home/supabase/docker/docker-compose.yml up