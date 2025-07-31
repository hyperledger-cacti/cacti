#!/bin/sh

# Load a Docker image tarball
# Usage: ./load-docker-image.sh /path/to/image.tar <image-tag>

set -e

IMAGE_TAR="$1"
IMAGE_TAG="$2"

if [ -z "$IMAGE_TAR" ]; then
  echo "Usage: $0 /path/to/image.tar <image-tag>"
  exit 1
fi

if [ ! -f "$IMAGE_TAR" ]; then
  echo "Error: File not found: $IMAGE_TAR"
  exit 1
fi

while ! docker info > /dev/null 2>&1; do
  sleep 1
done

echo "Loading image from $IMAGE_TAR..."
docker import "$IMAGE_TAR" "$IMAGE_TAG"

echo "Docker image loaded successfully."