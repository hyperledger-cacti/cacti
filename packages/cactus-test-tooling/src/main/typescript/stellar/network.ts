//
// List of supported networks to connect
// when the test ledger image is pulled up.
//
export enum Network {
  LOCAL = "local", // (Default) pull up a new pristine network image locally.
  FUTURENET = "futurenet", // pull up an image to connect to futurenet. Can take several minutes to sync the ledger state.
  TESTNET = "testnet", // pull up an image to connect to testnet  Can take several minutes to sync the ledger state.
}
