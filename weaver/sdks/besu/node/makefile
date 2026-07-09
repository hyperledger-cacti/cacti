.PHONY: build
build: .npmrc
	yarn install
	yarn run build
	
.PHONY: build-local
build-local: clean
	yarn install
	yarn run build

.PHONE: publish
publish: .npmrc
	npm publish --no-workspaces

clean:
	rm -rf node_modules protos-js package-lock.json .nyc_output coverage
