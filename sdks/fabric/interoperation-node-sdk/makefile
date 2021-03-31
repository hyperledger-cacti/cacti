.PHONY: build-local
build-local:
	echo "Calling update-protos-local script..."
	./scripts/update-protos-local.sh
	npm install
	npm run protos
	npm run build

.PHONY: build
build:
	echo "Calling update-protos script..."
	./scripts/update-protos.sh
	npm install
	npm run protos
	npm run build
