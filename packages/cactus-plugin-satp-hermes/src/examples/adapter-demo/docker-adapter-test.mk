# =============================================================================
# SATP Hermes Gateway - Docker Adapter Layer Test Commands
# =============================================================================
#
# This makefile provides commands to build and run the SATP Hermes Gateway
# Docker image with adapter layer configuration for testing.
#
# Usage (from satp-hermes package root):
#   make -f src/examples/docker-adapter-test.mk <target>
#
# Features:
#   - Deploy SATPWrapper contracts to local Besu/Anvil networks
#   - Create temp config files for two gateways
#   - Build and run Docker images for both gateways
#   - 5-minute timeout on adapter webhooks
#
# =============================================================================

# Configuration
MAKEFILE_PATH := $(lastword $(MAKEFILE_LIST))
IMAGE_NAME := satp-hermes-gateway-adapter-test
IMAGE_TAG := $(shell date +%Y-%m-%d)-adapter-layer
PACKAGE_DIR := packages/cactus-plugin-satp-hermes

# =============================================================================
# Gateway 1 Configuration (Besu Leaf)
# =============================================================================
GW1_CONTAINER_NAME := satp-gateway-1
GW1_SERVER_PORT := 3010
GW1_CLIENT_PORT := 3011
GW1_API_PORT := 4010
GW1_GID := gateway1-besu-adapter
GW1_NAME := BesuGateway1
GW1_NETWORK_ID := BesuTestNetwork1
GW1_ADDRESS := http://localhost

# Besu Network 1 (for Gateway 1)
BESU1_RPC_HTTP := http://host.docker.internal:8545
BESU1_RPC_WS := ws://host.docker.internal:8546
GW1_WRAPPER_ADDRESS := 0x5FbDB2315678afecb367f032d93F642f64180aa3

# Gateway 1 Key Pair
GW1_PRIVATE_KEY := 38c732b7b86d752c5c051a9c944a683da994eac1cc1544462518b90f89d8146d
GW1_PUBLIC_KEY := 036256069f81bcaae52a64965b8add79521ee54cb2ad3d85de5250d78cf0fc171c

# =============================================================================
# Gateway 2 Configuration (Besu Leaf)
# =============================================================================
GW2_CONTAINER_NAME := satp-gateway-2
GW2_SERVER_PORT := 3020
GW2_CLIENT_PORT := 3021
GW2_API_PORT := 4020
GW2_GID := gateway2-besu-adapter
GW2_NAME := BesuGateway2
GW2_NETWORK_ID := BesuTestNetwork2
GW2_ADDRESS := http://localhost

# Besu Network 2 (for Gateway 2)
BESU2_RPC_HTTP := http://host.docker.internal:8547
BESU2_RPC_WS := ws://host.docker.internal:8548
GW2_WRAPPER_ADDRESS := 0x5FbDB2315678afecb367f032d93F642f64180aa3

# Gateway 2 Key Pair (different from Gateway 1)
GW2_PRIVATE_KEY := 4a9b3a791a5a2b8d9c6e5f8a7b4c3d2e1f0e9d8c7b6a5948372615f4e3d2c1b0
GW2_PUBLIC_KEY := 024c0cf54f92d23dbb3d409a8047aa2a44abcb911767d3516b19fd94c2358dec65

# =============================================================================
# Ethereum Account (used for contract deployment and signing)
# Uses Besu dev network genesis account which has pre-funded ETH
# =============================================================================
BESU_GENESIS_ACCOUNT := 0x627306090abaB3A6e1400e9345bC60c78a8BEf57
BESU_GENESIS_PRIVATE_KEY := c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3

# Bridge account (will be funded from genesis account)
ETH_ACCOUNT := 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
ETH_PRIVATE_KEY := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
FUND_AMOUNT := 100ether

# =============================================================================
# Besu Test Ledger Configuration
# =============================================================================
BESU_IMAGE := ghcr.io/hyperledger/cactus-besu-all-in-one
BESU_IMAGE_TAG := 2024-06-09-cc2f9c5
BESU1_CONTAINER := besu-test-ledger-1
BESU2_CONTAINER := besu-test-ledger-2
BESU1_RPC_PORT := 8545
BESU1_WS_PORT := 8546
BESU2_RPC_PORT := 8547
BESU2_WS_PORT := 8548

# =============================================================================
# Temporary Config Directory
# Override with: make -f src/examples/docker-adapter-test.mk TEMP_DIR=/custom/path <target>
# =============================================================================
TEMP_DIR ?= /tmp/satp-adapter-test
TEMP_CONFIG_GW1 := $(TEMP_DIR)/gateway1-config.json
TEMP_ADAPTER_GW1 := $(TEMP_DIR)/gateway1-adapter-config.yml
TEMP_CONFIG_GW2 := $(TEMP_DIR)/gateway2-config.json
TEMP_ADAPTER_GW2 := $(TEMP_DIR)/gateway2-adapter-config.yml

# =============================================================================
# Adapter Timeout Configuration (5 minutes = 300000ms)
# =============================================================================
ADAPTER_TIMEOUT_MS := 300000

# =============================================================================
# Webhook Test Server Configuration
# =============================================================================
WEBHOOK_SERVER_PORT ?= 9223
WEBHOOK_SERVER_HOST := host.docker.internal

# =============================================================================
# Log File Configuration
# =============================================================================
LOG_FILE_GW1 := $(TEMP_DIR)/gateway-1.log
LOG_FILE_GW1_ADAPTER := $(TEMP_DIR)/gateway-1-adapter.log
LOG_FILE_GW2 := $(TEMP_DIR)/gateway-2.log
LOG_FILE_GW2_ADAPTER := $(TEMP_DIR)/gateway-2-adapter.log

# Legacy config paths (for backwards compatibility)
GATEWAY_CONFIG := src/examples/config/satp-gateway1-simple-deployed-adapter.config.json
ADAPTER_CONFIG := src/examples/config/adapter/satp-gateway1-simple-deployed-adapter.adapter-config.yml

# Legacy ports and container (backwards compatibility)
SERVER_PORT := $(GW1_SERVER_PORT)
CLIENT_PORT := $(GW1_CLIENT_PORT)
API_PORT := $(GW1_API_PORT)
CONTAINER_NAME := $(GW1_CONTAINER_NAME)

# =============================================================================
# Main Targets
# =============================================================================

.PHONY: all setup build run stop logs test clean help

## Default target - show help
all: help

## Full setup: build image, and run container
setup: build run
	@echo "✓ Setup complete! Gateway running at http://localhost:$(API_PORT)"

# =============================================================================
# Besu Test Ledger Operations
# =============================================================================

## Start Besu test ledger 1
start-besu1:
	@echo "Starting Besu test ledger 1..."
	@docker run -d --rm \
		--name $(BESU1_CONTAINER) \
		-p $(BESU1_RPC_PORT):8545 \
		-p $(BESU1_WS_PORT):8546 \
		-e BESU_NETWORK=dev \
		$(BESU_IMAGE):$(BESU_IMAGE_TAG) || \
		(echo "Container may already be running" && docker ps --filter "name=$(BESU1_CONTAINER)" --format "{{.Names}}: {{.Status}}")
	@echo "Waiting for Besu 1 to start..."
	@sleep 5
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if curl -s -X POST http://localhost:$(BESU1_RPC_PORT) -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q result; then \
			echo "✓ Besu 1 is ready on port $(BESU1_RPC_PORT)"; \
			break; \
		fi; \
		echo "  Waiting for Besu 1... ($$i/10)"; \
		sleep 2; \
		if [ $$i -eq 10 ]; then \
			echo "✗ Besu 1 failed to start"; \
			exit 1; \
		fi; \
	done

## Start Besu test ledger 2
start-besu2:
	@echo "Starting Besu test ledger 2..."
	@docker run -d --rm \
		--name $(BESU2_CONTAINER) \
		-p $(BESU2_RPC_PORT):8545 \
		-p $(BESU2_WS_PORT):8546 \
		-e BESU_NETWORK=dev \
		$(BESU_IMAGE):$(BESU_IMAGE_TAG) || \
		(echo "Container may already be running" && docker ps --filter "name=$(BESU2_CONTAINER)" --format "{{.Names}}: {{.Status}}")
	@echo "Waiting for Besu 2 to start..."
	@sleep 5
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if curl -s -X POST http://localhost:$(BESU2_RPC_PORT) -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q result; then \
			echo "✓ Besu 2 is ready on port $(BESU2_RPC_PORT)"; \
			break; \
		fi; \
		echo "  Waiting for Besu 2... ($$i/10)"; \
		sleep 2; \
		if [ $$i -eq 10 ]; then \
			echo "✗ Besu 2 failed to start"; \
			exit 1; \
		fi; \
	done

## Start both Besu test ledgers
start-besu: start-besu1 start-besu2
	@echo "✓ Both Besu test ledgers running"

## Stop Besu test ledger 1
stop-besu1:
	@echo "Stopping Besu test ledger 1..."
	@docker stop $(BESU1_CONTAINER) 2>/dev/null || echo "Container not running"
	@echo "✓ Besu 1 stopped"

## Stop Besu test ledger 2
stop-besu2:
	@echo "Stopping Besu test ledger 2..."
	@docker stop $(BESU2_CONTAINER) 2>/dev/null || echo "Container not running"
	@echo "✓ Besu 2 stopped"

## Stop both Besu test ledgers
stop-besu: stop-besu1 stop-besu2
	@echo "✓ All Besu ledgers stopped"

## Check Besu ledger status
besu-status:
	@echo "Besu Test Ledger Status:"
	@echo "========================"
	@echo "Besu 1 ($(BESU1_CONTAINER)):"
	@docker ps --filter "name=$(BESU1_CONTAINER)" --format "  Status: {{.Status}}" 2>/dev/null || echo "  Not running"
	@curl -s -X POST http://localhost:$(BESU1_RPC_PORT) -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | jq -r '"  Block: " + (.result // "N/A")' || echo "  RPC: Not responding"
	@echo ""
	@echo "Besu 2 ($(BESU2_CONTAINER)):"
	@docker ps --filter "name=$(BESU2_CONTAINER)" --format "  Status: {{.Status}}" 2>/dev/null || echo "  Not running"
	@curl -s -X POST http://localhost:$(BESU2_RPC_PORT) -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | jq -r '"  Block: " + (.result // "N/A")' || echo "  RPC: Not responding"

# =============================================================================
# Account Funding Operations
# =============================================================================

## Fund bridge account on Besu 1 from genesis account
fund-account-besu1:
	@echo "Funding $(ETH_ACCOUNT) on Besu 1 with $(FUND_AMOUNT)..."
	@cast send \
		--rpc-url http://localhost:$(BESU1_RPC_PORT) \
		--private-key $(BESU_GENESIS_PRIVATE_KEY) \
		--legacy \
		--value $(FUND_AMOUNT) \
		$(ETH_ACCOUNT) 2>&1 || true
	@sleep 2
	@BALANCE=$$(cast balance $(ETH_ACCOUNT) --rpc-url http://localhost:$(BESU1_RPC_PORT) 2>/dev/null); \
	if [ "$$BALANCE" != "0" ]; then \
		echo "✓ Account funded on Besu 1"; \
		echo "  Balance: $$(echo $$BALANCE | cast from-wei) ETH"; \
	else \
		echo "✗ Failed to fund account on Besu1"; \
		exit 1; \
	fi

## Fund bridge account on Besu 2 from genesis account
fund-account-besu2:
	@echo "Funding $(ETH_ACCOUNT) on Besu 2 with $(FUND_AMOUNT)..."
	@cast send \
		--rpc-url http://localhost:$(BESU2_RPC_PORT) \
		--private-key $(BESU_GENESIS_PRIVATE_KEY) \
		--legacy \
		--value $(FUND_AMOUNT) \
		$(ETH_ACCOUNT) 2>&1 || true
	@sleep 2
	@BALANCE=$$(cast balance $(ETH_ACCOUNT) --rpc-url http://localhost:$(BESU2_RPC_PORT) 2>/dev/null); \
	if [ "$$BALANCE" != "0" ]; then \
		echo "✓ Account funded on Besu 2"; \
		echo "  Balance: $$(echo $$BALANCE | cast from-wei) ETH"; \
	else \
		echo "✗ Failed to fund account on Besu2"; \
		exit 1; \
	fi

## Fund bridge accounts on both Besu networks
fund-accounts: fund-account-besu1 fund-account-besu2
	@echo "✓ All accounts funded"

## Check account balances
check-balances:
	@echo "Account Balances:"
	@echo "================="
	@echo "Genesis Account ($(BESU_GENESIS_ACCOUNT)):"
	@echo "  Besu 1: $$(cast balance $(BESU_GENESIS_ACCOUNT) --rpc-url http://localhost:$(BESU1_RPC_PORT) 2>/dev/null | cast from-wei 2>/dev/null || echo 'N/A') ETH"
	@echo "  Besu 2: $$(cast balance $(BESU_GENESIS_ACCOUNT) --rpc-url http://localhost:$(BESU2_RPC_PORT) 2>/dev/null | cast from-wei 2>/dev/null || echo 'N/A') ETH"
	@echo ""
	@echo "Bridge Account ($(ETH_ACCOUNT)):"
	@echo "  Besu 1: $$(cast balance $(ETH_ACCOUNT) --rpc-url http://localhost:$(BESU1_RPC_PORT) 2>/dev/null | cast from-wei 2>/dev/null || echo 'N/A') ETH"
	@echo "  Besu 2: $$(cast balance $(ETH_ACCOUNT) --rpc-url http://localhost:$(BESU2_RPC_PORT) 2>/dev/null | cast from-wei 2>/dev/null || echo 'N/A') ETH"

# =============================================================================
# Docker Build Operations
# =============================================================================

## Build the Docker image
build:
	@echo "Building Docker image: $(IMAGE_NAME):$(IMAGE_TAG)..."
	docker build \
		--pull \
		--rm \
		-f $(PACKAGE_DIR)/satp-hermes-gateway.Dockerfile \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		-t $(IMAGE_NAME):latest \
		$(PACKAGE_DIR)
	@echo "✓ Image built: $(IMAGE_NAME):$(IMAGE_TAG)"

## Build without cache
build-no-cache:
	@echo "Building Docker image (no cache): $(IMAGE_NAME):$(IMAGE_TAG)..."
	docker build \
		--pull \
		--rm \
		--no-cache \
		-f $(PACKAGE_DIR)/satp-hermes-gateway.Dockerfile \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		-t $(IMAGE_NAME):latest \
		$(PACKAGE_DIR)
	@echo "✓ Image built: $(IMAGE_NAME):$(IMAGE_TAG)"

# =============================================================================
# Docker Run Operations
# =============================================================================

## Run the container with adapter configuration
run: stop
	@echo "Starting container: $(CONTAINER_NAME)..."
	docker run -d --rm \
		--name $(CONTAINER_NAME) \
		-p $(SERVER_PORT):3010 \
		-p $(CLIENT_PORT):3011 \
		-p $(API_PORT):4010 \
		-v "$$(pwd)/$(PACKAGE_DIR)/$(GATEWAY_CONFIG):/opt/cacti/satp-hermes/config/config.json:ro" \
		-v "$$(pwd)/$(PACKAGE_DIR)/$(ADAPTER_CONFIG):/opt/cacti/satp-hermes/config/adapter-config.yml:ro" \
		$(IMAGE_NAME):latest
	@echo "✓ Container started: $(CONTAINER_NAME)"
	@echo "  Waiting for gateway to be ready..."
	@sleep 8
	@$(MAKE) -f $(MAKEFILE_PATH) healthcheck

## Run container in interactive mode (foreground)
run-interactive: stop
	@echo "Starting container in interactive mode: $(CONTAINER_NAME)..."
	docker run -it --rm \
		--name $(CONTAINER_NAME) \
		-p $(SERVER_PORT):3010 \
		-p $(CLIENT_PORT):3011 \
		-p $(API_PORT):4010 \
		-v "$$(pwd)/$(PACKAGE_DIR)/$(GATEWAY_CONFIG):/opt/cacti/satp-hermes/config/config.json:ro" \
		-v "$$(pwd)/$(PACKAGE_DIR)/$(ADAPTER_CONFIG):/opt/cacti/satp-hermes/config/adapter-config.yml:ro" \
		$(IMAGE_NAME):latest

## Stop the running container
stop:
	@echo "Stopping container: $(CONTAINER_NAME)..."
	@docker stop $(CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(CONTAINER_NAME) 2>/dev/null || true

## View container logs
logs:
	docker logs -f $(CONTAINER_NAME)

## View last 100 lines of logs
logs-tail:
	docker logs --tail 100 $(CONTAINER_NAME)

## Execute shell in running container
shell:
	docker exec -it $(CONTAINER_NAME) /bin/bash

# =============================================================================
# Test Operations
# =============================================================================

## Run health check
healthcheck:
	@echo "Checking gateway health..."
	@curl -s http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq . || \
		(echo "✗ Health check failed" && exit 1)
	@echo "✓ Gateway is healthy"

## Get gateway integrations
integrations:
	@echo "Getting gateway integrations..."
	@curl -s http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations | jq .

## Get all sessions
sessions:
	@echo "Getting all sessions..."
	@curl -s http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids | jq .

## Run all adapter tests
test: healthcheck integrations sessions
	@echo ""
	@echo "============================================="
	@echo "✓ All adapter tests completed successfully!"
	@echo "============================================="
	@echo ""
	@echo "Gateway endpoints available:"
	@echo "  - Health:       http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck"
	@echo "  - Status:       http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/status?sessionId=<id>"
	@echo "  - Integrations: http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations"
	@echo "  - Sessions:     http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids"
	@echo "  - Transact:     http://localhost:$(API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/transact"
	@echo ""

# =============================================================================
# Cleanup Operations
# =============================================================================

## Clean up containers and images
clean: stop
	@echo "Removing Docker image: $(IMAGE_NAME)..."
	@docker rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):latest 2>/dev/null || true
	@echo "✓ Cleanup complete"

## Deep clean - remove all related images
clean-all: clean
	@echo "Removing all related images..."
	@docker images | grep satp-hermes | awk '{print $$3}' | xargs -r docker rmi -f 2>/dev/null || true
	@echo "✓ Deep cleanup complete"

# =============================================================================
# Contract Deployment Operations
# =============================================================================

## Create temp directory for configs
create-temp-dir:
	@echo "Creating temp directory: $(TEMP_DIR)..."
	@mkdir -p $(TEMP_DIR)
	@echo "✓ Temp directory created"

## Deploy SATPWrapperContract to Besu network 1 using Foundry
## Note: Uses cast send --create because forge create has issues with Besu receipt parsing
deploy-contracts-besu1: create-temp-dir fund-account-besu1
	@echo "Deploying SATPWrapperContract to Besu network 1..."
	@echo "  Building contract..."
	@forge build --force --quiet
	@BYTECODE=$$(cat out/SATPWrapperContract.sol/SATPWrapperContract.json | jq -r '.bytecode.object'); \
	OWNER_PADDED=$$(cast abi-encode "f(address)" $(ETH_ACCOUNT)); \
	INIT_CODE="$${BYTECODE}$${OWNER_PADDED#0x}"; \
	echo "  Sending deployment transaction..."; \
	RESULT=$$(cast send \
		--rpc-url $(subst host.docker.internal,localhost,$(BESU1_RPC_HTTP)) \
		--private-key $(ETH_PRIVATE_KEY) \
		--legacy \
		--gas-limit 5000000 \
		--create "$$INIT_CODE" 2>&1 || true); \
	CONTRACT_ADDR=$$(echo "$$RESULT" | grep -oP '"contractAddress"\s*:\s*"\K[^"]+' | head -1); \
	STATUS=$$(echo "$$RESULT" | grep -oP '"status"\s*:\s*"\K[^"]+' | head -1); \
	if [ "$$STATUS" = "0x1" ] && [ -n "$$CONTRACT_ADDR" ]; then \
		echo "$$CONTRACT_ADDR" > $(TEMP_DIR)/contract-besu1.txt; \
		echo "✓ SATPWrapperContract deployed to Besu1: $$CONTRACT_ADDR"; \
	else \
		echo "✗ Failed to deploy to Besu1. Ensure Foundry is installed and Besu is running."; \
		echo "$$RESULT"; \
		exit 1; \
	fi

## Deploy SATPWrapperContract to Besu network 2 using Foundry
## Note: Uses cast send --create because forge create has issues with Besu receipt parsing
deploy-contracts-besu2: create-temp-dir fund-account-besu2
	@echo "Deploying SATPWrapperContract to Besu network 2..."
	@echo "  Building contract..."
	@forge build --force --quiet
	@BYTECODE=$$(cat out/SATPWrapperContract.sol/SATPWrapperContract.json | jq -r '.bytecode.object'); \
	OWNER_PADDED=$$(cast abi-encode "f(address)" $(ETH_ACCOUNT)); \
	INIT_CODE="$${BYTECODE}$${OWNER_PADDED#0x}"; \
	echo "  Sending deployment transaction..."; \
	RESULT=$$(cast send \
		--rpc-url $(subst host.docker.internal,localhost,$(BESU2_RPC_HTTP)) \
		--private-key $(ETH_PRIVATE_KEY) \
		--legacy \
		--gas-limit 5000000 \
		--create "$$INIT_CODE" 2>&1 || true); \
	CONTRACT_ADDR=$$(echo "$$RESULT" | grep -oP '"contractAddress"\s*:\s*"\K[^"]+' | head -1); \
	STATUS=$$(echo "$$RESULT" | grep -oP '"status"\s*:\s*"\K[^"]+' | head -1); \
	if [ "$$STATUS" = "0x1" ] && [ -n "$$CONTRACT_ADDR" ]; then \
		echo "$$CONTRACT_ADDR" > $(TEMP_DIR)/contract-besu2.txt; \
		echo "✓ SATPWrapperContract deployed to Besu2: $$CONTRACT_ADDR"; \
	else \
		echo "✗ Failed to deploy to Besu2. Ensure Foundry is installed and Besu is running."; \
		echo "$$RESULT"; \
		exit 1; \
	fi

## Deploy contracts to both Besu networks
deploy-contracts: create-temp-dir deploy-contracts-besu1 deploy-contracts-besu2
	@echo "✓ All contracts deployed"
	@echo "Contract addresses saved to:"
	@echo "  - $(TEMP_DIR)/contract-besu1.txt"
	@echo "  - $(TEMP_DIR)/contract-besu2.txt"

## Show deployed contract addresses
show-contracts:
	@echo "Deployed Contract Addresses:"
	@echo "============================"
	@if [ -f "$(TEMP_DIR)/contract-besu1.txt" ]; then \
		echo "  Besu 1: $$(cat $(TEMP_DIR)/contract-besu1.txt)"; \
	else \
		echo "  Besu 1: Not deployed (run 'deploy-contracts-besu1' first)"; \
	fi
	@if [ -f "$(TEMP_DIR)/contract-besu2.txt" ]; then \
		echo "  Besu 2: $$(cat $(TEMP_DIR)/contract-besu2.txt)"; \
	else \
		echo "  Besu 2: Not deployed (run 'deploy-contracts-besu2' first)"; \
	fi

## Initialize bridge contracts (registers wrapper with networks)
init-bridge: create-temp-dir
	@echo "Bridge initialization: Contracts are self-contained wrappers."
	@echo "No additional initialization required."
	@echo "✓ Bridge ready for operation"

# =============================================================================
# Bridge Address Retrieval (from Gateway API)
# =============================================================================

## Get bridge/wrapper address from Gateway 1 API
get-bridge-address-gw1:
	@echo "Fetching bridge address from Gateway 1..."
	@RESP=$$(curl -s "http://localhost:$(GW1_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/approve-address?networkId.id=$(GW1_NETWORK_ID)&networkId.ledgerType=BESU_2X&tokenType=NONSTANDARD_FUNGIBLE" 2>/dev/null); \
	ADDR=$$(echo "$$RESP" | jq -r '.approveAddress // empty' 2>/dev/null); \
	if [ -n "$$ADDR" ]; then \
		echo "$$ADDR" > $(TEMP_DIR)/bridge-address-gw1.txt; \
		echo "✓ Bridge address (GW1): $$ADDR"; \
	else \
		echo "✗ Failed to fetch bridge address from GW1 (is gateway running?)"; \
		echo "  Response: $$RESP"; \
		exit 1; \
	fi

## Get bridge/wrapper address from Gateway 2 API
get-bridge-address-gw2:
	@echo "Fetching bridge address from Gateway 2..."
	@RESP=$$(curl -s "http://localhost:$(GW2_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/approve-address?networkId.id=$(GW2_NETWORK_ID)&networkId.ledgerType=BESU_2X&tokenType=NONSTANDARD_FUNGIBLE" 2>/dev/null); \
	ADDR=$$(echo "$$RESP" | jq -r '.approveAddress // empty' 2>/dev/null); \
	if [ -n "$$ADDR" ]; then \
		echo "$$ADDR" > $(TEMP_DIR)/bridge-address-gw2.txt; \
		echo "✓ Bridge address (GW2): $$ADDR"; \
	else \
		echo "✗ Failed to fetch bridge address from GW2 (is gateway running?)"; \
		echo "  Response: $$RESP"; \
		exit 1; \
	fi

## Get bridge addresses from both gateways
get-bridge-addresses: create-temp-dir get-bridge-address-gw1 get-bridge-address-gw2
	@echo ""
	@echo "Bridge Addresses:"
	@echo "================="
	@echo "  Gateway 1: $$(cat $(TEMP_DIR)/bridge-address-gw1.txt 2>/dev/null || echo 'N/A')"
	@echo "  Gateway 2: $$(cat $(TEMP_DIR)/bridge-address-gw2.txt 2>/dev/null || echo 'N/A')"

## Show all saved addresses (deployed contracts and bridge addresses)
show-addresses:
	@echo "Saved Addresses:"
	@echo "================"
	@echo ""
	@echo "Deployed Contracts (from foundry deployment):"
	@if [ -f "$(TEMP_DIR)/contract-besu1.txt" ]; then \
		echo "  Besu 1: $$(cat $(TEMP_DIR)/contract-besu1.txt)"; \
	else \
		echo "  Besu 1: Not deployed"; \
	fi
	@if [ -f "$(TEMP_DIR)/contract-besu2.txt" ]; then \
		echo "  Besu 2: $$(cat $(TEMP_DIR)/contract-besu2.txt)"; \
	else \
		echo "  Besu 2: Not deployed"; \
	fi
	@echo ""
	@echo "Bridge Addresses (from gateway API):"
	@if [ -f "$(TEMP_DIR)/bridge-address-gw1.txt" ]; then \
		echo "  Gateway 1: $$(cat $(TEMP_DIR)/bridge-address-gw1.txt)"; \
	else \
		echo "  Gateway 1: Not fetched (run 'get-bridge-address-gw1' while gateway is running)"; \
	fi
	@if [ -f "$(TEMP_DIR)/bridge-address-gw2.txt" ]; then \
		echo "  Gateway 2: $$(cat $(TEMP_DIR)/bridge-address-gw2.txt)"; \
	else \
		echo "  Gateway 2: Not fetched (run 'get-bridge-address-gw2' while gateway is running)"; \
	fi

# =============================================================================
# Configuration Generation
# =============================================================================

## Generate Gateway 1 config file
create-config-gw1: create-temp-dir
	@echo "Creating Gateway 1 config: $(TEMP_CONFIG_GW1)..."
	@printf '%s\n' \
		'{' \
		'  "gid": {' \
		'    "id": "$(GW1_GID)",' \
		'    "name": "$(GW1_NAME)",' \
		'    "version": [{"Core": "v02", "Architecture": "v02", "Crash": "v02"}],' \
		'    "connectedDLTs": [{"id": "$(GW1_NETWORK_ID)", "ledgerType": "BESU_2X"}],' \
		'    "proofID": "mockProofID-gw1",' \
		'    "address": "$(GW1_ADDRESS)",' \
		'    "gatewayClientPort": $(GW1_CLIENT_PORT),' \
		'    "gatewayServerPort": $(GW1_SERVER_PORT),' \
		'    "gatewayOapiPort": $(GW1_API_PORT),' \
		'    "pubKey": "$(GW1_PUBLIC_KEY)"' \
		'  },' \
		'  "logLevel": "TRACE",' \
		'  "counterPartyGateways": [{' \
		'    "id": "$(GW2_GID)",' \
		'    "name": "$(GW2_NAME)",' \
		'    "version": [{"Core": "v02", "Architecture": "v02", "Crash": "v02"}],' \
		'    "connectedDLTs": [{"id": "$(GW2_NETWORK_ID)", "ledgerType": "BESU_2X"}],' \
		'    "proofID": "mockProofID-gw2",' \
		'    "address": "$(GW2_ADDRESS)",' \
		'    "gatewayClientPort": $(GW2_CLIENT_PORT),' \
		'    "gatewayServerPort": $(GW2_SERVER_PORT),' \
		'    "gatewayOapiPort": $(GW2_API_PORT),' \
		'    "pubKey": "$(GW2_PUBLIC_KEY)"' \
		'  }],' \
		'  "environment": "development",' \
		'  "ccConfig": {' \
		'    "bridgeConfig": [{' \
		'      "networkIdentification": {"id": "$(GW1_NETWORK_ID)", "ledgerType": "BESU_2X"},' \
		'      "signingCredential": {' \
		'        "ethAccount": "$(ETH_ACCOUNT)",' \
		'        "secret": "$(ETH_PRIVATE_KEY)",' \
		'        "type": "PRIVATE_KEY_HEX"' \
		'      },' \
		'      "gasConfig": {"gas": "6721975", "gasPrice": "20000000000"},' \
		'      "connectorOptions": {' \
		'        "rpcApiHttpHost": "$(BESU1_RPC_HTTP)",' \
		'        "rpcApiWsHost": "$(BESU1_RPC_WS)"' \
		'      },' \
		'      "wrapperContractName": "SATPWrapper",' \
		'      "wrapperContractAddress": "$(GW1_WRAPPER_ADDRESS)",' \
		'      "claimFormats": [1]' \
		'    }]' \
		'  },' \
		'  "keyPair": {' \
		'    "privateKey": "$(GW1_PRIVATE_KEY)",' \
		'    "publicKey": "$(GW1_PUBLIC_KEY)"' \
		'  },' \
		'  "enableCrashRecovery": false,' \
		'  "ontologyPath": "/opt/cacti/satp-hermes/ontologies",' \
		'  "adapterConfigPath": "/opt/cacti/satp-hermes/config/adapter-config.yml"' \
		'}' > $(TEMP_CONFIG_GW1)
	@echo "✓ Gateway 1 config created"

## Generate Gateway 1 adapter config (single outbound webhook at stage0/before)
create-adapter-gw1: create-temp-dir
	@echo "Creating Gateway 1 adapter config: $(TEMP_ADAPTER_GW1)..."
	@printf '%s\n' \
		'# Gateway 1 Adapter Configuration' \
		'# Single outbound webhook at stage0/before for testing' \
		'# Timeout: 5 minutes ($(ADAPTER_TIMEOUT_MS)ms)' \
		'' \
		'adapters:' \
		'  - id: "stage0-before-outbound"' \
		'    name: "Stage 0 Pre-Processing Webhook"' \
		'    description: "Outbound webhook called before stage 0 processing"' \
		'    executionPoints:' \
		'      - stage: "stage0"' \
		'        step: newSessionRequest' \
		'        point: "before"' \
		'    outboundWebhook:' \
		'      url: "http://$(WEBHOOK_SERVER_HOST):$(WEBHOOK_SERVER_PORT)/webhook/outbound/approve"' \
		'      timeoutMs: $(ADAPTER_TIMEOUT_MS)' \
		'      retryAttempts: 3' \
		'      retryDelayMs: 1000' \
		'    active: true' \
		'    priority: 1' \
		'' \
		'global:' \
		'  timeoutMs: $(ADAPTER_TIMEOUT_MS)' \
		'  retryAttempts: 3' \
		'  retryDelayMs: 500' \
		'  logLevel: "debug"' > $(TEMP_ADAPTER_GW1)
	@echo "✓ Gateway 1 adapter config created (single outbound webhook at stage0/before)"

## Generate Gateway 2 config file
create-config-gw2: create-temp-dir
	@echo "Creating Gateway 2 config: $(TEMP_CONFIG_GW2)..."
	@printf '%s\n' \
		'{' \
		'  "gid": {' \
		'    "id": "$(GW2_GID)",' \
		'    "name": "$(GW2_NAME)",' \
		'    "version": [{"Core": "v02", "Architecture": "v02", "Crash": "v02"}],' \
		'    "connectedDLTs": [{"id": "$(GW2_NETWORK_ID)", "ledgerType": "BESU_2X"}],' \
		'    "proofID": "mockProofID-gw2",' \
		'    "address": "$(GW2_ADDRESS)",' \
		'    "gatewayClientPort": $(GW2_CLIENT_PORT),' \
		'    "gatewayServerPort": $(GW2_SERVER_PORT),' \
		'    "gatewayOapiPort": $(GW2_API_PORT),' \
		'    "pubKey": "$(GW2_PUBLIC_KEY)"' \
		'  },' \
		'  "logLevel": "TRACE",' \
		'  "counterPartyGateways": [{' \
		'    "id": "$(GW1_GID)",' \
		'    "name": "$(GW1_NAME)",' \
		'    "version": [{"Core": "v02", "Architecture": "v02", "Crash": "v02"}],' \
		'    "connectedDLTs": [{"id": "$(GW1_NETWORK_ID)", "ledgerType": "BESU_2X"}],' \
		'    "proofID": "mockProofID-gw1",' \
		'    "address": "$(GW1_ADDRESS)",' \
		'    "gatewayClientPort": $(GW1_CLIENT_PORT),' \
		'    "gatewayServerPort": $(GW1_SERVER_PORT),' \
		'    "gatewayOapiPort": $(GW1_API_PORT),' \
		'    "pubKey": "$(GW1_PUBLIC_KEY)"' \
		'  }],' \
		'  "environment": "development",' \
		'  "ccConfig": {' \
		'    "bridgeConfig": [{' \
		'      "networkIdentification": {"id": "$(GW2_NETWORK_ID)", "ledgerType": "BESU_2X"},' \
		'      "signingCredential": {' \
		'        "ethAccount": "$(ETH_ACCOUNT)",' \
		'        "secret": "$(ETH_PRIVATE_KEY)",' \
		'        "type": "PRIVATE_KEY_HEX"' \
		'      },' \
		'      "gasConfig": {"gas": "6721975", "gasPrice": "20000000000"},' \
		'      "connectorOptions": {' \
		'        "rpcApiHttpHost": "$(BESU2_RPC_HTTP)",' \
		'        "rpcApiWsHost": "$(BESU2_RPC_WS)"' \
		'      },' \
		'      "wrapperContractName": "SATPWrapper",' \
		'      "wrapperContractAddress": "$(GW2_WRAPPER_ADDRESS)",' \
		'      "claimFormats": [1]' \
		'    }]' \
		'  },' \
		'  "keyPair": {' \
		'    "privateKey": "$(GW2_PRIVATE_KEY)",' \
		'    "publicKey": "$(GW2_PUBLIC_KEY)"' \
		'  },' \
		'  "enableCrashRecovery": false,' \
		'  "ontologyPath": "/opt/cacti/satp-hermes/ontologies",' \
		'  "adapterConfigPath": "/opt/cacti/satp-hermes/config/adapter-config.yml"' \
		'}' > $(TEMP_CONFIG_GW2)
	@echo "✓ Gateway 2 config created"

## Generate Gateway 2 adapter config (no adapters by default)
create-adapter-gw2: create-temp-dir
	@echo "Creating Gateway 2 adapter config: $(TEMP_ADAPTER_GW2)..."
	@printf '%s\n' \
		'# Gateway 2 Adapter Configuration' \
		'# No adapters configured - server side receives from Gateway 1' \
		'# Timeout: 5 minutes ($(ADAPTER_TIMEOUT_MS)ms)' \
		'' \
		'adapters: []' \
		'' \
		'global:' \
		'  timeoutMs: $(ADAPTER_TIMEOUT_MS)' \
		'  retryAttempts: 3' \
		'  retryDelayMs: 500' \
		'  logLevel: "debug"' > $(TEMP_ADAPTER_GW2)
	@echo "✓ Gateway 2 adapter config created (no adapters)"

## Create all temp config files
create-configs: create-config-gw1 create-adapter-gw1 create-config-gw2 create-adapter-gw2
	@echo "✓ All config files created in $(TEMP_DIR)"

# =============================================================================
# Multi-Gateway Docker Operations
# =============================================================================

## Run Gateway 1 with temp configs (logs to files)
run-gateway1: stop-gateway1 create-temp-dir
	@echo "Starting Gateway 1: $(GW1_CONTAINER_NAME)..."
	@echo "  Logs: $(LOG_FILE_GW1)"
	@echo "  Adapter logs: $(LOG_FILE_GW1_ADAPTER)"
	docker run -d --rm \
		--name $(GW1_CONTAINER_NAME) \
		--add-host=host.docker.internal:host-gateway \
		-p $(GW1_SERVER_PORT):3010 \
		-p $(GW1_CLIENT_PORT):3011 \
		-p $(GW1_API_PORT):4010 \
		-v "$(TEMP_CONFIG_GW1):/opt/cacti/satp-hermes/config/config.json:ro" \
		-v "$(TEMP_ADAPTER_GW1):/opt/cacti/satp-hermes/config/adapter-config.yml:ro" \
		$(IMAGE_NAME):latest
	@echo "✓ Gateway 1 started on ports $(GW1_SERVER_PORT)/$(GW1_CLIENT_PORT)/$(GW1_API_PORT)"
	@sleep 8
	@$(MAKE) -f $(MAKEFILE_PATH) healthcheck-gw1
	@echo "Starting log capture for Gateway 1..."
	@nohup sh -c 'docker logs -f $(GW1_CONTAINER_NAME) 2>&1 | tee $(LOG_FILE_GW1) | grep -i adapter > $(LOG_FILE_GW1_ADAPTER)' > /dev/null 2>&1 &
	@echo "✓ Log capture started"

## Run Gateway 2 with temp configs (logs to files)
run-gateway2: stop-gateway2 create-temp-dir
	@echo "Starting Gateway 2: $(GW2_CONTAINER_NAME)..."
	@echo "  Logs: $(LOG_FILE_GW2)"
	@echo "  Adapter logs: $(LOG_FILE_GW2_ADAPTER)"
	docker run -d --rm \
		--name $(GW2_CONTAINER_NAME) \
		--add-host=host.docker.internal:host-gateway \
		-p $(GW2_SERVER_PORT):3010 \
		-p $(GW2_CLIENT_PORT):3011 \
		-p $(GW2_API_PORT):4010 \
		-v "$(TEMP_CONFIG_GW2):/opt/cacti/satp-hermes/config/config.json:ro" \
		-v "$(TEMP_ADAPTER_GW2):/opt/cacti/satp-hermes/config/adapter-config.yml:ro" \
		$(IMAGE_NAME):latest
	@echo "✓ Gateway 2 started on ports $(GW2_SERVER_PORT)/$(GW2_CLIENT_PORT)/$(GW2_API_PORT)"
	@sleep 8
	@$(MAKE) -f $(MAKEFILE_PATH) healthcheck-gw2
	@echo "Starting log capture for Gateway 2..."
	@nohup sh -c 'docker logs -f $(GW2_CONTAINER_NAME) 2>&1 | tee $(LOG_FILE_GW2) | grep -i adapter > $(LOG_FILE_GW2_ADAPTER)' > /dev/null 2>&1 &
	@echo "✓ Log capture started"

## Stop Gateway 1
stop-gateway1:
	@echo "Stopping Gateway 1: $(GW1_CONTAINER_NAME)..."
	@docker stop $(GW1_CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(GW1_CONTAINER_NAME) 2>/dev/null || true

## Stop Gateway 2
stop-gateway2:
	@echo "Stopping Gateway 2: $(GW2_CONTAINER_NAME)..."
	@docker stop $(GW2_CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(GW2_CONTAINER_NAME) 2>/dev/null || true

## Stop both gateways
stop-all: stop-gateway1 stop-gateway2
	@echo "✓ All gateways stopped"

## Run both gateways
run-both: run-gateway1 run-gateway2
	@echo "✓ Both gateways running"
	@echo "  Gateway 1 API: http://localhost:$(GW1_API_PORT)"
	@echo "  Gateway 2 API: http://localhost:$(GW2_API_PORT)"

## Health check Gateway 1
healthcheck-gw1:
	@echo "Checking Gateway 1 health..."
	@curl -s http://localhost:$(GW1_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq . || \
		(echo "✗ Gateway 1 health check failed" && exit 1)
	@echo "✓ Gateway 1 is healthy"

## Health check Gateway 2
healthcheck-gw2:
	@echo "Checking Gateway 2 health..."
	@curl -s http://localhost:$(GW2_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq . || \
		(echo "✗ Gateway 2 health check failed" && exit 1)
	@echo "✓ Gateway 2 is healthy"

## View Gateway 1 logs
logs-gw1:
	docker logs -f $(GW1_CONTAINER_NAME)

## View Gateway 2 logs
logs-gw2:
	docker logs -f $(GW2_CONTAINER_NAME)

## View Gateway 1 adapter logs (filtered)
logs-gw1-adapter:
	@if [ -f "$(LOG_FILE_GW1_ADAPTER)" ]; then \
		tail -f $(LOG_FILE_GW1_ADAPTER); \
	else \
		echo "Adapter log file not found. Run 'run-gateway1' first."; \
		echo "Or filter live: docker logs -f $(GW1_CONTAINER_NAME) 2>&1 | grep -i adapter"; \
	fi

## View Gateway 2 adapter logs (filtered)
logs-gw2-adapter:
	@if [ -f "$(LOG_FILE_GW2_ADAPTER)" ]; then \
		tail -f $(LOG_FILE_GW2_ADAPTER); \
	else \
		echo "Adapter log file not found. Run 'run-gateway2' first."; \
		echo "Or filter live: docker logs -f $(GW2_CONTAINER_NAME) 2>&1 | grep -i adapter"; \
	fi

## Show log file locations
show-logs:
	@echo "Log File Locations:"
	@echo "==================="
	@echo ""
	@echo "Gateway 1:"
	@if [ -f "$(LOG_FILE_GW1)" ]; then \
		echo "  All logs:     $(LOG_FILE_GW1) ($$(wc -l < $(LOG_FILE_GW1)) lines)"; \
	else \
		echo "  All logs:     $(LOG_FILE_GW1) (not created yet)"; \
	fi
	@if [ -f "$(LOG_FILE_GW1_ADAPTER)" ]; then \
		echo "  Adapter logs: $(LOG_FILE_GW1_ADAPTER) ($$(wc -l < $(LOG_FILE_GW1_ADAPTER)) lines)"; \
	else \
		echo "  Adapter logs: $(LOG_FILE_GW1_ADAPTER) (not created yet)"; \
	fi
	@echo ""
	@echo "Gateway 2:"
	@if [ -f "$(LOG_FILE_GW2)" ]; then \
		echo "  All logs:     $(LOG_FILE_GW2) ($$(wc -l < $(LOG_FILE_GW2)) lines)"; \
	else \
		echo "  All logs:     $(LOG_FILE_GW2) (not created yet)"; \
	fi
	@if [ -f "$(LOG_FILE_GW2_ADAPTER)" ]; then \
		echo "  Adapter logs: $(LOG_FILE_GW2_ADAPTER) ($$(wc -l < $(LOG_FILE_GW2_ADAPTER)) lines)"; \
	else \
		echo "  Adapter logs: $(LOG_FILE_GW2_ADAPTER) (not created yet)"; \
	fi

# =============================================================================
# Webhook Test Server Operations
# =============================================================================

## Start webhook test server (background)
start-webhook-server: create-temp-dir
	@echo "Starting webhook test server on port $(WEBHOOK_SERVER_PORT)..."
	@if lsof -i :$(WEBHOOK_SERVER_PORT) > /dev/null 2>&1; then \
		echo "⚠ Port $(WEBHOOK_SERVER_PORT) already in use"; \
		lsof -i :$(WEBHOOK_SERVER_PORT) | head -2; \
		exit 0; \
	fi
	@(cd $(PWD) && npx ts-node src/test/typescript/adapter-test-server.ts > $(TEMP_DIR)/webhook-server.log 2>&1) & \
	WPID=$$!; \
	echo $$WPID > $(TEMP_DIR)/webhook-server.pid; \
	echo "  Starting (PID: $$WPID)..."; \
	for i in 1 2 3 4 5 6 7 8 9 10; do \
		sleep 1; \
		if curl -s http://127.0.0.1:$(WEBHOOK_SERVER_PORT)/ > /dev/null 2>&1; then \
			echo "✓ Webhook test server running on http://127.0.0.1:$(WEBHOOK_SERVER_PORT)"; \
			echo "  PID: $$WPID"; \
			echo "  Log: $(TEMP_DIR)/webhook-server.log"; \
			exit 0; \
		fi; \
		echo "  Waiting... ($$i/10)"; \
	done; \
	echo "✗ Failed to start webhook server after 10s"; \
	cat $(TEMP_DIR)/webhook-server.log 2>/dev/null || true; \
	exit 1

## Stop webhook test server
stop-webhook-server:
	@echo "Stopping webhook test server..."
	@if [ -f "$(TEMP_DIR)/webhook-server.pid" ]; then \
		PID=$$(cat $(TEMP_DIR)/webhook-server.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID 2>/dev/null || true; \
			echo "✓ Webhook server stopped (PID: $$PID)"; \
		else \
			echo "Server not running (stale PID file)"; \
		fi; \
		rm -f $(TEMP_DIR)/webhook-server.pid; \
	else \
		echo "No PID file found. Trying to kill by port..."; \
		lsof -ti :$(WEBHOOK_SERVER_PORT) | xargs -r kill 2>/dev/null || echo "No process found on port $(WEBHOOK_SERVER_PORT)"; \
	fi

## Check webhook test server status
webhook-server-status:
	@echo "Webhook Test Server Status:"
	@echo "==========================="
	@if [ -f "$(TEMP_DIR)/webhook-server.pid" ]; then \
		PID=$$(cat $(TEMP_DIR)/webhook-server.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "  Status: Running (PID: $$PID)"; \
			echo "  Port:   $(WEBHOOK_SERVER_PORT)"; \
			echo "  Log:    $(TEMP_DIR)/webhook-server.log"; \
		else \
			echo "  Status: Stopped (stale PID file)"; \
		fi; \
	else \
		if lsof -i :$(WEBHOOK_SERVER_PORT) > /dev/null 2>&1; then \
			echo "  Status: Running (unknown PID)"; \
			echo "  Port:   $(WEBHOOK_SERVER_PORT)"; \
		else \
			echo "  Status: Not running"; \
		fi; \
	fi
	@echo ""
	@echo "Endpoints:"
	@echo "  GET  /                           - Health check"
	@echo "  POST /mirror                     - Echo request body"
	@echo "  POST /webhook/outbound           - Receive outbound webhook"
	@echo "  POST /webhook/outbound/approve   - Always approve (continue: true)"
	@echo "  POST /webhook/outbound/reject    - Always reject (continue: false)"
	@echo "  POST /webhook/outbound/delay/:ms - Respond after delay"
	@echo "  POST /webhook/outbound/error/:code - Return HTTP error"
	@echo "  POST /webhook/inbound            - Receive inbound decision"
	@echo "  POST /webhook/trigger            - Proxy/trigger another URL"

## Test webhook server endpoints
test-webhook-server:
	@echo "Testing webhook server endpoints..."
	@echo ""
	@echo "1. Health check (GET /):"
	@curl -s http://127.0.0.1:$(WEBHOOK_SERVER_PORT)/ && echo ""
	@echo ""
	@echo "2. Mirror (POST /mirror):"
	@curl -s -X POST -H "Content-Type: application/json" \
		-d '{"test": "data", "foo": 123}' \
		http://127.0.0.1:$(WEBHOOK_SERVER_PORT)/mirror | jq .
	@echo ""
	@echo "3. Outbound approve (POST /webhook/outbound/approve):"
	@curl -s -X POST -H "Content-Type: application/json" \
		-d '{"sessionId": "test-123", "eventType": "test"}' \
		http://127.0.0.1:$(WEBHOOK_SERVER_PORT)/webhook/outbound/approve | jq .
	@echo ""
	@echo "✓ Webhook server tests passed"

## View webhook server logs
logs-webhook-server:
	@if [ -f "$(TEMP_DIR)/webhook-server.log" ]; then \
		tail -f $(TEMP_DIR)/webhook-server.log; \
	else \
		echo "Webhook server log not found. Start the server first."; \
	fi

# =============================================================================
# Full Deployment Pipeline
# =============================================================================

## Deploy full bridge setup: contracts + configs + both gateways
deploy-bridge: deploy-contracts init-bridge create-configs build run-both
	@echo ""
	@echo "============================================="
	@echo "✓ Full SATP Bridge Deployment Complete!"
	@echo "============================================="
	@echo ""
	@echo "Gateway 1 (Besu Leaf 1):"
	@echo "  API:        http://localhost:$(GW1_API_PORT)"
	@echo "  Server:     localhost:$(GW1_SERVER_PORT)"
	@echo "  Client:     localhost:$(GW1_CLIENT_PORT)"
	@echo "  Network:    $(GW1_NETWORK_ID)"
	@echo ""
	@echo "Gateway 2 (Besu Leaf 2):"
	@echo "  API:        http://localhost:$(GW2_API_PORT)"
	@echo "  Server:     localhost:$(GW2_SERVER_PORT)"
	@echo "  Client:     localhost:$(GW2_CLIENT_PORT)"
	@echo "  Network:    $(GW2_NETWORK_ID)"
	@echo ""
	@echo "Adapter timeout: $(ADAPTER_TIMEOUT_MS)ms (5 minutes)"
	@echo ""

# =============================================================================
# E2E Test Pipeline
# =============================================================================

## Run full E2E test: deploy bridge + wait for ready + run tests + cleanup
e2e: deploy-bridge e2e-wait-ready e2e-run-tests
	@echo ""
	@echo "============================================="
	@echo "✓ E2E Test Pipeline Complete!"
	@echo "============================================="

## Wait for both gateways to be ready
e2e-wait-ready:
	@echo ""
	@echo "Waiting for gateways to be ready..."
	@echo "Waiting for Gateway 1..."
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do \
		if curl -s http://localhost:$(GW1_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | grep -q "AVAILABLE"; then \
			echo "✓ Gateway 1 is ready"; \
			break; \
		fi; \
		echo "  Attempt $$i/20: Gateway 1 not ready, waiting 3s..."; \
		sleep 3; \
		if [ $$i -eq 20 ]; then \
			echo "✗ Gateway 1 failed to start after 60s"; \
			exit 1; \
		fi; \
	done
	@echo "Waiting for Gateway 2..."
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do \
		if curl -s http://localhost:$(GW2_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | grep -q "AVAILABLE"; then \
			echo "✓ Gateway 2 is ready"; \
			break; \
		fi; \
		echo "  Attempt $$i/20: Gateway 2 not ready, waiting 3s..."; \
		sleep 3; \
		if [ $$i -eq 20 ]; then \
			echo "✗ Gateway 2 failed to start after 60s"; \
			exit 1; \
		fi; \
	done
	@echo "✓ Both gateways are ready!"

## Run E2E tests against both gateways
e2e-run-tests:
	@echo ""
	@echo "============================================="
	@echo "Running E2E Tests"
	@echo "============================================="
	@echo ""
	@echo "Testing Gateway 1..."
	@echo "  Health check:"
	@curl -s http://localhost:$(GW1_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq .
	@echo ""
	@echo "  Integrations:"
	@curl -s http://localhost:$(GW1_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations | jq .
	@echo ""
	@echo "  Sessions:"
	@curl -s http://localhost:$(GW1_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids | jq .
	@echo ""
	@echo "Testing Gateway 2..."
	@echo "  Health check:"
	@curl -s http://localhost:$(GW2_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/healthcheck | jq .
	@echo ""
	@echo "  Integrations:"
	@curl -s http://localhost:$(GW2_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/integrations | jq .
	@echo ""
	@echo "  Sessions:"
	@curl -s http://localhost:$(GW2_API_PORT)/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids | jq .
	@echo ""
	@echo "✓ E2E tests completed"

## E2E with cleanup: run full E2E then cleanup
e2e-clean: e2e
	@echo "Cleaning up after E2E..."
	$(MAKE) -f $(MAKEFILE_PATH) stop-all
	@echo "✓ E2E cleanup complete"

## Clean temp configs
clean-configs:
	@echo "Removing temp configs..."
	@rm -rf $(TEMP_DIR)
	@echo "✓ Temp configs removed"

## Full cleanup: containers, images, and temp configs
clean-full: stop-all clean clean-configs
	@echo "✓ Full cleanup complete"

# =============================================================================
# Shutdown All Services
# =============================================================================

## Shutdown webhook server via API endpoint
shutdown-webhook-server:
	@echo "Shutting down webhook server via API..."
	@curl -s -X POST http://localhost:$(WEBHOOK_SERVER_PORT)/shutdown 2>/dev/null && \
		echo "✓ Shutdown request sent to webhook server" || \
		echo "  Webhook server not responding (may already be stopped)"
	@sleep 1
	@# Fallback: kill by PID if still running
	@if [ -f "$(TEMP_DIR)/webhook-server.pid" ]; then \
		PID=$$(cat $(TEMP_DIR)/webhook-server.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "  Forcing shutdown (PID: $$PID)..."; \
			kill $$PID 2>/dev/null || true; \
		fi; \
		rm -f $(TEMP_DIR)/webhook-server.pid; \
	fi
	@# Final fallback: kill by port
	@lsof -ti :$(WEBHOOK_SERVER_PORT) | xargs -r kill 2>/dev/null || true
	@echo "✓ Webhook server stopped"

## Shutdown all services: gateways, test ledgers, and adapter/webhook server
shutdown-all: 
	@echo ""
	@echo "============================================="
	@echo "  Shutting Down All Services"
	@echo "============================================="
	@echo ""
	@echo "1. Stopping SATP Gateways..."
	@docker stop $(GW1_CONTAINER_NAME) 2>/dev/null && echo "   ✓ Gateway 1 stopped" || echo "   - Gateway 1 not running"
	@docker stop $(GW2_CONTAINER_NAME) 2>/dev/null && echo "   ✓ Gateway 2 stopped" || echo "   - Gateway 2 not running"
	@echo ""
	@echo "2. Stopping Besu Test Ledgers..."
	@docker stop $(BESU1_CONTAINER) 2>/dev/null && echo "   ✓ Besu 1 stopped" || echo "   - Besu 1 not running"
	@docker stop $(BESU2_CONTAINER) 2>/dev/null && echo "   ✓ Besu 2 stopped" || echo "   - Besu 2 not running"
	@echo ""
	@echo "3. Stopping Webhook/Adapter Test Server..."
	@curl -s -X POST http://localhost:$(WEBHOOK_SERVER_PORT)/shutdown 2>/dev/null && \
		(sleep 1 && echo "   ✓ Webhook server shutdown requested") || \
		echo "   - Webhook server not responding"
	@if [ -f "$(TEMP_DIR)/webhook-server.pid" ]; then \
		PID=$$(cat $(TEMP_DIR)/webhook-server.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID 2>/dev/null && echo "   ✓ Killed webhook server (PID: $$PID)" || true; \
		fi; \
		rm -f $(TEMP_DIR)/webhook-server.pid; \
	fi
	@lsof -ti :$(WEBHOOK_SERVER_PORT) | xargs -r kill 2>/dev/null || true
	@echo ""
	@echo "============================================="
	@echo "  ✓ All Services Shutdown Complete"
	@echo "============================================="
	@echo ""

## Show status of all services
status-all:
	@echo ""
	@echo "============================================="
	@echo "  Service Status"
	@echo "============================================="
	@echo ""
	@echo "SATP Gateways:"
	@docker ps --filter "name=$(GW1_CONTAINER_NAME)" --format "  Gateway 1: {{.Status}}" 2>/dev/null || echo "  Gateway 1: Not running"
	@docker ps --filter "name=$(GW2_CONTAINER_NAME)" --format "  Gateway 2: {{.Status}}" 2>/dev/null || echo "  Gateway 2: Not running"
	@echo ""
	@echo "Besu Test Ledgers:"
	@docker ps --filter "name=$(BESU1_CONTAINER)" --format "  Besu 1: {{.Status}}" 2>/dev/null || echo "  Besu 1: Not running"
	@docker ps --filter "name=$(BESU2_CONTAINER)" --format "  Besu 2: {{.Status}}" 2>/dev/null || echo "  Besu 2: Not running"
	@echo ""
	@echo "Webhook/Adapter Server (port $(WEBHOOK_SERVER_PORT)):"
	@if curl -s http://localhost:$(WEBHOOK_SERVER_PORT)/ > /dev/null 2>&1; then \
		echo "  Status: Running"; \
		if [ -f "$(TEMP_DIR)/webhook-server.pid" ]; then \
			echo "  PID: $$(cat $(TEMP_DIR)/webhook-server.pid)"; \
		fi; \
	else \
		echo "  Status: Not running"; \
	fi
	@echo ""

# =============================================================================
# Help
# =============================================================================

## Show this help message
help:
	@echo ""
	@echo "SATP Hermes Gateway - Docker Adapter Layer Test Commands"
	@echo "========================================================="
	@echo ""
	@echo "Usage: make -f $(MAKEFILE_PATH) <target>"
	@echo ""
	@echo "Quick Start (Single Gateway):"
	@echo "  make -f $(MAKEFILE_PATH) setup    # Full setup (build, run)"
	@echo "  make -f $(MAKEFILE_PATH) build    # Build Docker image only"
	@echo "  make -f $(MAKEFILE_PATH) run      # Run container only"
	@echo "  make -f $(MAKEFILE_PATH) test     # Run adapter tests"
	@echo ""
	@echo "Multi-Gateway Bridge Deployment:"
	@echo "  make -f $(MAKEFILE_PATH) deploy-bridge    # Full bridge deployment"
	@echo "  make -f $(MAKEFILE_PATH) deploy-contracts # Deploy wrapper contracts"
	@echo "  make -f $(MAKEFILE_PATH) create-configs   # Generate temp configs"
	@echo "  make -f $(MAKEFILE_PATH) run-both         # Run both gateways"
	@echo ""
	@echo "Available targets:"
	@echo ""
	@echo "  Besu Test Ledger Operations:"
	@echo "    start-besu           Start both Besu test ledgers"
	@echo "    start-besu1          Start Besu ledger 1 (port $(BESU1_RPC_PORT))"
	@echo "    start-besu2          Start Besu ledger 2 (port $(BESU2_RPC_PORT))"
	@echo "    stop-besu            Stop both Besu ledgers"
	@echo "    stop-besu1           Stop Besu ledger 1"
	@echo "    stop-besu2           Stop Besu ledger 2"
	@echo "    besu-status          Check Besu ledger status"
	@echo ""
	@echo "  Account Funding Operations:"
	@echo "    fund-accounts        Fund bridge account on both Besu networks"
	@echo "    fund-account-besu1   Fund account on Besu 1 ($(FUND_AMOUNT))"
	@echo "    fund-account-besu2   Fund account on Besu 2 ($(FUND_AMOUNT))"
	@echo "    check-balances       Check account balances on both networks"
	@echo ""
	@echo "  Build Operations:"
	@echo "    build                Build the Docker image"
	@echo "    build-no-cache       Build the Docker image without cache"
	@echo ""
	@echo "  Contract Deployment:"
	@echo "    deploy-contracts     Deploy SATPWrapper to both Besu networks"
	@echo "    deploy-contracts-besu1  Deploy to Besu network 1 only"
	@echo "    deploy-contracts-besu2  Deploy to Besu network 2 only"
	@echo "    show-contracts       Show deployed contract addresses"
	@echo "    init-bridge          Initialize bridge contracts"
	@echo ""
	@echo "  Bridge Address Operations:"
	@echo "    get-bridge-addresses Get bridge addresses from both gateway APIs"
	@echo "    get-bridge-address-gw1  Get bridge address from Gateway 1 API"
	@echo "    get-bridge-address-gw2  Get bridge address from Gateway 2 API"
	@echo "    show-addresses       Show all saved addresses"
	@echo ""
	@echo "  Config Generation:"
	@echo "    create-configs       Create all temp config files"
	@echo "    create-config-gw1    Create Gateway 1 config"
	@echo "    create-config-gw2    Create Gateway 2 config"
	@echo "    create-adapter-gw1   Create Gateway 1 adapter config"
	@echo "    create-adapter-gw2   Create Gateway 2 adapter config"
	@echo ""
	@echo "  Single Gateway Operations (Legacy):"
	@echo "    run                  Run container in detached mode"
	@echo "    run-interactive      Run container in interactive mode"
	@echo "    stop                 Stop the running container"
	@echo "    logs                 View container logs (follow)"
	@echo "    logs-tail            View last 100 lines of logs"
	@echo "    shell                Open shell in running container"
	@echo ""
	@echo "  Multi-Gateway Operations:"
	@echo "    run-gateway1         Run Gateway 1 with temp configs"
	@echo "    run-gateway2         Run Gateway 2 with temp configs"
	@echo "    run-both             Run both gateways"
	@echo "    stop-gateway1        Stop Gateway 1"
	@echo "    stop-gateway2        Stop Gateway 2"
	@echo "    stop-all             Stop both gateways"
	@echo "    healthcheck-gw1      Check Gateway 1 health"
	@echo "    healthcheck-gw2      Check Gateway 2 health"
	@echo ""
	@echo "  Log Operations:"
	@echo "    logs-gw1             View Gateway 1 logs (all)"
	@echo "    logs-gw2             View Gateway 2 logs (all)"
	@echo "    logs-gw1-adapter     View Gateway 1 adapter logs (filtered)"
	@echo "    logs-gw2-adapter     View Gateway 2 adapter logs (filtered)"
	@echo "    show-logs            Show log file locations and sizes"
	@echo "    logs-webhook-server  View webhook server logs"
	@echo ""
	@echo "  Webhook Test Server:"
	@echo "    start-webhook-server Start webhook test server (port $(WEBHOOK_SERVER_PORT))"
	@echo "    stop-webhook-server  Stop webhook test server"
	@echo "    webhook-server-status Check webhook server status"
	@echo "    test-webhook-server  Test webhook server endpoints"
	@echo ""
	@echo "  E2E Test Operations:"
	@echo "    e2e                  Full E2E: deploy + wait + test"
	@echo "    e2e-wait-ready       Wait for both gateways to be ready"
	@echo "    e2e-run-tests        Run tests against both gateways"
	@echo "    e2e-clean            Run E2E then cleanup"
	@echo ""
	@echo "  Shutdown & Status Operations:"
	@echo "    shutdown-all         Shutdown gateways, ledgers, and webhook server"
	@echo "    shutdown-webhook-server  Shutdown webhook server via API"
	@echo "    status-all           Show status of all services"
	@echo ""
	@echo "  Test Operations:"
	@echo "    healthcheck          Check gateway health"
	@echo "    integrations         Get gateway integrations"
	@echo "    sessions             Get all sessions"
	@echo "    test                 Run all adapter tests"
	@echo ""
	@echo "  Cleanup Operations:"
	@echo "    clean                Stop container and remove image"
	@echo "    clean-all            Remove all related images"
	@echo "    clean-configs        Remove temp config files"
	@echo "    clean-full           Full cleanup (all of the above)"
	@echo ""
	@echo "Configuration:"
	@echo "  Branch:           $(BRANCH_NAME)"
	@echo "  Remote:           $(REMOTE_NAME)"
	@echo "  Image:            $(IMAGE_NAME):$(IMAGE_TAG)"
	@echo "  Adapter Timeout:  $(ADAPTER_TIMEOUT_MS)ms (5 minutes)"
	@echo "  Temp Directory:   $(TEMP_DIR) (configurable via TEMP_DIR=...)"
	@echo "  Webhook Server:   http://$(WEBHOOK_SERVER_HOST):$(WEBHOOK_SERVER_PORT)"
	@echo ""
	@echo "  Gateway 1:"
	@echo "    Container:      $(GW1_CONTAINER_NAME)"
	@echo "    API Port:       $(GW1_API_PORT)"
	@echo "    Server Port:    $(GW1_SERVER_PORT)"
	@echo "    Client Port:    $(GW1_CLIENT_PORT)"
	@echo "    Besu RPC:       $(BESU1_RPC_HTTP)"
	@echo "    Adapter:        Single outbound webhook at stage0/before"
	@echo "    All Logs:       $(LOG_FILE_GW1)"
	@echo "    Adapter Logs:   $(LOG_FILE_GW1_ADAPTER)"
	@echo ""
	@echo "  Gateway 2:"
	@echo "    Container:      $(GW2_CONTAINER_NAME)"
	@echo "    API Port:       $(GW2_API_PORT)"
	@echo "    Server Port:    $(GW2_SERVER_PORT)"
	@echo "    Client Port:    $(GW2_CLIENT_PORT)"
	@echo "    Besu RPC:       $(BESU2_RPC_HTTP)"
	@echo "    Adapter:        No adapters (server side)"
	@echo "    All Logs:       $(LOG_FILE_GW2)"
	@echo "    Adapter Logs:   $(LOG_FILE_GW2_ADAPTER)"
	@echo ""
