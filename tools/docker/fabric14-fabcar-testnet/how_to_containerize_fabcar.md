# How to Containerize Fabcar

#### Background

- You need to work fabcar to use cartrade, but it may not work outside centos.

#### Goal

- make fabcar work regardless of the environment by making it a docker container,
  - where "work fabcar" means "use registerUser, query, invoke".

#### System Requirement

- node version: 14.18.0 (node image version of validator container: 14.18.1)

#### Abstruct of modification

- change to fabcar v1.4.12
- add validator container (modify docker-compose and use node image)
- change `localhost` to the IP address of your environment

#### Detail of modification

- Change the specified version on line 4 of `/ cactus/tools/docker/fabric 14 -fabcar-testnet/script-start-docker.sh` from` 1.4.1 1.4.1 0.4.22 `to` 1.4.12 1.4.9 0.4.22 `,

  - i.e. `curl -sSL https://bit.ly/2ysbOFE | bash -s -- 1.4.12 1.4.9 0.4.22`.

- Add the following to the end of `/cactus/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/docker-compose-cli.yml`;

  - ```
    validator:
        container_name: validator
        image: node:14.18.1
        tty: true
        stdin_open: true
        environment: 
          - http_proxy=$http_proxy
          - https_proxy=$https_proxy
          - HTTP_PROXY=$HTTP_PROXY
          - HTTPS_PROXY=$HTTPS_PROXY
          - ftp_proxy=$ftp_proxy
          - FTP_PROXY=$FTP_PROXY
          - no_proxy=localhost,127.0.0.1
          - NO_PROXY=localhost,127.0.0.1
        volumes:
          - ./:/app/first-network
          - ../fabcar:/app/fabcar
        working_dir: /app
        command: /bin/bash
        depends_on:
          - cli
          - orderer.example.com
          - peer0.org1.example.com
          - peer1.org1.example.com
          - peer0.org2.example.com
          - peer1.org2.example.com
        networks:
          - byfn
    ```

- Result

  ```
  [user002@earth fabric14-fabcar-testnet]$ cd fabric-samples/fabcar
  [user002@earth fabcar]$ ./startFabric.sh
  Stopping for channel 'mychannel' with CLI timeout of '10' seconds and CLI delay of '3' seconds
  proceeding ...
  WARNING: The BYFN_CA1_PRIVATE_KEY variable is not set. Defaulting to a blank string.
  WARNING: The BYFN_CA2_PRIVATE_KEY variable is not set. Defaulting to a blank string.
  Removing network net_byfn
  ...
  [user002@earth fabcar]$ docker ps -a
  CONTAINER ID   IMAGE                                                                                                    COMMAND                  CREATED          STATUS          PORTS                                        NAMES
  7f87865737b7   dev-peer0.org2.example.com-fabcar-1.0-264b0a1cb5efbecaac5cf8990339c24474dc8435c6e10f10f2be565d555d0e94   "chaincode -peer.add…"   15 minutes ago   Up 15 minutes                                                dev-peer0.org2.example.com-fabcar-1.0
  79c4ab074f16   dev-peer0.org1.example.com-fabcar-1.0-5c906e402ed29f20260ae42283216aa75549c571e2e380f3615826365d8269ba   "chaincode -peer.add…"   16 minutes ago   Up 16 minutes                                                dev-peer0.org1.example.com-fabcar-1.0
  c34598d33a61   node:14.18.1                                                                                             "docker-entrypoint.s…"   16 minutes ago   Up 16 minutes                                                validator
  d83d2777ca8d   hyperledger/fabric-tools:latest                                                                          "/bin/bash"              16 minutes ago   Up 16 minutes                                                cli
  ac599af0ee86   hyperledger/fabric-peer:latest                                                                           "peer node start"        16 minutes ago   Up 16 minutes   0.0.0.0:8051->8051/tcp                       peer1.org1.example.com
  06e59d7e665a   hyperledger/fabric-peer:latest                                                                           "peer node start"        16 minutes ago   Up 16 minutes   0.0.0.0:9051->9051/tcp                       peer0.org2.example.com
  a656edbcf22a   hyperledger/fabric-peer:latest                                                                           "peer node start"        16 minutes ago   Up 16 minutes   0.0.0.0:10051->10051/tcp                     peer1.org2.example.com
  965b3de2cef7   hyperledger/fabric-peer:latest                                                                           "peer node start"        16 minutes ago   Up 16 minutes   0.0.0.0:7051->7051/tcp                       peer0.org1.example.com
  5c5ce4f71f24   hyperledger/fabric-orderer:latest                                                                        "orderer"                17 minutes ago   Up 16 minutes   0.0.0.0:7050->7050/tcp                       orderer.example.com
  a981e8ba06ad   hyperledger/fabric-couchdb                                                                               "tini -- /docker-ent…"   17 minutes ago   Up 16 minutes   4369/tcp, 9100/tcp, 0.0.0.0:7984->5984/tcp   couchdb2
  56004756bf8d   hyperledger/fabric-ca:latest                                                                             "sh -c 'fabric-ca-se…"   17 minutes ago   Up 16 minutes   0.0.0.0:7054->7054/tcp                       ca_peerOrg1
  c6710b0cec7e   hyperledger/fabric-couchdb                                                                               "tini -- /docker-ent…"   17 minutes ago   Up 16 minutes   4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp   couchdb0
  2fb0d56b57fb   hyperledger/fabric-couchdb                                                                               "tini -- /docker-ent…"   17 minutes ago   Up 16 minutes   4369/tcp, 9100/tcp, 0.0.0.0:8984->5984/tcp   couchdb3
  dc1f036103a8   hyperledger/fabric-couchdb                                                                               "tini -- /docker-ent…"   17 minutes ago   Up 16 minutes   4369/tcp, 9100/tcp, 0.0.0.0:6984->5984/tcp   couchdb1
  e736ce4fcb65   hyperledger/fabric-ca:latest                                                                             "sh -c 'fabric-ca-se…"   17 minutes ago   Up 16 minutes   7054/tcp, 0.0.0.0:8054->8054/tcp             ca_peerOrg2
  [user002@earth fabcar]$ docker exec -it validator bash
  root@c34598d33a61:/app# ls
  fabcar  first-network
  root@c34598d33a61:/app# cd fabcar
  root@c34598d33a61:/app/fabcar# ls
  java  javascript  javascript-low-level  startFabric.sh  stopFabric.sh  typescript
  root@c34598d33a61:/app/fabcar# cd javascript
  root@c34598d33a61:/app/fabcar/javascript# ls
  enrollAdmin.js  invoke.js  package.json  query.js  registerUser
  root@c34598d33a61:/app/fabcar/javascript# npm config set proxy $http_proxy
  root@c34598d33a61:/app/fabcar/javascript# npm config set https-proxy $https_proxy
  root@c34598d33a61:/app/fabcar/javascript# npm config set no-proxy localhost,127.0.0.1                      root@c34598d33a61:/app/fabcar/javascript# npm install
  npm WARN deprecated mkdirp@0.5.1: Legacy versions of mkdirp are no longer supported. Please update to mkdirp 1.x. (Note that the API surface has changed to use Promises in 1.x.)
  npm WARN deprecated grpc@1.24.3: This library will not receive further updates other than security fixes. We recommend using @grpc/grpc-js instead.
  ...
  root@c34598d33a61:/app/fabcar/javascript# ls
  enrollAdmin.js  invoke.js  node_modules  package-lock.json  package.json  query.js  registerUser.js  wallet
  root@c34598d33a61:/app/fabcar/javascript# node enrollAdmin
  Wallet path: /app/fabcar/javascript/wallet
  2021-11-05T23:08:11.341Z - error: [FabricCAClientService.js]: Failed to enroll admin, error:%o message=Calling enrollment endpoint failed with error [Error: connect ECONNREFUSED 127.0.0.1:7054
      at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1159:16) {
    errno: -111,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '127.0.0.1',
    port: 7054
  }], stack=Error: Calling enrollment endpoint failed with error [Error: connect ECONNREFUSED 127.0.0.1:7054
      at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1159:16) {
    errno: -111,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '127.0.0.1',
    port: 7054
  }]
      at ClientRequest.<anonymous> (/app/fabcar/javascript/node_modules/fabric-ca-client/lib/FabricCAClient.js:487:12)
      at ClientRequest.emit (events.js:400:28)
      at TLSSocket.socketErrorListener (_http_client.js:475:9)
      at TLSSocket.emit (events.js:400:28)
      at emitErrorNT (internal/streams/destroy.js:106:8)
      at emitErrorCloseNT (internal/streams/destroy.js:74:3)
      at processTicksAndRejections (internal/process/task_queues.js:82:21)
  Failed to enroll admin user "admin": Error: Calling enrollment endpoint failed with error [Error: connect ECONNREFUSED 127.0.0.1:7054
      at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1159:16) {
    errno: -111,
    code: 'ECONNREFUSED',
    syscall: 'connect',
    address: '127.0.0.1',
    port: 7054
  }]
  root@c34598d33a61:/app/fabcar/javascript# 
  ```

  - A connection error should occur.

- Then, change the following parts of `/cactus/tools/docker/fabric14-fabcar-testnet/fabric-samples/fabcar/javascript`の `registerUser.js`, `query.js`, `invole.js` ;

  - `registerUser.js`
    - line 37: `await gateway.connect(ccpPath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });`
    - --> `await gateway.connect(ccpPath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: false } });`
  - `query.js`
    - line 30: `await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });`
    - --> `await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: false } });`
  - `invoke.js`
    - line 30: `await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });`
    - --> `await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: false } });`

- Also, change `localhost` in the following files in `/cactus/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network` to the IP address of your environment;

  - `ccp-template.json`, `ccp-template.yaml`, `connection-org1.json`, `connection-org1.yaml`, `connection-org2.json`, `connection-org2.yaml`, `connection-org3.json`, `connection-org3.yaml` 

- Then you will get success as the following;

  ```
  root@c34598d33a61:/app/fabcar/javascript# ls
  enrollAdmin.js  invoke.js  node_modules  package-lock.json  package.json  query.js 
  root@c34598d33a61:/app/fabcar/javascript# node enrollAdmin
  Wallet path: /app/fabcar/javascript/wallet
  Successfully enrolled admin user "admin" and imported it into the wallet
   registerUser.js  wallet
  root@c34598d33a61:/app/fabcar/javascript# node registerUser.js 
  Wallet path: /app/fabcar/javascript/wallet
  Successfully registered and enrolled admin user "user1" and imported it into the wallet
  root@c34598d33a61:/app/fabcar/javascript# node query.js 
  Wallet path: /app/fabcar/javascript/wallet
  Transaction has been evaluated, result is: [{"Key":"CAR0", "Record":{"colour":"blue","make":"Toyota","model":"Prius","owner":"Tomoko"}},{"Key":"CAR1", "Record":{"colour":"red","make":"Ford","model":"Mustang","owner":"Brad"}},{"Key":"CAR2", "Record":{"colour":"green","make":"Hyundai","model":"Tucson","owner":"Jin Soo"}},{"Key":"CAR3", "Record":{"colour":"yellow","make":"Volkswagen","model":"Passat","owner":"Max"}},{"Key":"CAR4", "Record":{"colour":"black","make":"Tesla","model":"S","owner":"Adriana"}},{"Key":"CAR5", "Record":{"colour":"purple","make":"Peugeot","model":"205","owner":"Michel"}},{"Key":"CAR6", "Record":{"colour":"white","make":"Chery","model":"S22L","owner":"Aarav"}},{"Key":"CAR7", "Record":{"colour":"violet","make":"Fiat","model":"Punto","owner":"Pari"}},{"Key":"CAR8", "Record":{"colour":"indigo","make":"Tata","model":"Nano","owner":"Valeria"}},{"Key":"CAR9", "Record":{"colour":"brown","make":"Holden","model":"Barina","owner":"Shotaro"}}]
  root@c34598d33a61:/app/fabcar/javascript# node invoke.js 
  Wallet path: /app/fabcar/javascript/wallet
  Transaction has been submitted
  root@c34598d33a61:/app/fabcar/javascript# node query.js 
  Wallet path: /app/fabcar/javascript/wallet
  Transaction has been evaluated, result is: [{"Key":"CAR0", "Record":{"colour":"blue","make":"Toyota","model":"Prius","owner":"Tomoko"}},{"Key":"CAR1", "Record":{"colour":"red","make":"Ford","model":"Mustang","owner":"Brad"}},{"Key":"CAR12", "Record":{"colour":"Black","make":"Honda","model":"Accord","owner":"Tom"}},{"Key":"CAR2", "Record":{"colour":"green","make":"Hyundai","model":"Tucson","owner":"Jin Soo"}},{"Key":"CAR3", "Record":{"colour":"yellow","make":"Volkswagen","model":"Passat","owner":"Max"}},{"Key":"CAR4", "Record":{"colour":"black","make":"Tesla","model":"S","owner":"Adriana"}},{"Key":"CAR5", "Record":{"colour":"purple","make":"Peugeot","model":"205","owner":"Michel"}},{"Key":"CAR6", "Record":{"colour":"white","make":"Chery","model":"S22L","owner":"Aarav"}},{"Key":"CAR7", "Record":{"colour":"violet","make":"Fiat","model":"Punto","owner":"Pari"}},{"Key":"CAR8", "Record":{"colour":"indigo","make":"Tata","model":"Nano","owner":"Valeria"}},{"Key":"CAR9", "Record":{"colour":"brown","make":"Holden","model":"Barina","owner":"Shotaro"}}]
  root@c34598d33a61:/app/fabcar/javascript# 
  ```

  

