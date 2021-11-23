# Building Hyperledger Iroha testnet

## Abstract

This tool allows you to launch test net on a single instance using Iroha's docker container.

In addition, you can launch 4 instances of Iroha on your PC or cloud environment.

In either case, you can run Iroha's API using a test script called setup-iroha-wallet.

## How to run

### Single Host Single instance

Use docker-compose to launch it as follows: 

```
$ docker-compose up -d
```

If it starts normally, the docker ps command will display:

```
$ docker ps
CONTAINER ID   IMAGE                     COMMAND                  CREATED              STATUS              PORTS                                           NAMES
4370a2679d7e   hyperledger/iroha:1.2.1   "/opt/iroha/config/e…"   About a minute ago   Up About a minute   0.0.0.0:50051->50051/tcp, :::50051->50051/tcp   iroha_node_1
f14813ae92b9   postgres:13.2-alpine      "docker-entrypoint.s…"   About a minute ago   Up About a minute   5432/tcp                                        iroha_postgres_1
```

You can view the Iroha execution log using the docker logs command.

```
$ docker logs -f iroha_node_1
```

### Single Host 4 Instances

You can also run four Iroha instances on a single PC or cloud for testing. In this case, do the following:

```
$ cd example/node4
$ docker-compose up -d
```

In this case, Iroha's distributed ledger and PostgreSQL DB used for [WSV](https://iroha.readthedocs.io/en/main/concepts_architecture/architecture.html#world-state-view) are created on the host and volume mounted on docker. Depending on the version of docker, you may get an error due to permission issues when writing blocks to the directory for the distributed ledger.

In such a case, delete the directory created as iroha1 ~ iroha4 and the files under it, and then execute the setup.sh script.
In this case, do the following:

```
$ sudo rm -fr iroha?
$ bash setup.sh
```
In this state, try starting Iroha again with docker-compose.

```
$ docker-compose up -d
```

## View Iroha Log

In the case of Single Host 4 instance, you can display the log of each Iroha on 4 terminal screens.

In this case, first open the four terminal screens. In addition, open 5 screens in total, and execute the following script from the last terminal.

```
$ cd example/node4
$ bash logs4.sh
```

This script keeps displaying the Iroha logs obtained by docker logs -f on the screens of the four terminals starting with the one with the smallest terminal number. Of course, you can use the docker logs command individually.

## Test script

You can run the test script while Iroha is running. In this case, run the setup-iroha-wallet.sh script located in the example / iroha-wallet directory.

```
$ cd example/iroha-wallet
$ bash setup-iroha-wallet.sh
```

This script performs the following transactional operations:

1. Create an alice account
2. Create a bob account
3. Create an asset called coolcoin
4. Create an asset called hotcoin
5. Add 1000 units of cool coin
6. Add 1000 units of hot coin
7. Transfer 500 units of cool coin to alice
8. Transfer 500 units of hot coin to alice
9. Transfer 500 units of cool coin to bob
10. Transfer 500 units of hotcoin to bob

After performing all transaction operations, the status is queried each time.

## How to stop

If you want to stop it, run docker-compose down. Here, in the case of Single Host Single Instance, execute it in the iroha-testnet directory. For Single Host 4Instances, run in the example/node4 directory.

Since we are using the ccache-data volume in the docker-compose.yml file, it's a good idea to add the "-v" option when running docker-compose down.

```
$ docker-compose down -v
```

## References

Please refer to [Hyperledger Iroha documentation](https://iroha.readthedocs.io/en/main/index.html) for more information.
