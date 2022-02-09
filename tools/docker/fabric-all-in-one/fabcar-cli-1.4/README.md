# fabric-cli-.14

Helper CLI tools for interacting with FabCar fabric deployed in `fabric-all-in-one` image.
Sources come from official fabric-samples 1.4.8 - https://github.com/hyperledger/fabric-samples/releases/tag/v1.4.8. Any modifications were marked with `// EDIT`' comment (for instance, changed location of connection info json to `./connection.json`).

## Usage

### Setup
 - Run `npm install`
 - Run `./setup.sh` before using any other script from this directory.
 - Setup will copy `connection-org1.json` to `./connection.json`, and will deploy `admin` and `appUser`. Wallet can later be used by other applications (sample apps, for instance)

### Scripts
 - `enrollAdmin.js` - Will enrol `admin` and store it in the wallet.
 - `registerUser.js` - Will register `appUser` and store it in the wallet.
 - `query.js` - Will run `queryAllCars` on the fabric, all cars will be printed in verbose (formatted) way.
