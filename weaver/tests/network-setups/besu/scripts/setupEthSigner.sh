# Script to generate password and V3 Keystore key files for EthSigner

# Create a directory in the Besu network's home folder to store the password and key files

cd SampleBesuNetwork$1
mkdir keys


# Generate key files

cp ../artifacts/network$1/passwordFile keys/

#Node-1
Node=Node-1
cp ../artifacts/network$1/createKeyFile.js .
key=`cat $Node/data/key`
sed -i "s/<AccountPrivateKey>/$key/g" createKeyFile.js
touch keys/keyFile_${Node}
npm install web3
node createKeyFile.js > keys/keyFile_${Node}
rm createKeyFile.js
cp ../artifacts/account.toml keys/
cd networkFiles/keys/
accountID=`ls -d -1 */ |sed -n '1p'`  # For Node-1
accountID=${accountID:2}
accountID=${accountID::-1}
cd ../../keys/
mv account.toml ${accountID}.toml
sed -i 's,description,description = "File based configuration for Node-1",g' ${accountID}.toml
sed -i 's,key-file,key-file = "keyFile_Node-1",g' ${accountID}.toml # EthSigner should be run from SampleBesuNetwork
sed -i 's,password-file,password-file = "passwordFile",g' ${accountID}.toml
cd ../

#Node-2
Node=Node-2
cp ../artifacts/network$1/createKeyFile.js .
key=`cat $Node/data/key`
sed -i "s/<AccountPrivateKey>/$key/g" createKeyFile.js
touch keys/keyFile_${Node}
#npm install web3
node createKeyFile.js > keys/keyFile_${Node}
rm createKeyFile.js
cp ../artifacts/account.toml keys/
cd networkFiles/keys/
accountID=`ls -d -1 */ |sed -n '2p'`   # For Node-2
accountID=${accountID:2}
accountID=${accountID::-1}
cd ../../keys/
mv account.toml ${accountID}.toml
sed -i 's,description,description = "File based configuration for Node-2",g' ${accountID}.toml
sed -i 's,key-file,key-file = "keyFile_Node-2",g' ${accountID}.toml # EthSigner should be run from SampleBesuNetwork
sed -i 's,password-file,password-file = "passwordFile",g' ${accountID}.toml
cd ../


#Node-3
Node=Node-3
cp ../artifacts/network$1/createKeyFile.js .
key=`cat $Node/data/key`
sed -i "s/<AccountPrivateKey>/$key/g" createKeyFile.js
touch keys/keyFile_${Node}
#npm install web3
node createKeyFile.js > keys/keyFile_${Node}
rm createKeyFile.js
cp ../artifacts/account.toml keys/
cd networkFiles/keys/
accountID=`ls -d -1 */ |sed -n '3p'` # For Node-3
accountID=${accountID:2}
accountID=${accountID::-1}
cd ../../keys/
mv account.toml ${accountID}.toml
sed -i 's,description,description = "File based configuration for Node-3",g' ${accountID}.toml
sed -i 's,key-file,key-file = "keyFile_Node-3",g' ${accountID}.toml # EthSigner should be run from SampleBesuNetwork
sed -i 's,password-file,password-file = "passwordFile",g' ${accountID}.toml
cd ../


#Node-1
Node=Node-4
cp ../artifacts/network$1/createKeyFile.js .
key=`cat $Node/data/key`
sed -i "s/<AccountPrivateKey>/$key/g" createKeyFile.js
touch keys/keyFile_${Node}
#npm install web3
node createKeyFile.js > keys/keyFile_${Node}
rm createKeyFile.js
cp ../artifacts/account.toml keys/
cd networkFiles/keys/
accountID=`ls -d -1 */ |sed -n '4p'`   # For Node-4
accountID=${accountID:2}
accountID=${accountID::-1}
cd ../../keys/
mv account.toml ${accountID}.toml
sed -i 's,description,description = "File based configuration for Node-4",g' ${accountID}.toml
sed -i 's,key-file,key-file = "keyFile_Node-4",g' ${accountID}.toml # EthSigner should be run from SampleBesuNetwork
sed -i 's,password-file,password-file = "passwordFile",g' ${accountID}.toml
cd ../
