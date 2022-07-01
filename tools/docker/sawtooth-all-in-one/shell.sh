#!/usr/bin/env sh
# Simple helper that will proxy sawtooth commands  into shell container.

docker exec -it sawtooth-shell-default "$@"
