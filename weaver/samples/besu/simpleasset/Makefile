.PHONY: deploy-contracts
deploy-contracts: deploy-contract-network1 deploy-contract-network2

.PHONY: deploy-contract-network1
deploy-contract-network1:
	BESU_NETWORK_HOST=127.0.0.1 BESU_NETWORK_PORT=8545 yarn run deploy-contract

.PHONY: deploy-contract-network2
deploy-contract-network2:
	BESU_NETWORK_HOST=127.0.0.1 BESU_NETWORK_PORT=9544 yarn run deploy-contract

.PHONY: clean-run
clean-run:
	yarn run clean-run

.PHONY: clean
clean:
	yarn run clean
