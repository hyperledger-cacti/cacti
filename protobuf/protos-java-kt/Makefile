.PHONY: build
build:
	sh get-fabric-protos.sh
	./gradlew clean jar

.PHONY: publish
publish: build
	./gradlew publishAllPublicationsToMavenRepository

.PHONY: clean	
clean:
	./gradlew clean
	rm -rf fabric-protos src