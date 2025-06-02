import { Injectable } from "@angular/core";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { AuthConfig } from "../../common/auth-config";
import { WalletService } from "./wallet.service";
import { Bookshelf } from "../interfaces/bookshelf.interface";

@Injectable({
  providedIn: "root",
})
export class BookshelfService {
  private readonly log: Logger;
  private bookshelfCache: Map<string, Bookshelf> = new Map();
  private lastRefreshTime = 0;

  constructor(
    private http: HttpClient,
    private walletService: WalletService,
  ) {
    const label = "BookshelfService";
    this.log = LoggerProvider.getOrCreate({ level: "INFO", label });

    // Check for refresh flag periodically
    setInterval(() => this.checkRefreshFlag(), 1000);
  }

  /**
   * Check if we need to refresh the cache
   */
  private checkRefreshFlag(): void {
    const refreshFlag = localStorage.getItem("refresh_bookshelves");
    if (refreshFlag === "true") {
      // Clear the flag
      localStorage.removeItem("refresh_bookshelves");

      // Force refresh if it's been at least 1 second since last refresh
      const now = Date.now();
      if (now - this.lastRefreshTime > 1000) {
        this.lastRefreshTime = now;
        this.clearCache();
        this.getAllBookshelves().catch((err) =>
          this.log.error("Error refreshing bookshelves:", err),
        );
      }
    }
  }

  /**
   * Clear the bookshelf cache
   */
  public clearCache(): void {
    this.log.info("Clearing bookshelf cache");
    this.bookshelfCache.clear();
  }

  /**
   * Get all bookshelves
   * @param includeSOLD Whether to include bookshelves that are marked as SOLD
   */
  public async getAllBookshelves(
    includeSOLD: boolean = false,
  ): Promise<Bookshelf[]> {
    try {
      this.log.info("Getting all bookshelves");

      // Get headers for API call
      const headers = await this.getSignedHeaders();
      if (!headers) {
        throw new Error("Wallet not connected");
      }

      // Call the API
      const apiUrl = `${window.location.origin}/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/list-bookshelves`;

      const response = await firstValueFrom(this.http.get(apiUrl, { headers }));

      let bookshelves = (response as any).data || [];

      // Update cache and check for local status overrides
      bookshelves.forEach((bookshelf: Bookshelf) => {
        // Check if this bookshelf has a status override in localStorage
        const statusKey = `product_status_bookshelf_${bookshelf.id}`;
        const storedStatus = localStorage.getItem(statusKey);
        if (storedStatus) {
          bookshelf.status = storedStatus;
        }

        this.bookshelfCache.set(bookshelf.id, bookshelf);
      });

      // Filter out SOLD bookshelves if requested
      if (!includeSOLD) {
        bookshelves = bookshelves.filter(
          (bookshelf: Bookshelf) => bookshelf.status !== "SOLD",
        );
      }

      return bookshelves;
    } catch (error) {
      this.log.error("Error getting bookshelves:", error);
      return [];
    }
  }

  /**
   * Get a specific bookshelf by ID
   */
  public async getBookshelfById(id: string): Promise<Bookshelf | null> {
    try {
      // First check cache
      if (this.bookshelfCache.has(id)) {
        return this.bookshelfCache.get(id) || null;
      }

      this.log.info(`Getting bookshelf with ID ${id}`);

      // Get headers for API call
      const headers = await this.getSignedHeaders();
      if (!headers) {
        throw new Error("Wallet not connected");
      }

      // Call the API
      const apiUrl = `${window.location.origin}/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/bookshelf/${id}`;

      const response = await firstValueFrom(this.http.get(apiUrl, { headers }));

      if ((response as any).success && (response as any).data) {
        const bookshelf = (response as any).data;

        // Check if this bookshelf has a status override in localStorage
        const statusKey = `product_status_bookshelf_${bookshelf.id}`;
        const storedStatus = localStorage.getItem(statusKey);
        if (storedStatus) {
          bookshelf.status = storedStatus;
        }

        // Update cache
        this.bookshelfCache.set(id, bookshelf);

        return bookshelf;
      }

      return null;
    } catch (error) {
      this.log.error(`Error getting bookshelf ${id}:`, error);
      return null;
    }
  }

  /**
   * Get signed wallet headers
   */
  private async getSignedHeaders(): Promise<{ [key: string]: string } | null> {
    try {
      // Get wallet headers
      const headers = this.walletService.getWalletHeaders();
      if (!headers) {
        this.log.warn("Wallet not connected");
        return null;
      }

      // Sign the message
      const signResult = await this.walletService.signMessage(
        headers["x-message"],
      );
      if (!signResult) {
        this.log.warn("Failed to sign message");
        return null;
      }

      // Add signature to headers
      const signedHeaders = {
        ...headers,
        "x-signature": signResult.signature,
        "Content-Type": "application/json",
        Authorization: `Bearer ${AuthConfig.authToken}`,
      };

      return signedHeaders;
    } catch (error) {
      this.log.error("Error getting signed headers:", error);
      return null;
    }
  }
}
