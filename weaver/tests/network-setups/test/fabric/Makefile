all: deploy-pvc deploy-pg deploy-ca crypto-create artifacts deploy-ord init-external-builder deploy-peer create-channel join-channel deploy-cc
clean: del-ca del-ord del-peer del-jobs del-pg del-cc del-pvc

deploy-pg:
	kubectl apply -f k8s/postgres-secret.yaml
	kubectl apply -f k8s/postgres-statefulset.yaml
	kubectl apply -f k8s/postgres-service.yaml
	sleep 20

deploy-pvc:
	oc create -f k8s/pvc-network1-secrets.yaml
	kubectl create configmap cc-scripts --from-file=scripts || true

crypto-create:
	kubectl apply -f k8s/job-gen-crypto-ord.yaml
	kubectl apply -f k8s/job-gen-crypto-org1.yaml
	sleep 5

artifacts:
	kubectl create configmap network1-configtx --from-file=network1/configtx.yaml
	kubectl apply -f k8s/job-gen-artifacts.yaml

create-channel:
	kubectl apply -f k8s/job-create-channel.yaml
	sleep 10

join-channel:
	kubectl apply -f k8s/job-join-channel.yaml
	sleep 10

deploy-ca:
	kubectl apply -f k8s/ca-dep.yaml
	kubectl apply -f k8s/ca-svc.yaml
	sleep 30

deploy-ord:
	kubectl apply -f k8s/ord-dep.yaml
	kubectl apply -f k8s/ord-svc.yaml

init-external-builder:
	kubectl create configmap external-builder --from-file=external-service-builder/bin || true
	# kubectl apply -f k8s/fabric-cli.yaml || true
	# sh ./copy-builder.sh

deploy-peer:
	kubectl create configmap peer-config --from-file=peer-config/core.yaml
	kubectl apply -f k8s/peer-dep.yaml
	kubectl apply -f k8s/peer-svc.yaml
	sleep 30

del-pvc:
	kubectl delete deployment fabric-cli || true
	oc delete pvc network1-secrets || true
	kubectl delete configmap network1-configtx || true
	kubectl delete configmap cc-scripts || true

del-ca:
	kubectl delete deployment ca-orderer-network1 || true
	kubectl delete deployment ca-org1-network1 || true
	kubectl delete service ca-orderer-network1 || true
	kubectl delete service ca-org1-network1 || true

del-ord:
	kubectl delete deployment ord0-orderers-network1 || true
	kubectl delete service ord0-orderers-network1 || true

del-peer:
	kubectl delete deployment peer0-org1-network1 || true
	kubectl delete service peer0-org1-network1 || true
	kubectl delete configmap external-builder || true
	kubectl delete configmap peer-config || true

del-pg:
	kubectl delete statefulset postgresql-network1 || true
	kubectl delete service postgresql-network1 || true
	kubectl delete secret postgresql-network1 || true
	kubectl delete service postgresql-network1-headless || true

del-jobs:
	kubectl delete job gen-crypto-ord || true
	kubectl delete job gen-crypto-org1 || true
	kubectl delete job gen-artifacts || true
	kubectl delete job create-channel || true
	kubectl delete job join-channel || true

build-sacc:
	oc create -f chaincode-oc/git-resource.yaml
	oc create -f chaincode-oc/image-resource.yaml
	oc create -f chaincode-oc/cc-build.yaml

del-build-sacc:
	oc delete pipelineresource sacc-git || true
	oc delete pipelineresource sacc-image2 || true

build-cc:
	kubectl template charts/buildcc > buildcc.yaml
	oc create -f buildcc.yaml
	rm buildcc.yaml

deploy-cc:
	helm install sacc-deploy charts/deploycc

del-cc:
	helm delete sacc-deploy || true
