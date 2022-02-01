# Indy TestNet Pool

## Abstract
- Docker compose file can be used to build and start test indy pool.
- Pool is available in docker bridge network indy_net (`172.16.0.0/24`)
- Image is based on the upstream - https://github.com/hyperledger/indy-sdk/blob/1.6.x/ci/indy-pool.dockerfile

## How to build
```
docker-compose build
```

## How to start
- `-d` will cause the containers to run in detached mode, can be removed.
```
docker-compose up -d
```

## How to stop
```
docker-compose down
```

## Test - Generate Proof
- You can test the setup by generating a proof using our helper tool in `../../../examples/register-indy-data/`
- Follow build instructions described in `register-indy-data` README.
- Run container to generate proof only, use force flag to overwrite possible leftovers from previous runs. It will save the proof in `/etc/cactus/indy-validator/myproof.json`
```
docker run --rm -ti -v/etc/cactus/:/etc/cactus/ --net="host" req_discounted_cartrade --force --proof_only
```

## Cleanup
```
./script-cleanup.sh
```
