build:
	yarn workspaces focus

build-local:
	yarn workspaces focus

build-image:
	docker build -t fabric-cli:latest .
	
clean:
	rm -rf node_modules package-lock.json
	rm -rf build || true

