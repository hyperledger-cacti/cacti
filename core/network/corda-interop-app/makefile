.PHONY: build-local
build-local:
	echo "Building protos locally..."
	cd ../../../common/protos-java-kt && make build
	cp build.gradle.local build.gradle
	echo "Set gradle build files to use local dependencies"
	./gradlew clean jar

.PHONY: build
build:
	cp build.gradle.remote build.gradle
	echo "Set gradle build files to use remote dependencies"
	./gradlew clean jar

.PHONY: publish
publish:
	cp build.gradle.remote build.gradle
	echo "Publishing cordapps to Github..."
	./gradlew publishAllPublicationsToMavenRepository

.PHONY: publish-workflows
publish-workflows:
	cp build.gradle.remote build.gradle
	echo "Publishing interop workflows to Github..."
	./gradlew publishWorkflowsPublicationToMavenRepository
	
.PHONY: test
test:
	./gradlew test

.PHONY: clean-local
clean-local:
	cp build.gradle.local build.gradle
	./gradlew clean
	rm -rf fabric-protos proto || true
	rm -rf .gradle

.PHONY: clean
clean:
	cp build.gradle.remote build.gradle
	./gradlew clean
	rm -rf .gradle
