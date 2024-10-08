DOCKER_IMAGE_NAME ?= cacti-weaver-iin-agent
DOCKER_TAG ?= `cat ./VERSION`
DOCKER_REGISTRY ?= ghcr.io/hyperledger
GIT_URL = https://github.com/hyperledger-cacti/cacti/weaver/core/identity-management/iin-agent
DLT_SPECIFIC_DIR ?= .
COMPOSE_ARG ?=

build: .npmrc
	npm install --workspaces=false
	npm run build

	
protos-js:
	mkdir -p protos-js && \
		(cp -r ../../../common/protos-js/common ./protos-js/ && \
		cp -r ../../../common/protos-js/corda ./protos-js/ && \
		cp -r ../../../common/protos-js/driver ./protos-js/ && \
		cp -r ../../../common/protos-js/identity ./protos-js/ && \
		cp -r ../../../common/protos-js/fabric ./protos-js/ && \
		cp -r ../../../common/protos-js/msp ./protos-js/ && \
		cp -r ../../../common/protos-js/networks ./protos-js/ && \
		cp -r ../../../common/protos-js/peer ./protos-js/ && \
		cp -r ../../../common/protos-js/relay ./protos-js/ && \
		cp -r ../../../common/protos-js/package.json ./protos-js/) || \
		(rm -rf protos-js && echo "Error: Please build weaver/common/protos-js locally" && exit 1)

cacti-weaver-sdk-fabric:
	mkdir -p cacti-weaver-sdk-fabric && \
		(cp -r ../../../sdks/fabric/interoperation-node-sdk/build ./cacti-weaver-sdk-fabric/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/index.js ./cacti-weaver-sdk-fabric/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/package.json ./cacti-weaver-sdk-fabric/package.json) || \
		(rm -rf cacti-weaver-sdk-fabric && echo "Error: Please build weaver/sdks/fabric/interoperation-node-sdk locally" && exit 1)

build-local: protos-js cacti-weaver-sdk-fabric
	(cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install --workspaces=false) || \
		(mv package-remote.json package.json && exit 1) # Only if fails	
	mv package-remote.json package.json # Only if success
	npm run build

build-image-local: protos-js cacti-weaver-sdk-fabric
	cp package.json package-remote.json
	cp package-local.json package.json
	(docker build --build-arg BUILD_TAG="local" --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) -f iinagent.local.Dockerfile . ) || \
		(mv package-remote.json package.json && exit 1) # Only if fails
	mv package-remote.json package.json # Only if success
	rm -rf protos-js cacti-weaver-sdk-fabric
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
	chmod 777 $(DLT_SPECIFIC_DIR)
	docker network create iin || true
	docker compose $(COMPOSE_ARG) up -d

stop:
	docker compose $(COMPOSE_ARG) down

re-deploy: stop deploy
	
test-local: build-local
	npm run test

clean:
	rm -rf node_modules package-lock.json out
	
clean-local:
	rm -rf node_modules package-lock.json out protos-js cacti-weaver-sdk-fabric
