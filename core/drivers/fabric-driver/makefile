include makefile.variables.docker

COMPOSE_ARG ?=
	
build: .npmrc
	npm install
	npm run build
	npm run postinstall

build-local:
	mkdir -p protos-js && \
		cp -r ../../../common/protos-js/common ./protos-js/ && \
		cp -r ../../../common/protos-js/corda ./protos-js/ && \
		cp -r ../../../common/protos-js/driver ./protos-js/ && \
		cp -r ../../../common/protos-js/fabric ./protos-js/ && \
		cp -r ../../../common/protos-js/msp ./protos-js/ && \
		cp -r ../../../common/protos-js/networks ./protos-js/ && \
		cp -r ../../../common/protos-js/peer ./protos-js/ && \
		cp -r ../../../common/protos-js/relay ./protos-js/ && \
		cp -r ../../../common/protos-js/package.json ./protos-js/
	cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install && \
		mv package-remote.json package.json
	npm run build
	npm run postinstall
	
build-image-local:
	mkdir -p protos-js && \
		cp -r ../../../common/protos-js/common ./protos-js/ && \
		cp -r ../../../common/protos-js/corda ./protos-js/ && \
		cp -r ../../../common/protos-js/driver ./protos-js/ && \
		cp -r ../../../common/protos-js/fabric ./protos-js/ && \
		cp -r ../../../common/protos-js/msp ./protos-js/ && \
		cp -r ../../../common/protos-js/networks ./protos-js/ && \
		cp -r ../../../common/protos-js/peer ./protos-js/ && \
		cp -r ../../../common/protos-js/relay ./protos-js/ && \
		cp -r ../../../common/protos-js/package.json ./protos-js/
	cp package.json package-remote.json
	cp package-local.json package.json
	docker build --build-arg BUILD_TAG="local" --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) -f fabricDriver.dockerfile.local .
	mv package-remote.json package.json
	rm -rf protos-js

build-image: .npmrc
	docker build --build-arg BUILD_TAG="remote" --build-arg GIT_URL=$(GIT_URL) -t ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) -f fabricDriver.dockerfile .
	
push-image: build-image
	docker tag ${DOCKER_IMAGE_NAME}:$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)

deploy:
	docker-compose $(COMPOSE_ARG) up -d

stop:
	docker-compose $(COMPOSE_ARG) down

re-deploy: stop deploy
	
clean:
	rm -rf node_modules package-lock.json out
	
clean-local:
	rm -rf node_modules package-lock.json out protos-js
