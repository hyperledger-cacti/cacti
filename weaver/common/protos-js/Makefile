.PHONY: build
build:
	sh ../get-fabric-protos.sh ../..
	npm install --workspaces=false
	npm run build

.PHONY: publish
publish: build
	npm publish --no-workspaces

.PHONY: clean-build
clean-build:
	rm -rf common corda driver fabric msp networks peer relay identity

.PHONY: clean
clean: clean-build
	rm -rf node_modules
	rm package-lock.json
	rm -rf ../fabric-protos
