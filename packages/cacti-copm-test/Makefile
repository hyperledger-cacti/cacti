WORKSPACE ?= $(shell realpath `pwd`/../../)
DOCKER_IMAGES=hyperledger/fabric-orderer hyperledger/fabric-peer hyperledger/fabric-ca ghcr.io/hyperledger/cacti-weaver-iin-agent ghcr.io/hyperledger/cacti-weaver-relay-server ghcr.io/hyperledger/cacti-weaver-driver-fabric corda/community:4.12-zulu-openjdk ghcr.io/hyperledger/cacti-weaver-driver-corda copm-corda

common-relay-config:
	cd $(WORKSPACE)/weaver/core/relay && \
	make convert-compose-method2

%-setup:
	make -f Makefile_$* setup

%-lock-network:
	make -f Makefile_$* lock-network

%-pledge-network:
	make -f Makefile_$* pledge-network

define stop_docker
echo "removing $(1)"
docker stop `docker container ls -a -q -f ancestor=$(1) | xargs` || true
docker rm `docker container ls -a -q -f ancestor=$(1) | xargs` || true
endef

clean-network:
	$(foreach image,$(DOCKER_IMAGES),$(call stop_docker,$(image)))
	cd $(WORKSPACE)/weaver/tests/network-setups/fabric/dev && make clean || true
	docker volume prune -f
	docker volume rm  network2_peer0.org2.network2.com || true
	docker volume rm network1_peer0.org2.network1.com || true
	docker network rm corda_default || true
	docker network rm corda_network2_default || true
	docker network rm relay || true
	if [ "$(shell id -un )" != "root" ]; then  \
		sudo chown -R $(shell id -un ) $(WORKSPACE)/weaver/tests/network-setups/fabric/shared; \
		sudo rm -Rf $(WORKSPACE)/weaver/tests/network-setups/corda/dev/*/build || true; \
	fi 
	docker volume rm `docker volume ls | grep -v NAME | sed -e 's/local   //g' | grep -v vscode | xargs` || true
	cd $(WORKSPACE)/weaver/tests/network-setups/corda && make clean || true
