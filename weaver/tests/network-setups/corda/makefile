APP_NAME ?= simple
PROFILE ?= 1-node

start: github.properties
	# Network1
	./scripts/generate.sh
	./scripts/get-cordapps.sh $(APP_NAME)
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE)
	# Network2
	./scripts/generate.sh Corda_Network2
	./scripts/get-cordapps.sh $(APP_NAME)
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE) Corda_Network2
	# Check Status
	./scripts/check-nodes-status.sh $(PROFILE)
	./scripts/check-nodes-status.sh $(PROFILE) Corda_Network2
	
start-local:
	# Network1
	./scripts/generate.sh
	./scripts/get-cordapps.sh $(APP_NAME) local
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE)
	# Network2
	./scripts/generate.sh Corda_Network2
	./scripts/get-cordapps.sh $(APP_NAME) local
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE) Corda_Network2
	# Check Status
	./scripts/check-nodes-status.sh $(PROFILE)
	./scripts/check-nodes-status.sh $(PROFILE) Corda_Network2

.PHONY: start-network1
start-network1: github.properties
	./scripts/generate.sh
	./scripts/get-cordapps.sh $(APP_NAME)
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE)
	./scripts/check-nodes-status.sh $(PROFILE)

.PHONY: start-network1-local
start-network1-local:
	./scripts/generate.sh
	./scripts/get-cordapps.sh $(APP_NAME) local
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE)
	./scripts/check-nodes-status.sh $(PROFILE)

.PHONY: start-network2
start-network2: github.properties
	./scripts/generate.sh Corda_Network2
	./scripts/get-cordapps.sh $(APP_NAME)
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE) Corda_Network2
	./scripts/check-nodes-status.sh $(PROFILE) Corda_Network2

.PHONY: start-network2-local
start-network2-local:
	./scripts/generate.sh Corda_Network2
	./scripts/get-cordapps.sh $(APP_NAME) local
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE) Corda_Network2
	./scripts/check-nodes-status.sh $(PROFILE) Corda_Network2

.PHONY: restart-with-new-interop-app
restart-with-new-interop-app: stop
	cd ../../../core/network/corda-interop-app && ./gradlew clean jar
	./scripts/get-cordapps.sh $(APP_NAME) local
	./scripts/start-nodes.sh $(APP_NAME) $(PROFILE)

.PHONY:	stop-network1
stop-network1: 
	docker-compose -f dev/Corda_Network/docker-compose.yml -p corda --profile $(PROFILE) down --volumes || true

.PHONY:	stop-network2
stop-network2: 
	docker-compose -f dev/Corda_Network2/docker-compose.yml -p corda_network2 --profile $(PROFILE) down --volumes || true

stop: stop-network1 stop-network2

.PHONY: clean-network1
clean-network1:	stop-network1
	./gradlew -p dev/Corda_Network clean

.PHONY: clean-network2
clean-network2:	stop-network2
	./gradlew -p dev/Corda_Network2 clean

.PHONY: clean
clean:	clean-network1 clean-network2
	rm shared/artifacts/*.jar || true
	docker system prune -f
	docker volume prune -f

rebuild-network2:
	./gradlew -p dev/Corda_Network2 clean prepareDockerNodes
	cd dev/Corda_Network2/build/nodes/Notary && rm -rf corda.jar djvm logs cordapps/*.jar
	cd dev/Corda_Network2/build/nodes/PartyA && rm -rf corda.jar djvm logs cordapps/*.jar
	cd dev/Corda_Network2/build/nodes/PartyB && rm -rf corda.jar djvm logs cordapps/*.jar
	cd dev/Corda_Network2/build/nodes/PartyC && rm -rf corda.jar djvm logs cordapps/*.jar
	rm -rf dev/Corda_Network2/build/nodes/.cache
	touch dev/Corda_Network2/build/nodes/Notary/cordapps/config/.gitkeep
	touch dev/Corda_Network2/build/nodes/PartyA/cordapps/config/.gitkeep
	touch dev/Corda_Network2/build/nodes/PartyB/cordapps/config/.gitkeep
	touch dev/Corda_Network2/build/nodes/PartyC/cordapps/config/.gitkeep

rebuild-network1:
	./gradlew -p dev/Corda_Network clean prepareDockerNodes
	cd dev/Corda_Network/build/nodes/Notary && rm -rf corda.jar djvm logs cordapps/*.jar
	cd dev/Corda_Network/build/nodes/PartyA && rm -rf corda.jar djvm logs cordapps/*.jar
	cd dev/Corda_Network/build/nodes/PartyB && rm -rf corda.jar djvm logs cordapps/*.jar
	cd dev/Corda_Network/build/nodes/PartyC && rm -rf corda.jar djvm logs cordapps/*.jar
	rm -rf dev/Corda_Network/build/nodes/.cache
	touch dev/Corda_Network/build/nodes/Notary/cordapps/config/.gitkeep
	touch dev/Corda_Network/build/nodes/PartyA/cordapps/config/.gitkeep
	touch dev/Corda_Network/build/nodes/PartyB/cordapps/config/.gitkeep
	touch dev/Corda_Network/build/nodes/PartyC/cordapps/config/.gitkeep
    
