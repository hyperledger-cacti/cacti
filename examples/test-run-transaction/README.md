# test-run-transaction

A proto-code of communication feature to http-typed Validator for Verifier

## Setup for communication app with http-server

```
/// build ///
cd packages
vi config/default.json
  -> edit applicationHostInfo.hostName (“http://xxx.xxx.xxx.xxx”) to the IP address of your server
npm install
npm run build
cd ../examples/run-transaction
npm install
npm run build
npm run init-run-transaction
npm run start
  -> The run-transaction app will start on port 5034.
```

## Setup for stub server instead of http-type Validator

```
/// build ///
cd examples/run-transaction/supply-chain-app-stub
npm install
npx tsc
/// exec server ///
node app/app.js
```

## Execution to call API of http-type Validator

```
/// exec to call API ///
curl localhost:5034/api/v1/bl/run-transaction/ -XPOST -H "Content-Type: application/json" -d '{"businessLogicID":"j71S9gLN", "tradeParams": ["1111", "2222", "3333", "4444", "5555", ["6666-1", "6666-2"]]}'
```