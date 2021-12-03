## How to Containerize Fabcar

#### Background

- You need to work fabcar to use cartrade, but it may not work outside centos.

#### Goal

- make fabcar work regardless of the environment by making it a docker container, where "work fabcar" means "use registerUser, query, invoke".

#### Required patch Files

- I create two patch files in`/cactus/tools/docker/fabric14-fabcar-testnet`.

1. `script-start-docker_newer.patch`

   - This changes and adds the following in `script-start-docker.sh` :
     - Change the fabric version from v1.4.1 to v1.4.12.
     - Add a command to apply `fabric-samples_dockerize.patch`.
     - Add a command to run fabcar in the container.

2. `fabric-samples_dockerize.patch`

   - This changes and adds the following in `fabric-samples` : 

     - Change values of parameter `asLocalhost` used in node APIs in `fabric-samples/fabcar/javascript` from `true` to `false`.

     - Change addresses used in `fabric-samples/first-network/ccp-template.json` from `localhost` to IP address of your environment.

     - Add a verifier container to end of `fabric-samples/first-network/docker-compose-cli.yaml` to run node APIs in the container.

       

#### How to use these patch files

- Do the following operations in `/cactus/tools/docker/fabric14-fabcar-testnet ` :

1. When running fabcar under a proxy environment,

   - Uncomment lines 20--26 of `script-start-docker_newer.patch` when running fabcar under a proxy environment

   - Set the environment variables as follows:

     ```
     $ export http_proxy=http://username:password@proxyhost:port
     $ export https_proxy=http://username:password@proxyhost:port
     $ export HTTP_PROXY=http://username:password@proxyhost:port
     $ export HTTPS_PROXY=http://username:password@proxyhost:port
     $ export ftp_proxy=http://username:password@proxyhost:port
     $ export FTP_PROXY=http://username:password@proxyhost:port
     $ export no_proxy=localhost,127.0.0.1
     ```

2. Enter the IP address of your environment in `xx.xx.xx.xx` on lines 45, 54, 63, 75, 84, and 93 of `fabric-samples_dockerize.patch`

3. `$ patch < script-start-docker_newer.patch `

4. `$ ./script-start-docker.sh`



#### Test log

- Test envronment : Centos7, node v14.18.0, docker version 20.10.5 under a proxy network

  ```
  [user002@earth fabric14-fabcar-testnet]$ patch < script-start-docker_newer.patch
  patching file script-start-docker.sh
  Hunk #2 succeeded at 19 with fuzz 2.
  [user002@earth fabric14-fabcar-testnet]$ ls
  README.md                       script-start-docker.sh.orig
  fabric-samples_dockerize.patch  script-start-docker_newer.patch
  script-start-docker.sh
  [user002@earth fabric14-fabcar-testnet]$ ./script-start-docker.sh
  [process] start docker environment for Fabric testnet
  
  Clone hyperledger/fabric-samples repo
  
  ===> Cloning hyperledger/fabric-samples repo
  Cloning into 'fabric-samples'...
  remote: Enumerating objects: 8324, done.
  remote: Counting objects: 100% (599/599), done.
  remote: Compressing objects: 100% (380/380), done.
  remote: Total 8324 (delta 280), reused 442 (delta 208), pack-reused 7725
  Receiving objects: 100% (8324/8324), 4.92 MiB | 8.20 MiB/s, done.
  Resolving deltas: 100% (4314/4314), done.
  ===> Checking out v1.4.12 of hyperledger/fabric-samples
  
  Pull Hyperledger Fabric binaries
  
  ===> Downloading version 1.4.12 platform specific fabric binaries
  ===> Downloading:  https://github.com/hyperledger/fabric/releases/download/v1.4.12/hyperledger-fabric-linux-amd64-1.4.12.tar.gz
    % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                   Dload  Upload   Total   Spent    Left  Speed
  100   681  100   681    0     0   1368      0 --:--:-- --:--:-- --:--:--  1370
  100 79.0M  100 79.0M    0     0  5866k      0  0:00:13  0:00:13 --:--:-- 8058k
  ==> Done.
  ===> Downloading version 1.4.9 platform specific fabric-ca-client binary
  ===> Downloading:  https://github.com/hyperledger/fabric-ca/releases/download/v1.4.9/hyperledger-fabric-ca-linux-amd64-1.4.9.tar.gz
    % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                   Dload  Upload   Total   Spent    Left  Speed
  100   683  100   683    0     0   1367      0 --:--:-- --:--:-- --:--:--  1366
  100 23.6M  100 23.6M    0     0  4506k      0  0:00:05  0:00:05 --:--:-- 6389k
  ==> Done.
  
  Pull Hyperledger Fabric docker images
  
  FABRIC_IMAGES: peer orderer ccenv tools
  ===> Pulling fabric Images
  ====> hyperledger/fabric-peer:1.4.12
  1.4.12: Pulling from hyperledger/fabric-peer
  Digest: sha256:3c07486c8113415ffdb83b65c3d245397a90581c3536d5acac174d30d1ab8d77
  Status: Image is up to date for hyperledger/fabric-peer:1.4.12
  docker.io/hyperledger/fabric-peer:1.4.12
  ====> hyperledger/fabric-orderer:1.4.12
  1.4.12: Pulling from hyperledger/fabric-orderer
  Digest: sha256:1b70416ebb1286686794a74c5d87d77d3ca458a95eabb946f9684a495a986642
  Status: Image is up to date for hyperledger/fabric-orderer:1.4.12
  docker.io/hyperledger/fabric-orderer:1.4.12
  ====> hyperledger/fabric-ccenv:1.4.12
  1.4.12: Pulling from hyperledger/fabric-ccenv
  Digest: sha256:20bd9890c6de6157078adf8bda57fa6652b3456557c86ba8a7b1cbd51e984084
  Status: Image is up to date for hyperledger/fabric-ccenv:1.4.12
  docker.io/hyperledger/fabric-ccenv:1.4.12
  ====> hyperledger/fabric-tools:1.4.12
  1.4.12: Pulling from hyperledger/fabric-tools
  Digest: sha256:9b4605c1de2facc06eb0531376f698c8849f4288fc0ed4f3dad3e334af62105e
  Status: Image is up to date for hyperledger/fabric-tools:1.4.12
  docker.io/hyperledger/fabric-tools:1.4.12
  ===> Pulling fabric ca Image
  ====> hyperledger/fabric-ca:1.4.9
  1.4.9: Pulling from hyperledger/fabric-ca
  Digest: sha256:28f50c6aa4f4642842e706d3ae6dcee181921d03bd30ab2a8b09b66e0349d92f
  Status: Image is up to date for hyperledger/fabric-ca:1.4.9
  docker.io/hyperledger/fabric-ca:1.4.9
  ===> List out hyperledger docker images
  hyperledgerlabs/minifab                                                                                  latest         2f7e1a92b0ca   8 weeks ago      568MB
  hyperledger/fabric-tools                                                                                 1.4            461901e2a2c1   7 months ago     1.55GB
  hyperledger/fabric-tools                                                                                 1.4.12         461901e2a2c1   7 months ago     1.55GB
  hyperledger/fabric-tools                                                                                 latest         461901e2a2c1   7 months ago     1.55GB
  hyperledger/fabric-ccenv                                                                                 1.4            01caec52b792   7 months ago     1.42GB
  hyperledger/fabric-ccenv                                                                                 1.4.12         01caec52b792   7 months ago     1.42GB
  hyperledger/fabric-ccenv                                                                                 latest         01caec52b792   7 months ago     1.42GB
  hyperledger/fabric-orderer                                                                               1.4            a4be4d4c5800   7 months ago     133MB
  hyperledger/fabric-orderer                                                                               1.4.12         a4be4d4c5800   7 months ago     133MB
  hyperledger/fabric-orderer                                                                               latest         a4be4d4c5800   7 months ago     133MB
  hyperledger/fabric-peer                                                                                  1.4            df5561a93137   7 months ago     141MB
  hyperledger/fabric-peer                                                                                  1.4.12         df5561a93137   7 months ago     141MB
  hyperledger/fabric-peer                                                                                  latest         df5561a93137   7 months ago     141MB
  hyperledger/fabric-baseos                                                                                amd64-0.4.22   56b3cacd110b   12 months ago    95.5MB
  hyperledger/fabric-ca                                                                                    1.4            dbbc768aec79   13 months ago    158MB
  hyperledger/fabric-ca                                                                                    1.4.9          dbbc768aec79   13 months ago    158MB
  hyperledger/fabric-ca                                                                                    latest         dbbc768aec79   13 months ago    158MB
  hyperledger/fabric-ca                                                                                    1.4.8          152b9082adf6   15 months ago    158MB
  hyperledger/fabric-tools                                                                                 1.4.8          e642eef94cae   16 months ago    1.5GB
  hyperledger/fabric-orderer                                                                               1.4.8          1a326828a41f   16 months ago    127MB
  hyperledger/fabric-peer                                                                                  1.4.8          b31292eb8166   16 months ago    135MB
  hyperledger/fabric-couchdb                                                                               latest         b967e8b98b6b   16 months ago    261MB
  hyperledger/fabric-ca                                                                                    1.4.1          3a1799cda5d7   2 years ago      252MB
  hyperledger/fabric-tools                                                                                 1.4.1          432c24764fbb   2 years ago      1.55GB
  hyperledger/fabric-ccenv                                                                                 1.4.1          d7433c4b2a1c   2 years ago      1.43GB
  hyperledger/fabric-orderer                                                                               1.4.1          ec4ca236d3d4   2 years ago      173MB
  hyperledger/fabric-peer                                                                                  1.4.1          a1e3874f338b   2 years ago      178MB
  hyperledger/fabric-baseos                                                                                amd64-0.4.15   9d6ec11c60ff   2 years ago      145MB
  dockerlize fabric-samples
  patching file fabric-samples/fabcar/javascript/invoke.js
  patching file fabric-samples/fabcar/javascript/query.js
  patching file fabric-samples/fabcar/javascript/registerUser.js
  patching file fabric-samples/first-network/ccp-template.json
  patching file fabric-samples/first-network/ccp-template.yaml
  patching file fabric-samples/first-network/docker-compose-cli.yaml
  Stopping for channel 'mychannel' with CLI timeout of '10' seconds and CLI delay of '3' seconds
  proceeding ...
  WARNING: The BYFN_CA1_PRIVATE_KEY variable is not set. Defaulting to a blank string.
  WARNING: The BYFN_CA2_PRIVATE_KEY variable is not set. Defaulting to a blank string.
  Removing network net_byfn
  Removing volume net_orderer.example.com
  Removing volume net_peer0.org1.example.com
  Removing volume net_peer1.org1.example.com
  Removing volume net_peer0.org2.example.com
  Removing volume net_peer1.org2.example.com
  Removing volume net_orderer2.example.com
  WARNING: Volume net_orderer2.example.com not found.
  Removing volume net_orderer3.example.com
  WARNING: Volume net_orderer3.example.com not found.
  Removing volume net_orderer4.example.com
  WARNING: Volume net_orderer4.example.com not found.
  Removing volume net_orderer5.example.com
  WARNING: Volume net_orderer5.example.com not found.
  Removing volume net_peer0.org3.example.com
  WARNING: Volume net_peer0.org3.example.com not found.
  Removing volume net_peer1.org3.example.com
  WARNING: Volume net_peer1.org3.example.com not found.
  ---- No containers available for deletion ----
  Untagged: dev-peer0.org2.example.com-fabcar-1.0-264b0a1cb5efbecaac5cf8990339c24474dc8435c6e10f10f2be565d555d0e94:latest
  Deleted: sha256:a28e7a8c44fdb1d24938dfc6f214ad99c60acf253f4776e19180ea6658897193
  Deleted: sha256:82b3025502a2397be06758092bf0ed33864cd1fb59d5fe2330ec5749d4b5298d
  Deleted: sha256:af449fb396c96b69c0369e049995e5b7123aeb61788059568bc1da17f1ae5ae7
  Deleted: sha256:27023eb4cff6d6776ebf63a566775382ef34ce82ff13916a9a35ecb94e99c6bc
  Untagged: dev-peer0.org1.example.com-fabcar-1.0-5c906e402ed29f20260ae42283216aa75549c571e2e380f3615826365d8269ba:latest
  Deleted: sha256:d86881fb0c7c78f548abbbf321d8109e5a0d1973eb114158bdd8e92e7c2961dc
  Deleted: sha256:71488aad0ac58969abf404951644e52dae24b4e61691c8ade985dba99e9c01cc
  Deleted: sha256:1d723ca8059f135e6a426483e0fb92d762ccf8e43e2031107bc7a571372ea7d5
  Deleted: sha256:ee54978a04a0b3b18e6f2a0c7fa103384b64b17fde457a5e3264289b9b0d64c2
  
  Starting for channel 'mychannel' with CLI timeout of '10' seconds and CLI delay of '3' seconds and using database 'couchdb'
  proceeding ...
  LOCAL_VERSION=1.4.11
  DOCKER_IMAGE_VERSION=1.4.12
  =================== WARNING ===================
    Local fabric binaries and docker images are  
    out of  sync. This may cause problems.       
  ===============================================
  /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/bin/cryptogen
  
  ##########################################################
  ##### Generate certificates using cryptogen tool #########
  ##########################################################
  + cryptogen generate --config=./crypto-config.yaml
  org1.example.com
  org2.example.com
  + res=0
  + set +x
  
  Generate CCP files for Org1 and Org2
  /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/bin/configtxgen
  ##########################################################
  #########  Generating Orderer Genesis block ##############
  ##########################################################
  CONSENSUS_TYPE=solo
  + '[' solo == solo ']'
  + configtxgen -profile TwoOrgsOrdererGenesis -channelID byfn-sys-channel -outputBlock ./channel-artifacts/genesis.block
  2021-11-20 07:54:44.974 JST [common.tools.configtxgen] main -> INFO 001 Loading configuration
  2021-11-20 07:54:45.063 JST [common.tools.configtxgen.localconfig] completeInitialization -> INFO 002 orderer type: solo
  2021-11-20 07:54:45.063 JST [common.tools.configtxgen.localconfig] Load -> INFO 003 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.152 JST [common.tools.configtxgen.localconfig] completeInitialization -> INFO 004 orderer type: solo
  2021-11-20 07:54:45.152 JST [common.tools.configtxgen.localconfig] LoadTopLevel -> INFO 005 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.154 JST [common.tools.configtxgen] doOutputBlock -> INFO 006 Generating genesis block
  2021-11-20 07:54:45.154 JST [common.tools.configtxgen] doOutputBlock -> INFO 007 Writing genesis block
  + res=0
  + set +x
  
  #################################################################
  ### Generating channel configuration transaction 'channel.tx' ###
  #################################################################
  + configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel
  2021-11-20 07:54:45.180 JST [common.tools.configtxgen] main -> INFO 001 Loading configuration
  2021-11-20 07:54:45.275 JST [common.tools.configtxgen.localconfig] Load -> INFO 002 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.364 JST [common.tools.configtxgen.localconfig] completeInitialization -> INFO 003 orderer type: solo
  2021-11-20 07:54:45.364 JST [common.tools.configtxgen.localconfig] LoadTopLevel -> INFO 004 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.364 JST [common.tools.configtxgen] doOutputChannelCreateTx -> INFO 005 Generating new channel configtx
  2021-11-20 07:54:45.366 JST [common.tools.configtxgen] doOutputChannelCreateTx -> INFO 006 Writing new channel tx
  + res=0
  + set +x
  
  #################################################################
  #######    Generating anchor peer update for Org1MSP   ##########
  #################################################################
  + configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
  2021-11-20 07:54:45.391 JST [common.tools.configtxgen] main -> INFO 001 Loading configuration
  2021-11-20 07:54:45.486 JST [common.tools.configtxgen.localconfig] Load -> INFO 002 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.580 JST [common.tools.configtxgen.localconfig] completeInitialization -> INFO 003 orderer type: solo
  2021-11-20 07:54:45.580 JST [common.tools.configtxgen.localconfig] LoadTopLevel -> INFO 004 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.580 JST [common.tools.configtxgen] doOutputAnchorPeersUpdate -> INFO 005 Generating anchor peer update
  2021-11-20 07:54:45.580 JST [common.tools.configtxgen] doOutputAnchorPeersUpdate -> INFO 006 Writing anchor peer update
  + res=0
  + set +x
  
  #################################################################
  #######    Generating anchor peer update for Org2MSP   ##########
  #################################################################
  + configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP
  2021-11-20 07:54:45.606 JST [common.tools.configtxgen] main -> INFO 001 Loading configuration
  2021-11-20 07:54:45.700 JST [common.tools.configtxgen.localconfig] Load -> INFO 002 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.798 JST [common.tools.configtxgen.localconfig] completeInitialization -> INFO 003 orderer type: solo
  2021-11-20 07:54:45.798 JST [common.tools.configtxgen.localconfig] LoadTopLevel -> INFO 004 Loaded configuration: /home/user002/cactus_cp1/tools/docker/fabric14-fabcar-testnet/fabric-samples/first-network/configtx.yaml
  2021-11-20 07:54:45.798 JST [common.tools.configtxgen] doOutputAnchorPeersUpdate -> INFO 005 Generating anchor peer update
  2021-11-20 07:54:45.798 JST [common.tools.configtxgen] doOutputAnchorPeersUpdate -> INFO 006 Writing anchor peer update
  + res=0
  + set +x
  
  Creating network "net_byfn" with the default driver
  Creating volume "net_orderer.example.com" with default driver
  Creating volume "net_peer0.org1.example.com" with default driver
  Creating volume "net_peer1.org1.example.com" with default driver
  Creating volume "net_peer0.org2.example.com" with default driver
  Creating volume "net_peer1.org2.example.com" with default driver
  Creating couchdb3               ... done
  Creating couchdb1               ... done
  Creating orderer.example.com ... done
  Creating ca_peerOrg1            ... done
  Creating couchdb0            ... done
  Creating ca_peerOrg2            ... done
  Creating couchdb2               ... done
  Creating peer0.org1.example.com ... done
  Creating peer1.org1.example.com ... done
  Creating peer0.org2.example.com ... done
  Creating peer1.org2.example.com ... done
  Creating cli                    ... done
  Creating validator              ... done
  CONTAINER ID   IMAGE                               COMMAND                  CREATED         STATUS                  PORTS                                        NAMES
  f9be2ed36e76   node:14.18.1                        "docker-entrypoint.s…"   1 second ago    Up Less than a second                                                validator
  c1b4bbfc8910   hyperledger/fabric-tools:latest     "/bin/bash"              1 second ago    Up Less than a second                                                cli
  3ebbb0edb38c   hyperledger/fabric-peer:latest      "peer node start"        3 seconds ago   Up 1 second             0.0.0.0:10051->10051/tcp                     peer1.org2.example.com
  e183c5844467   hyperledger/fabric-peer:latest      "peer node start"        3 seconds ago   Up 1 second             0.0.0.0:9051->9051/tcp                       peer0.org2.example.com
  e448bcb0103f   hyperledger/fabric-peer:latest      "peer node start"        3 seconds ago   Up 1 second             0.0.0.0:8051->8051/tcp                       peer1.org1.example.com
  135e09f7720f   hyperledger/fabric-peer:latest      "peer node start"        3 seconds ago   Up 2 seconds            0.0.0.0:7051->7051/tcp                       peer0.org1.example.com
  9720ce59a2f9   hyperledger/fabric-couchdb          "tini -- /docker-ent…"   5 seconds ago   Up 3 seconds            4369/tcp, 9100/tcp, 0.0.0.0:7984->5984/tcp   couchdb2
  db717c513c00   hyperledger/fabric-ca:latest        "sh -c 'fabric-ca-se…"   5 seconds ago   Up 3 seconds            7054/tcp, 0.0.0.0:8054->8054/tcp             ca_peerOrg2
  4e2ed5621573   hyperledger/fabric-couchdb          "tini -- /docker-ent…"   5 seconds ago   Up 3 seconds            4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp   couchdb0
  24eba0e94ba5   hyperledger/fabric-couchdb          "tini -- /docker-ent…"   5 seconds ago   Up 3 seconds            4369/tcp, 9100/tcp, 0.0.0.0:6984->5984/tcp   couchdb1
  ad04b4ab54be   hyperledger/fabric-orderer:latest   "orderer"                5 seconds ago   Up 3 seconds            0.0.0.0:7050->7050/tcp                       orderer.example.com
  42f655d4eb27   hyperledger/fabric-ca:latest        "sh -c 'fabric-ca-se…"   5 seconds ago   Up 3 seconds            0.0.0.0:7054->7054/tcp                       ca_peerOrg1
  3f9ef95cbf00   hyperledger/fabric-couchdb          "tini -- /docker-ent…"   5 seconds ago   Up 3 seconds            4369/tcp, 9100/tcp, 0.0.0.0:8984->5984/tcp   couchdb3
  
   ____    _____      _      ____    _____ 
  / ___|  |_   _|    / \    |  _ \  |_   _|
  \___ \    | |     / _ \   | |_) |   | |  
   ___) |   | |    / ___ \  |  _ <    | |  
  |____/    |_|   /_/   \_\ |_| \_\   |_|  
  
  Build your first network (BYFN) end-to-end test
  
  Channel name : mychannel
  Creating channel...
  + peer channel create -o orderer.example.com:7050 -c mychannel -f ./channel-artifacts/channel.tx --tls true --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
  + res=0
  + set +x
  2021-11-19 22:54:52.092 UTC [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
  2021-11-19 22:54:52.115 UTC [cli.common] readBlock -> INFO 002 Received block: 0
  ===================== Channel 'mychannel' created ===================== 
  
  Having all peers join the channel...
  + peer channel join -b mychannel.block
  + res=1
  + set +x
  Error: error getting endorser client for channel: endorser client failed to connect to peer0.org1.example.com:7051: failed to create new connection: connection error: desc = "transport: error while dialing: dial tcp 172.21.0.9:7051: connect: connection refused"
  peer0.org1 failed to join the channel, Retry after 3 seconds
  + peer channel join -b mychannel.block
  + res=0
  + set +x
  2021-11-19 22:54:55.304 UTC [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
  2021-11-19 22:54:55.393 UTC [channelCmd] executeJoin -> INFO 002 Successfully submitted proposal to join channel
  ===================== peer0.org1 joined channel 'mychannel' ===================== 
  
  + peer channel join -b mychannel.block
  + res=0
  + set +x
  2021-11-19 22:54:58.445 UTC [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
  2021-11-19 22:54:58.529 UTC [channelCmd] executeJoin -> INFO 002 Successfully submitted proposal to join channel
  ===================== peer1.org1 joined channel 'mychannel' ===================== 
  
  + peer channel join -b mychannel.block
  + res=0
  + set +x
  2021-11-19 22:55:01.580 UTC [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
  2021-11-19 22:55:01.681 UTC [channelCmd] executeJoin -> INFO 002 Successfully submitted proposal to join channel
  ===================== peer0.org2 joined channel 'mychannel' ===================== 
  
  + peer channel join -b mychannel.block
  + res=0
  + set +x
  2021-11-19 22:55:04.731 UTC [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
  2021-11-19 22:55:04.809 UTC [channelCmd] executeJoin -> INFO 002 Successfully submitted proposal to join channel
  ===================== peer1.org2 joined channel 'mychannel' ===================== 
  
  Updating anchor peers for org1...
  + peer channel update -o orderer.example.com:7050 -c mychannel -f ./channel-artifacts/Org1MSPanchors.tx --tls true --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
  + res=0
  + set +x
  2021-11-19 22:55:07.857 UTC [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
  2021-11-19 22:55:07.864 UTC [channelCmd] update -> INFO 002 Successfully submitted channel update
  ===================== Anchor peers updated for org 'Org1MSP' on channel 'mychannel' ===================== 
  
  Updating anchor peers for org2...
  + peer channel update -o orderer.example.com:7050 -c mychannel -f ./channel-artifacts/Org2MSPanchors.tx --tls true --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
  + res=0
  + set +x
  2021-11-19 22:55:10.914 UTC [channelCmd] InitCmdFactory -> INFO 001 Endorser and orderer connections initialized
  2021-11-19 22:55:10.930 UTC [channelCmd] update -> INFO 002 Successfully submitted channel update
  ===================== Anchor peers updated for org 'Org2MSP' on channel 'mychannel' ===================== 
  
  
  ========= All GOOD, BYFN execution completed =========== 
  
  
   _____   _   _   ____   
  | ____| | \ | | |  _ \  
  |  _|   |  \| | | | | | 
  | |___  | |\  | | |_| | 
  |_____| |_| \_| |____/  
  
  + echo 'Installing smart contract on peer0.org1.example.com'
  Installing smart contract on peer0.org1.example.com
  + docker exec -e CORE_PEER_LOCALMSPID=Org1MSP -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt cli peer chaincode install -n fabcar -v 1.0 -p github.com/chaincode/fabcar/go -l golang
  2021-11-19 22:55:14.102 UTC [chaincodeCmd] checkChaincodeCmdParams -> INFO 001 Using default escc
  2021-11-19 22:55:14.102 UTC [chaincodeCmd] checkChaincodeCmdParams -> INFO 002 Using default vscc
  2021-11-19 22:55:14.290 UTC [chaincodeCmd] install -> INFO 003 Installed remotely response:<status:200 payload:"OK" > 
  + echo 'Installing smart contract on peer0.org2.example.com'
  Installing smart contract on peer0.org2.example.com
  + docker exec -e CORE_PEER_LOCALMSPID=Org2MSP -e CORE_PEER_ADDRESS=peer0.org2.example.com:9051 -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt cli peer chaincode install -n fabcar -v 1.0 -p github.com/chaincode/fabcar/go -l golang
  2021-11-19 22:55:14.437 UTC [chaincodeCmd] checkChaincodeCmdParams -> INFO 001 Using default escc
  2021-11-19 22:55:14.437 UTC [chaincodeCmd] checkChaincodeCmdParams -> INFO 002 Using default vscc
  2021-11-19 22:55:14.618 UTC [chaincodeCmd] install -> INFO 003 Installed remotely response:<status:200 payload:"OK" > 
  + echo 'Instantiating smart contract on mychannel'
  Instantiating smart contract on mychannel
  + docker exec -e CORE_PEER_LOCALMSPID=Org1MSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp cli peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n fabcar -l golang -v 1.0 -c '{"Args":[]}' -P 'AND('\''Org1MSP.member'\'','\''Org2MSP.member'\'')' --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
  2021-11-19 22:55:14.754 UTC [chaincodeCmd] checkChaincodeCmdParams -> INFO 001 Using default escc
  2021-11-19 22:55:14.754 UTC [chaincodeCmd] checkChaincodeCmdParams -> INFO 002 Using default vscc
  + echo 'Waiting for instantiation request to be committed ...'
  Waiting for instantiation request to be committed ...
  + sleep 10
  + echo 'Submitting initLedger transaction to smart contract on mychannel'
  Submitting initLedger transaction to smart contract on mychannel
  + echo 'The transaction is sent to the two peers with the chaincode installed (peer0.org1.example.com and peer0.org2.example.com) so that chaincode is built before receiving the following requests'
  The transaction is sent to the two peers with the chaincode installed (peer0.org1.example.com and peer0.org2.example.com) so that chaincode is built before receiving the following requests
  + docker exec -e CORE_PEER_LOCALMSPID=Org1MSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp cli peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n fabcar -c '{"function":"initLedger","Args":[]}' --waitForEvent --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --peerAddresses peer0.org1.example.com:7051 --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
  2021-11-19 22:56:00.622 UTC [chaincodeCmd] ClientWait -> INFO 001 txid [aca685bffc50c66f78a97cd99eebdab37272da0bc0bada20f716392d76e368e6] committed with status (VALID) at peer0.org1.example.com:7051
  2021-11-19 22:56:00.622 UTC [chaincodeCmd] ClientWait -> INFO 002 txid [aca685bffc50c66f78a97cd99eebdab37272da0bc0bada20f716392d76e368e6] committed with status (VALID) at peer0.org2.example.com:9051
  2021-11-19 22:56:00.622 UTC [chaincodeCmd] chaincodeInvokeOrQuery -> INFO 003 Chaincode invoke successful. result: status:200 
  + set +x
  
  Total setup execution time : 79 secs ...
  
  Next, use the FabCar applications to interact with the deployed FabCar contract.
  The FabCar applications are available in multiple programming languages.
  Follow the instructions for the programming language of your choice:
  
  JavaScript:
  
    Start by changing into the "javascript" directory:
      cd javascript
  
    Next, install all required packages:
      npm install
  
    Then run the following applications to enroll the admin user, and register a new user
    called user1 which will be used by the other applications to interact with the deployed
    FabCar contract:
      node enrollAdmin
      node registerUser
  
    You can run the invoke application as follows. By default, the invoke application will
    create a new car, but you can update the application to submit other transactions:
      node invoke
  
    You can run the query application as follows. By default, the query application will
    return all cars, but you can update the application to evaluate other transactions:
      node query
  
  TypeScript:
  
    Start by changing into the "typescript" directory:
      cd typescript
  
    Next, install all required packages:
      npm install
  
    Next, compile the TypeScript code into JavaScript:
      npm run build
  
    Then run the following applications to enroll the admin user, and register a new user
    called user1 which will be used by the other applications to interact with the deployed
    FabCar contract:
      node dist/enrollAdmin
      node dist/registerUser
  
    You can run the invoke application as follows. By default, the invoke application will
    create a new car, but you can update the application to submit other transactions:
      node dist/invoke
  
    You can run the query application as follows. By default, the query application will
    return all cars, but you can update the application to evaluate other transactions:
      node dist/query
  
  Java:
  
    Start by changing into the "java" directory:
      cd java
  
    Then, install dependencies and run the test using:
      mvn test
  
    The test will invoke the sample client app which perform the following:
      - Enroll admin and user1 and import them into the wallet (if they don't already exist there)
      - Submit a transaction to create a new car
      - Evaluate a transaction (query) to return details of this car
      - Submit a transaction to change the owner of this car
      - Evaluate a transaction (query) to return the updated details of this car
  
  set proxy for npm in validator container
  npm install in validator container
  npm WARN deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
  npm WARN deprecated mkdirp@0.5.1: Legacy versions of mkdirp are no longer supported. Please update to mkdirp 1.x. (Note that the API surface has changed to use Promises in 1.x.)
  npm WARN deprecated grpc@1.24.3: This library will not receive further updates other than security fixes. We recommend using @grpc/grpc-js instead.
  npm WARN deprecated querystring@0.2.0: The querystring API is considered Legacy. new code should use the URLSearchParams API instead.
  npm WARN deprecated node-pre-gyp@0.15.0: Please upgrade to @mapbox/node-pre-gyp: the non-scoped node-pre-gyp package is deprecated and only the @mapbox scoped package will recieve updates in the future
  npm WARN deprecated request@2.88.2: request has been deprecated, see https://github.com/request/request/issues/3142
  npm WARN deprecated cloudant-follow@0.17.0: This package is no longer maintained.
  npm WARN deprecated har-validator@5.1.5: this library is no longer supported
  
  > pkcs11js@1.2.6 install /app/fabcar/javascript/node_modules/pkcs11js
  > node-gyp rebuild
  
  make: Entering directory '/app/fabcar/javascript/node_modules/pkcs11js/build'
    CXX(target) Release/obj.target/pkcs11/src/main.o
    CXX(target) Release/obj.target/pkcs11/src/dl.o
    CXX(target) Release/obj.target/pkcs11/src/const.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/error.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/v8_convert.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/template.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/mech.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/param.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/param_aes.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/param_rsa.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/param_ecdh.o
    CXX(target) Release/obj.target/pkcs11/src/pkcs11/pkcs11.o
    CXX(target) Release/obj.target/pkcs11/src/async.o
    CXX(target) Release/obj.target/pkcs11/src/node.o
    SOLINK_MODULE(target) Release/obj.target/pkcs11.node
    COPY Release/pkcs11.node
  make: Leaving directory '/app/fabcar/javascript/node_modules/pkcs11js/build'
  
  > grpc@1.24.3 install /app/fabcar/javascript/node_modules/grpc
  > node-pre-gyp install --fallback-to-build --library=static_library
  
  node-pre-gyp WARN Using request for node-pre-gyp https download 
  [grpc] Success: "/app/fabcar/javascript/node_modules/grpc/src/node/extension_binary/node-v83-linux-x64-glibc/grpc_node.node" is installed via remote
  npm notice created a lockfile as package-lock.json. You should commit this file.
  npm WARN notsup Unsupported engine for fabric-ca-client@1.4.18: wanted: {"node":"^10.15.3 || ^12.15.0","npm":"^6.4.1"} (current: {"node":"14.18.1","npm":"6.14.15"})
  npm WARN notsup Not compatible with your version of node/npm: fabric-ca-client@1.4.18
  npm WARN notsup Unsupported engine for fabric-network@1.4.18: wanted: {"node":"^10.15.3 || ^12.15.0","npm":"^6.4.1"} (current: {"node":"14.18.1","npm":"6.14.15"})
  npm WARN notsup Not compatible with your version of node/npm: fabric-network@1.4.18
  npm WARN notsup Unsupported engine for fabric-client@1.4.18: wanted: {"node":"^10.15.3 || ^12.15.0","npm":" ^6.4.1"} (current: {"node":"14.18.1","npm":"6.14.15"})
  npm WARN notsup Not compatible with your version of node/npm: fabric-client@1.4.18
  npm WARN fabcar@1.0.0 No repository field.
  
  added 473 packages from 1081 contributors and audited 473 packages in 52.778s
  
  9 packages are looking for funding
    run `npm fund` for details
  
  found 30 vulnerabilities (14 moderate, 10 high, 6 critical)
    run `npm audit fix` to fix them, or `npm audit` for details
  exec fabcar from validator container
  Wallet path: /app/fabcar/javascript/wallet
  Successfully enrolled admin user "admin" and imported it into the wallet
  Wallet path: /app/fabcar/javascript/wallet
  Successfully registered and enrolled admin user "user1" and imported it into the wallet
  Wallet path: /app/fabcar/javascript/wallet
  Transaction has been evaluated, result is: [{"Key":"CAR0", "Record":{"colour":"blue","make":"Toyota","model":"Prius","owner":"Tomoko"}},{"Key":"CAR1", "Record":{"colour":"red","make":"Ford","model":"Mustang","owner":"Brad"}},{"Key":"CAR2", "Record":{"colour":"green","make":"Hyundai","model":"Tucson","owner":"Jin Soo"}},{"Key":"CAR3", "Record":{"colour":"yellow","make":"Volkswagen","model":"Passat","owner":"Max"}},{"Key":"CAR4", "Record":{"colour":"black","make":"Tesla","model":"S","owner":"Adriana"}},{"Key":"CAR5", "Record":{"colour":"purple","make":"Peugeot","model":"205","owner":"Michel"}},{"Key":"CAR6", "Record":{"colour":"white","make":"Chery","model":"S22L","owner":"Aarav"}},{"Key":"CAR7", "Record":{"colour":"violet","make":"Fiat","model":"Punto","owner":"Pari"}},{"Key":"CAR8", "Record":{"colour":"indigo","make":"Tata","model":"Nano","owner":"Valeria"}},{"Key":"CAR9", "Record":{"colour":"brown","make":"Holden","model":"Barina","owner":"Shotaro"}}]
  Wallet path: /app/fabcar/javascript/wallet
  Transaction has been submitted
  Wallet path: /app/fabcar/javascript/wallet
  Transaction has been evaluated, result is: [{"Key":"CAR0", "Record":{"colour":"blue","make":"Toyota","model":"Prius","owner":"Tomoko"}},{"Key":"CAR1", "Record":{"colour":"red","make":"Ford","model":"Mustang","owner":"Brad"}},{"Key":"CAR12", "Record":{"colour":"Black","make":"Honda","model":"Accord","owner":"Tom"}},{"Key":"CAR2", "Record":{"colour":"green","make":"Hyundai","model":"Tucson","owner":"Jin Soo"}},{"Key":"CAR3", "Record":{"colour":"yellow","make":"Volkswagen","model":"Passat","owner":"Max"}},{"Key":"CAR4", "Record":{"colour":"black","make":"Tesla","model":"S","owner":"Adriana"}},{"Key":"CAR5", "Record":{"colour":"purple","make":"Peugeot","model":"205","owner":"Michel"}},{"Key":"CAR6", "Record":{"colour":"white","make":"Chery","model":"S22L","owner":"Aarav"}},{"Key":"CAR7", "Record":{"colour":"violet","make":"Fiat","model":"Punto","owner":"Pari"}},{"Key":"CAR8", "Record":{"colour":"indigo","make":"Tata","model":"Nano","owner":"Valeria"}},{"Key":"CAR9", "Record":{"colour":"brown","make":"Holden","model":"Barina","owner":"Shotaro"}}]
  [user002@earth fabric14-fabcar-testnet]$ 
  ```
