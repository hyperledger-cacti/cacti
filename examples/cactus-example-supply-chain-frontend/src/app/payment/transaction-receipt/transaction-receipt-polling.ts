import { Subscription, interval } from "rxjs";
import { switchMap, takeWhile } from "rxjs/operators";
import { Logger } from "@hyperledger/cactus-common";
import { MatSnackBar } from "@angular/material/snack-bar";

/**
 * Polling service that can be added to the TransactionReceiptComponent to check for status updates
 * after a payment is processed.
 */
export class ProductStatusPoller {
  private statusPollSubscription: Subscription;
  private readonly pollInterval = 5000; // Poll every 5 seconds
  private readonly maxPollAttempts = 20; // Stop polling after ~100 seconds

  constructor(
    private log: Logger,
    private snackBar?: MatSnackBar,
  ) {}

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.statusPollSubscription) {
      this.statusPollSubscription.unsubscribe();
    }
  }

  /**
   * Start polling for product status updates
   * 
   * @param productId The ID of the product to check
   * @param productType The type of product (bookshelf, bambooHarvest, etc.)
   * @param product The current product object
   * @param getProductFn Function that returns a Promise with the latest product data
   * @param onStatusChange Callback function when status changes
   */
  public startPolling(
    productId: string, 
    productType: string,
    product: any,
    getProductFn: (id: string) => Promise<any>,
    onStatusChange: (updatedProduct: any) => void
  ): void {
    this.log.info(`Starting to poll for product status updates for ${productType} with ID ${productId}`);
    
    let pollCount = 0;
    
    this.statusPollSubscription = interval(this.pollInterval)
      .pipe(
        // Only continue polling until max attempts or status changes to SOLD
        takeWhile(() => pollCount < this.maxPollAttempts && product?.status !== 'SOLD'),
        // For each interval, fetch the latest product status
        switchMap(() => {
          pollCount++;
          this.log.debug(`Polling product status (attempt ${pollCount}/${this.maxPollAttempts})`);
          return getProductFn(productId);
        })
      )
      .subscribe({
        next: (updatedProduct) => {
          if (updatedProduct) {
            this.log.debug(`Received updated product status: ${updatedProduct.status}`);
            
            // Call the callback with updated product
            onStatusChange(updatedProduct);
            
            if (updatedProduct.status === 'SOLD') {
              this.log.info('Product status changed to SOLD, stopping polling');
              
              // Show a notification if snackbar is available
              if (this.snackBar) {
                this.snackBar.open('Product status updated to SOLD!', 'Close', {
                  duration: 5000,
                  panelClass: ['success-snackbar'],
                });
              }
              
              // Stop polling
              if (this.statusPollSubscription) {
                this.statusPollSubscription.unsubscribe();
              }
            }
          }
        },
        error: (err) => {
          this.log.error('Error polling for product status:', err);
        }
      });
  }
  
  /**
   * Stop polling
   */
  public stopPolling(): void {
    if (this.statusPollSubscription) {
      this.log.debug('Manually stopping product status polling');
      this.statusPollSubscription.unsubscribe();
    }
  }
}

// Usage example in component:
/*
// Inside your component:
private statusPoller: ProductStatusPoller;

constructor(...) {
  // Create the poller
  this.statusPoller = new ProductStatusPoller(this.log, this.snackBar);
}

// Start polling when needed
if (this.transaction?.status === true && this.product && this.product.status !== 'SOLD') {
  this.statusPoller.startPolling(
    this.productId,
    this.productType,
    this.product,
    (id) => this.bookshelfService.getBookshelfById(id),
    (updatedProduct) => {
      this.product = updatedProduct;
      // Do anything else with the updated product
    }
  );
}

// Clean up
ngOnDestroy() {
  // Clean up subscriptions
  
  // Clean up poller
  if (this.statusPoller) {
    this.statusPoller.destroy();
  }
}
*/ 