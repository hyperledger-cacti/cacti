build: .npmrc
	npm install
	npm run build

	
protos-js:
	mkdir -p protos-js && \
		cp -r ../../../common/protos-js/common ./protos-js/ && \
		cp -r ../../../common/protos-js/corda ./protos-js/ && \
		cp -r ../../../common/protos-js/driver ./protos-js/ && \
		cp -r ../../../common/protos-js/identity ./protos-js/ && \
		cp -r ../../../common/protos-js/fabric ./protos-js/ && \
		cp -r ../../../common/protos-js/msp ./protos-js/ && \
		cp -r ../../../common/protos-js/networks ./protos-js/ && \
		cp -r ../../../common/protos-js/peer ./protos-js/ && \
		cp -r ../../../common/protos-js/relay ./protos-js/ && \
		cp -r ../../../common/protos-js/package.json ./protos-js/

weaver-fabric-interop-sdk:
	mkdir -p weaver-fabric-interop-sdk && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/build ./weaver-fabric-interop-sdk/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/index.js ./weaver-fabric-interop-sdk/ && \
		cp -r ../../../sdks/fabric/interoperation-node-sdk/package.json ./weaver-fabric-interop-sdk/package.json

build-local: protos-js weaver-fabric-interop-sdk
	(cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install) || \
		(mv package-remote.json package.json && exit 1) # Only if fails	
	mv package-remote.json package.json # Only if success
	npm run build
	
clean:
	rm -rf node_modules package-lock.json out
	
clean-local:
	rm -rf node_modules package-lock.json out protos-js
