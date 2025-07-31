#!/bin/sh

# Usage: ./start-satp.sh /path/to/image.tar imagename:tag
# This script loads a Docker image and starts the SATP Hermes gateway. Pullign the imge in the container was slow, so we load it from a tar file.

IMAGE_TAR="$1"
IMAGE_TAG="$2"

if [ -z "$IMAGE_TAR" ] || [ -z "$IMAGE_TAG" ]; then
  echo "Usage: $0 /path/to/image.tar imagename:tag"
  exit 1
fi

# Wait until Docker is available
while ! docker info > /dev/null 2>&1; do
  echo "Waiting for Docker to be ready..."
  sleep 1
done

echo "Loading Docker image from $IMAGE_TAR as $IMAGE_TAG..."
docker load -i "$IMAGE_TAR"
echo "Docker image loaded."

echo "Starting Node.js gateway..."
cd /opt/cacti/satp-hermes
exec /usr/local/bin/node index.js