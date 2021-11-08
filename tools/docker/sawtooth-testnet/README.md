<!--
 Copyright 2020 Cactus contributors
 SPDX-License-Identifier: Apache-2.0

 README.md
-->

# A tool to launch Sawtooth docker containers

## Abstract
- Modules to launch Sawtooth docker containers

## How to build
- Execute the following command, then the docker containers will be launched.
	```
	./script-start-docker.sh
	```
- If the following containers appear when you display the container list with the command `docker ps`, it will be fine.
	```
	CONTAINER ID        IMAGE                                                                                                    COMMAND                  CREATED              STATUS              PORTS                                                    NAMES
	6fe03a6e1716        hyperledger/sawtooth-shell:nightly                 "bash -c 'sawtooth k…"   4 hours ago         Up 4 hours          4004/tcp, 8008/tcp                                       sawtooth-shell-default
	c5bbe6ea9904        hyperledger/sawtooth-settings-tp:nightly           "settings-tp -vv -C …"   4 hours ago         Up 4 hours          4004/tcp                                                 sawtooth-settings-tp-default
	016eaa658ed2        hyperledger/sawtooth-intkey-tp-python:nightly      "intkey-tp-python -v…"   4 hours ago         Up 4 hours          4004/tcp                                                 sawtooth-intkey-tp-python-default
	95b77877b672        hyperledger/sawtooth-xo-tp-python:nightly          "xo-tp-python -vv -C…"   4 hours ago         Up 4 hours          4004/tcp                                                 sawtooth-xo-tp-python-default
	1d7ecbc5b84d        hyperledger/sawtooth-rest-api:nightly              "sawtooth-rest-api -…"   4 hours ago         Up 4 hours          4004/tcp, 0.0.0.0:8008->8008/tcp                         sawtooth-rest-api-default
	b44ffa3b385f        hyperledger/sawtooth-devmode-engine-rust:nightly   "devmode-engine-rust…"   4 hours ago         Up 4 hours                                                                   sawtooth-devmode-engine-rust-default
	8f50d8fbe985        hyperledger/sawtooth-validator:nightly             "bash -c 'sawadm key…"   4 hours ago         Up 4 hours          0.0.0.0:4004->4004/tcp                                   sawtooth-validator-default
	```

## Note
- This directory referenced the minimum files (*.yaml on this repository) for Sawtooth ledger construction from the following repository:
	- [Hyperledger/sawtooth-core v1-3 (/docker/compose)](https://github.com/hyperledger/sawtooth-core/tree/1-3/docker/compose)