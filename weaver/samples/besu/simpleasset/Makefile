.PHONY: deploy-contracts
deploy-contracts: deploy-contract-network1 deploy-contract-network2

.PHONY: deploy-contract-network1
deploy-contract-network1:
	BESU_NETWORK_HOST=localhost BESU_NETWORK_PORT=8545 npm run deploy-contract

.PHONY: deploy-contract-network2
deploy-contract-network2:
	BESU_NETWORK_HOST=localhost BESU_NETWORK_PORT=9544 npm run deploy-contract

.PHONY: clean-run
clean-run:
	npm run clean-run

.PHONY: clean
clean:
	npm run clean
