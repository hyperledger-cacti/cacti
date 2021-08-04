.PHONY: build
build: .npmrc
	npm install
	npm run build
	
.PHONY: build-local
build-local:
	cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install && \
		mv package-remote.json package.json
	npm run build
	mkdir build/protos-js && cp -r node_modules/@hyperledger-labs/weaver-protos-js/* build/protos-js/

.PHONE: publish
publish: .npmrc
	npm publish
	

clean:
	rm -rf build node_modules package-lock.json .nyc_output coverage
