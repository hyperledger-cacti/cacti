DOCKER_IMAGE_NAME ?= weaver-corda-driver
DOCKER_TAG ?= 1.2.3
DOCKER_REGISTRY ?= ghcr.io/hyperledger-labs
GIT_URL = https://github.com/hyperledger-labs/weaver-dlt-interoperability/core/drivers/corda-driver
COMPOSE_ARG ?=

.PHONY: build-local
build-local:
	echo "Building Driver..."
	./gradlew clean installDist

.PHONY: build-refresh-dependencies-local
build-refresh-dependencies-local:
	./gradlew build --refresh-dependencies

.PHONY: build
build: github.properties
	./gradlew clean installDist

.PHONY: build-refresh-dependencies
build-refresh-dependencies: github.properties
	./gradlew build --refresh-dependencies
	
.PHONY: image
image: github.properties
	docker build --build-arg GIT_URL=$(GIT_URL) -t corda-driver:latest .

.PHONY: push-image	
push-image: image
	docker tag corda-driver:latest $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

.PHONY: run
run:
	./build/install/corda-driver/bin/corda-driver
	
.PHONY: deploy
deploy:
	docker-compose $(COMPOSE_ARG) up -d
	
.PHONY: stop
stop:
	docker-compose $(COMPOSE_ARG) down
	
.PHONY: clean
clean:
	./gradlew clean
	rm -rf .gradle
