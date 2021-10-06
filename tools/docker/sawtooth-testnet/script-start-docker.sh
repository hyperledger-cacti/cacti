echo "[process] start docker environment for Sawtooth testnet"
docker network create sawtooth_net
docker-compose -f sawtooth-default.yaml up -d