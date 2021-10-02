#!/bin/sh

mkdir indy_pool/sandbox
chown 1000:1000 indy_pool/sandbox

cp -r ../../../packages-python/cactus_validator_socketio/ validator/
cp validator/requirements.txt validator/cactus_validator_socketio/validator-python/
