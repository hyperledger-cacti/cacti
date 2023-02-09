.PHONY: build-local
build-local:
	echo "Set gradle build files to use local dependencies"
	./gradlew clean jar

.PHONY: build
build:	github.properties
	echo "Set gradle build files to use remote dependencies"
	./gradlew clean jar

.PHONY: publish
publish: github.properties
	echo "Publishing cordapps to Github..."
	./gradlew publishAllPublicationsToMavenRepository

.PHONY: publish-workflows
publish-workflows: github.properties
	echo "Publishing interop workflows to Github..."
	./gradlew publishWorkflowsPublicationToMavenRepository

.PHONY: publish-contracts
publish-contracts: github.properties
	echo "Publishing interop contracts Github..."
	./gradlew publishContractsPublicationToMavenRepository

.PHONY: test
test:
	./gradlew test

.PHONY: clean-local
clean-local:
	./gradlew clean
	rm -rf fabric-protos proto || true
	rm -rf .gradle

.PHONY: clean
clean:	github.properties
	./gradlew clean
	rm -rf .gradle
