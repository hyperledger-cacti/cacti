.PHONY: build
build: .npmrc
	npm install
	npm run build
	
.PHONE: publish
publish: .npmrc
	npm publish
	

clean:
	rm -rf build node_modules package-lock.json .nyc_output coverage
