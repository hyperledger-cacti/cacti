#!/usr/bin/env sh

echo "# Create /tmp/indy-all-in-one/"
mkdir -p "/tmp/indy-all-in-one/"

echo "# Start docker environment for Indy all-in-one"
docker-compose build && docker-compose up -d

echo "# OK"