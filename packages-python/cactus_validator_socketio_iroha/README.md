# Socket.io-typed Validator for Iroha

## Features

This validator codes provides the following features:
- execSyncFunction (* under construction)
- sendSignedTransaction (* under construction)
- monitoring blocks

## How to test this validator

### Requirements:

- OS: Linux (Ubuntu or CentOS)
- node.js: v12
- python: v3.8
- Available port number: 5060

### How to execute test client (in the current status, only the monitor feature can be tested)

1. Launch [iroha-testnet](https://github.com/hyperledger/cactus/tree/main/tools/docker/iroha-testnet) docker and execute its wallet script
    ```
    $ cd cactus/tools/docker/iroha-testnet/
    $ docker-compose up -d
    $ cd example/iroha-wallet
    $ bash setup-iroha-wallet.sh
    ```

1. Launch validator server on the first console
    ```
    $ cd cactus/packages-python/cactus_validator_socketio_iroha/
    $ python3 -m venv .venv
    $ . .venv/bin/activate
    $ pip3 install websocket eventlet flask requests flask-socketio==5.1.1 pyyaml pyjwt cryptography iroha schedule
    $ cd ./validator-python
    $ python3 -m main
    ```
    - If there is the following message on your first console, the validator is successfully launched.

        ```
        socket port: 5060
        Server initialized for eventlet.
        ```

1. Execute test script on the second console

    ```
    $ cd cactus/packages-python/cactus_validator_socketio_iroha/testcli
    $ npm install
    $ node testsock.js
    ```

    - If there is the following message on your second console, the block monitoring request is successfully executed.

        ```
        connect
        81680a4dc06a4685b8219b22fd002023
        polling
        call nop!
        ##exec requestStartMonitor()
        ```

    - After this request is executed, the messages about monitoring blocks (`##get_block block num is : n`) will appear on your first console.

        ```
        81680a4dc06a4685b8219b22fd002023: Sending packet OPEN data {'sid': '81680a4dc06a4685b8219b22fd002023', 'upgrades': ['websocket'], 'pingTimeout': 60000, 'pingInterval': 25000}
        on connect (sessionid: 81680a4dc06a4685b8219b22fd002023)
        ##called getValidatorInstance()
        ##IrohaConnector.__init__
        81680a4dc06a4685b8219b22fd002023: Sending packet MESSAGE data 0
        81680a4dc06a4685b8219b22fd002023: Received request to upgrade to websocket
        81680a4dc06a4685b8219b22fd002023: Received packet MESSAGE data 2["test-event"]
        received event "test-event" from 81680a4dc06a4685b8219b22fd002023 [/]
        ##IrohaConnector.cb()
        81680a4dc06a4685b8219b22fd002023: Upgrade to websocket successful
        81680a4dc06a4685b8219b22fd002023: Received packet MESSAGE data 2["nop"]
        received event "nop" from 81680a4dc06a4685b8219b22fd002023 [/]
        received nop
        ##IrohaConnector.nop()
        81680a4dc06a4685b8219b22fd002023: Received packet MESSAGE data 2["startMonitor"]
        received event "startMonitor" from 81680a4dc06a4685b8219b22fd002023 [/]
        on startMonitor
        ##called monitoring_routine()
        ##get_block block num is : 1
        ##get_block block num is : 2
        ##get_block block num is : 3
        ...
        ##get_block block num is : 12
        ```

    - After 180 seconds on the second console, run requestStopMonitor and the test script will stop running.

        ```
        ##exec requestStopMonitor()
        ```
