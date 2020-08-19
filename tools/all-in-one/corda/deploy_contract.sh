#!/bin/sh

# if [ "$#" -ne 1 ]; then
#     echo "Illegal number of parameters"
#     exit 2
# fi

cp /root/smart-contracts/upload.zip /opt/corda/builder/upload.zip
cd /opt/corda/builder
unzip upload.zip

echo "Building Cordapps"
./gradlew build -x test
./gradlew deployNodes

sleep 20
echo "Kill all running corda nodes"
kill $(ps aux | grep corda | awk '{print $1}')

echo "Deploying Cordapps"
cp /opt/corda/builder/build/nodes/PartyA/cordapps/*.jar /opt/corda/partyA/cordapps/
cp /opt/corda/builder/build/nodes/PartyA/cordapps/*.jar /opt/corda/partyB/cordapps/
java -jar /opt/corda/partyA/corda.jar --base-directory=/opt/corda/partyA & java -jar /opt/corda/partyB/corda.jar --base-directory=/opt/corda/partyB && fg
