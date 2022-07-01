#!/usr/bin/env sh

# Fail on first wrong command
set -e

# Get blocks
wget -O- http://localhost:8008/blocks
