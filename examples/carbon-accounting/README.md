# Cactus Blockchain Carbon Accounting Example

This is an implementation of the Hyperledger CA2 SIG's similarly named project
(which has multiple different DLTs working together),
but one that uses Hyperledger Cactus as its development framework instead of
relying on the vanilla ledger SDKs.

At the same time this is also a case study of how can a real world project be
delivered with Hyperledger Cactus.

## Usage

Further details and documentation to be defined later.

## Building and running the container locally

```sh
# Change directories to the project root

# Build the dockar image and tag it as "caeb" for carbon accounting example backend
DOCKER_BUILDKIT=1 docker build -f ./examples/carbon-accounting/Dockerfile . -t caeb

# Run the built image with ports mapped to the host machine as you see fit
# The --privileged flag is required because we use Docker-in-Docker for pulling
# up ledger containers from within the container in order to have the example
# be completely self-contained where you don't need to worry about running
# multiple different ledgers just this one container.
docker run --rm -it --privileged -p 3000:3000 -p 3100:3100 -p 3200:3200 -p 4000:4000 -p 4100:4100 -p 4200:4200 caeb
```