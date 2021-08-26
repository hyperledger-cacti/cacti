.PHONY: start
start: github.properties
	./scripts/generate.sh
	./scripts/get-cordapps.sh
	./scripts/start-nodes.sh

.PHONY: start-local
start-local:
	./scripts/generate.sh
	./scripts/get-cordapps.sh local
	./scripts/start-nodes.sh

.PHONY: restart-with-new-interop-app
restart-with-new-interop-app: stop
	cd ../../../core/network/corda-interop-app && ./gradlew clean jar
	./scripts/get-cordapps.sh local
	./scripts/start-nodes.sh

.PHONY:	stop
stop: 
	docker-compose down

.PHONY: clean
clean:	stop
	./gradlew clean
	rm artifacts/*.jar || true
