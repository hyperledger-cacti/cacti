#!/bin/bash

DDIR=/qdata/tm
rm -rf ${DDIR}
mkdir -p ${DDIR}
cp /tm.pub ${DDIR}/tm.pub
cp /tm.key ${DDIR}/tm.key

#extract the tessera version from the jar
TESSERA_VERSION=$(unzip -p /tessera/tessera-app.jar META-INF/MANIFEST.MF | grep Tessera-Version | cut -d" " -f2)
echo "Tessera version (extracted from manifest file): ${TESSERA_VERSION}"
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
java -Xms128M -Xmx128M -Dverbosity=WARN -jar /tessera/tessera-app.jar -configfile ${DDIR}/tessera-config-09.json
