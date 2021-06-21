include .env
export
build-local:
	echo "Calling update-protos-local script..."
	./scripts/update-protos-local.sh
	npm install
	npm run build
	npm run postinstall


build-image-local:
	# cp ${CONNECTION_PROFILE} connection_profile.json
	echo "Calling update-protos-local script..."
	./scripts/update-protos-local.sh
	docker build -t fabric-driver:latest -f fabricDriver.dockerfile .

build:
	echo "Calling update-protos script..."
	./scripts/update-protos.sh
	npm install
	npm run build
	npm run postinstall


build-image:
	# cp ${CONNECTION_PROFILE} connection_profile.json
	echo "Calling update-protos script..."
	./scripts/update-protos.sh
	docker build -t fabric-driver:latest -f fabricDriver.dockerfile .

deploy:
	docker-compose -f docker-compose.yml up -d --remove-orphans

stop:
	docker stop fabric-driver 2> /dev/null || true
	docker rm fabric-driver 2> /dev/null || true

clean-local: stop build-local

clean-deploy-local: clean-local deploy

clean: stop build

clean-deploy: clean deploy
