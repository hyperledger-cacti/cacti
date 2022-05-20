# Indy Validator
- Cactus socketio validator to integrate with Hyperledger Indy

## Build
- By default, it assumes that indy pool is available at `172.16.0.2`
- You can modify this behavior by editing `Dockerfile` or by setting arg `pool_ip`
```
./setup_indy.sh
```

## Test
- Use `testcli/testsock.js` to check basic communication pattern with the validator.

### How-To
1. Start indy testnet pool (follow instructions from `../../tools/docker/indy-testnet/` README). It should create docker network `indy-testnet_indy_net`, pool should be available at `172.16.0.2`.
1. Generate proof and store it in local `/etc/cactus`:
    ```
    rm -r /etc/cactus/validator_socketio_indy/*
    cd ../../examples/register-indy-data/
    ./script-build-docker.sh
    docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="host" register-indy-data --proof_only
    ```
1. Copy indy validator config
    ```
    cp -rf ./config/* /etc/cactus/validator_socketio_indy/
    ```
1. Generate validator certificate using OpenSSL tool
    ```
    mkdir -p "/etc/cactus/validator_socketio_indy/CA/"
    openssl ecparam -genkey -name "prime256v1" -out "/etc/cactus/validator_socketio_indy/CA/connector.priv"
    openssl req -new -sha256 -key "/etc/cactus/validator_socketio_indy/CA/connector.priv" \
        -out "/etc/cactus/validator_socketio_indy/CA/connector.csr" \
        -subj "/C=JP/ST=Tokyo/L=Minato-Ku/O=CactusSamples/CN=IndyValidator"
    openssl req -x509 -sha256 -days 365 -key "/etc/cactus/validator_socketio_indy/CA/connector.priv" \
        -in "/etc/cactus/validator_socketio_indy/CA/connector.csr" \
        -out "/etc/cactus/validator_socketio_indy/CA/connector.crt"
    ```
1. Build and run validator container:
    ```
    docker build . -t indy-validator

    docker run -v/etc/cactus/:/etc/cactus --rm --net="indy-testnet_indy_net" -p 10080:8000 indy-validator
    ```
1. Open separate console, install dependencies and run the testing script:
    ```
    cd testcli/
    ln -s /etc/cactus/validator_socketio_indy/CA/connector.crt .
    npm install
    node testsock.js
    ```

    Output should look like this:
    ```
    connect
    AVE5voPzdLLEcm5kAAAD
    websocket
    call nop!
    call request2. get schema request.
    #[recv]response, res: [object Object]
    call verify()
    ##signsignature: ....
    Authentication OK
    ##decoded: {
    result: [
        'Apyv5EV88KoZRqtXMmaeXV:2:Job-Certificate:0.2',
        '{"ver":"1.0","id":"Apyv5EV88KoZRqtXMmaeXV:2:Job-Certificate:0.2","name":"Job-Certificate","version":"0.2","attrNames":["experience","last_name","salary","first_name","employee_status"],"seqNo":19}'
    ]
    }
    OK - Done.
    ```

## Manual Test
- Validator used by `cactus-example-discounted-asset-trade` sample app.
