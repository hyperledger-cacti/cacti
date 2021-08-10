.PHONY: build-local
build-local:
	echo "Building Protos..."
	cd ../../../common/protos-java-kt && make build
	echo "Building corda-interop-app..."
	cd ../../network/corda-interop-app && make build-local
	echo "Building Driver..."
	./gradlew clean build 

.PHONY: build-refresh-dependencies-local
build-refresh-dependencies-local:
	./gradlew build --refresh-dependencies

.PHONY: build
build: github.properties
	./gradlew clean build 

.PHONY: build-refresh-dependencies
build-refresh-dependencies: github.properties
	./gradlew build --refresh-dependencies
	

.PHONY: run
test:
	./gradlew test
	
.PHONY: clean
clean:
	./gradlew clean
	rm -rf .gradle
