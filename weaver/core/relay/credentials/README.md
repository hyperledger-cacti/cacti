## Sample certificates and keys

The sample certificates and private keys in this folder were generated for relays and drivers running in the host machine in our testnet.

- Single root CA for all components:
  * _Certificate_: `fabric_ca_cert.pem`
  * _Truststore_: `fabric_trust_store.jks` (password is `trelay`)
- Any relay or driver:
  * _Certificate_: `fabric_cert.pem`
  * _Private key_: `fabric_key`

## Useful commands

**Prerequisite**: make sure the `keytool` command exists on your system. It is typically installed as part of a JRE.

- To create a truststore and import a CA certificate, run:
  ```bash
  keytool -import -file <cert-path> -alias <ca-alias> -keystore <jks-file-path>
  ```
  The truststore in the folder was created the following way:
  ```bash
  keytool -import -file fabric_ca_cert.pem -alias myCA -keystore fabric_trust_store.jks
  ```

- To import another certificate into an existing truststore, run:
  ```bash
  keytool -import -file <another-cert-path> -alias myCA1 -keystore <jks-file-path>
  ```

- To list contents of a truststore, run:
  ```bash
  keytool -v -list -keystore <jks-file-path>
  ```
