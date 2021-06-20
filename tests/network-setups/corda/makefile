.PHONY: start
start:
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
	./scripts/stop-nodes.sh

.PHONY: clean
clean:	stop
	./gradlew clean
	rm artifacts/*.jar
