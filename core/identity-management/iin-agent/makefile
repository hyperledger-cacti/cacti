DOCKER_IMAGE_NAME ?= weaver-iin-agent
DOCKER_TAG ?= `cat ./VERSION`
DOCKER_REGISTRY ?= ghcr.io/hyperledger-labs
GIT_URL = https://github.com/hyperledger-labs/weaver-dlt-interoperability/core/identity-management/iin-agent

COMPOSE_ARG ?=

build: .npmrc
	npm install
	npm run build

	
protos-js:
	mkdir -p protos-js && \
		cp -r ../../../common/protos-js/common ./protos-js/ && \
		cp -r ../../../common/protos-js/corda ./protos-js/ && \
		cp -r ../../../common/protos-js/driver ./protos-js/ && \
		cp -r ../../../common/protos-js/identity ./protos-js/ && \
		cp -r ../../../common/protos-js/fabric ./protos-js/ && \
		cp -r ../../../common/protos-js/msp ./protos-js/ && \
		cp -r ../../../common/protos-js/networks ./protos-js/ && \
		cp -r ../../../common/protos-js/peer ./protos-js/ && \
		cp -r ../../../common/protos-js/relay ./protos-js/ && \
		cp -r ../../../common/protos-js/package.json ./protos-js/

weaver-fabric-interop-sdk:
	mkdir -p weaver-fabric-interop-sdk && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/build ./weaver-fabric-interop-sdk/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/index.js ./weaver-fabric-interop-sdk/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/package.json ./weaver-fabric-interop-sdk/package.json

build-local: protos-js weaver-fabric-interop-sdk
	(cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install) || \
		(mv package-remote.json package.json && exit 1) # Only if fails	
	mv package-remote.json package.json # Only if success
	npm run build

build-image-local: protos-js weaver-fabric-interop-sdk
	cp package.json package-remote.json
	cp package-local.json package.json
	(docker build --build-arg BUILD_TAG="local" --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) -f iinagent.local.Dockerfile . ) || \
		(mv package-remote.json package.json && exit 1) # Only if fails
	mv package-remote.json package.json # Only if success
	rm -rf protos-js weaver-fabric-interop-sdk
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_IMAGE_NAME):latest

build-image: .npmrc
	docker build --build-arg BUILD_TAG="remote" --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) -f iinagent.Dockerfile .

check-if-tag-exists:
	!(DOCKER_CLI_EXPERIMENTAL=enabled docker manifest inspect $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG) > /dev/null)
	
push-image: check-if-tag-exists build-image
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

push-image-latest:
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest

deploy:
	docker network create iin || true
	docker-compose $(COMPOSE_ARG) up -d

stop:
	docker-compose $(COMPOSE_ARG) down

re-deploy: stop deploy
	
test-local: build-local
	npm run test

clean:
	rm -rf node_modules package-lock.json out
	
clean-local:
	rm -rf node_modules package-lock.json out protos-js weaver-fabric-interop-sdk
