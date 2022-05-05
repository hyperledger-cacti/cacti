FABRIC_VERSION=2.1.0
FABRIC_CA_VERSION=1.4.7
FABRIC_COUCH_VERSION=0.4.20
CHAINCODE_NAME?=simplestate
NW?=network1
E2E_CONFIDENTIALITY?=false

.PHONY:	all
all: start

.PHONY: start
start:	start-network1 start-network2

.PHONY: start-interop
start-interop: start-interop-network1 start-interop-network2

.PHONY: start-interop-local
start-interop-local: start-interop-network1-local start-interop-network2-local

.PHONY: start-network1
start-network1:	.fabric-setup setup-cc
	./network.sh up createChannel -ca -nw network1
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network1

.PHONY: start-network1-local
start-network1-local: .fabric-setup setup-cc-local
	./network.sh up createChannel -ca -nw network1
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network1

.PHONY: start-network2
start-network2: .fabric-setup setup-cc
	./network.sh up createChannel -ca -nw network2
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network2

.PHONY: start-network2-local
start-network2-local: .fabric-setup setup-cc-local
	./network.sh up createChannel -ca -nw network2
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw network2

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
	./network.sh deployCC -ch interop -nw network1

.PHONY: setup-interop-network1-local
setup-interop-network1-local: setup-interop-cc-local
	./network.sh deployCC -ch interop -nw network1

.PHONY: setup-interop-network2
setup-interop-network2: setup-interop-cc
	./network.sh deployCC -ch interop -nw network2

.PHONY: setup-interop-network2-local
setup-interop-network2-local: setup-interop-cc-local
	./network.sh deployCC -ch interop -nw network2

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
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw $(NW)

.PHONY: deploy-cc-local
deploy-cc-local: setup-cc-local
	./network.sh deployCC -ch $(CHAINCODE_NAME) -nw $(NW)


.fabric-setup:
	curl -sSL https://bit.ly/2ysbOFE | bash -s -- $(FABRIC_VERSION) $(FABRIC_CA_VERSION) $(FABRIC_COUCH_VERSION) -s
	touch .fabric-setup

.PHONY: stop
stop:	stop-network1 stop-network2

.PHONY: stop-network1
stop-network1:
	./network.sh down -nw network1

.PHONY: stop-network2
stop-network2:
	./network.sh down -nw network2

.PHONY: remove
remove:	remove-network1 remove-network2

.PHONY: remove-network1
remove-network1:
	./network.sh clean -nw network1

.PHONY: remove-network2
remove-network2:
	./network.sh clean -nw network2

.PHONY: clean
clean:	stop
	+rm -rf bin || true
	+rm -rf config || true
	+rm .fabric-setup || true
	+chmod -R 755 ../shared/chaincode/interop
	+rm -rf ../shared/chaincode/*
