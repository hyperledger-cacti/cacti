# cactus-corda-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/ -t caio
docker run --rm --privileged caio
```

# cactus-corda-4-8-all-in-one

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/ -f ./tools/docker/corda-all-in-one/corda-v4_8/Dockerfile -t caio48
docker run --rm --privileged caio48
```

# cactus-corda-4-8-all-in-one-flowdb

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Customization

`build.gradle` file from this sample has defined a single node called PartyA. It was modified to deploy the same nodes as in the obligation sample to make it work with our CordaTestLedger:
- Notary
- ParticipantA
- ParticipantB
- ParticipantC

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/corda-v4_8-flowdb/ -t caio48-flowdb
docker run --rm --privileged caio48-flowdb
```

# cactus-corda-5-all-in-one-solar

> This docker image is for `testing` and `development` only.
> Do NOT use in production!

## Usage

### Build and Run Image Locally

```sh
DOCKER_BUILDKIT=1 docker build ./tools/docker/corda-all-in-one/corda-v5/ -f ./tools/docker/corda-all-in-one/corda-v5/Dockerfile -t caio5
docker run --privileged caio5
```

### Install Application and Testing

Open container CLI:

```sh
docker exec -it <id_docker> /bin/sh
```

In container CLI, run this command to install the sample application on the network:

```sh
/root/bin/corda-cli/bin/corda-cli package install -n solar-system /corda5-solarsystem-contracts-demo/solar-system.cpb
```

To check that everything works correctly, start a flow with the following curl command:

```sh
curl -u earthling:password --insecure -X POST "https://localhost:12112/api/v1/flowstarter/startflow" -H  "accept: application/json" -H  "Content-Type: application/json" -d "{\"rpcStartFlowRequest\":{\"clientId\":\"launchpad-1\",\"flowName\":\"net.corda.solarsystem.flows.LaunchProbeFlow\",\"parameters\":{\"parametersInJson\":\"{\\\"message\\\": \\\"Hello Mars\\\", \\\"target\\\": \\\"C=GB, L=FOURTH, O=MARS, OU=PLANET\\\", \\\"planetaryOnly\\\":\\\"true\\\"}\"}}}"
```
If the command is successful, it returns a 200 response, including the flowId (a uuid) and the clientId, like the following: 
```json
{
    "flowId":{
        "uuid":"9c8d5b46-be92-4be8-9569-76cb3e41cde9"
    },
    "clientId":"launchpad-1"
}
```
Using the field value ```flowId``` from the answer above, you can check the flow status:
```sh
curl -u earthling:password --insecure -X GET "https://localhost:12112/api/v1/flowstarter/flowoutcome/<flowId>" -H  "accept: application/json"
```
It returns a 200 response, which includes these items in the response body:

- Flow status
- Signatures of both parties
- ID of the state

Sample of response:
```json
{
    "status":"COMPLETED",
    "resultJson":"{ \n \"txId\" : \"SHA-256:882FCCFA0CE08FEC4F90A8BBC8B8FBC1DE3CBDA8DBED4D6562E0922234B87E4F\",\n \"outputStates\" : [\"{\\\"message\\\":\\\"Hello Mars\\\",\\\"planetaryOnly\\\":true,\\\"launcher\\\":\\\"OU\\u003dPLANET, O\\u003dEARTH, L\\u003dTHIRD, C\\u003dIE\\\",\\\"target\\\":\\\"OU\\u003dPLANET, O\\u003dMARS, L\\u003dFOURTH, C\\u003dGB\\\",\\\"linearId\\\":\\\"31800d11-b518-4fb7-a18e-18cc1c64a4ff\\\"}\"], \n \"signatures\": [\"ijMOjsLWxihWLnfxw7DoIv1gpHFaSAs+VfGSS5qaI1Z4cZu96riAo1uEFSbeskZTt2eGNwv05IP3dS08AjLRCA==\", \"2yRNwdrqKU6/lrUfgmaiXxdPYHjXxfXIYlEL8RHU2aNGQPUVXmc+jbsaNxbcig7Fs0kck28JreuUwn1lJOZODw==\"]\n}",
    "exceptionDigest":null
}
```



