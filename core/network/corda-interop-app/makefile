.PHONY: build-local
build-local:
	echo "Calling update-protos-local script..."
	./scripts/update-protos-local.sh
	echo "Successfully updated protos, compiling Kotlin from protos and compiling the client..."
	cp interop-contracts/build.gradle.local interop-contracts/build.gradle
	cp interop-workflows/build.gradle.local interop-workflows/build.gradle
	echo "Set gradle build files to use local dependencies"
	./gradlew clean jar

.PHONY: build
build:
	echo "Calling update-protos script..."
	./scripts/update-protos.sh
	echo "Successfully updated protos, compiling Kotlin from protos and compiling the client..."
	cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	echo "Set gradle build files to use local dependencies"
	./gradlew clean jar

.PHONY: publish
publish:
	cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	echo "Publishing cordapps to Artifactory..."
	./gradlew publishAllPublicationsToMavenRepository

.PHONY: publish-workflows
publish-workflows:
	cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	echo "Publishing interop workflows to Artifactory..."
	./gradlew publishWorkflowsPublicationToMavenRepository

.PHONY: clean-local
clean-local:
	cp interop-contracts/build.gradle.local interop-contracts/build.gradle
	cp interop-workflows/build.gradle.local interop-workflows/build.gradle
	./gradlew clean

.PHONY: clean
clean:
	cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	./gradlew clean
