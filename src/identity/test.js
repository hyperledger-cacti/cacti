// Run: npm i && npm run pool && node test.js
//
const indy = require('indy-sdk')
const identityManager = require('./IdentityManager')
const util = require('./test-utils')

const log = console.log

async function main() {
  log("Set protocol version 2 to work with Indy Node 1.4")
  await indy.setProtocolVersion(2)

  // 1.
  log('1. Creates a new local pool ledger configuration that is used later when connecting to ledger.')
  const poolName = 'pool'
  const genesisFilePath = await util.getPoolGenesisTxnPath(poolName)
  const poolConfig = {'genesis_txn': genesisFilePath}
  await indy.createPoolLedgerConfig(poolName, poolConfig)

  // 2.
  log('2. Open pool ledger and get handle from libindy')
  const poolHandle = await indy.openPoolLedger(poolName, undefined)

  const steward = {
    did: `steward_did`,
    key: `steward_key`,
    wallet: `steward_wallet`
  }

  const manager = new IdentityManager(poolHandle);
  await manager.initializeIdentity(steward);
}

main().catch(e => log('ERROR:', e.stack));
