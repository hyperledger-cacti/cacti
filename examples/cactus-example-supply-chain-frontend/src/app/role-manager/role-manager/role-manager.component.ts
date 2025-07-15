import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { WalletService } from "../../common/services/wallet.service";

@Component({
  selector: "app-role-manager",
  templateUrl: "./role-manager.component.html",
  styleUrls: ["./role-manager.component.scss"],
})
export class RoleManagerComponent implements OnInit {
  walletAddress: string | null = null;
  isAdmin: boolean = false;

  // Form for adding manufacturers and customers
  roleForm: FormGroup;

  // Lists for tracking addresses with roles
  manufacturers: string[] = [];
  customers: string[] = [];

  // Status flags
  loading = false;
  errorMessage = "";
  successMessage = "";

  constructor(
    private walletService: WalletService,
    private fb: FormBuilder,
  ) {
    this.roleForm = this.fb.group({
      address: [
        "",
        [Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)],
      ],
      role: ["manufacturer", Validators.required],
    });
  }

  ngOnInit() {
    // Subscribe to wallet address changes
    this.walletService.walletAddress$.subscribe((address) => {
      this.walletAddress = address;
      if (address) {
        this.checkRoles(address);
      }
    });

    // Subscribe to admin status changes
    this.walletService.isAdmin$.subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });
  }

  async checkRoles(address: string) {
    try {
      const isManufacturer = await this.walletService.isManufacturer(address);
      if (isManufacturer && !this.manufacturers.includes(address)) {
        this.manufacturers.push(address);
      }

      const isCustomer = await this.walletService.isCustomer(address);
      if (isCustomer && !this.customers.includes(address)) {
        this.customers.push(address);
      }
    } catch (error) {
      console.error("Error checking roles:", error);
    }
  }

  async addRole() {
    if (!this.roleForm.valid) {
      this.errorMessage = "Please enter a valid Ethereum address";
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    try {
      const { address, role } = this.roleForm.value;

      if (role === "manufacturer") {
        const success = await this.walletService.addManufacturer(address);
        if (success) {
          this.successMessage = `Added ${address} as a manufacturer`;
          if (!this.manufacturers.includes(address)) {
            this.manufacturers.push(address);
          }
        } else {
          this.errorMessage = "Failed to add manufacturer";
        }
      } else if (role === "customer") {
        const success = await this.walletService.addCustomer(address);
        if (success) {
          this.successMessage = `Added ${address} as a customer`;
          if (!this.customers.includes(address)) {
            this.customers.push(address);
          }
        } else {
          this.errorMessage = "Failed to add customer";
        }
      }
    } catch (error) {
      console.error("Error adding role:", error);
      this.errorMessage = `Error: ${error.message || error}`;
    } finally {
      this.loading = false;
    }
  }

  getShortenedAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
