echo "Gradle build..."
cd /opt/corda/corda-source
./gradlew build -x test

echo "Gradle deploy..."
./gradlew deployNodes

echo "Copying cordapps to Network.."
cp /opt/corda/corda-source/build/nodes/PartyA/cordapps/workflows-0.1.jar /opt/corda/partyA/cordapps/workflows-0.1.jar
cp /opt/corda/corda-source/build/nodes/PartyA/cordapps/contracts-0.1.jar  /opt/corda/partyA/cordapps/contracts-0.1.jar
cp /opt/corda/corda-source/build/nodes/PartyA/cordapps/workflows-0.1.jar /opt/corda/partyB/cordapps/workflows-0.1.jar
cp /opt/corda/corda-source/build/nodes/PartyA/cordapps/contracts-0.1.jar  /opt/corda/partyB/cordapps/contracts-0.1.jar

echo "Starting corda nodes..."
java -jar /opt/corda/partyA/corda.jar --base-directory=/opt/corda/partyA & java -jar /opt/corda/partyB/corda.jar --base-directory=/opt/corda/partyB && fg
