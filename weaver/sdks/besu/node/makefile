.PHONY: build
build: .npmrc
	yarn install
	yarn run build
	
.PHONY: build-local
build-local:
	mkdir -p protos-js && \
		(cp -r ../../../common/protos-js/common ./protos-js/ && \
		cp -r ../../../common/protos-js/corda ./protos-js/ && \
		cp -r ../../../common/protos-js/driver ./protos-js/ && \
		cp -r ../../../common/protos-js/fabric ./protos-js/ && \
		cp -r ../../../common/protos-js/msp ./protos-js/ && \
		cp -r ../../../common/protos-js/networks ./protos-js/ && \
		cp -r ../../../common/protos-js/peer ./protos-js/ && \
		cp -r ../../../common/protos-js/relay ./protos-js/ && \
		cp -r ../../../common/protos-js/identity ./protos-js/ && \
		cp -r ../../../common/protos-js/package.json ./protos-js/) || \
		(rm -rf protos-js && echo "Error: Please build weaver/common/protos-js locally" && exit 1)
	yarn install
	rm -rf build
	yarn run build
	mkdir -p build
	cp -r protos-js build/
	

.PHONE: publish
publish: .npmrc
	yarn publish --no-workspaces
	

clean:
	rm -rf build node_modules protos-js package-lock.json .nyc_output coverage
