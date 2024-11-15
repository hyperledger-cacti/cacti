import { Chain, Common } from "@ethereumjs/common";
import {
  AccessListEIP2930Transaction,
  BlobEIP4844Transaction,
  FeeMarketEIP1559Transaction,
  LegacyTransaction,
  TransactionFactory,
  TypedTxData,
} from "@ethereumjs/tx";

type CustomChainArg = Parameters<typeof Common.custom>[0];

/**
 * Sign ethereum transaction data offline. Can be used with both mainnet and custom chains.
 *
 * @param txData transaction data (format must be compatible with @ethereumjs/tx)
 * @param privateKey HEX private signing key
 * @param customChainInfo optional custom chain information (default: mainnet)
 *
 * @returns serialized transaction, txId (hash) and signedTransaction object
 */
export function signTransaction(
  txData: TypedTxData,
  privateKey: string,
  customChainInfo?: CustomChainArg,
): {
  serializedTransactionHex: string;
  txId: string;
  signedTransactionObject:
    | LegacyTransaction
    | AccessListEIP2930Transaction
    | FeeMarketEIP1559Transaction
    | BlobEIP4844Transaction;
} {
  let chainConfiguration = new Common({
    chain: Chain.Mainnet,
    hardfork: "istanbul",
  });
  if (customChainInfo) {
    chainConfiguration = Common.custom(customChainInfo);
  }

  const transaction = TransactionFactory.fromTxData(txData, {
    common: chainConfiguration as any,
  });
  if (privateKey.toLowerCase().startsWith("0x")) {
    privateKey = privateKey.slice(2);
  }
  const signedTransaction = transaction.sign(Buffer.from(privateKey, "hex"));

  const hash = signedTransaction.hash();
  const txId = "0x" + Buffer.from(hash).toString("hex");
  const serializedTransaction = signedTransaction.serialize();
  const serializedTransactionHex =
    "0x" + Buffer.from(serializedTransaction).toString("hex");

  return {
    serializedTransactionHex,
    txId,
    signedTransactionObject: signedTransaction,
  };
}
