.PHONY: start
start: artifactory.properties
	echo "Building corda simple app..."
	cp artifactory.properties ../../../samples/corda/corda-simple-application/
	cd ../../../samples/corda/corda-simple-application && make build
	cp build.gradle.remote build.gradle
	./scripts/generate.sh
	#./scripts/get-cordapps.sh
	# ./scripts/start-nodes.sh
	docker-compose up -d
	docker ps -a
	docker logs corda_partya_1 -f

.PHONY: start-local
start-local:
	echo "Building corda interop app..."
	cd ../../../core/network/corda-interop-app && make build-local
	echo "Building corda simple app..."
	cd ../../../samples/corda/corda-simple-application && make build-local
	cp build.gradle.local build.gradle
	./scripts/generate.sh
	#./scripts/get-cordapps.sh local
	# ./scripts/start-nodes.sh
	docker-compose up -d
	docker ps -a
	docker logs corda_partya_1 -f

.PHONY: restart-with-new-interop-app
restart-with-new-interop-app: 
	./scripts/restart-with-new-interop-app.sh

.PHONY:	stop
stop: 
	docker-compose down

.PHONY: clean
clean:	stop
	./gradlew clean
	rm artifacts/*.jar
