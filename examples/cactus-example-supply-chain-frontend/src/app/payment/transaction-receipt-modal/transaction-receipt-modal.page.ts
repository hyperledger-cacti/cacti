import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ElementRef,
} from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

@Component({
  selector: "app-transaction-receipt-modal",
  templateUrl: "./transaction-receipt-modal.page.html",
  styleUrls: ["./transaction-receipt-modal.page.scss"],
})
export class TransactionReceiptModalPage implements OnInit, AfterViewInit {
  @Input() txHash: string;
  @Input() productId: string;
  @Input() productType: string;

  private readonly log: Logger;

  constructor(
    private modalController: ModalController,
    private elementRef: ElementRef,
  ) {
    const label = "TransactionReceiptModalPage";
    this.log = LoggerProvider.getOrCreate({ level: "INFO", label });
  }

  ngOnInit() {
    this.log.info(
      `Transaction receipt modal initialized for tx: ${this.txHash}`,
    );
    console.log(`Transaction receipt modal initialized for tx: ${this.txHash}`);
    console.log(`Product ID: ${this.productId}, Type: ${this.productType}`);

    if (!this.txHash) {
      console.error("Error: No transaction hash provided to modal!");
    }
  }

  ngAfterViewInit() {
    // Remove unwanted text elements after view initialization
    setTimeout(() => {
      this.cleanupUnwantedElements();
    }, 100);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  /**
   * Clean up any unwanted text elements that appear in the modal
   */
  private cleanupUnwantedElements(): void {
    try {
      // Get the modal's root element
      const element = this.elementRef.nativeElement;

      // Loop through all elements in the modal
      const allElements = element.querySelectorAll("*");
      allElements.forEach((el: Element) => {
        // Look for circular elements with short text like "at", "ch", etc.
        if (
          el.childNodes.length === 1 &&
          el.childNodes[0].nodeType === Node.TEXT_NODE &&
          /^(at|ch|up|fl|c|u|fi)$/.test(el.childNodes[0].textContent.trim())
        ) {
          el.remove();
        }

        // Remove any standalone text nodes with these patterns
        this.removeUnwantedTextNodes(el);
      });

      // Also check direct child nodes of the element
      Array.from(element.childNodes).forEach((node: Node) => {
        if (
          node.nodeType === Node.TEXT_NODE &&
          /^\s*(at|ch|up|fl|c|u|fi)\s*$/.test(node.textContent || "")
        ) {
          node.textContent = "";
        }
      });

      // Add a MutationObserver to keep removing unwanted elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node: Node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                // If this is an element with just minimal text and no useful classes
                if (
                  el.textContent &&
                  el.textContent.trim().length < 5 &&
                  (!el.className || !el.className.includes("step"))
                ) {
                  el.remove();
                }
              } else if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || "";
                if (/^\s*(at|ch|up|fl|c|u|fi)\s*$/.test(text)) {
                  node.textContent = "";
                }
              }
            });
          }
        });
      });

      // Start observing
      observer.observe(element, {
        childList: true,
        subtree: true,
      });
    } catch (error) {
      console.error("Error cleaning up modal elements:", error);
    }
  }

  /**
   * Helper method to remove text nodes containing unwanted text
   */
  private removeUnwantedTextNodes(element: Element): void {
    if (!element) return;

    // Create a list of nodes to remove (can't remove while iterating)
    const nodesToRemove: ChildNode[] = [];

    // Check all direct child nodes
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() || "";
        // Match specific unwanted text patterns
        if (/^(at|ch|up|fl|c|u|fi)$/.test(text)) {
          nodesToRemove.push(node);
        }
      }
    });

    // Remove the identified nodes
    nodesToRemove.forEach((node) => {
      try {
        element.removeChild(node);
      } catch (e) {
        // Ignore errors if node can't be removed
      }
    });
  }
}
