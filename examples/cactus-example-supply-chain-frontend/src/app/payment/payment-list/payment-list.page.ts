import { Component, Inject, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import { ApiClient } from "@hyperledger/cactus-api-client";
import { BESU_DEMO_LEDGER_ID } from "../../../constants";
import { WalletService } from "../../common/services/wallet.service";
import {
  PaymentService,
  PaymentStatus,
} from "../../common/services/payment.service";
import { PaymentDetailPage } from "../payment-detail/payment-detail.page";
import { TransactionReceiptModalPage } from "../transaction-receipt-modal/transaction-receipt-modal.page";
import { AuthConfig } from "../../common/auth-config";

export interface Payment {
  id: string;
  amount: string;
  payee: string;
  payer: string;
  productId: string;
  productType: string;
  status: PaymentStatus;
  timestamp: number;
  transactionReference?: string;
}

@Component({
  selector: "app-payment-list",
  templateUrl: "./payment-list.page.html",
  styleUrls: ["./payment-list.page.scss"],
})
export class PaymentListPage implements OnInit {
  private readonly log: Logger;
  public payments: Payment[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  walletConnected = false;
  public signedHeaders: { [key: string]: string } | null = null;

  // Make PaymentStatus enum available in template
  PaymentStatus = PaymentStatus;

  constructor(
    private readonly apiClient: ApiClient,
    @Inject(BESU_DEMO_LEDGER_ID) private readonly besuLedgerId: string,
    public readonly modalController: ModalController,
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "PaymentListPage" });
  }

  async ngOnInit(): Promise<void> {
    // Check if wallet is already connected
    this.walletConnected = this.walletService.isWalletConnected();
    if (this.walletConnected) {
      await this.initializeApiAndLoadData();
    } else {
      // If not connected, try connecting
      await this.connectWallet();
    }

    // Subscribe to wallet changes
    this.walletService.walletAddress$.subscribe((address) => {
      this.walletConnected = !!address;
      if (this.walletConnected && !this.signedHeaders) {
        this.initializeApiAndLoadData();
      }
    });
  }

  async ionViewDidEnter(): Promise<void> {
    if (this.walletConnected) {
      this.loadPayments();
    } else {
      this.errorMessage = "Please connect your wallet to view payments";
    }
  }

  async connectWallet(): Promise<void> {
    this.isLoading = true;
    try {
      const connected = await this.walletService.connectWallet();
      if (connected) {
        this.walletConnected = true;
        await this.initializeApiAndLoadData();
      } else {
        this.errorMessage = "Failed to connect wallet. Please try again.";
      }
    } catch (error) {
      this.log.error("Error connecting wallet:", error);
      this.errorMessage =
        "Error connecting wallet. Please check the console for details.";
    } finally {
      this.isLoading = false;
    }
  }

  private async initializeApiAndLoadData(): Promise<void> {
    try {
      // Get wallet headers
      const headers = this.walletService.getWalletHeaders();
      if (!headers) {
        this.log.warn("Wallet not connected");
        this.errorMessage = "Wallet not connected";
        return;
      }

      // Sign the message
      const signResult = await this.walletService.signMessage(
        headers["x-message"],
      );
      if (!signResult) {
        this.log.warn("Failed to sign message");
        this.errorMessage = "Failed to sign message";
        return;
      }

      // Add signature to headers and store them
      headers["x-signature"] = signResult.signature;
      this.signedHeaders = {
        ...headers,
        Authorization: `Bearer ${AuthConfig.authToken}`,
      };

      this.log.debug("API initialized with signed headers:", {
        walletAddress: headers["x-wallet-address"],
        hasSignature: !!headers["x-signature"],
      });

      // Load payments with the signed headers
      await this.loadPayments();
    } catch (error) {
      this.log.error("Failed to initialize API:", error);
      this.errorMessage = "Failed to initialize. Please try again.";
    }
  }

  async loadPayments(): Promise<void> {
    if (!this.walletConnected) {
      this.log.warn("Wallet not connected, attempting to connect");
      await this.connectWallet();
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = null;

      // First, ensure we're on the right network (Sepolia)
      const isCorrectNetwork = await this.paymentService.ensureCorrectNetwork();
      if (!isCorrectNetwork) {
        this.errorMessage =
          "Please switch to the Sepolia testnet in your wallet.";
        return;
      }

      // If we don't have signed headers, try to get them
      if (!this.signedHeaders) {
        this.log.debug("No signed headers available, reinitializing");
        await this.initializeApiAndLoadData();
        if (!this.signedHeaders) {
          throw new Error("Failed to initialize API with signed headers");
        }
      }

      // Pass the signed headers to the payment service
      this.payments = await this.paymentService.getAllPayments(
        this.signedHeaders,
      );

      this.log.debug(`Loaded ${this.payments.length} payments`);

      // Sort payments by timestamp (most recent first)
      this.payments.sort((a, b) => b.timestamp - a.timestamp);

      if (this.payments.length === 0) {
        this.errorMessage =
          "No payments found. This could be because there are no payments in the contract, or there was an issue connecting to the contract.";
      }
    } catch (error) {
      this.log.error("Failed to load payments:", error);
      this.errorMessage = `Failed to load payments: ${error.message || "Unknown error"}`;
    } finally {
      this.isLoading = false;
    }
  }

  async onClickAddNew(): Promise<void> {
    if (!this.walletConnected) {
      this.errorMessage = "Please connect your wallet to create a payment";
      return;
    }

    const modal = await this.modalController.create({
      component: PaymentDetailPage,
      componentProps: {
        payment: undefined,
        signedHeaders: this.signedHeaders, // Pass signed headers to the detail page
      },
    });

    modal.onDidDismiss().then((detail) => {
      if (detail && detail.data) {
        this.loadPayments();
      }
    });
    return await modal.present();
  }

  async onClickDetail(payment: Payment): Promise<void> {
    const modal = await this.modalController.create({
      component: PaymentDetailPage,
      componentProps: {
        payment: payment,
        signedHeaders: this.signedHeaders, // Pass signed headers to the detail page
      },
    });

    modal.onDidDismiss().then((detail) => {
      if (detail && detail.data) {
        this.loadPayments();
      }
    });
    return await modal.present();
  }

  async onClickDelete(payment: Payment): Promise<void> {
    if (!confirm(`Are you sure you want to delete payment #${payment.id}?`)) {
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = null;

      // Just remove from local array since we don't have a delete endpoint
      this.payments = this.payments.filter((p) => p.id !== payment.id);

      this.log.debug(`Deleted payment ${payment.id}`);
    } catch (error) {
      this.log.error("Failed to delete payment:", error);
      this.errorMessage = "Failed to delete payment. Please try again later.";
    } finally {
      this.isLoading = false;
    }
  }

  async onClickViewReceipt(payment: Payment): Promise<void> {
    // Create a dedicated receipt modal for the transaction
    const modal = await this.modalController.create({
      component: TransactionReceiptModalPage,
      componentProps: {
        txHash: payment.transactionReference,
        productId: payment.productId,
        productType: payment.productType,
      },
    });

    return await modal.present();
  }

  getStatusText(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.Pending:
        return "Pending";
      case PaymentStatus.Paid:
        return "Paid";
      case PaymentStatus.Failed:
        return "Failed";
      case PaymentStatus.Cancelled:
        return "Cancelled";
      default:
        return "Unknown";
    }
  }

  getStatusClass(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.Pending:
        return "status-pending";
      case PaymentStatus.Paid:
        return "status-paid";
      case PaymentStatus.Failed:
        return "status-failed";
      case PaymentStatus.Cancelled:
        return "status-cancelled";
      default:
        return "";
    }
  }

  /**
   * Format an Ethereum address or transaction hash to show abbreviated form
   */
  formatAddress(address: string): string {
    if (!address) return "N/A";

    // For Ethereum addresses (0x + 40 hex chars)
    if (address.startsWith("0x") && address.length === 42) {
      return `${address.substring(0, 6)}...${address.substring(38)}`;
    }

    // For transaction hashes (longer)
    if (address.startsWith("0x")) {
      return `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
    }

    // If not a standard format, just abbreviate
    if (address.length > 20) {
      return `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
    }

    return address;
  }
}
