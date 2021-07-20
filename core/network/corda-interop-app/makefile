.PHONY: build-local
build-local:
	echo "Building protos locally..."
	cd ../../../common/protos-java-kt && make build
	# ./scripts/update-protos-local.sh
	# echo "Successfully updated protos, compiling Kotlin from protos and compiling the client..."
	cp build.gradle.local build.gradle
	# cp interop-contracts/build.gradle.local interop-contracts/build.gradle
	# cp interop-workflows/build.gradle.local interop-workflows/build.gradle
	echo "Set gradle build files to use local dependencies"
	./gradlew clean jar

.PHONY: build
build:
	# echo "Calling update-protos script..."
	# ./scripts/update-protos.sh
	# echo "Successfully updated protos, compiling Kotlin from protos and compiling the client..."
	cp build.gradle.remote build.gradle
	# cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	# cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	echo "Set gradle build files to use remote dependencies"
	./gradlew clean jar

.PHONY: publish
publish:
	cp build.gradle.remote build.gradle
	# cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	# cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	echo "Publishing cordapps to Artifactory..."
	./gradlew publishAllPublicationsToMavenRepository

.PHONY: publish-workflows
publish-workflows:
	cp build.gradle.remote build.gradle
	# cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	# cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	echo "Publishing interop workflows to Artifactory..."
	./gradlew publishWorkflowsPublicationToMavenRepository
	
.PHONY: test
test:
	./gradlew test

.PHONY: clean-local
clean-local:
	cp build.gradle.local build.gradle
	# cp interop-contracts/build.gradle.local interop-contracts/build.gradle
	# cp interop-workflows/build.gradle.local interop-workflows/build.gradle
	./gradlew clean
	rm -rf fabric-protos proto || true

.PHONY: clean
clean:
	cp build.gradle.remote build.gradle
	# cp interop-contracts/build.gradle.remote interop-contracts/build.gradle
	# cp interop-workflows/build.gradle.remote interop-workflows/build.gradle
	./gradlew clean
