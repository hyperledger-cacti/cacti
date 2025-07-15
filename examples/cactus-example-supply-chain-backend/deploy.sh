#!/bin/bash

# Load .env file
source .env

# Deploy RoleManager contract
echo "Deploying RoleManager contract..."
forge create src/main/solidity/RoleManager.sol:RoleManager \
  --rpc-url $ALCHEMY_RPC_URL \
  --private-key $PRIVATE_KEY

echo "Enter RoleManager address: "
read ROLE_MANAGER

# Deploy Payment contract with RoleManager address
echo "Deploying Payment contract..."
forge create src/main/solidity/Payment.sol:Payment \
  --rpc-url $ALCHEMY_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $ROLE_MANAGER

echo "Enter Payment contract address: "
read PAYMENT

# Show deployment summary
echo "Deployment Summary:"
echo "RoleManager: $ROLE_MANAGER"
echo "Payment: $PAYMENT"
echo "Done!"

# Save to infrastructure file location
echo "Updating the contract addresses in your codebase? (y/n)"
read update
if [ "$update" = "y" ]; then
  echo "Enter path to file to update (e.g. src/main/typescript/infrastructure/supply-chain-app-dummy-infrastructure.ts):"
  read filepath
  if [ -f "$filepath" ]; then
    sed -i "s|const ROLE_MANAGER_CONTRACT_ADDRESS = \".*\"|const ROLE_MANAGER_CONTRACT_ADDRESS = \"$ROLE_MANAGER\"|" $filepath
    sed -i "s|const PAYMENT_CONTRACT_ADDRESS = \".*\"|const PAYMENT_CONTRACT_ADDRESS = \"$PAYMENT\"|" $filepath
    echo "Updated contract addresses in $filepath"
  else
    echo "File not found: $filepath"
  fi
fi
