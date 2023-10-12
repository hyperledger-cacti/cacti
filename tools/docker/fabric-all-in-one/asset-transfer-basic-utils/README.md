# fabric-cli-.14

Helper CLI tools for interacting with `asset-transfer-basic` CC deployed in `fabric-all-in-one` image.
Sources are based on official fabric-samples - https://github.com/hyperledger/fabric-samples/

## Usage

### Setup
 - Run `npm install`
 - Run `./setup.sh` before using any other script from this directory.
 - Setup will copy `connection-org1.json` to `./connection.json`, and will deploy `admin` and `appUser`. Wallet can later be used by other applications (sample apps, for instance)

### Scripts
 - `enrollAdmin.js` - Will enrol `admin` and store it in the wallet.
 - `registerUser.js` - Will register `appUser` and store it in the wallet.
 - `query.js` - Will run `GetAllAssets` on the fabric, all assets will be printed in verbose (formatted) way.
