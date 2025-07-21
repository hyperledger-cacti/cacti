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

1. `yarn install` && `npm run enable-corepack`
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

## Environment Variables

This project uses environment variables for configuration. Create a `process.env` file in the root directory of this project with the following variables:

```
# Ethereum RPC Endpoints
ETHEREUM_SEPOLIA_RPC_ENDPOINT=https://eth-sepolia.g.alchemy.com/v2/your-api-key-here

# Wallet credentials
PRIVATE_KEY=your-private-key-here

# Contract addresses (will be filled after deployment)
ROLE_MANAGER_CONTRACT_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS
PAYMENT_CONTRACT_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS

# Logging
LOG_LEVEL=INFO
```

This approach keeps sensitive information like API keys, private keys, and contract addresses out of the codebase. The application will check for these required environment variables at startup.

## Cross-Chain Functionality

This example demonstrates Hyperledger Cactus's powerful cross-chain capabilities, particularly in the context of a supply chain application for bamboo harvesting. Key features include:

### Role-Based Access Control via Ethereum

- User authentication leverages Sepolia(Ethereum) wallet signatures
- The RoleManager smart contract on Ethereum Sepolia manages roles (manufacturer, customer)
- Users' Sepolia(Ethereum) wallet addresses are mapped to corresponding Fabric identities

### Supply Chain Data Management via Hyperledger Fabric

- Bamboo harvest data is stored on a Hyperledger Fabric network
- Different access levels are maintained for public and private data
- Manufacturers can insert and view detailed records
- Customers can view only basic public information

### Cross-Chain Integration

- Ethereum handles authentication and role verification
- Fabric manages the actual supply chain data
- Cactus connectors provide seamless integration between chains
- Role verification on Ethereum determines access permissions for Fabric operations

### Data Linking Features

- Manufacturers can link private data records with public data
- Support for private notes visible only to authorized parties
- Enhanced traceability while maintaining privacy where needed

This implementation showcases how Hyperledger Cactus enables different ledgers to work together, leveraging the strengths of each platform while providing a unified interface for applications.

## Component Documentation

### Backend Endpoints

#### Manufacturer Data Management

##### InsertManufacturerDataEndpoint

Located at `examples/cactus-example-supply-chain-business-logic-plugin/src/main/typescript/business-logic-plugin/web-services/insert-manufacturer-data-endpoint.ts`

This endpoint allows manufacturers to insert product data into the supply chain. Key features:

- **Authentication**: Uses Sepolia(Ethereum) wallet signatures for secure identity verification
- **Role Verification**: Checks if the sender has manufacturer privileges using RoleManager smart contract
- **Cross-Chain Logic**: Stores data on Hyperledger Fabric after verifying permissions on Ethereum
- **Data Privacy**: Manages both public data (visible to all) and private data (visible only to manufacturers)
- **Connector Integration**: Leverages Cactus connectors for Ethereum and Fabric

##### ListManufacturerDataEndpoint

Located at `examples/cactus-example-supply-chain-business-logic-plugin/src/main/typescript/business-logic-plugin/web-services/list-manufacturer-data-endpoint.ts`

This endpoint allows users to fetch manufacturer data from the supply chain with role-based access control:

- **Role-Based Data Access**: Different data visibility based on user role (manufacturer vs. customer)
- **Authentication**: Secure wallet signature verification
- **Enhanced Record Handling**: Support for retrieving both basic and detailed records
- **MSP Management**: Maps Ethereum identities to appropriate Fabric MSP IDs
- **Error Handling**: Comprehensive error handling with detailed feedback

#### Payment Processing

##### ProcessPaymentEndpoint

Located at `examples/cactus-example-supply-chain-business-logic-plugin/src/main/typescript/business-logic-plugin/web-services/process-payment-endpoint.ts`

This endpoint enables payment processing across different chains:

- **Transaction Verification**: Verifies payment transactions using signature validation
- **Cross-Chain Status Updates**: Updates product status on Fabric after payment on Ethereum
- **Reference Management**: Maintains transaction references for tracking across chains
- **Security**: Ensures proper authentication and authorization for transactions
- **Failure Handling**: Robust error handling for failed transactions

### Frontend Modules

#### Role Manager Module

Located at `examples/cactus-example-supply-chain-frontend/src/app/role-manager/`

This Angular module manages user roles across the application:

- **Role Assignment**: Interface for admins to assign manufacturer/customer roles
- **Role Verification**: Checks user roles for proper UI rendering and access control
- **Smart Contract Integration**: Communicates with RoleManager contract on Ethereum
- **Identity Mapping**: Maps Ethereum wallet addresses to Fabric identities
- **UI Components**: User interface for role management (add/remove roles)

#### Payment Module

Located at `examples/cactus-example-supply-chain-frontend/src/app/payment/`

This Angular module handles all payment-related functionality:

- **Payment List**: View and manage payment records
- **Payment Detail**: View detailed information about specific payments
- **Transaction Receipt**: Display transaction receipts after payments
- **Transaction Receipt Modal**: Interactive modal for payment confirmation
- **Smart Contract Integration**: Interacts with Payment contract on Ethereum
- **Status Tracking**: Monitors payment status and updates UI accordingly

#### Manufacturer Data Module

Located at `examples/cactus-example-supply-chain-frontend/src/app/manufacturer-data/`

This Angular module manages manufacturer product data:

- **Manufacturer Data List**: View all manufacturer products
- **Manufacturer Data Detail**: View and edit detailed product information
- **Access Control**: Shows different data based on user role
- **Data Validation**: Validates manufacturer data before submission
- **Integration**: Communicates with backend endpoints for data operations

### Frontend Services

#### PaymentService

Located at `examples/cactus-example-supply-chain-frontend/src/app/common/services/payment.service.ts`

This service handles all payment-related operations:

- **Payment Creation**: Create new payment records on the blockchain
- **Payment Processing**: Process payments with Ethereum transactions
- **Status Management**: Track and update payment status
- **Product Status Updates**: Update product status after successful payments
- **Cross-Chain Coordination**: Ensure consistent state across Ethereum and Fabric
- **Transaction History**: Track and display transaction history
- **Error Handling**: Comprehensive error handling for payment operations

#### WalletService

Located at `examples/cactus-example-supply-chain-frontend/src/app/common/services/wallet.service.ts`

This service manages wallet connections and authentication:

- **Wallet Connection**: Connect/disconnect to Ethereum wallets (MetaMask)
- **Signature Management**: Sign messages for authentication
- **Role Checking**: Verify user roles (manufacturer, customer, admin)
- **Header Generation**: Generate authentication headers for API calls
- **Smart Contract Integration**: Initialize and interact with role management contracts
- **Event Handling**: Manage wallet events and state changes
- **Security**: Ensure secure authentication flow with signature verification

#### AuthConfig

Located at `examples/cactus-example-supply-chain-frontend/src/app/common/auth-config.ts`

This service manages authentication configuration:

- **Token Management**: Store and manage authentication tokens
- **Role Verification**: Provide methods to check user roles
- **Configuration**: Central configuration for authentication-related settings
- **JWT Handling**: Process JWT payloads for user information
