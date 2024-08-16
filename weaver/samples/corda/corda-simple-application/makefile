.PHONY: build-local-weaver-dependencies
build-local-weaver-dependencies:
	echo "Building local protos..."
	cd ../../../common/protos-java-kt && make build
	echo "Building corda interop app..."
	cd ../../../core/network/corda-interop-app && make build-local
	
.PHONY: build-local	
build-local:
	cd ../fungible-house-token && rm -f github.properties && make build
	./gradlew clean installDist jar

.PHONY: build-refresh-dependencies-local
build-refresh-dependencies-local: build-local-weaver-dependencies
	./gradlew clean build --refresh-dependencies

.PHONY: build-cordapp-local
build-cordapp-local: build-local-weaver-dependencies
	./gradlew jar

.PHONY: build-cli-local
build-cli-local: build-local-weaver-dependencies
	./gradlew installDist

.PHONY: test-local
test-local: build-local-weaver-dependencies
	./gradlew test

.PHONY: build
build: github.properties
	cp github.properties ../fungible-house-token/
	cd ../fungible-house-token && make build
	./gradlew clean installDist jar

.PHONY: build-refresh-dependencies
build-refresh-dependencies: github.properties
	./gradlew clean build --refresh-dependencies

.PHONY: build-cordapp
build-cordapp: github.properties
	./gradlew jar

.PHONY: build-cli
build-cli: github.properties
	cp github.properties ../fungible-house-token/
	cd ../fungible-house-token && make build
	./gradlew installDist

.PHONY: test
test: github.properties
	./gradlew test

.PHONY: initialise-vault
initialise-vault:
	if [ $(shell docker ps | grep corda_partya_1 | wc -l) -eq 1 ]; then \
		REMOTE_FLOW="localhost:30006#com.cordaSimpleApplication.flow.GetStateByKey:*" ./clients/build/install/clients/bin/clients configure all; \
	fi
	if [ $(shell docker ps | grep corda_network2_partya_1 | wc -l) -eq 1 ]; then \
		CORDA_PORT=30006 NETWORK_NAME=Corda_Network2 REMOTE_FLOW="localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:*" ./clients/build/install/clients/bin/clients configure all; \
	fi

.PHONY: initialise-vault-docker
initialise-vault-docker:
	if [ $(shell docker ps | grep corda_partya_1 | wc -l) -eq 1 ]; then \
		MEMBER_CREDENTIAL_FOLDER="clients/src/main/resources/config/credentials_docker" REMOTE_FLOW="corda_network2_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:*" LOCAL_FLOW="corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:*" ./clients/build/install/clients/bin/clients configure all; \
	fi
	if [ $(shell docker ps | grep corda_network2_partya_1 | wc -l) -eq 1 ]; then \
		CORDA_PORT=30006 NETWORK_NAME=Corda_Network2 MEMBER_CREDENTIAL_FOLDER="clients/src/main/resources/config/credentials_docker" REMOTE_FLOW="corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:*" LOCAL_FLOW="corda_network2_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:*" ./clients/build/install/clients/bin/clients configure all; \
	fi

.PHONY: initialise-vault-asset-transfer
initialise-vault-asset-transfer:
	if [ $(shell docker ps | grep corda_partya_1 | wc -l) -eq 1 ]; then \
		./clients/build/install/clients/bin/clients configure network; \
	fi
	if [ $(shell docker ps | grep corda_network2_partya_1 | wc -l) -eq 1 ]; then \
		CORDA_PORT=30006 NETWORK_NAME=Corda_Network2 ./clients/build/install/clients/bin/clients configure network; \
	fi
	bash scripts/initNetworkId.sh

.PHONY: initialise-vault-asset-transfer-docker
initialise-vault-asset-transfer-docker:
	if [ $(shell docker ps | grep corda_partya_1 | wc -l) -eq 1 ]; then \
		MEMBER_CREDENTIAL_FOLDER="clients/src/main/resources/config/credentials_docker" ./clients/build/install/clients/bin/clients configure network; \
	fi
	if [ $(shell docker ps | grep corda_network2_partya_1 | wc -l) -eq 1 ]; then \
		MEMBER_CREDENTIAL_FOLDER="clients/src/main/resources/config/credentials_docker" CORDA_PORT=30006 NETWORK_NAME=Corda_Network2 ./clients/build/install/clients/bin/clients configure network; \
	fi
	bash scripts/initNetworkId.sh

.PHONY: get-access-control-policies
get-access-control-policies:
	./clients/build/install/clients/bin/clients get-access-control-policies

.PHONY: get-verification-policies
get-verification-policies:
	./clients/build/install/clients/bin/clients get-verification-policies

.PHONY: get-security-groups
get-security-groups:
	./clients/build/install/clients/bin/clients get-security-groups

.PHONY: publish-cordapps
publish-cordapps:
	echo "Publishing CorDapps to Github..."
	./gradlew publishContractsPublicationToMavenRepository
	./gradlew publishWorkflowsPublicationToMavenRepository

.PHONY: clean
clean:
	./gradlew clean
	rm -rf .gradle
