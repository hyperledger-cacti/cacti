.PHONY: build-local
build-local:
	echo "Building Protos..."
	cd ../../../common/protos-java-kt && make build
	echo "Building corda-interop-app..."
	cd ../../network/corda-interop-app && make build-local
	echo "Building Driver..."
	cp build.gradle.local build.gradle
	./gradlew clean installDist

.PHONY: build-refresh-dependencies-local
build-refresh-dependencies-local:
	cp build.gradle.local build.gradle
	./gradlew build --refresh-dependencies

.PHONY: build
build:
	cp build.gradle.remote build.gradle
	./gradlew clean installDist

.PHONY: build-refresh-dependencies
build-refresh-dependencies: 
	cp build.gradle.remote build.gradle
	./gradlew build --refresh-dependencies

.PHONY: run
run:
	./build/install/corda-driver/bin/corda-driver
	
.PHONY: clean
clean:
	./gradlew clean
