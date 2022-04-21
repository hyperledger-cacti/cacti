include makefile.variables.docker

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

.PHONY: image
image: github.properties
	docker build --build-arg GIT_URL=$(GIT_URL) -f Dockerfile.remote -t $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) .

.PHONY: push-image	
push-image: image
	docker tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
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
