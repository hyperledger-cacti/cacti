#!/bin/bash

curl -o tessera-22.1.7.tar https://s01.oss.sonatype.org/service/local/repositories/releases/content/net/consensys/quorum/tessera/tessera-dist/22.1.7/tessera-dist-22.1.7.tar

DDIR=/qdata/tm
rm -rf ${DDIR}
mkdir -p ${DDIR}
cp /tm.pub ${DDIR}/tm.pub
cp /tm.key ${DDIR}/tm.key

tar xvf tessera-22.1.7.tar
export PATH=$PATH:tessera-22.1.7/bin

# sorting versions to target correct configuration
TESSERA_CONFIG_TYPE="-09"

echo Config type ${TESSERA_CONFIG_TYPE}

#generating the two config flavors
cat <<EOF > ${DDIR}/tessera-config-09.json
{
  "jdbc": {
    "username": "sa",
    "password": "",
    "url": "jdbc:h2:./${DDIR}/db;MODE=Oracle;TRACE_LEVEL_SYSTEM_OUT=0",
    "autoCreateTables": true
  },
  "serverConfigs":[
  {
    "app":"ThirdParty",
    "enabled": true,
    "serverAddress": "http://$(hostname -i):9080",
    "communicationType" : "REST"
  },
  {
    "app":"Q2T",
    "enabled": true,
    "serverAddress": "unix:${DDIR}/tm.ipc",
    "communicationType" : "REST"
  },
  {
    "app":"P2P",
    "enabled": true,
    "serverAddress": "http://$(hostname -i):9000",
    "sslConfig": {
      "tls": "OFF"
    },
    "communicationType" : "REST"
  }
  ],
  "peer": [
      {
          "url": "http://localhost:9000"
      }
  ],
  "keys": {
    "passwords": [],
    "keyData": [
      {
        "config": $(cat ${DDIR}/tm.key),
        "publicKey": "$(cat ${DDIR}/tm.pub)"
      }
    ]
  },
  "alwaysSendTo": []
}
EOF

cat ${DDIR}/tessera-config-09.json
tessera -configfile ${DDIR}/tessera-config-09.json