DOCKER_IMAGE_NAME ?= weaver-fabric-driver
DOCKER_TAG ?= 1.2.1
DOCKER_REGISTRY ?= ghcr.io/hyperledger-labs
GIT_URL = https://github.com/hyperledger-labs/weaver-dlt-interoperability/core/drivers/fabric-driver

build-local: .npmrc
	# echo "Calling update-protos-local script..."
	# ./scripts/update-protos-local.sh
	npm install
	# npm run protos
	npm run build
	npm run postinstall

build-image-local: .npmrc
	# cp ${CONNECTION_PROFILE} connection_profile.json
	# echo "Calling update-protos-local script..."
	# ./scripts/update-protos-local.sh
	docker build --build-arg GIT_URL=$(GIT_URL) -t fabric-driver:latest -f fabricDriver.dockerfile .
	
build: .npmrc
	npm install
	npm run build
	npm run postinstall

build-image: .npmrc
	docker build --build-arg GIT_URL=$(GIT_URL) -t fabric-driver:latest -f fabricDriver.dockerfile .
	
push-image: build-image
	docker tag fabric-driver:latest $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

deploy:
	docker-compose up -d

stop:
	docker stop fabric-driver 2> /dev/null || true
	docker rm fabric-driver 2> /dev/null || true

clean-local: stop build-local

clean-deploy-local: clean-local deploy

clean: stop build

clean-deploy: clean deploy
	
clear:
	rm -rf node_modules package-lock.json out
