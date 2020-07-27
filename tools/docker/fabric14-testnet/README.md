# fabric-testnet

This package enables you to start minimal configured blockchain network with Hyperledger Fabric v1.4.x

## Starting the network

```sh
docker-compose up -d
```

## Create and joining a channel

docker-compose starts plain fabric network first, and you need to configure a channel to use.

* The following command will create a channel named 'mychannel'
```sh
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel create -o orderer.example.com:7050 -c mychannel -f /etc/hyperledger/configtx/channel.tx
```
* Run this command to join peer0 from Org1 to that channel
```sh
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel join -b mychannel.block
```

## Reference

Please refer to [the original guide](https://xord.one/guide-to-setting-up-your-first-hyperledger-fabric-network-part-1/) which is written by Abdul Sami for further details.




