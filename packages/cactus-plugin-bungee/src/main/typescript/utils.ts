import { Transaction } from "./view-creation/transaction";

export class Utils {
  static bufArray2HexStr(array: Uint8Array): string {
    return Buffer.from(array).toString("hex");
  }

  static writeKeyToFile(fileName: string, key: string): void {
    const fs = require("fs");

    fs.writeFile(fileName, key, function (err: boolean) {
      if (err) {
        return console.error(err);
      }
      console.log("File created!");
    });
  }

  static readKeyFromFile(fileName: string): string {
    const fs = require("fs");
    const data = fs.readFileSync(fileName, "utf8");
    return data;
  }

  // Receive transactions in string format and parses to Transaction []
  static txsStringToTxs(txString: string): Transaction[] {
    // eslint-disable-next-line prefer-const
    let transactions: Transaction[] = [];

    const txs = JSON.parse(txString);

    for (const tx of txs) {
      const txId = tx.value.txId;
      // const ts = tx.value.timestamp.seconds + "." + tx.value.timestamp.nanos;
      const ts = tx.value.timestamp.seconds;
      transactions.push(new Transaction(txId, ts));
    }

    return transactions;
  }
}
