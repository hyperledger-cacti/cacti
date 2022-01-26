# Starting Indy Valdiator

## Starting

### Build and run containers

Go to cactus/tools/docker/indy-testnet directory and follow the [instructions](https://github.com/hyperledger/cactus/blob/main/tools/docker/indy-testnet/README.md).
This will build Indy related images and start the containers.

You need to:

- edit `.env` file if necessary (if you are behind firewall).

- run `./run-before-build.sh`.

- run `docker-comopse build` to build images.

- run `docker-compose up` will start the containers. It will pull a docker image (nginx) first time you do this.

You can `Ctrl-c` to stop the containers.

### Verify that containers are actually up

Type following in the host environemnt:

```bash
docker ps | grep -e indy_pool -e nginx -e validator
```

Three containers `indy_pool`, `nginx` and `validator` must be printed.
