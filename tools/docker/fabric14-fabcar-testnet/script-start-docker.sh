echo "[process] start docker environment for Fabric testnet"
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 1.4.1 1.4.1
cp -a wallet fabric-samples/fabcar/javascript
cd fabric-samples/fabcar
./startFabric.sh
cd javascript
npm install
node enrollAdmin.js
node registerUser.js