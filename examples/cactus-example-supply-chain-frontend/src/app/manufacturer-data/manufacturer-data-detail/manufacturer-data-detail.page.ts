import { v4 as uuidv4 } from "uuid";
import { Component, Input, OnInit } from "@angular/core";
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  Validators,
} from "@angular/forms";
import { ModalController } from "@ionic/angular";

import { ManufacturerData } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

@Component({
  selector: "app-manufacturer-data-detail",
  templateUrl: "./manufacturer-data-detail.page.html",
  styleUrls: [],
})
export class ManufacturerDataDetailPage implements OnInit {
  private readonly log: Logger;
  public form: UntypedFormGroup;
  @Input()
  public manufacturerData: ManufacturerData;
  @Input()
  public isReadOnly = false;

  constructor(
    public readonly modalController: ModalController,
    public readonly formBuilder: UntypedFormBuilder,
  ) {
    this.log = LoggerProvider.getOrCreate({
      label: "ManufacturerDataDetailPage",
    });
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("component initialized.", this.manufacturerData);
    this.log.debug("Read-only mode:", this.isReadOnly);

    if (!this.manufacturerData) {
      // Only set defaults for new records, not existing ones
      this.manufacturerData = {
        id: uuidv4(),
        name: "",
        costPrice: 0,
        inventory: 0,
        supplierInfo: "",
        shippingAddress: "",
        customerContact: "",
      };
    } else {
      // If we have manufacturerData, check if it has placeholder text but we're a manufacturer
      // This should not happen with our fixes, but adding as a safety check
      if (!this.isReadOnly) {
        // We're a manufacturer and should see real data
        if (
          this.manufacturerData.supplierInfo ===
            "Contact manufacturer for details" ||
          this.manufacturerData.supplierInfo ===
            "Available to manufacturers only"
        ) {
          this.log.warn(
            "Detected placeholder text for a manufacturer. This should not happen.",
          );
        }
      }
    }

    // Log the actual values to debug
    this.log.debug("Manufacturer data for form:", {
      id: this.manufacturerData.id,
      name: this.manufacturerData.name,
      costPrice: this.manufacturerData.costPrice,
      inventory: this.manufacturerData.inventory,
      supplierInfo: this.manufacturerData.supplierInfo,
      shippingAddress: this.manufacturerData.shippingAddress,
      customerContact: this.manufacturerData.customerContact,
    });

    // Create form using the actual data from the manufacturerData object
    // Ensure costPrice is a number
    const costPrice =
      typeof this.manufacturerData.costPrice === "number"
        ? this.manufacturerData.costPrice
        : parseFloat(this.manufacturerData.costPrice as any) || 0;

    // Ensure inventory is a number
    const inventory =
      typeof this.manufacturerData.inventory === "number"
        ? this.manufacturerData.inventory
        : parseFloat(this.manufacturerData.inventory as any) || 0;

    // Create form with real values, not placeholders
    this.form = this.formBuilder.group({
      id: [this.manufacturerData.id, Validators.required],
      name: [this.manufacturerData.name, Validators.required],
      costPrice: [costPrice, [Validators.required, Validators.min(0)]],
      inventory: [inventory, [Validators.required, Validators.min(0)]],
      supplierInfo: [this.manufacturerData.supplierInfo, Validators.required],
      shippingAddress: [
        this.manufacturerData.shippingAddress,
        Validators.required,
      ],
      customerContact: [
        this.manufacturerData.customerContact,
        Validators.required,
      ],
    });

    // Check the form values after initialization
    this.logFormValues();

    // If in read-only mode, disable the entire form
    if (this.isReadOnly) {
      this.form.disable();
    }
  }

  /**
   * Log form values for debugging
   */
  private logFormValues(): void {
    const values = this.form.getRawValue();
    this.log.debug("Form values after initialization:", values);

    // Specifically check cost price
    this.log.debug("Cost price value:", {
      raw: values.costPrice,
      type: typeof values.costPrice,
      original: this.manufacturerData.costPrice,
      originalType: typeof this.manufacturerData.costPrice,
    });
  }

  async clickDismiss(): Promise<void> {
    await this.modalController.dismiss();
  }

  async clickSubmit(): Promise<void> {
    // Don't allow submission in read-only mode
    if (this.isReadOnly) {
      await this.modalController.dismiss();
      return;
    }

    if (this.form.valid) {
      const formValues = this.form.getRawValue();

      // Ensure numeric values are properly formatted
      const manufacturerData: ManufacturerData = {
        ...formValues,
        costPrice:
          typeof formValues.costPrice === "number"
            ? formValues.costPrice
            : parseFloat(formValues.costPrice) || 0,
        inventory:
          typeof formValues.inventory === "number"
            ? formValues.inventory
            : parseFloat(formValues.inventory) || 0,
      };

      this.log.debug(
        "Submitting manufacturer data with formatted values:",
        manufacturerData,
      );
      await this.modalController.dismiss(manufacturerData);
    }
  }
}
