<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Helm Charts for dlt-interop

  Before deploying to kubernetes, make sure kubeconfig is pointing to your k8s cluster.
  
  ### Pre-requisites
  
  1. Helm v3
  

  ### Artifactory APIKEY

  Obtain the artifactory apikey and save it in a file, say `apikey`. \
  Now run this to create secret for apikey into the k8s cluster:
  ```
  kubectl create secret generic artifactory-apikey --from-file=username=./username --from-file=apikey=./apikey
  ```

  ### Docker Login

  To deploy these charts into k8s cluster, docker login to repository is required: \
  ```
  docker login res-dlt-interop-docker-local.artifactory.swg-devops.com
  ```
  This will create `$HOME/.docker/config.json`. \
  \
  Now run following to place this as a secret in k8s:
  ```
  kubectl create secret generic interop-artifactory \
    --from-file=.dockerconfigjson=$HOME/.docker/config.json \
    --type=kubernetes.io/dockerconfigjson
  ```

  ### Install Network Charts

  Now run:
  ```
  make network NW=<network-name>
  ```
  for ibmcloud k8s cluster, values/ibmcloud.yaml needs to be used, so run:
  ```
  make network NW=<network-name> VALUES=values/ibmcloud.yaml
  ```
  To uninstalled the network, run:
  ```
  make del-network NW=<network-name>
  ```

  ### Deploy Chaincode

  Make sure the chaincode that needs to be deployed, its docker image is present in some docker registry (either in JFrog Artifactory, or cloud registry). \
  Create values file for the chaincode, check `deploycc/values.yaml` for reference. Minimal requirement is to change `chaincodes` key. \
  Now run:
  ```
  make deploy-cc NW=<network-name> CCNAME=<chaincode-name> VALUES=<path/to/chaincode-values.yaml>
  ```
  To uninstall the chart for this chaincode run:
  ```
  make del-cc NW=<network-name> CCNAME=<chaincode-name>
  ```
