## Sample certificates and keys

The sample certificates and private keys in this folder were generated for relays and drivers running within Docker containers in our testnet.

- Single root CA for all components:
  * _Certificate_: `ca-cert.pem`
  * _Private key_: `ca-key.pem`
  * _Truststore_: `relay_drivers_trust_store.jks` (password is `trelay`)
- Fabric `network1` relay:
  * _Certificate_: `relay-network1-cert.pem`
  * _Private key_: `relay-network1-key.pem`
- Fabric `network2` relay:
  * _Certificate_: `relay-network2-cert.pem`
  * _Private key_: `relay-network2-key.pem`
- Corda network relay:
  * _Certificate_: `relay-corda-cert.pem`
  * _Private key_: `relay-corda-key.pem`
- Fabric `network1` driver:
  * _Certificate_: `fabric-driver-network1-cert.pem`
  * _Private key_: `fabric-driver-network1-cert.pem`
- Fabric `network2` driver:
  * _Certificate_: `fabric-driver-network2-cert.pem`
  * _Private key_: `fabric-driver-network2-cert.pem`
- Corda `Corda_Network` driver:
  * _Certificate_: `corda-driver-cert.pem`
  * _Private key_: `corda-driver-key.pem`
- Corda `Corda_Network2` driver:
  * _Certificate_: `corda2-driver-cert.pem`
  * _Private key_: `corda2-driver-key.pem`

## Useful commands

You can generate other certificates and keys for root CAs and the various components using the appropriate commands, examples of which are given below.

**Prerequisite**: make sure the `openssl` and  `keytool` commands exist on your system. `keytool` is typically installed as part of a JRE.

- To create a self-signed key-cert pair, run:
  ```bash
  openssl req -x509 -newkey rsa:4096 -keyout <key-file-path> -out <cert-file-path> -sha256 -days 365 -nodes -addext "subjectAltName = DNS:localhost,IP:127.0.0.1"
  ```
  The sample CA cert and key were generated thie following way:
  ```bash
  openssl req -x509 -newkey rsa:4096 -keyout ca-key.pem -out ca-cert.pem -sha256 -days 365 -nodes -addext "subjectAltName = DNS:localhost,IP:127.0.0.1"
  ```

- The truststore in the folder was created the following way:
  ```bash
  keytool -import -file ca-cert.pem -alias relayCA -keystore relay_drivers_trust_store.jks
  ```

- To create a private key and CSR for a subject, run:
  ```bash
  openssl req -newkey rsa:4096 -nodes -days 365 -keyout <subject-key-file-path> -out <subject-csr-file-path>
  ```
  _Example_: the sample key and CSR for the Fabric `network1` relay were generated as follows:
  ```bash
  openssl req -newkey rsa:4096 -nodes -days 365 -keyout relay-network1-key.pem -out relay-network1-csr.pem
  ```

- To create a certificate signed by a CA, first create an extensions file (say `v3.ext`) containing the subject's alternative names to be embedded in the certificate (replace `<subject-service-name>` with the hostname or the docker container service name below):
  ```
  subjectAltName = DNS:<subject-service-name>,DNS:localhost,IP:127.0.0.1
  ```
  Then run:
  ```bash
  openssl x509 -req -in <subject-csr-file-path> -out <subject-cert-file-path> -sha256 -days 365 -CA <CA-cert-file-path> -CAkey <CA-key-file-path> -CAcreateserial -extfile v3.ext
  ```
  _Example_: the sample `v3.ext` used for the Corda `Corda_Network` driver contained the following (note the reference to the Docker container service name):
  ```
  subjectAltName = DNS:corda-driver-Corda_Network,DNS:localhost,IP:127.0.0.1
  ```
  The command to generate the Corda `Corda_Network` driver's certificate was as follows:
  ```bash
  openssl x509 -req -in corda-driver-csr.pem -out corda-driver-cert.pem -sha256 -days 365 -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -extfile v3.ext
  ```

- To examine the contents of a certificate, run:
  ```bash
  openssl x509 -in <subject-cert-file-path> -noout -text
  ```
  _Example_: to view the contents of the certificate of the Fabric `network2` driver, run:
  ```bash
  openssl x509 -in fabric-driver-network2-cert.pem -noout -text
  ```
