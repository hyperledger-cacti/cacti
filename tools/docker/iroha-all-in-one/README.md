# Iroha All in One Image

The Iroha All in One Image (Iroha AIO) is a convenient tool for test automation purposes. It is flexible enough to start programmatically without extra dependencies or host machines such as specific Iroha network/volumes, making it labor-saving for us to carry out automated tests.

Iroha AIO trims everything down to make it as slim as possible but ensures all functionalities of Iroha. This makes it much easier to pull up tests about functionality rather than running a production-grade ledger. The smaller package also makes the production environment more robust since the CI environment machines are not very powerful. An all in one Iroha + Postgres image that uses about 0.5 GB of RAM and one vCPU worth of hardware resources idling.

The following ports are open on the container:

```yaml
- 50051:50051/tcp # Iroha RPC - Torii
- 5432:5432/tcp # PostgreSQL 
```

## Build an image locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/iroha-all-in-one/ -t iaio
```


## Shell into a running container:

```sh
docker run -it --entrypoint bash iaio
```

## Logs of Iroha Ledger via shell:

```sh
docker logs iaio
```
