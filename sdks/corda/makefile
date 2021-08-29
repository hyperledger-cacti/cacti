.PHONY: build
build:
	./gradlew clean jar 

.PHONY: build-refresh-dependencies
build-refresh-dependencies: github.properties
	./gradlew build --refresh-dependencies
	
.PHONY: publish
publish: github.properties
	echo "Publishing SDK to Github..."
	./gradlew publishAllPublicationsToMavenRepository
	
.PHONY: test
test:
	./gradlew test
	
.PHONY: clean
clean:
	./gradlew clean
	rm -rf .gradle
