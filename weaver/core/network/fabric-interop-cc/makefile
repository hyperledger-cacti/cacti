DOCKER_IMAGE_NAME ?= weaver-fabric-cc
DOCKER_TAG ?= `cat contracts/interop/VERSION`
DOCKER_REGISTRY ?= ghcr.io/hyperledger-labs
GIT_URL = https://github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc

.PHONY: build protos all clean image push-image check-if-tag-exists

all: build

build:
	echo "Building chaincode binary"
	./scripts/build.sh

list-names:
	echo ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG)

image:
	(cd contracts/interop && make run-vendor)
	docker build --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) .

check-if-tag-exists:
	!(DOCKER_CLI_EXPERIMENTAL=enabled docker manifest inspect $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG) > /dev/null)

push-image: check-if-tag-exists image
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

push-image-latest:
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest

clean:
	rm -rf ./bin
