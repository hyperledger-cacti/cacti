.PHONY: build-local-weaver-dependencies
build-local-weaver-dependencies:
	echo "Building local protos..."
	cd ../../../common/protos-java-kt && make build
	echo "Building corda interop app..."
	cd ../../../core/network/corda-interop-app && make build-local
	
.PHONY: build-local	
build-local: build-local-weaver-dependencies
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
	./gradlew clean installDist jar

.PHONY: build-refresh-dependencies
build-refresh-dependencies: github.properties
	./gradlew clean build --refresh-dependencies

.PHONY: build-cordapp
build-cordapp: github.properties
	./gradlew jar

.PHONY: build-cli
build-cli: github.properties
	./gradlew installDist

.PHONY: test
test: github.properties
	./gradlew test

.PHONY: initialise-vault
initialise-vault:
	./clients/build/install/clients/bin/clients configure-all network1,network2

.PHONY: initialise-vault-docker
initialise-vault-docker:
	./clients/build/install/clients/bin/clients configure-all network1-docker

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
