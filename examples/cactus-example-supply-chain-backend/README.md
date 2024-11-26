# Hyperledger Cactus Example - Supply Chain App


## Usage

1. Execute the following from:
    ```sh
    docker run \
      --rm \
      --privileged \
      -p 3000:3000 \
      -p 3100:3100 \
      -p 3200:3200 \
      -p 4000:4000 \
      -p 4100:4100 \
      -p 4200:4200 \
      ghcr.io/hyperledger/cactus-example-supply-chain-app:2024-03-08--pr-3059-1
    ```
2. Observe the example application pulling up in the logs
   1. the test ledger containers,
   2. a test consortium with multiple members and their Cactus nodes
3. Wait for the output to show the message `INFO (api-server): Cactus Cockpit reachable http://127.0.0.1:3200`
4. Visit http://127.0.0.1:3200 in your web browser with Javascript enabled

## Building and running the container locally

```sh
# Change directories to the project root

# Build the docker image and tag it as "scaeb" for supply chain app example backend
DOCKER_BUILDKIT=1 docker build --file \
  ./examples/cactus-example-supply-chain-backend/Dockerfile \
  . \
  --tag scaeb \
  --tag ghcr.io/hyperledger/cactus-example-supply-chain-app:$(git describe --contains --all HEAD | sed -r 's,/,-,g')_$(git rev-parse --short HEAD)_$(date -u +"%Y-%m-%dT%H-%M-%SZ")

# Run the built image with ports mapped to the host machine as you see fit
# The --privileged flag is required because we use Docker-in-Docker for pulling
# up ledger containers from within the container in order to have the example
# be completely self-contained where you don't need to worry about running
# multiple different ledgers jus this one container.
docker run --rm -it --privileged -p 3000:3000 -p 3100:3100 -p 3200:3200 -p 4000:4000 -p 4100:4100 -p 4200:4200 scaeb
```

Building the image with a specific npm package version:

```sh
DOCKER_BUILDKIT=1 docker build \
  --build-arg NPM_PKG_VERSION=jwt-supply-chain \
  --file ./examples/cactus-example-supply-chain-backend/Dockerfile \
  --tag scaeb \
  ./
```

## Running the Example Application Locally

> Make sure you have all the dependencies set up as explained in `BUILD.md`

On the terminal, issue the following commands:

1. `npm run enable-corepack`
2. `npm run configure`
3. `yarn start:example-supply-chain`

## Debugging the Example Application Locally

On the terminal, issue the following commands (steps 1 to 6) and then perform the rest of the steps manually.

1. `npm run enable-corepack`
2. `yarn run configure`
3. `yarn build:dev`
4. `cd ./examples/cactus-example-supply-chain-backend/`
5. `yarn install`
6. `cd ../../`
7. Locate the `.vscode/template.launch.json` file
8. Within that file locate the entry named `"Example: Supply Chain App"`
9. Copy the VSCode debug definition object from 2) to your `.vscode/launch.json` file
10. At this point the VSCode `Run and Debug` panel on the left should have an option also titled `"Example: Supply Chain App"` which starts the application
11. When the application finishes loading, the JWT token generated is displayed on the terminal
12. Visit http://localhost:3200 in a web browser with Javascript enabled and insert the token when prompted

## Live Reloading the GUI Application

1. `npm run enable-corepack`
2. `npm run configure`
3. `yarn build:dev`
4. Locate the `.vscode/template.launch.json` file
5. Within that file locate the entry named `"Example: Supply Chain App"`
6. Copy the VSCode debug definition object from 2) to your `.vscode/launch.json` file
7. At this point the VSCode `Run and Debug` panel on the left should have an option also titled `"Example: Supply Chain App"` which starts the application
8. `cd ./examples/cactus-example-supply-chain-frontend/`
9. `yarn serve:proxy`
10. When the application finishes loading, the JWT token generated is displayed on the terminal
11. Visit http://localhost:8000 in a web browser with Javascript enabled and insert the token when prompted
12. At this point if you modify the source code of the GUI application under the `./examples/cactus-example-supply-chain-frontend/` path it will automatically reload the browser window (you will need to paste in the JWT again when this happens)
