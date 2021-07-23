.PHONY: start
start: artifactory.properties
	echo "Building corda simple app..."
	cp artifactory.properties ../../../samples/corda/corda-simple-application/
	cd ../../../samples/corda/corda-simple-application && make build
	./scripts/generate.sh
	./scripts/get-cordapps.sh
	./scripts/start-nodes.sh

.PHONY: start-local
start-local:
	echo "Building corda interop app..."
	cd ../../../core/network/corda-interop-app && make build-local
	echo "Building corda simple app..."
	cd ../../../samples/corda/corda-simple-application && make build-local
	./scripts/generate.sh
	./scripts/get-cordapps.sh local
	./scripts/start-nodes.sh

.PHONY: restart-with-new-interop-app
restart-with-new-interop-app: 
	./scripts/restart-with-new-interop-app.sh

.PHONY:	stop
stop: 
	docker-compose down

.PHONY: clean
clean:	stop
	./gradlew clean
	rm artifacts/*.jar || true
