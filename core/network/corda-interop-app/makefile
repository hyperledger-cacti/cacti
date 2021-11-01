.PHONY: build-local
build-local:
	cp build.gradle build.gradle.bk
	cp build.gradle.local build.gradle
	echo "Set gradle build files to use local dependencies"
	./gradlew clean jar
	mv build.gradle.bk build.gradle

.PHONY: build
build:
	cp build.gradle build.gradle.bk
	cp build.gradle.remote build.gradle
	echo "Set gradle build files to use remote dependencies"
	./gradlew clean jar
	mv build.gradle.bk build.gradle

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
	cp build.gradle build.gradle.bk
	cp build.gradle.local build.gradle
	./gradlew clean
	rm -rf fabric-protos proto || true
	rm -rf .gradle
	mv build.gradle.bk build.gradle

.PHONY: clean
clean:
	cp build.gradle build.gradle.bk
	cp build.gradle.remote build.gradle
	./gradlew clean
	rm -rf .gradle
	mv build.gradle.bk build.gradle
