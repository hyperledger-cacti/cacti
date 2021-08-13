.PHONY: start
start: github.properties
	echo "Building corda simple app..."
	cp github.properties ../../../samples/corda/corda-simple-application/
	cd ../../../samples/corda/corda-simple-application && make build
	./scripts/generate.sh
	./scripts/get-cordapps.sh
	./scripts/start-nodes.sh

.PHONY: start-local
start-local:
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
