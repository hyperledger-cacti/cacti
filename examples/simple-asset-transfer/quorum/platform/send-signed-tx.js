const argv = require('minimist')(process.argv.slice(2));
const EthereumTx = require('ethereumjs-tx');
const keythereum = require("keythereum");
const Web3 = require('web3');
const fs = require('fs');


// connect to block chain
console.log('using node', argv.node);
const providerURL = "http://127.0.0.1";
const providerPort = "2200".concat(argv.node - 1);
var web3 = new Web3(new Web3.providers.HttpProvider(providerURL + ":" + providerPort));

const keyJSON = fs.readFileSync('keys/key'+argv.node, 'utf8');
const keyObj = JSON.parse(keyJSON);
const password = '';
const privateKey = keythereum.recover(password, keyObj);

console.log('privateKey: ', privateKey.toString('hex'));


web3.eth.getAccounts().then(re => {
  let account = re[0];
  console.log('account: ', account);

  return web3.eth.getTransactionCount(account);
}).then(nonce => {
  console.log('nonce: ', nonce);

  let txParams = {
    nonce: '0x0'+nonce,
    gasPrice: '0x00',
    gasLimit: '0x47b760',
    to: '0xca843569e3427144cead5e4d5999a3d0ccf92b8e', // node 2 account
    value: '0x01',
    chainId: 10,
  };

  console.log('tx payload: ', txParams);

  const tx = new EthereumTx(txParams);

  tx.sign(privateKey);
  const serializedTx = tx.serialize();
  var rawTx = '0x' + tx.serialize().toString('hex');

  console.log('raw transaction: ', rawTx);

  web3.eth.sendSignedTransaction(rawTx)
    .on('receipt', console.log);
});
