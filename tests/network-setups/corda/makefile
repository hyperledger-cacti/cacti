.PHONY: start
start: github.properties
	./scripts/generate.sh
	./scripts/get-cordapps.sh
	./scripts/start-nodes.sh
	./scripts/check-nodes-status.sh

.PHONY: start-house
start-house:
	./scripts/generate.sh
	./scripts/get-house-cordapps.sh
	./scripts/get-cordapps.sh
	./scripts/start-house-nodes.sh

.PHONY: start-house-local
start-house-local:
	./scripts/generate.sh
	./scripts/get-house-cordapps.sh local
	./scripts/get-cordapps.sh local
	./scripts/start-house-nodes.sh

.PHONY: start-local
start-local:
	./scripts/generate.sh
	./scripts/get-cordapps.sh local
	./scripts/start-nodes.sh
	./scripts/check-nodes-status.sh

.PHONY: restart-with-new-interop-app
restart-with-new-interop-app: stop
	cd ../../../core/network/corda-interop-app && ./gradlew clean jar
	./scripts/get-cordapps.sh local
	./scripts/start-nodes.sh

.PHONY:	stop
stop: 
	docker-compose down --volumes

.PHONY: clean
clean:	stop
	./gradlew clean
	rm shared/artifacts/*.jar || true
