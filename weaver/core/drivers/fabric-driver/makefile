DOCKER_IMAGE_NAME ?= cacti-weaver-driver-fabric
DOCKER_TAG ?= `cat ./VERSION`
DOCKER_REGISTRY ?= ghcr.io/hyperledger
GIT_URL = https://github.com/hyperledger-cacti/cacti/cacti/core/drivers/fabric-driver
NETWORK_NAME ?= network1
COMPOSE_ARG ?=

build: .npmrc
	npm install --workspaces=false
	npm run build

protos-js:
	mkdir -p protos-js && \
		(cp -r ../../../common/protos-js/common ./protos-js/ && \
		cp -r ../../../common/protos-js/corda ./protos-js/ && \
		cp -r ../../../common/protos-js/driver ./protos-js/ && \
		cp -r ../../../common/protos-js/fabric ./protos-js/ && \
		cp -r ../../../common/protos-js/identity ./protos-js/ && \
		cp -r ../../../common/protos-js/msp ./protos-js/ && \
		cp -r ../../../common/protos-js/networks ./protos-js/ && \
		cp -r ../../../common/protos-js/peer ./protos-js/ && \
		cp -r ../../../common/protos-js/relay ./protos-js/ && \
		cp -r ../../../common/protos-js/package.json ./protos-js/) || \
		(rm -rf protos-js && echo "Error: Please build weaver/common/protos-js locally" && exit 1)

cacti-weaver-sdk-fabric: protos-js
	mkdir -p cacti-weaver-sdk-fabric && \
		(cp -r ../../../sdks/fabric/interoperation-node-sdk/build ./cacti-weaver-sdk-fabric/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/index.js ./cacti-weaver-sdk-fabric/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/package.json ./cacti-weaver-sdk-fabric/package.json) || \
		(rm -rf cacti-weaver-sdk-fabric && echo "Error: Please build weaver/sdks/fabric/interoperation-node-sdk locally" && exit 1)

build-local: cacti-weaver-sdk-fabric
	cp package.json package-remote.json
	cp package-local.json package.json
	(npm install --workspaces=false --unsafe-perm) || \
		(mv package-remote.json package.json && exit 1) # Only if fails	
	mv package-remote.json package.json # Only if success
	npm run build
	
build-image-local: cacti-weaver-sdk-fabric
	cp package.json package-remote.json
	cp package-local.json package.json
	(docker build --build-arg BUILD_TAG="local" --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) -f fabricDriver.dockerfile.local . ) || \
		(mv package-remote.json package.json && exit 1) # Only if fails
	mv package-remote.json package.json # Only if success
	rm -rf protos-js cacti-weaver-sdk-fabric
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_IMAGE_NAME):latest

build-image: .npmrc
	docker build --build-arg BUILD_TAG="remote" --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) -f fabricDriver.dockerfile .

check-if-tag-exists:
	!(DOCKER_CLI_EXPERIMENTAL=enabled docker manifest inspect $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG) > /dev/null)
	
push-image: check-if-tag-exists build-image
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

push-image-latest:
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest

deploy:
	mkdir -p wallet-$(NETWORK_NAME) && chmod 777 wallet-$(NETWORK_NAME)
	docker compose $(COMPOSE_ARG) up -d

stop:
	docker compose $(COMPOSE_ARG) down

re-deploy: stop deploy
	
clean:
	rm -rf node_modules package-lock.json out
	
clean-local:
	rm -rf node_modules package-lock.json out protos-js cacti-weaver-sdk-fabric
