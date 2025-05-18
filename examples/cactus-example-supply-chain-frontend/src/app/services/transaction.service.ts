import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, throwError, timer, forkJoin } from "rxjs";
import {
  catchError,
  map,
  switchMap,
  retry,
  retryWhen,
  delayWhen,
  tap,
  timeout,
} from "rxjs/operators";

// Define the Transaction interface inline to avoid import issues
interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  status: boolean;
  nonce: number;
  input: string;
}

@Injectable({
  providedIn: "root",
})
export class TransactionService {
  private apiUrl = "https://api-sepolia.etherscan.io/api";
  private apiKey = "6KXCWAJ1I8MKPBY6Q4SVA5AF1U1BC7AA41";

  constructor(private http: HttpClient) {}

  getTransaction(hash: string): Observable<Transaction> {
    console.log("Getting transaction details for hash:", hash);

    // Make sure hash is trimmed and doesn't have any unexpected characters
    const cleanHash = hash.trim();

    // First check if the hash itself is valid
    if (!cleanHash || !cleanHash.startsWith("0x") || cleanHash.length !== 66) {
      console.error("Invalid transaction hash format:", cleanHash);
      return throwError(
        () => new Error(`Invalid transaction hash format: ${cleanHash}`),
      );
    }

    // Call Etherscan API to get transaction details - use the working endpoint format
    const url = `${this.apiUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${cleanHash}&apikey=${this.apiKey}`;
    console.log("API URL:", url);

    return this.http.get<any>(url).pipe(
      // Add a timeout to avoid hanging
      timeout(15000),
      tap((response) => console.log("Raw transaction response:", response)),
      // Add retry with exponential backoff for transactions that might not be indexed yet
      retryWhen((errors) =>
        errors.pipe(
          tap((err) =>
            console.log("Error fetching transaction, will retry:", err),
          ),
          // Retry up to 3 times with increasing delay
          delayWhen((_, attempt) => {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/3)`);
            return timer(delay);
          }),
        ),
      ),
      switchMap((response) => {
        if (!response || !response.result) {
          console.warn("Transaction not found or not indexed yet:", response);
          // For debugging, also output the complete response
          console.log("Complete response:", JSON.stringify(response));
          return throwError(
            () =>
              new Error(
                "Transaction not found or not yet indexed. Please try again in a few moments.",
              ),
          );
        }

        const txData = response.result;
        console.log("Transaction data:", txData);

        // Get the receipt to determine status
        return this.getTransactionReceipt(cleanHash).pipe(
          tap((receiptResponse) =>
            console.log("Receipt response:", receiptResponse),
          ),
          switchMap((receiptResponse) => {
            const receipt =
              receiptResponse && receiptResponse.result
                ? receiptResponse.result
                : null;

            console.log("Receipt data:", receipt);

            // Determine transaction status from receipt
            let txStatus = true; // Default to true
            if (receipt) {
              // For newer transactions, status is 0x1 for success, 0x0 for failure
              txStatus = receipt.status === "0x1";
            }

            // If we have a block number, get timestamp
            if (txData.blockNumber) {
              const blockNumber = parseInt(txData.blockNumber, 16);
              console.log("Block number:", blockNumber);

              return this.getBlockTimestamp(blockNumber).pipe(
                map((timestamp) => {
                  console.log("Block timestamp:", timestamp);

                  // Return the complete transaction object with timestamp
                  const transaction = {
                    hash: txData.hash,
                    blockNumber: blockNumber,
                    timestamp: timestamp,
                    from: txData.from,
                    to: txData.to,
                    value: this.formatWeiToEther(txData.value),
                    gasUsed: receipt
                      ? parseInt(receipt.gasUsed || "0", 16)
                      : parseInt(txData.gas || "0", 16),
                    gasPrice: this.formatWeiToGwei(txData.gasPrice),
                    status: txStatus,
                    nonce: parseInt(txData.nonce || "0", 16),
                    input: txData.input,
                  } as Transaction;

                  console.log("Processed transaction data:", transaction);
                  return transaction;
                }),
                catchError((err) => {
                  console.error("Error getting block timestamp:", err);

                  // Return transaction with current timestamp as fallback
                  return of({
                    hash: txData.hash,
                    blockNumber: blockNumber,
                    timestamp: Math.floor(Date.now() / 1000),
                    from: txData.from,
                    to: txData.to,
                    value: this.formatWeiToEther(txData.value),
                    gasUsed: receipt
                      ? parseInt(receipt.gasUsed || "0", 16)
                      : parseInt(txData.gas || "0", 16),
                    gasPrice: this.formatWeiToGwei(txData.gasPrice),
                    status: txStatus,
                    nonce: parseInt(txData.nonce || "0", 16),
                    input: txData.input,
                  } as Transaction);
                }),
              );
            } else {
              // No block number means pending transaction
              console.log("Transaction is still pending (no block number)");
              return of({
                hash: txData.hash,
                blockNumber: 0,
                timestamp: Math.floor(Date.now() / 1000),
                from: txData.from,
                to: txData.to,
                value: this.formatWeiToEther(txData.value),
                gasUsed: parseInt(txData.gas || "0", 16),
                gasPrice: this.formatWeiToGwei(txData.gasPrice),
                status: false, // Pending transactions aren't successful yet
                nonce: parseInt(txData.nonce || "0", 16),
                input: txData.input,
              } as Transaction);
            }
          }),
          catchError((err) => {
            console.error("Error processing receipt:", err);

            // Create a basic transaction object even without receipt
            return of({
              hash: txData.hash,
              blockNumber: txData.blockNumber
                ? parseInt(txData.blockNumber, 16)
                : 0,
              timestamp: Math.floor(Date.now() / 1000),
              from: txData.from,
              to: txData.to,
              value: this.formatWeiToEther(txData.value),
              gasUsed: parseInt(txData.gas || "0", 16),
              gasPrice: this.formatWeiToGwei(txData.gasPrice),
              status: false, // Unknown status, assume false
              nonce: parseInt(txData.nonce || "0", 16),
              input: txData.input,
            } as Transaction);
          }),
        );
      }),
      catchError((error) => {
        // Provide more detailed error information
        let errorMsg = "Error fetching transaction";
        if (error.message) {
          errorMsg = error.message;
        } else if (error.status === 429) {
          errorMsg = "API rate limit exceeded. Please try again later.";
        } else if (error.status >= 500) {
          errorMsg = "Etherscan service unavailable. Please try again later.";
        }
        console.error(errorMsg, error);
        return throwError(() => new Error(errorMsg));
      }),
    );
  }

  // Get transaction receipt (for status)
  getTransactionReceipt(hash: string): Observable<any> {
    const url = `${this.apiUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${hash}&apikey=${this.apiKey}`;
    console.log("Getting transaction receipt from:", url);

    return this.http.get<any>(url).pipe(
      timeout(10000), // Add timeout
      catchError((error) => {
        console.error("Error getting receipt:", error);
        return of(null);
      }),
    );
  }

  // Get block information to extract timestamp
  getBlockTimestamp(blockNumber: number): Observable<number> {
    const url = `${this.apiUrl}?module=proxy&action=eth_getBlockByNumber&tag=0x${blockNumber.toString(16)}&boolean=true&apikey=${this.apiKey}`;
    console.log("Getting block data from:", url);

    return this.http.get<any>(url).pipe(
      timeout(10000), // Add timeout
      tap((response) => console.log("Block response:", response)),
      map((response) => {
        if (response && response.result && response.result.timestamp) {
          return parseInt(response.result.timestamp, 16);
        }
        console.warn("Couldn't get timestamp from block, using current time");
        return Math.floor(Date.now() / 1000);
      }),
      catchError((error) => {
        console.error("Error getting block timestamp:", error);
        return of(Math.floor(Date.now() / 1000));
      }),
    );
  }

  // Helper method to convert wei to ether
  private formatWeiToEther(weiValue: string): string {
    if (!weiValue) return "0";
    try {
      const wei = BigInt(weiValue);
      // Convert to ETH by dividing by 10^18
      const etherValue = Number(wei) / 1e18;
      return etherValue.toString();
    } catch (error) {
      console.error(
        "Error formatting wei to ether:",
        error,
        "Value:",
        weiValue,
      );
      return "0";
    }
  }

  // Helper method to convert wei to gwei
  private formatWeiToGwei(weiValue: string): string {
    if (!weiValue) return "0";
    try {
      const wei = BigInt(weiValue);
      // Convert to Gwei by dividing by 10^9
      const gweiValue = Number(wei) / 1e9;
      return gweiValue.toString();
    } catch (error) {
      console.error("Error formatting wei to gwei:", error, "Value:", weiValue);
      return "0";
    }
  }
}
