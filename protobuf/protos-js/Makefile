.PHONY: build
build:
	sh update-protos-local.sh
	npm install
	npm run build

.PHONY: publish
publish:
	npm publish

.PHONY: clean-build
clean-build:
	rm -rf common corda driver fabric msp networks peer relay

.PHONY: clean
clean: clean-build
	rm -rf node_modules
	rm package-lock.json
	rm -rf fabric-protos
	rm -rf protos