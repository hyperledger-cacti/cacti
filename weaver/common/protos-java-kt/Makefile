.PHONY: build
build:
	sh ../get-fabric-protos.sh ../..
	./gradlew clean jar

.PHONY: publish
publish: build
	./gradlew publishAllPublicationsToMavenRepository

.PHONY: clean-build
clean-build:
	./gradlew clean

.PHONY: clean
clean: clean-build
	rm -rf ../fabric-protos 