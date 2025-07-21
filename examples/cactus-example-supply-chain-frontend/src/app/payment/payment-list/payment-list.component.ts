import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { firstValueFrom, Subscription } from "rxjs";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  PaymentService,
  PaymentStatus,
} from "../../common/services/payment.service";
import { Payment } from "../payment-list/payment-list.page";
import { ProductStatusService } from "../../common/services/product-status.service";

@Component({
  selector: "app-payment-list",
  templateUrl: "./payment-list.component.html",
  styleUrls: ["./payment-list.component.scss"],
})
export class PaymentListComponent implements OnInit, OnDestroy {
  private readonly log: Logger;
  private subscriptions: Subscription[] = [];

  payments: Payment[] = [];
  isLoading = true;
  error: string | null = null;
  isUsingMockData = false;
  dataSource: "blockchain" | "events" | "etherscan" | "localStorage" | "mock" =
    "blockchain";

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private productStatusService?: ProductStatusService,
  ) {
    const label = "PaymentListComponent";
    this.log = LoggerProvider.getOrCreate({ level: "INFO", label });
  }

  async ngOnInit() {
    try {
      this.log.info("Initializing Payment List Component");

      // Subscribe to payment status changes
      this.subscriptions.push(
        this.paymentService.paymentStatus$.subscribe(() => {
          this.log.info("Payment status changed, refreshing payment list");
          this.loadPayments();
        }),
      );

      // Load payments immediately
      await this.loadPayments();

      // Update product statuses based on payments
      this.updateProductStatusesFromPayments();
    } catch (error) {
      this.log.error("Error in ngOnInit:", error);
      this.error = "Failed to initialize payment list.";
      this.isLoading = false;
    }
  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  async loadPayments() {
    try {
      this.isLoading = true;
      this.error = null;
      this.isUsingMockData = false;
      this.dataSource = "blockchain";

      this.log.info("Loading payments from blockchain...");

      try {
        // Try to get payments using our improved service method
        this.payments = await this.paymentService.getAllPayments();

        // If we get here, data was loaded successfully
        this.log.info(
          `Loaded ${this.payments.length} payments from blockchain`,
        );

        // Determine data source based on payment properties
        this.detectDataSource();

        if (this.payments.length === 0) {
          this.log.warn("No payments found, using mock data as fallback");
          this.loadMockPayments();
        }
      } catch (blockchainError) {
        // If blockchain call fails, log the error and fall back to mock data
        this.log.warn("Failed to load from blockchain:", blockchainError);
        this.loadMockPayments();
      }

      // Ensure all payments have valid timestamps
      this.payments = this.payments.map((payment) => {
        // If timestamp is 0 or invalid, set it to current time
        if (!payment.timestamp) {
          payment.timestamp = Date.now();
        }
        return payment;
      });

      // Sort payments by timestamp (newest first)
      this.payments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      this.isLoading = false;
    } catch (error) {
      this.log.error("Error loading payments:", error);
      // Load mock data as fallback
      this.loadMockPayments();
      this.isLoading = false;
    }
  }

  /**
   * Update product statuses based on payment records
   * This ensures that products with paid payments are marked as SOLD
   */
  private async updateProductStatusesFromPayments() {
    try {
      if (
        !this.payments ||
        this.payments.length === 0 ||
        this.isUsingMockData
      ) {
        return;
      }

      this.log.info("Updating product statuses based on payment records");

      // Find all payments with status = Paid
      const paidPayments = this.payments.filter(
        (payment) => payment.status === PaymentStatus.Paid,
      );

      if (paidPayments.length === 0) {
        this.log.info("No paid payments found, nothing to update");
        return;
      }

      this.log.info(
        `Found ${paidPayments.length} paid payments to update product statuses`,
      );

      // Update each product status in localStorage
      for (const payment of paidPayments) {
        if (payment.productId && payment.productType) {
          // Update localStorage status
          const status =
            payment.productType.toLowerCase() === "shipment"
              ? "SHIPPED"
              : "SOLD";
          this.updateLocalProductStatus(
            payment.productType,
            payment.productId,
            status,
          );

          // Try to update backend status if ProductStatusService is available
          if (this.productStatusService) {
            try {
              await this.productStatusService.markProductAsPaid(
                payment.productType,
                payment.productId,
                null,
                payment.transactionReference,
              );
            } catch (error) {
              this.log.warn(
                `Failed to update ${payment.productType} ${payment.productId} status:`,
                error,
              );
            }
          }
        }
      }

      // Set global refresh flag
      localStorage.setItem("refresh_all_products", Date.now().toString());
    } catch (error) {
      this.log.error("Error updating product statuses:", error);
    }
  }

  /**
   * Update local storage with product status
   */
  private updateLocalProductStatus(
    productType: string,
    productId: string,
    status: string,
  ): void {
    try {
      // Standard localStorage key format
      const key = `product_status_${productType.toLowerCase()}_${productId}`;
      localStorage.setItem(key, status);

      // Also set direct product status key
      localStorage.setItem(
        `${productType.toLowerCase()}_${productId}_status`,
        status,
      );

      // For bamboo harvests, set all possible key formats and refresh flags
      const normalizedType = productType.toLowerCase();
      if (
        ["bamboo", "bambooharvest", "bamboo-harvest"].includes(normalizedType)
      ) {
        // Set all key formats for better UI consistency
        localStorage.setItem(`product_status_bamboo_${productId}`, status);
        localStorage.setItem(
          `product_status_bambooharvest_${productId}`,
          status,
        );
        localStorage.setItem(
          `product_status_bamboo-harvest_${productId}`,
          status,
        );
        localStorage.setItem(`bamboo_${productId}_status`, status);
        localStorage.setItem(`bambooharvest_${productId}_status`, status);
        localStorage.setItem(`bamboo-harvest_${productId}_status`, status);

        // Always set refresh flags for bamboo harvests
        localStorage.setItem("refresh_bamboo", "true");
      }

      // Also set refresh flags for bookshelves
      if (normalizedType === "bookshelf") {
        localStorage.setItem(`bookshelf_${productId}_status`, status);
        localStorage.setItem("refresh_bookshelves", "true");
      }

      // Set shipment status
      if (normalizedType === "shipment") {
        localStorage.setItem(`shipment_${productId}_status`, status);
        localStorage.setItem("refresh_shipments", "true");
      }
    } catch (error) {
      this.log.warn(`Error updating local product status: ${error}`);
    }
  }

  /**
   * Detect the data source based on payment properties
   */
  private detectDataSource() {
    if (this.isUsingMockData) {
      this.dataSource = "mock";
      return;
    }

    if (this.payments.length === 0) {
      return;
    }

    // Check the first payment for clues about the data source
    const firstPayment = this.payments[0];

    // Check for Etherscan-specific patterns
    if (firstPayment.productId && firstPayment.productId.startsWith("tx-")) {
      this.dataSource = "etherscan";
      return;
    }

    // Check for event-based data
    if (firstPayment.productId && firstPayment.productId.startsWith("event-")) {
      this.dataSource = "events";
      return;
    }

    // Check for localStorage-based data
    if (
      firstPayment.productId &&
      (firstPayment.productId.includes("block-") ||
        !firstPayment.productId.includes("-"))
    ) {
      this.dataSource = "blockchain";
      return;
    }

    // Default to blockchain
    this.dataSource = "blockchain";
  }

  // Load mock payment data when blockchain data is unavailable
  loadMockPayments() {
    this.log.info("Using mock payment data");
    this.isUsingMockData = true;
    this.dataSource = "mock";

    // Create some realistic mock data
    const now = Date.now();
    this.payments = [
      {
        id: "1",
        amount: "0.05",
        payee: "0x1234567890123456789012345678901234567890",
        payer:
          localStorage.getItem("walletAddress") ||
          "0x0987654321098765432109876543210987654321",
        productId: "shelf-001",
        productType: "Bookshelf",
        status: PaymentStatus.Paid,
        timestamp: now - 3600000, // 1 hour ago
        transactionReference:
          "0xe890c89d2d201da58c754c8f9dfc49e2755fcc8cc8a10910c991d94b2eaec4e9",
      },
      {
        id: "2",
        amount: "0.03",
        payee: "0x1234567890123456789012345678901234567890",
        payer:
          localStorage.getItem("walletAddress") ||
          "0x0987654321098765432109876543210987654321",
        productId: "bh-2023-04",
        productType: "Bamboo Harvest",
        status: PaymentStatus.Paid,
        timestamp: now - 86400000, // 1 day ago
        transactionReference:
          "0xd7c3a5b17d7cfa43ce47f07fef171e8fe33a8d3e0e45f2b30271cd3e7aeaf125",
      },
      {
        id: "3",
        amount: "0.02",
        payee: "0x1234567890123456789012345678901234567890",
        payer:
          localStorage.getItem("walletAddress") ||
          "0x0987654321098765432109876543210987654321",
        productId: "chair-105",
        productType: "Chair",
        status: PaymentStatus.Pending,
        timestamp: now - 172800000, // 2 days ago
        transactionReference:
          "0xb394889147058beb6a5f7d15aae73d1dfe945a4e3eea8eb32c9c5be3db19c7b2",
      },
    ];
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return "Unknown";

    try {
      // Use actual transaction timestamp from blockchain
      const date = new Date(timestamp);

      // Format with date and time
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      this.log.error("Error formatting date:", error);
      return "Invalid Date";
    }
  }

  getStatusClass(status: string | PaymentStatus): string {
    // Convert numeric status to string if needed
    if (typeof status === "number") {
      status = PaymentStatus[status] as string;
    }

    if (typeof status === "string") {
      switch (status.toLowerCase()) {
        case "paid":
        case "1":
          return "paid";
        case "pending":
        case "0":
          return "pending";
        case "cancelled":
        case "3":
          return "cancelled";
        case "refunded":
        case "2":
          return "refunded";
        case "failed":
        case "4":
          return "failed";
        default:
          return "unknown";
      }
    } else {
      // Handle enum values
      switch (status) {
        case PaymentStatus.Paid:
          return "paid";
        case PaymentStatus.Pending:
          return "pending";
        case PaymentStatus.Cancelled:
          return "cancelled";
        case PaymentStatus.Refunded:
          return "refunded";
        case PaymentStatus.Failed:
          return "failed";
        default:
          return "unknown";
      }
    }
  }

  viewPayment(payment: Payment) {
    // Use the real transaction hash from the payment
    const txHash = payment.transactionReference || "";

    if (!txHash || txHash === "0x") {
      this.log.warn("No transaction hash available for payment:", payment);
      return;
    }

    this.log.info("Navigating to transaction receipt:", txHash);

    // Navigate to the transaction receipt page with the hash and product info
    this.router.navigate(["/payment/receipt", txHash], {
      queryParams: {
        productId: payment.productId,
        productType: payment.productType,
      },
    });
  }

  refreshPayments() {
    this.loadPayments();
  }
}
