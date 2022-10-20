FABRIC_VERSION=2.1.0
FABRIC_CA_VERSION=1.4.7
FABRIC_COUCH_VERSION=0.4.20
CHAINCODE_NAME?=simplestate
NW?=network1
E2E_CONFIDENTIALITY?=false
PROFILE ?= 1-node

.PHONY:	all
all: start
	
.PHONY: artifacts-network1
artifacts-network1:
	cp -r ../network-artifacts/network1/* ../shared/network1/
	
.PHONY: artifacts-network2
artifacts-network2:
	cp -r ../network-artifacts/network2/* ../shared/network2/

.PHONY: start
start: start-network1 start-network2

.PHONY: start-interop
start-interop: start-interop-network1 start-interop-network2

.PHONY: start-interop-local
start-interop-local: start-interop-network1-local start-interop-network2-local

.PHONY: start-network1
start-network1:	.fabric-setup artifacts-network1 setup-cc
	./network.sh up createChannel -ca -nw network1 -p $(PROFILE)
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network1 -p $(PROFILE)

.PHONY: start-network1-local
start-network1-local: .fabric-setup artifacts-network1 setup-cc-local
	./network.sh up createChannel -ca -nw network1 -p $(PROFILE)
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network1 -p $(PROFILE)

.PHONY: start-network2
start-network2: .fabric-setup artifacts-network2 setup-cc
	./network.sh up createChannel -ca -nw network2 -p $(PROFILE)
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network2 -p $(PROFILE)

.PHONY: start-network2-local
start-network2-local: .fabric-setup artifacts-network2 setup-cc-local
	./network.sh up createChannel -ca -nw network2 -p $(PROFILE)
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network2 -p $(PROFILE)

.PHONY: start-interop-network1
start-interop-network1:	setup-interop-cc start-network1 setup-interop-network1

.PHONY: start-interop-network1-local
start-interop-network1-local: setup-interop-cc-local start-network1-local setup-interop-network1-local

.PHONY: start-interop-network2
start-interop-network2: setup-interop-cc start-network2 setup-interop-network2

.PHONY: start-interop-network2-local
start-interop-network2-local: setup-interop-cc-local start-network2-local setup-interop-network2-local

.PHONY: setup-interop-network1
setup-interop-network1: setup-interop-cc
	./network.sh deployCC -ch interop -nw network1 -p $(PROFILE)

.PHONY: setup-interop-network1-local
setup-interop-network1-local: setup-interop-cc-local
	./network.sh deployCC -ch interop -nw network1 -p $(PROFILE)

.PHONY: setup-interop-network2
setup-interop-network2: setup-interop-cc
	./network.sh deployCC -ch interop -nw network2 -p $(PROFILE)

.PHONY: setup-interop-network2-local
setup-interop-network2-local: setup-interop-cc-local
	./network.sh deployCC -ch interop -nw network2 -p $(PROFILE)

.PHONY: setup-interop-cc
setup-interop-cc:
	./scripts/setupCC.sh

.PHONY: setup-interop-cc-local
setup-interop-cc-local:
	./scripts/setupCCLocal.sh

.PHONY: setup-cc
setup-cc:
	./scripts/setupAppCC.sh $(CHAINCODE_NAME)

.PHONY: setup-cc-local
setup-cc-local:
	./scripts/setupAppCCLocal.sh $(CHAINCODE_NAME)

.PHONY: deploy-cc
deploy-cc: setup-cc
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw $(NW) -p $(PROFILE)

.PHONY: deploy-cc-local
deploy-cc-local: setup-cc-local
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw $(NW) -p $(PROFILE)


.fabric-setup:
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- $(FABRIC_VERSION) $(FABRIC_CA_VERSION) $(FABRIC_COUCH_VERSION) -s
	touch .fabric-setup

.PHONY: stop
stop:	stop-network1 stop-network2

.PHONY: stop-network1
stop-network1:
	./network.sh down -nw network1 -p $(PROFILE)

.PHONY: stop-network2
stop-network2:
	./network.sh down -nw network2 -p $(PROFILE)

.PHONY: remove
remove:	remove-network1 remove-network2

.PHONY: remove-network1
remove-network1:
	./network.sh clean -nw network1 -p $(PROFILE)
	rm -rf ../shared/network1/wallet/*.id

.PHONY: remove-network2
remove-network2:
	./network.sh clean -nw network2 -p $(PROFILE)
	rm -rf ../shared/network2/wallet/*.id

.PHONY: clean
clean:	remove
	+docker system prune -f || true
	+rm -rf bin || true
	+rm -rf config || true
	+rm .fabric-setup || true
	+chmod -R 755 ../shared/chaincode/interop
	+rm -rf ../shared/chaincode/*

chmod-artifacts:
	sudo chmod 644 ../shared/network1/fabric-ca/ordererOrg/msp/keystore/*
	sudo chmod 644 ../shared/network1/fabric-ca/org1/msp/keystore/*
	sudo chmod 644 ../shared/network1/fabric-ca/org2/msp/keystore/*
	sudo chmod 644 ../shared/network2/fabric-ca/ordererOrg/msp/keystore/*
	sudo chmod 644 ../shared/network2/fabric-ca/org1/msp/keystore/*
	sudo chmod 644 ../shared/network2/fabric-ca/org2/msp/keystore/*

docker-ccp:
	(cd ../shared/network1/peerOrganizations/org1.network1.com && \
		cp connection-org1.json connection-org1.docker.json && \
		sed -i'.bkp' -e 27' s/localhost/peer0.org1.network1.com/' connection-org1.docker.json && \
		sed -i'.bkp' -e 39' s/localhost/ca.org1.network1.com/' connection-org1.docker.json && \
		rm -rf connection-org1.docker.json.bkp)
	(cd ../shared/network1/peerOrganizations/org2.network1.com && \
		cp connection-org2.json connection-org2.docker.json && \
		sed -i'.bkp' -e 27' s/localhost/peer0.org2.network1.com/' connection-org2.docker.json && \
		sed -i'.bkp' -e 39' s/localhost/ca.org2.network1.com/' connection-org2.docker.json && \
		rm -rf connection-org2.docker.json.bkp)
	(cd ../shared/network2/peerOrganizations/org1.network2.com && \
		cp connection-org1.json connection-org1.docker.json && \
		sed -i'.bkp' -e 27' s/localhost/peer0.org1.network2.com/' connection-org1.docker.json && \
		sed -i'.bkp' -e 39' s/localhost/ca.org1.network2.com/' connection-org1.docker.json && \
		rm -rf connection-org1.docker.json.bkp)
	(cd ../shared/network2/peerOrganizations/org2.network2.com && \
		cp connection-org2.json connection-org2.docker.json && \
		sed -i'.bkp' -e 27' s/localhost/peer0.org2.network2.com/' connection-org2.docker.json && \
		sed -i'.bkp' -e 39' s/localhost/ca.org2.network2.com/' connection-org2.docker.json && \
		rm -rf connection-org2.docker.json.bkp)
	

backup-network1:
	cp -r ../shared/network1/ordererOrganizations ../network-artifacts/network1/
	cp -r ../shared/network1/peerOrganizations ../network-artifacts/network1/
	cp ../shared/network1/system-genesis-block/genesis.block ../network-artifacts/network1/system-genesis-block/
	cp -r ../shared/network1/channel-artifacts ../network-artifacts/network1/
	cp -r ../shared/network1/fabric-ca/ordererOrg ../network-artifacts/network1/fabric-ca
	cp -r ../shared/network1/fabric-ca/org1 ../network-artifacts/network1/fabric-ca
	cp -r ../shared/network1/fabric-ca/org2 ../network-artifacts/network1/fabric-ca
	rm ../network-artifacts/network1/fabric-ca/ordererOrg/fabric-ca-server-config.yaml ../network-artifacts/network1/fabric-ca/org1/fabric-ca-server-config.yaml ../network-artifacts/network1/fabric-ca/org2/fabric-ca-server-config.yaml
	
backup-network2:
	cp -r ../shared/network2/ordererOrganizations ../network-artifacts/network2/
	cp -r ../shared/network2/peerOrganizations ../network-artifacts/network2/
	cp ../shared/network2/system-genesis-block/genesis.block ../network-artifacts/network2/system-genesis-block/
	cp -r ../shared/network2/channel-artifacts ../network-artifacts/network2/
	cp -r ../shared/network2/fabric-ca/ordererOrg ../network-artifacts/network2/fabric-ca
	cp -r ../shared/network2/fabric-ca/org1 ../network-artifacts/network2/fabric-ca
	cp -r ../shared/network2/fabric-ca/org2 ../network-artifacts/network2/fabric-ca
	rm ../network-artifacts/network2/fabric-ca/ordererOrg/fabric-ca-server-config.yaml ../network-artifacts/network2/fabric-ca/org1/fabric-ca-server-config.yaml ../network-artifacts/network2/fabric-ca/org2/fabric-ca-server-config.yaml

backup: backup-network1 backup-network2

delete-artifacts:
	(cd ../network-artifacts/network1 && rm -rf ordererOrganizations peerOrganizations system-genesis-block/* channel-artifacts fabric-ca/ordererOrg fabric-ca/org1 fabric-ca/org2)
	(cd ../network-artifacts/network2 && rm -rf ordererOrganizations peerOrganizations system-genesis-block/* channel-artifacts fabric-ca/ordererOrg fabric-ca/org1 fabric-ca/org2)
    
