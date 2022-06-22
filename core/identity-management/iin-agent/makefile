build: .npmrc
	npm install
	npm run build

build-local:
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
	cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install && \
		mv package-remote.json package.json
	npm run build
	
clean:
	rm -rf node_modules package-lock.json out
	
clean-local:
	rm -rf node_modules package-lock.json out protos-js
