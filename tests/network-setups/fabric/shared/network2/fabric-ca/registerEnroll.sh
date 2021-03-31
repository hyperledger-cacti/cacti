

function createOrg1 {

  NW_CFG_PATH="$1"
  echo "NW_CFG_PATH = $NW_CFG_PATH"
	echo "Enroll the CA admin"
  echo
	mkdir -p $NW_CFG_PATH/peerOrganizations/org1.network2.com/

	export FABRIC_CA_CLIENT_HOME=$NW_CFG_PATH/peerOrganizations/org1.network2.com/
#  rm -rf $FABRIC_CA_CLIENT_HOME/fabric-ca-client-config.yaml
#  rm -rf $FABRIC_CA_CLIENT_HOME/msp

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:5054 --caname ca.org1.network2.com --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org1-network2-com.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org1-network2-com.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org1-network2-com.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org1-network2-com.pem
    OrganizationalUnitIdentifier: orderer' > $NW_CFG_PATH/peerOrganizations/org1.network2.com/msp/config.yaml

  echo
	echo "Register peer0"
  echo
  set -x
	fabric-ca-client register --caname ca.org1.network2.com --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x

  echo
  echo "Register user"
  echo
  set -x
  fabric-ca-client register --caname ca.org1.network2.com --id.name user1 --id.secret user1pw --id.type client --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x

  echo
  echo "Register the org admin"
  echo
  set -x
  fabric-ca-client register --caname ca.org1.network2.com --id.name org1admin --id.secret org1adminpw --id.type admin --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x

	mkdir -p $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers
  mkdir -p $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com

  echo
  echo "## Generate the peer0 msp"
  echo
  set -x
	fabric-ca-client enroll -u https://peer0:peer0pw@localhost:5054 --caname ca.org1.network2.com -M $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/msp --csr.hosts peer0.org1.network2.com --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x

  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/msp/config.yaml $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/msp/config.yaml

  echo
  echo "## Generate the peer0-tls certificates"
  echo
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:5054 --caname ca.org1.network2.com -M $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls --enrollment.profile tls --csr.hosts peer0.org1.network2.com --csr.hosts localhost --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x


  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/tlscacerts/* $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/ca.crt
  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/signcerts/* $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/server.crt
  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/keystore/* $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/server.key

  mkdir $NW_CFG_PATH/peerOrganizations/org1.network2.com/msp/tlscacerts
  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/tlscacerts/* $NW_CFG_PATH/peerOrganizations/org1.network2.com/msp/tlscacerts/ca.crt

  mkdir $NW_CFG_PATH/peerOrganizations/org1.network2.com/tlsca
  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/tls/tlscacerts/* $NW_CFG_PATH/peerOrganizations/org1.network2.com/tlsca/tlsca.org1.network2.com-cert.pem

  mkdir $NW_CFG_PATH/peerOrganizations/org1.network2.com/ca
  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/peers/peer0.org1.network2.com/msp/cacerts/* $NW_CFG_PATH/peerOrganizations/org1.network2.com/ca/ca.org1.network2.com-cert.pem

  mkdir -p $NW_CFG_PATH/peerOrganizations/org1.network2.com/users
  mkdir -p $NW_CFG_PATH/peerOrganizations/org1.network2.com/users/User1@org1.network2.com

  echo
  echo "## Generate the user msp"
  echo
  set -x
	fabric-ca-client enroll -u https://user1:user1pw@localhost:5054 --caname ca.org1.network2.com -M $NW_CFG_PATH/peerOrganizations/org1.network2.com/users/User1@org1.network2.com/msp --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x

  mkdir -p $NW_CFG_PATH/peerOrganizations/org1.network2.com/users/Admin@org1.network2.com

  echo
  echo "## Generate the org admin msp"
  echo
  set -x
	fabric-ca-client enroll -u https://org1admin:org1adminpw@localhost:5054 --caname ca.org1.network2.com -M $NW_CFG_PATH/peerOrganizations/org1.network2.com/users/Admin@org1.network2.com/msp --tls.certfiles $NW_CFG_PATH/fabric-ca/org1/tls-cert.pem
  set +x

  cp $NW_CFG_PATH/peerOrganizations/org1.network2.com/msp/config.yaml $NW_CFG_PATH/peerOrganizations/org1.network2.com/users/Admin@org1.network2.com/msp/config.yaml

}


function createOrg2 {

  echo
	echo "Enroll the CA admin"
  echo
	mkdir -p organizations/peerOrganizations/org2.example.com/

	export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org2.example.com/
#  rm -rf $FABRIC_CA_CLIENT_HOME/fabric-ca-client-config.yaml
#  rm -rf $FABRIC_CA_CLIENT_HOME/msp

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:8054 --caname ca-org2 --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org2.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org2.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org2.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-5054-ca-org2.pem
    OrganizationalUnitIdentifier: orderer' > ${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml

  echo
	echo "Register peer0"
  echo
  set -x
	fabric-ca-client register --caname ca-org2 --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x

  echo
  echo "Register user"
  echo
  set -x
  fabric-ca-client register --caname ca-org2 --id.name user1 --id.secret user1pw --id.type client --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x

  echo
  echo "Register the org admin"
  echo
  set -x
  fabric-ca-client register --caname ca-org2 --id.name org2admin --id.secret org2adminpw --id.type admin --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x

	mkdir -p organizations/peerOrganizations/org2.example.com/peers
  mkdir -p organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com

  echo
  echo "## Generate the peer0 msp"
  echo
  set -x
	fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 --caname ca-org2 -M ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp --csr.hosts peer0.org2.example.com --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x

  cp ${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp/config.yaml

  echo
  echo "## Generate the peer0-tls certificates"
  echo
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 --caname ca-org2 -M ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls --enrollment.profile tls --csr.hosts peer0.org2.example.com --csr.hosts localhost --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x


  cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/tlscacerts/* ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
  cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/signcerts/* ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.crt
  cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/keystore/* ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.key

  mkdir ${PWD}/organizations/peerOrganizations/org2.example.com/msp/tlscacerts
  cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/tlscacerts/* ${PWD}/organizations/peerOrganizations/org2.example.com/msp/tlscacerts/ca.crt

  mkdir ${PWD}/organizations/peerOrganizations/org2.example.com/tlsca
  cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/tlscacerts/* ${PWD}/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem

  mkdir ${PWD}/organizations/peerOrganizations/org2.example.com/ca
  cp ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp/cacerts/* ${PWD}/organizations/peerOrganizations/org2.example.com/ca/ca.org2.example.com-cert.pem

  mkdir -p organizations/peerOrganizations/org2.example.com/users
  mkdir -p organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com

  echo
  echo "## Generate the user msp"
  echo
  set -x
	fabric-ca-client enroll -u https://user1:user1pw@localhost:8054 --caname ca-org2 -M ${PWD}/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x

  mkdir -p organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com

  echo
  echo "## Generate the org admin msp"
  echo
  set -x
	fabric-ca-client enroll -u https://org2admin:org2adminpw@localhost:8054 --caname ca-org2 -M ${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp --tls.certfiles ${PWD}/organizations/fabric-ca/org2/tls-cert.pem
  set +x

  cp ${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml ${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/config.yaml

}

function createOrderer {

  NW_CFG_PATH="$1"
  echo "NW_CFG_PATH = $NW_CFG_PATH"
	echo "Enroll the CA admin"
  echo
	mkdir -p $NW_CFG_PATH/ordererOrganizations/network2.com

	export FABRIC_CA_CLIENT_HOME=$NW_CFG_PATH/ordererOrganizations/network2.com
#  rm -rf $FABRIC_CA_CLIENT_HOME/fabric-ca-client-config.yaml
#  rm -rf $FABRIC_CA_CLIENT_HOME/msp

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:8054 --caname ca.orderer.network2.com --tls.certfiles $NW_CFG_PATH/fabric-ca/ordererOrg/tls-cert.pem
  set +x

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-orderer-network2-com.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-orderer-network2-com.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-orderer-network2-com.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-orderer-network2-com.pem
    OrganizationalUnitIdentifier: orderer' > $NW_CFG_PATH/ordererOrganizations/network2.com/msp/config.yaml


  echo
	echo "Register orderer"
  echo
  set -x
	fabric-ca-client register --caname ca.orderer.network2.com --id.name orderer --id.secret ordererpw --id.type orderer --tls.certfiles $NW_CFG_PATH/fabric-ca/ordererOrg/tls-cert.pem
    set +x

  echo
  echo "Register the orderer admin"
  echo
  set -x
  fabric-ca-client register --caname ca.orderer.network2.com --id.name ordererAdmin --id.secret ordererAdminpw --id.type admin --tls.certfiles $NW_CFG_PATH/fabric-ca/ordererOrg/tls-cert.pem
  set +x

	mkdir -p $NW_CFG_PATH/ordererOrganizations/network2.com/orderers
  mkdir -p $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/network2.com

  mkdir -p $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com

  echo
  echo "## Generate the orderer msp"
  echo
  set -x
	fabric-ca-client enroll -u https://orderer:ordererpw@localhost:8054 --caname ca.orderer.network2.com -M $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/msp --csr.hosts orderer.network2.com --csr.hosts localhost --tls.certfiles $NW_CFG_PATH/fabric-ca/ordererOrg/tls-cert.pem
  set +x

  cp $NW_CFG_PATH/ordererOrganizations/network2.com/msp/config.yaml $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/msp/config.yaml

  echo
  echo "## Generate the orderer-tls certificates"
  echo
  set -x
  fabric-ca-client enroll -u https://orderer:ordererpw@localhost:8054 --caname ca.orderer.network2.com -M $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls --enrollment.profile tls --csr.hosts orderer.network2.com --csr.hosts localhost --tls.certfiles $NW_CFG_PATH/fabric-ca/ordererOrg/tls-cert.pem
  set +x

  cp $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/tlscacerts/* $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/ca.crt
  cp $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/signcerts/* $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/server.crt
  cp $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/keystore/* $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/server.key

  mkdir $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/msp/tlscacerts
  cp $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/tlscacerts/* $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/msp/tlscacerts/tlsca.network2.com-cert.pem

  mkdir $NW_CFG_PATH/ordererOrganizations/network2.com/msp/tlscacerts
  cp $NW_CFG_PATH/ordererOrganizations/network2.com/orderers/orderer.network2.com/tls/tlscacerts/* $NW_CFG_PATH/ordererOrganizations/network2.com/msp/tlscacerts/tlsca.network2.com-cert.pem

  mkdir -p $NW_CFG_PATH/ordererOrganizations/network2.com/users
  mkdir -p $NW_CFG_PATH/ordererOrganizations/network2.com/users/Admin@network2.com

  echo
  echo "## Generate the admin msp"
  echo
  set -x
	fabric-ca-client enroll -u https://ordererAdmin:ordererAdminpw@localhost:8054 --caname ca.orderer.network2.com -M $NW_CFG_PATH/ordererOrganizations/network2.com/users/Admin@network2.com/msp --tls.certfiles $NW_CFG_PATH/fabric-ca/ordererOrg/tls-cert.pem
  set +x

  cp $NW_CFG_PATH/ordererOrganizations/network2.com/msp/config.yaml $NW_CFG_PATH/ordererOrganizations/network2.com/users/Admin@network2.com/msp/config.yaml

}
