.PHONY: deploy-contracts
deploy-contracts: build deploy-contract-network1 deploy-contract-network2

.PHONY: deploy-contract-network1
deploy-contract-network1:
	BESU_NETWORK_HOST=localhost BESU_NETWORK_PORT=8545 yarn run deploy

.PHONY: deploy-contract-network2
deploy-contract-network2:
	BESU_NETWORK_HOST=localhost BESU_NETWORK_PORT=9544 yarn run deploy

build:
	yarn install
	yarn run compile

compile:
	yarn run compile

.PHONY: clean-build
clean-build:
	rm -rf build

.PHONY: clean
clean:
	rm -rf node_modules package-lock.json build contracts/interop
