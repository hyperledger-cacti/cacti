import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import {
  BrowserProvider,
  Contract,
  Signer,
  ethers,
  verifyMessage,
} from "ethers";

// Define window.ethereum interface
declare global {
  interface Window {
    ethereum?: any;
  }
}

@Injectable({
  providedIn: "root",
})
export class WalletService {
  private walletAddress = new BehaviorSubject<string | null>(null);
  private isAdmin = new BehaviorSubject<boolean>(false);
  private provider: BrowserProvider | null = null;
  private signer: Signer | null = null;
  private roleManagerContract: Contract | null = null;

  // Fixed contract addresses
  private readonly ROLE_MANAGER_ADDRESS =
    "0xcEdB13d503e8B4aCc3b6e2e9d8B8c0e530Df1044"; // Replace with your actual deployed contract address

  // Admin wallet address from RoleManager.sol
  private readonly ADMIN_WALLET_ADDRESS =
    "0x6f005BC8541B5216d9eD80A1F1921eFff0B30A7E";

  constructor() {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== "undefined") {
      this.provider = new BrowserProvider(window.ethereum);
    }
  }

  get walletAddress$(): Observable<string | null> {
    return this.walletAddress.asObservable();
  }

  get isAdmin$(): Observable<boolean> {
    return this.isAdmin.asObservable();
  }

  async connectWallet(): Promise<boolean> {
    try {
      if (!this.provider) {
        throw new Error("MetaMask is not installed");
      }

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Get the connected account
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      this.walletAddress.next(address);
      this.isAdmin.next(
        address.toLowerCase() === this.ADMIN_WALLET_ADDRESS.toLowerCase(),
      );

      // Get contract information from the backend
      try {
        await this.initializeRoleManagerContract();
      } catch (error) {
        console.warn("Failed to initialize role manager contract", error);
        // Continue anyway for the user experience
        return true;
      }

      return true;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      return false;
    }
  }

  async disconnectWallet(): Promise<void> {
    this.walletAddress.next(null);
    this.isAdmin.next(false);
    this.signer = null;
    this.roleManagerContract = null;
  }

  async signMessage(
    message: string,
  ): Promise<{ signature: string; message: string } | null> {
    try {
      if (!this.walletAddress.value) {
        throw new Error("Wallet not connected");
      }

      console.log("Opening MetaMask for signature...");

      // Use direct MetaMask method instead of ethers.js
      // This is more reliable and provides better feedback
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, this.walletAddress.value],
      });

      console.log("Signature received from MetaMask");

      return {
        signature,
        message,
      };
    } catch (error) {
      console.error("Failed to sign message:", error);
      alert(`Failed to sign message: ${error}`);
      return null;
    }
  }

  getWalletHeaders(): { [key: string]: string } | null {
    if (!this.walletAddress.value) {
      return null;
    }

    return {
      "x-wallet-address": this.walletAddress.value,
      "x-message": "Please sign this message to authenticate",
      "x-signature": "", // This will be filled in when making requests
    };
  }

  isWalletConnected(): boolean {
    return this.walletAddress.value !== null;
  }

  isAdminWallet(): boolean {
    return this.isAdmin.value;
  }

  /**
   * Initialize the RoleManager contract instance
   */
  async initializeRoleManagerContract(): Promise<void> {
    try {
      console.log("Initializing RoleManager contract...");

      if (!this.signer) {
        throw new Error("Wallet not connected");
      }

      // Get authentication headers
      const headers = this.getWalletHeaders();
      if (!headers) {
        throw new Error("Cannot get authentication headers");
      }

      // Ask user to sign the authentication message
      const signResult = await this.signMessage(headers["x-message"]);
      if (!signResult) {
        throw new Error("Failed to sign authentication message");
      }

      // Add signature to headers
      headers["x-signature"] = signResult.signature;
      headers["Content-Type"] = "application/json";

      console.log("Authentication headers prepared:", headers);

      // Get contract information from the backend
      const apiUrl =
        window.location.origin +
        "/api/v1/plugins/@hyperledger/cactus-example-supply-chain-backend/deploy-role-manager";

      console.log("Fetching contract info from:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST", // Using POST instead of GET
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(
          `Failed to get contract info: ${response.statusText} (${response.status})`,
        );
      }

      const contractInfo = await response.json();
      console.log("RoleManager contract info:", contractInfo);

      // Create contract instance
      this.roleManagerContract = new ethers.Contract(
        contractInfo.contractAddress || this.ROLE_MANAGER_ADDRESS,
        contractInfo.abi,
        this.signer,
      );

      console.log(
        "RoleManager contract initialized at:",
        this.roleManagerContract.target,
      );
    } catch (error) {
      console.error("Failed to initialize RoleManager contract:", error);
      alert(`Failed to initialize contract: ${error}`);
    }
  }

  /**
   * Check if an address is a manufacturer
   */
  async isManufacturer(address: string): Promise<boolean> {
    try {
      if (!this.roleManagerContract) {
        await this.initializeRoleManagerContract();
      }

      if (!this.roleManagerContract) {
        throw new Error("Contract not initialized");
      }

      const isManufacturer =
        await this.roleManagerContract.isManufacturer(address);
      return isManufacturer;
    } catch (error) {
      console.error("Failed to check manufacturer status:", error);
      return false;
    }
  }

  /**
   * Check if an address is a customer
   */
  async isCustomer(address: string): Promise<boolean> {
    try {
      if (!this.roleManagerContract) {
        await this.initializeRoleManagerContract();
      }

      if (!this.roleManagerContract) {
        throw new Error("Contract not initialized");
      }

      const isCustomer = await this.roleManagerContract.isCustomer(address);
      return isCustomer;
    } catch (error) {
      console.error("Failed to check customer status:", error);
      return false;
    }
  }

  /**
   * Add a manufacturer (admin only)
   */
  async addManufacturer(manufacturerAddress: string): Promise<boolean> {
    try {
      if (!this.isAdminWallet()) {
        throw new Error("Only admin can add manufacturers");
      }

      if (!this.roleManagerContract) {
        await this.initializeRoleManagerContract();
      }

      if (!this.roleManagerContract) {
        throw new Error("Contract not initialized");
      }

      const tx =
        await this.roleManagerContract.addManufacturer(manufacturerAddress);
      await tx.wait();

      console.log(`Manufacturer ${manufacturerAddress} added successfully`);
      return true;
    } catch (error) {
      console.error("Failed to add manufacturer:", error);
      alert(`Failed to add manufacturer: ${error}`);
      return false;
    }
  }

  /**
   * Add a customer (admin only)
   */
  async addCustomer(customerAddress: string): Promise<boolean> {
    try {
      if (!this.isAdminWallet()) {
        throw new Error("Only admin can add customers");
      }

      if (!this.roleManagerContract) {
        await this.initializeRoleManagerContract();
      }

      if (!this.roleManagerContract) {
        throw new Error("Contract not initialized");
      }

      const tx = await this.roleManagerContract.addCustomer(customerAddress);
      await tx.wait();

      console.log(`Customer ${customerAddress} added successfully`);
      return true;
    } catch (error) {
      console.error("Failed to add customer:", error);
      alert(`Failed to add customer: ${error}`);
      return false;
    }
  }

  /**
   * Check if the connected wallet is a manufacturer
   */
  async checkManufacturerRole(): Promise<boolean> {
    try {
      const address = this.walletAddress.value;
      if (!address) {
        console.warn("Cannot check manufacturer role - wallet not connected");
        return false;
      }

      return await this.isManufacturer(address);
    } catch (error) {
      console.error("Error checking manufacturer role:", error);
      return false;
    }
  }

  /**
   * Check if the connected wallet is a customer
   */
  async checkCustomerRole(): Promise<boolean> {
    try {
      const address = this.walletAddress.value;
      if (!address) {
        console.warn("Cannot check customer role - wallet not connected");
        return false;
      }

      return await this.isCustomer(address);
    } catch (error) {
      console.error("Error checking customer role:", error);
      return false;
    }
  }
}
