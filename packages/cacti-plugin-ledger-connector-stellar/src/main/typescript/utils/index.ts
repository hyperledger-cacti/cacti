import { TransactionInvocation } from "stellar-plus/lib/stellar-plus/types";
import { TransactionInvocation as RawTransactionInvocation } from "../generated/openapi/typescript-axios";
import { DefaultAccountHandler } from "stellar-plus/lib/stellar-plus/account";
import { NetworkConfig } from "stellar-plus/lib/stellar-plus/network";
import { readFile } from "fs/promises";

export const convertApiTransactionInvocationToStellarPlus = (
  rawTransactionInvocation: RawTransactionInvocation,
  networkConfig: NetworkConfig,
): TransactionInvocation => {
  const header = {
    ...rawTransactionInvocation.header,
    fee: rawTransactionInvocation.header.fee.toString(),
  };

  const signers = rawTransactionInvocation.signers.map((signer) => {
    return new DefaultAccountHandler({
      networkConfig,
      secretKey: signer,
    });
  });

  return {
    header,
    signers,
  };
};

export const loadWasmFile = async (wasmFilePath: string): Promise<Buffer> => {
  try {
    const buffer = await readFile(wasmFilePath);
    return buffer;
  } catch (error) {
    console.error(`Error reading the WASM file: ${error}`);
    throw error;
  }
};
