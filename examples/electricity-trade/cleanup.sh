docker stop sawtooth-shell-default
docker stop sawtooth-settings-tp-default
docker stop sawtooth-xo-tp-python-default
docker stop sawtooth-devmode-engine-rust-default
docker stop sawtooth-rest-api-default
docker stop sawtooth-intkey-tp-python-default
docker stop sawtooth-validator-default
docker stop geth1

docker rm sawtooth-shell-default
docker rm sawtooth-settings-tp-default
docker rm sawtooth-xo-tp-python-default
docker rm sawtooth-devmode-engine-rust-default
docker rm sawtooth-rest-api-default
docker rm sawtooth-intkey-tp-python-default
docker rm sawtooth-validator-default
docker rm geth1

sudo rm -R ../../tools/docker/geth-testnet/data-geth1/geth
sudo rm ../../tools/docker/geth-testnet/data-geth1/geth.ipc*
sudo rm -R ./node_modules
