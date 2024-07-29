# geth-all-in-one

An all in one ethereum/client-go (geth) docker image as described in [go-ethereum documentation](https://geth.ethereum.org/docs/fundamentals/private-network).

- Clique (PoS) is used to mimic mainnet node.
- This docker image is for `testing` and `development` only.
- **Do NOT use in production!**
- Only use provided test account in internal network, don't use it on mainnet / testnets.

## Usage

### Docker Compose

```bash
./script-start-docker.sh
```

or manually:

```bash
docker-compose build && docker-compose up -d
```

### Docker

```bash
# Build
docker build ./tools/docker/geth-all-in-one/ -t cactus_geth_all_in_one

# Run
docker run --rm --name geth_aio_testnet --detach -p 8545:8545 -p 8546:8546 cactus_geth_all_in_one
```

### Examples

#### Attach geth CLI

```bash
docker exec -ti geth_aio_testnet geth --datadir "/root/data" attach

> eth.blockNumber
24
```

### Configure with Hardhat

```javascript
module.exports = {
  // ...
  networks: {
    geth: {
      url: "http://127.0.0.1:8545",
      chainId: 10,
    },
  },
};
```

## Test Setup

- Use typescript [GethTestLedger helper class](../../../packages/cactus-test-geth-ledger) to start this ledger and use it from inside of automatic test.

## Possible improvements

- Replace (deprecated) `eth.personal` with `Clef` - https://geth.ethereum.org/docs/interacting-with-geth/rpc/ns-personal
