.PHONY: build
build:
	sh ../get-fabric-protos.sh ../..
	yarn workspaces focus
	yarn build

.PHONY: publish
publish: build
	yarn npm publish

.PHONY: clean-build
clean-build:
	rm -rf common corda driver fabric msp networks peer relay identity

.PHONY: clean
clean: clean-build
	rm -rf node_modules
	rm package-lock.json
	rm -rf ../fabric-protos
