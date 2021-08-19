build:
	npm install
	yarn link

build-local:
	cp package.json package-remote.json && \
		cp package-local.json package.json && \
		npm install && \
		mv package-remote.json package.json
	yarn link

build-image:
	docker build -t fabric-cli:latest .
	
clean:
	rm -rf node_modules package-lock.json
	rm -rf build || true

