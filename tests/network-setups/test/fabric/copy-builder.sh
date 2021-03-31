POD=$(kubectl get pod -l app=fabric-cli -o jsonpath="{.items[0].metadata.name}")
echo ${POD}
kubectl cp external-service-builder ${POD}:/var/pvc1/external-service-builder
