# fabric-docker-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

An all in one fabric docker image with the `fabric-samples` repo fully embedded.

## Usage

### Building Local Image

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/fabric-all-in-one/ -f ./tools/docker/fabric-all-in-one/Dockerfile_v1.4.x -t faio14x
```
### VSCode

## Usage

### Visual Studio Code

Example `.vscode/tasks.json` file for building/running the image:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Docker - BUILD and TAG: 1.4.x",
      "type": "shell",
      "command": "docker build . -f Dockerfile_v1.4.x -t hyperledger/cactus-fabric-all-in-one:1.4.8"
    },
    {
      "label": "Docker - BUILD and TAG: 2.x",
      "type": "shell",
      "command": "docker build . -f Dockerfile_v2.x -t hyperledger/cactus-fabric-all-in-one:2.2.0"
    },
    {
      "label": "Docker Compose - BUILD",
      "type": "shell",
      "command": "docker-compose build --force-rm"
    },
    {
      "label": "Docker Compose - UP",
      "type": "shell",
      "command": "docker-compose up --force-recreate "
    }
  ]
}
```

### Local Image Builds

From the project root:

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/fabric-all-in-one/ -f ./tools/docker/fabric-all-in-one/Dockerfile_v2.x -t faio2x
docker run --detach --privileged --publish-all --env FABRIC_VERSION=2.2.0 faio2x

docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                     PORTS                                                                                                                                                                                                                                                                                                                                                                                  NAMES
db676059b79e        faio2x              "/usr/bin/supervisor…"   9 minutes ago       Up 9 minutes   0.0.0.0:32924->22/tcp, 0.0.0.0:32923->2375/tcp, 0.0.0.0:32922->2376/tcp, 0.0.0.0:32921->5984/tcp, 0.0.0.0:32920->6984/tcp, 0.0.0.0:32919->7050/tcp, 0.0.0.0:32918->7051/tcp, 0.0.0.0:32917->7054/tcp, 0.0.0.0:32916->7984/tcp, 0.0.0.0:32915->8051/tcp, 0.0.0.0:32914->8054/tcp, 0.0.0.0:32913->8984/tcp, 0.0.0.0:32912->9001/tcp, 0.0.0.0:32911->9051/tcp, 0.0.0.0:32910->10051/tcp   sharp_clarke

docker cp db676059b79e:/etc/hyperledger/cactus/fabric-aio-image.key ./fabric-aio-image.key

ssh root@localhost -p 32924 -i fabric-aio-image.key
```

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/fabric-all-in-one/ -f ./tools/docker/fabric-all-in-one/Dockerfile_v1.4.x  -t faio14x
docker run --detach --privileged --publish-all --env FABRIC_VERSION=1.4.8 faio14x

docker ps

CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                            PORTS                                                                                                                                                                                                                                                                                                                                                                                  NAMES
c09eb94d94d3        faio14x             "/usr/bin/supervisor…"   5 seconds ago       Up 4 seconds (health: starting)   0.0.0.0:32990->22/tcp, 0.0.0.0:32989->2375/tcp, 0.0.0.0:32988->2376/tcp, 0.0.0.0:32987->5984/tcp, 0.0.0.0:32986->6984/tcp, 0.0.0.0:32985->7050/tcp, 0.0.0.0:32984->7051/tcp, 0.0.0.0:32983->7054/tcp, 0.0.0.0:32982->7984/tcp, 0.0.0.0:32981->8051/tcp, 0.0.0.0:32980->8054/tcp, 0.0.0.0:32979->8984/tcp, 0.0.0.0:32978->9001/tcp, 0.0.0.0:32977->9051/tcp, 0.0.0.0:32976->10051/tcp   funny_jepsen


docker cp c09eb94d94d3:/etc/hyperledger/cactus/fabric-aio-image.key ./fabric-aio-image.key
ssh root@localhost -p 32990 -i fabric-aio-image.key
```

### Running Fabric CLI Container Commands

For Fabric 1.4.x

```sh
$ docker exec -it --workdir /fabric-samples/fabcar/ dindy docker exec cli peer chaincode query --channelID mychannel --name fabcar --ctor '{"Args": [], "Function": "queryAllCars"}'
[{"Key":"CAR0", "Record":{"colour":"blue","make":"Toyota","model":"Prius","owner":"Tom"}},{"Key":"CAR1", "Record":{"colour":"red","make":"Ford","model":"Mustang","owner":"Brad"}},{"Key":"CAR2", "Record":{"colour":"green","make":"Hyundai","model":"Tucson","owner":"Jin Soo"}},{"Key":"CAR3", "Record":{"colour":"yellow","make":"Volkswagen","model":"Passat","owner":"Max"}},{"Key":"CAR4", "Record":{"colour":"black","make":"Tesla","model":"S","owner":"Adriana"}},{"Key":"CAR5", "Record":{"colour":"purple","make":"Peugeot","model":"205","owner":"Michel"}},{"Key":"CAR6", "Record":{"colour":"white","make":"Chery","model":"S22L","owner":"Aarav"}},{"Key":"CAR7", "Record":{"colour":"violet","make":"Fiat","model":"Punto","owner":"Pari"}},{"Key":"CAR8", "Record":{"colour":"indigo","make":"Tata","model":"Nano","owner":"Valeria"}},{"Key":"CAR9", "Record":{"colour":"brown","make":"Holden","model":"Barina","owner":"Shotaro"}}]
```

For Fabric 2.x

```sh
cd /fabric-samples/test-network
export PATH=${PWD}/../bin:${PWD}:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
# for peer command issued to peer0.org1.example.com
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer chaincode query --channelID mychannel --name fabcar --ctor '{"Args": [], "Function": "queryAllCars"}'
[{"Key":"CAR0","Record":{"make":"Toyota","model":"Prius","colour":"blue","owner":"Tom"}},{"Key":"CAR1","Record":{"make":"Ford","model":"Mustang","colour":"red","owner":"Brad"}},{"Key":"CAR2","Record":{"make":"Hyundai","model":"Tucson","colour":"green","owner":"Jin Soo"}},{"Key":"CAR277","Record":{"make":"Trabant","model":"601","colour":"Blue","owner":"4cf0a45d-1349-4900-927c-d03e2a2c4dfc"}},{"Key":"CAR3","Record":{"make":"Volkswagen","model":"Passat","colour":"yellow","owner":"Max"}},{"Key":"CAR4","Record":{"make":"Tesla","model":"S","colour":"black","owner":"Adriana"}},{"Key":"CAR5","Record":{"make":"Peugeot","model":"205","colour":"purple","owner":"Michel"}},{"Key":"CAR6","Record":{"make":"Chery","model":"S22L","colour":"white","owner":"Aarav"}},{"Key":"CAR7","Record":{"make":"Fiat","model":"Punto","colour":"violet","owner":"Pari"}},{"Key":"CAR8","Record":{"make":"Tata","model":"Nano","colour":"indigo","owner":"Valeria"}},{"Key":"CAR9","Record":{"make":"Holden","model":"Barina","colour":"brown","owner":"Shotaro"}}]
```
