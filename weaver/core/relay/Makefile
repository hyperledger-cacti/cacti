DOCKER_IMAGE_NAME ?= weaver-relay
DOCKER_TAG ?= `cat ./VERSION`
DOCKER_REGISTRY ?= ghcr.io/hyperledger-labs
GIT_URL = https://github.com/hyperledger-labs/weaver-dlt-interoperability

PROTOS_TAG ?= v1.4.2

DOCKER_IMAGE_ALL = $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
DOCKER_IMAGE_SERVER = $(DOCKER_IMAGE_NAME)-server:$(DOCKER_TAG)
DOCKER_IMAGE_SERVER_LATEST = $(DOCKER_IMAGE_NAME)-server:latest
DOCKER_IMAGE_CLIENT = $(DOCKER_IMAGE_NAME)-client:$(DOCKER_TAG)
DOCKER_IMAGE_DRIVER = $(DOCKER_IMAGE_NAME)-driver:$(DOCKER_TAG)

COMMIT = $(shell git log -1 --oneline | cut -d ' ' -f 1)
BRANCH = $(shell git rev-parse --abbrev-ref HEAD)
TIMESTAMP = $(shell date +%FT%T%z)
COMPOSE_ARG ?=

.PHONY: all
all: 	build-local

# This target builds a fingerprint file that provides accountability for the
# docker image and also the binary. It can be used for introspection and 
# others troubleshooting activities. More importantly it provides traceability
# of the build artifacts back to the source.
fingerprint.json: 
	@echo -e "\033[1mBUILD\033[0m - Creating build fingerprint..."
	@echo "{ "\version\" : \""$(DOCKER_TAG)\"", \"protos-version\" : \"$(PROTOS_TAG)\"", \"commit\" : \""$(COMMIT)"\", \"branch\" : \""$(BRANCH)"\", \"timestamp\" : \""$(TIMESTAMP)"\" }" > fingerprint.json

# This target is used to provision the protobuf definitions that are required
# to build the scaffolds of the relay GRPC service.
protos:
	@echo -e "\033[1mFETCH\033[0m - Calling update-protos script..."
	./scripts/update-protos.sh

# Builds the relay binary.
.PHONY: build
build:	protos
	@echo -e "\033[1mBUILD\033[0m - Successfully updated protos, compiling Rust..."
	cargo build

# Builds the docker image of the relay. The target depends upon
# the build fingerprint and the presence of the protos folder
# which contains the definitions of the interfaces for the relay
# service.
.PHONY:	build-server
build-server: protos fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay server)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) --build-arg GIT_URL=$(GIT_URL) -t $(DOCKER_IMAGE_SERVER) -f Dockerfile.server . 

.PHONY: build-client
build-client: protos fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay client)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) -t $(DOCKER_IMAGE_CLIENT) -f Dockerfile.client .

.PHONY: build-driver
build-driver: protos fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay driver)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) -t $(DOCKER_IMAGE_DRIVER) -f Dockerfile.driver .


.PHONY: build-allinone
build-allinone: protos fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay all-in-one)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) -t $(DOCKER_IMAGE_ALL) -f Dockerfile .


.PHONY: build-images
build-images: build-allinone build-driver build-server build-client

# This target is used to provision the protobuf definitions that are required
# to build the scaffolds of the relay GRPC service.
protos-local:
	@echo -e "\033[1mFETCH\033[0m - Calling update-protos local script..."
	./scripts/update-protos.sh local

# Builds the relay binary.
.PHONY: build-local
build-local:	protos-local
	@echo -e "\033[1mBUILD\033[0m - Successfully updated protos, compiling Rust..."
	cargo build

# Builds the docker image of the relay. The target depends upon
# the build fingerprint and the presence of the protos folder
# which contains the definitions of the interfaces for the relay
# service.
.PHONY:	build-server-local
build-server-local: protos-local fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay server)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) --build-arg GIT_URL=$(GIT_URL) -t $(DOCKER_IMAGE_SERVER) -f Dockerfile.server .
	docker tag $(DOCKER_IMAGE_SERVER) $(DOCKER_IMAGE_SERVER_LATEST)

.PHONY: build-client-local
build-client-local: protos-local fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay client)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) -t $(DOCKER_IMAGE_CLIENT) -f Dockerfile.client .

.PHONY: build-driver-local
build-driver-local: protos-local fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay driver)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) -t $(DOCKER_IMAGE_DRIVER) -f Dockerfile.driver .


.PHONY: build-allinone-local
build-allinone-local: protos-local fingerprint.json
	@echo -e "\033[1mBUILD\033[0m - Building Docker image (relay all-in-one)..."
	docker build  --build-arg COMMIT=$(COMMIT) --build-arg BRANCH=$(BRANCH) --build-arg PROTOS_VERSION=$(PROTOS_TAG) --build-arg VERSION=$(DOCKER_TAG) -t $(DOCKER_IMAGE_ALL) -f Dockerfile .


.PHONY: build-images-local
build-images-local: build-allinone-local build-driver-local build-server-local build-client-local

.PHONY: check-if-tag-exists
check-if-tag-exists:
	!(DOCKER_CLI_EXPERIMENTAL=enabled docker manifest inspect $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_SERVER) > /dev/null)

.PHONY: push-server
push-server: check-if-tag-exists build-server-local
	@echo -e "\033[1mPUSH\033[0m - Pushing Docker image (relay server)..."
	docker tag $(DOCKER_IMAGE_SERVER) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_SERVER)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_SERVER)
	
.PHONY: push-server
push-server-latest:
	@echo -e "\033[1mPUSH\033[0m - Pushing Docker image Latest tag (relay server)..."
	docker tag $(DOCKER_IMAGE_SERVER) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_SERVER_LATEST)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_SERVER_LATEST)

.PHONY: push-client
push-client: build-client
	@echo -e "\033[1mPUSH\033[0m - Pushing Docker image (relay client)..."
	docker tag $(DOCKER_IMAGE_CLIENT) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_CLIENT)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_CLIENT)

.PHONY: push-driver
push-driver: build-driver
	@echo -e "\033[1mPUSH\033[0m - Pushing Docker image (relay driver)..."
	docker tag $(DOCKER_IMAGE_DRIVER) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_DRIVER)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_DRIVER)

.PHONY: push-allinone
	@echo -e "\033[1mPUSH\033[0m - Pushing Docker image (relay all-in-one)..."
	docker tag $(DOCKER_IMAGE_ALL) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_ALL)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_ALL)

# Pushes the relay to the specified repository.
.PHONY: push
pushi-images: push-server push-client push-driver push-allinone
	@echo -e "\033[1mPUSH\033[0m - Pushing Docker image..."
	docker tag $(DOCKER_IMAGE) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE)

# Starts an instance of the relay container.
#
.PHONY: start
start:
	docker network create relay || true
	docker-compose $(COMPOSE_ARG) up -d
# Starts an instance of the relay container.
#
.PHONY: start-server
start-server:
	docker network create relay || true
	docker-compose $(COMPOSE_ARG) up -d relay-server

.PHONY: stop
stop:
	docker-compose $(COMPOSE_ARG) down
	
.PHONY: convert-compose-method1
convert-compose-method1:
	./scripts/convert-compose.sh 1
	
.PHONY: convert-compose-method2
convert-compose-method2:
	./scripts/convert-compose.sh 2

# Cleans up all the build artifacts.
#
.PHONY: clean
clean:
	@echo -e "\033[1mCLEAN\033[0m - Removing all artifacts..."
	-rm -rf protos-rs
	-rm fingerprint.json
	-docker-compose down
	-docker rmi $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_SERVER)
	-docker rmi $(DOCKER_IMAGE_SERVER)
	-docker rmi $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_CLIENT)
	-docker rmi $(DOCKER_IMAGE_CLIENT)
	-docker rmi $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_DRIVER)
	-docker rmi $(DOCKER_IMAGE_DRIVER)
	-docker rmi $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_ALL)
	-docker rmi $(DOCKER_IMAGE_ALL)
	cargo clean

update-pkgs:
	cargo update -p nom
	cargo update -p lexical-core
