DOCKER_IMAGE_NAME ?= weaver-corda-driver
DOCKER_TAG ?= `cat ./VERSION`
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
	
	
.PHONY: image-local
image-local: build-local
	docker build -f Dockerfile.local -t $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) .
	docker tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) $(DOCKER_IMAGE_NAME):latest

.PHONY: image
image: github.properties
	docker build --build-arg GIT_URL=$(GIT_URL) -f Dockerfile.remote -t $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) .

.PHONY: check-if-tag-exists
check-if-tag-exists:
	!(DOCKER_CLI_EXPERIMENTAL=enabled docker manifest inspect $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG) > /dev/null)

.PHONY: push-image	
push-image: check-if-tag-exists image
	docker tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	
.PHONY: push-image-latest
push-image-latest:
	docker tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest

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
