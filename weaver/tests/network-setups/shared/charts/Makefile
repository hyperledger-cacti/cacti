NW ?= network1
VALUES ?= fabric-network/values.yaml
ARGS ?=
CCNAME ?= interop

clean: del-network del-cc del-relay del-fabric-cli

network:
	helm dep up fabric-network
	helm install fabric-$(NW) -f $(VALUES) --set global.network.name=$(NW) $(ARGS) ./fabric-network

del-network:
	helm delete fabric-$(NW) || true

deploy-cc:
	helm install deploycc-$(CCNAME)-$(NW) -f $(VALUES) --set global.network.name=$(NW) ./deploycc

del-cc:
	helm delete deploycc-$(CCNAME)-$(NW) || true

deploy-relay:
	helm install relay-$(NW) $(ARGS) --set network.name=$(NW) ./relay-one

del-relay:
	helm delete relay-$(NW) || true

deploy-fabric-cli:
	helm install fabric-cli-$(NW) $(ARGS) --set cli.network=$(NW) --set cli.remoteNetwork=$(RM_NW) ./fabric-cli

del-fabric-cli:
	helm delete fabric-cli-$(NW) || true


# kubectl cp $PEER2POD:/fabric/network1-secrets/fabric-cli/network2 ./nw-configs/network2
# kubectl cp ./nw-configs/network2 $PEER1POD:/fabric/network1-secrets/fabric-cli/network2
# kubectl cp $PEER1POD:/fabric/network1-secrets/fabric-cli/network1 ./nw-configs/network1
# kubectl cp ./nw-configs/network1 $PEER2POD:/fabric/network1-secrets/fabric-cli/network1

# make network NW=network1
# make deploy-cc NW=network1 CCNAME=interop VALUES=values/chaincode-interop.yaml
# make deploy-relay NW=network1
# make deploy-fabric-cli NW=network1 RM_NW=network2

# make network NW=network2 VALUES=values/ibmcloud.yaml
# make deploy-cc NW=network2 CCNAME=interop VALUES=values/chaincode-interop.yaml
# make deploy-relay NW=network2 ARGS="-f values/ic-relay.yaml --set network.domain.cluster=ris3-int-dal12-ocp-9ca4d14d48413d18ce61b80811ba4308-0000.us-south.containers.appdomain.cloud --set deployment.namespace=dlt-interop-fabric2"
# make deploy-fabric-cli NW=network2 RM_NW=network1
