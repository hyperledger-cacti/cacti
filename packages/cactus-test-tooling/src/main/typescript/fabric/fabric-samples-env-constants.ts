export interface IFabricOrgEnvInfo extends NodeJS.ProcessEnv {
  [key: string]: string | undefined;
  readonly CORE_PEER_TLS_ENABLED: string;
  readonly CORE_PEER_LOCALMSPID: string;
  readonly CORE_PEER_TLS_CERT_FILE: string;
  readonly CORE_PEER_TLS_KEY_FILE: string;
  readonly CORE_PEER_ADDRESS: string;
  readonly CORE_PEER_MSPCONFIGPATH: string;
  readonly CORE_PEER_TLS_ROOTCERT_FILE: string;
  readonly ORDERER_TLS_ROOTCERT_FILE: string;
}

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ENABLED_ORG_1 = "true";
export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_LOCALMSPID_ORG_1 =
  "Org1MSP";
export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_CERT_FILE_ORG_1 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/server.crt";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_KEY_FILE_ORG_1 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/server.key";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_ADDRESS_ORG_1 =
  "peer0.org1.example.com:7051";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_MSPCONFIGPATH_ORG_1 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ROOTCERT_FILE_ORG_1 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt";

export const FABRIC_25_LTS_FABRIC_SAMPLES__ORDERER_TLS_ROOTCERT_FILE_ORG_1 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem";

/**
 * Contains the file paths and other configuration parameters (such as flags,
 * hostnames etc.) that are a match for what you need to execute peer commands
 * from within the "cli" container of the fabric samples test network.
 *
 * The aforementioned test network ships with 2 organizations by default, this
 * is the configuration to make the peer binary talk to the **first** organization.
 *
 * Important note: The paths are only accurate within the mentioned `cli` container
 * as defined in the compose .yaml files describing the test network. Therefore,
 * if you have shelled into the Cacti All-in-One Fabric container, these are not
 * useful there, instead you need to shell into the nested `cli` container by
 * executing something like `docker exec -it cli bash` which will then get you
 * to the environment where these paths are representative and useful.
 *
 * @see https://github.com/hyperledger/fabric-samples
 */
export const FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1: IFabricOrgEnvInfo = {
  CORE_PEER_TLS_ENABLED:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ENABLED_ORG_1,
  CORE_PEER_LOCALMSPID:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_LOCALMSPID_ORG_1,
  CORE_PEER_TLS_CERT_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_CERT_FILE_ORG_1,
  CORE_PEER_TLS_KEY_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_KEY_FILE_ORG_1,
  CORE_PEER_ADDRESS: FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_ADDRESS_ORG_1,
  CORE_PEER_MSPCONFIGPATH:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_MSPCONFIGPATH_ORG_1,
  CORE_PEER_TLS_ROOTCERT_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ROOTCERT_FILE_ORG_1,
  ORDERER_TLS_ROOTCERT_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__ORDERER_TLS_ROOTCERT_FILE_ORG_1,
};

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ENABLED_ORG_2 = "true";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_LOCALMSPID_ORG_2 =
  "Org2MSP";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_CERT_FILE_ORG_2 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.crt";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_KEY_FILE_ORG_2 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.key";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_ADDRESS_ORG_2 =
  "peer0.org2.example.com:9051";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_MSPCONFIGPATH_ORG_2 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp";

export const FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ROOTCERT_FILE_ORG_2 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt";

export const FABRIC_25_LTS_FABRIC_SAMPLES__ORDERER_TLS_ROOTCERT_FILE_ORG_2 =
  "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem";

/**
 * Contains the file paths and other configuration parameters (such as flags,
 * hostnames etc.) that are a match for what you need to execute peer commands
 * from within the "cli" container of the fabric samples test network.
 *
 * The aforementioned test network ships with 2 organizations by default, this
 * is the configuration to make the peer binary talk to the **second** organization.
 *
 * Important note: The paths are only accurate within the mentioned `cli` container
 * as defined in the compose .yaml files describing the test network. Therefore,
 * if you have shelled into the Cacti All-in-One Fabric container, these are not
 * useful there, instead you need to shell into the nested `cli` container by
 * executing something like `docker exec -it cli bash` which will then get you
 * to the environment where these paths are representative and useful.
 *
 * @see https://github.com/hyperledger/fabric-samples
 */
export const FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2: IFabricOrgEnvInfo = {
  CORE_PEER_TLS_ENABLED:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ENABLED_ORG_2,
  CORE_PEER_LOCALMSPID:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_LOCALMSPID_ORG_2,
  CORE_PEER_TLS_CERT_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_CERT_FILE_ORG_2,
  CORE_PEER_TLS_KEY_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_KEY_FILE_ORG_2,
  CORE_PEER_ADDRESS: FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_ADDRESS_ORG_2,
  CORE_PEER_MSPCONFIGPATH:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_MSPCONFIGPATH_ORG_2,
  CORE_PEER_TLS_ROOTCERT_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__CORE_PEER_TLS_ROOTCERT_FILE_ORG_2,
  ORDERER_TLS_ROOTCERT_FILE:
    FABRIC_25_LTS_FABRIC_SAMPLES__ORDERER_TLS_ROOTCERT_FILE_ORG_2,
};
