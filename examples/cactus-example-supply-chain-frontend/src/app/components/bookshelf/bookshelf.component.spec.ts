import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
} from "@angular/core/testing";
import { ReactiveFormsModule, FormBuilder } from "@angular/forms";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialogModule, MatDialog } from "@angular/material/dialog";
import { of, throwError } from "rxjs";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

// Mock interfaces and classes to replace missing imports
interface Bookshelf {
  id: string;
  name: string;
  manufacturer: string;
  price: number;
  status: string;
  width: number;
  height: number;
  depth: number;
  material: string;
}

interface MaterialTraceInfo {
  materialId: string;
  harvestLocation: string;
  harvestDate: string;
  certifications: string[];
  processingSteps: {
    facility: string;
    date: string;
    process: string;
    verifier: string;
  }[];
  affectedProducts: string[];
}

enum Role {
  Manufacturer = "manufacturer",
  Customer = "customer",
  Supplier = "supplier",
  Admin = "admin",
}

class BookshelfComponent {
  bookshelves: Bookshelf[] = [];
  filteredBookshelves: Bookshelf[] = [];
  materialTraceInfo: MaterialTraceInfo;
  showTraceResults = false;
  bookshelfForm: any;
  filterMaterial = "";

  canCreateBookshelf(): boolean {
    return false;
  }
  canPayForBookshelf(bookshelf: Bookshelf): boolean {
    return false;
  }
  canUpdateStatus(bookshelf: Bookshelf): boolean {
    return false;
  }
  isProductRecalled(bookshelf: Bookshelf): boolean {
    return false;
  }
  ngOnInit() {}
  loadBookshelves() {}
  filterByStatus(status: string) {}
  onSubmit() {}
  payForBookshelf(bookshelf: Bookshelf) {}
  updateStatus(bookshelf: Bookshelf, status: string) {}
  traceMaterial(bookshelf: Bookshelf) {}
  initiateRecall(bookshelf: Bookshelf) {}
  closeTraceResults() {}
  purchaseBookshelf(bookshelf: Bookshelf) {}
  trackByFn(index: number, item: Bookshelf): string {
    return item.id;
  }
  applyFilter() {}
  resetFilter() {}
}

class BookshelfService {
  getBookshelfList() {
    return of([]);
  }
  getBookshelf() {
    return of({});
  }
  createBookshelf() {
    return of({});
  }
  updateBookshelfStatus() {
    return of({});
  }
  payForBookshelf() {
    return of({});
  }
  traceMaterial() {
    return of({});
  }
  initiateRecall() {
    return of({});
  }
}

class AuthService {
  getCurrentUserRole() {
    return "";
  }
  isLoggedIn() {
    return true;
  }
}

class PaymentService {
  createPayment() {
    return of({});
  }
  processPayment() {
    return of({});
  }
  getPaymentByProductId() {
    return of({});
  }
}

// Define SpyObj type for jasmine
declare namespace jasmine {
  // Define Spy type if it doesn't exist
  interface Spy {
    and: any;
    calls: any;
  }

  interface SpyObj<T> {
    [key: string]: Spy;
  }
}

describe("BookshelfComponent", () => {
  let component: BookshelfComponent;
  let fixture: ComponentFixture<BookshelfComponent>;
  let bookshelfService: jasmine.SpyObj<BookshelfService>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let paymentService: jasmine.SpyObj<PaymentService>;

  const mockBookshelf: Bookshelf = {
    id: "bookshelf-001",
    name: "Modern Bamboo Shelf",
    manufacturer: "org1MSP.manufacturer1",
    price: 0.5,
    status: "CREATED",
    width: 80,
    height: 120,
    depth: 30,
    material: "Bamboo",
  };

  const mockBookshelfList: Bookshelf[] = [
    mockBookshelf,
    {
      id: "bookshelf-002",
      name: "Minimalist Bamboo Shelf",
      manufacturer: "org1MSP.manufacturer1",
      price: 0.7,
      status: "PAID",
      width: 100,
      height: 150,
      depth: 35,
      material: "Bamboo",
    },
    {
      id: "bookshelf-003",
      name: "Rustic Bamboo Shelf",
      manufacturer: "org1MSP.manufacturer2",
      price: 0.6,
      status: "SHIPPED",
      width: 90,
      height: 130,
      depth: 30,
      material: "BH-2023-0342",
    },
  ];

  const mockMaterialTrace: MaterialTraceInfo = {
    materialId: "BH-2023-0342",
    harvestLocation: "Anji County, Zhejiang Province, China",
    harvestDate: "2023-07-15",
    certifications: ["FSC", "PEFC"],
    processingSteps: [
      {
        facility: "Anji Bamboo Processing Plant",
        date: "2023-07-20",
        process: "Initial processing and treatment",
        verifier: "Org1MSP",
      },
      {
        facility: "Hangzhou Manufacturing Center",
        date: "2023-08-05",
        process: "Component production",
        verifier: "Org2MSP",
      },
    ],
    affectedProducts: ["bookshelf-003", "bookshelf-005", "bookshelf-009"],
  };

  beforeEach(waitForAsync(() => {
    const bookshelfServiceSpy = jasmine.createSpyObj("BookshelfService", [
      "getBookshelfList",
      "getBookshelf",
      "createBookshelf",
      "updateBookshelfStatus",
      "payForBookshelf",
      "traceMaterial",
      "initiateRecall",
    ]);

    const authServiceSpy = jasmine.createSpyObj("AuthService", [
      "getCurrentUserRole",
      "isLoggedIn",
    ]);
    const snackBarSpy = jasmine.createSpyObj("MatSnackBar", ["open"]);
    const dialogSpy = jasmine.createSpyObj("MatDialog", ["open"]);
    const paymentSpy = jasmine.createSpyObj("PaymentService", [
      "createPayment",
      "processPayment",
      "getPaymentByProductId",
    ]);

    TestBed.configureTestingModule({
      declarations: [BookshelfComponent],
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
        BrowserAnimationsModule,
      ],
      providers: [
        FormBuilder,
        { provide: BookshelfService, useValue: bookshelfServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: PaymentService, useValue: paymentSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookshelfComponent);
    component = fixture.componentInstance;
    bookshelfService = TestBed.inject(
      BookshelfService,
    ) as unknown as jasmine.SpyObj<BookshelfService>;
    authService = TestBed.inject(
      AuthService,
    ) as unknown as jasmine.SpyObj<AuthService>;
    snackBar = TestBed.inject(
      MatSnackBar,
    ) as unknown as jasmine.SpyObj<MatSnackBar>;
    dialog = TestBed.inject(MatDialog) as unknown as jasmine.SpyObj<MatDialog>;
    paymentService = TestBed.inject(
      PaymentService,
    ) as unknown as jasmine.SpyObj<PaymentService>;

    // Default auth setup
    authService.getCurrentUserRole.and.returnValue(Role.Manufacturer);
    authService.isLoggedIn.and.returnValue(true);

    // Default response for bookshelf list
    bookshelfService.getBookshelfList.and.returnValue(of(mockBookshelfList));
    bookshelfService.getBookshelf.and.returnValue(of(mockBookshelf));
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BookshelfComponent);
    component = fixture.componentInstance;

    // Set up default mock returns
    bookshelfService.getBookshelfList.and.returnValue(of(mockBookshelfList));

    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load bookshelf list on init", fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(bookshelfService.getBookshelfList).toHaveBeenCalled();
    expect(component.bookshelves.length).toBe(3);
    expect(component.bookshelves[0].name).toBe("Modern Bamboo Shelf");
  }));

  it("should filter bookshelves by status", fakeAsync(() => {
    component.ngOnInit();
    tick();

    component.filterByStatus("PAID");
    expect(component.filteredBookshelves.length).toBe(1);
    expect(component.filteredBookshelves[0].status).toBe("PAID");

    component.filterByStatus("ALL");
    expect(component.filteredBookshelves.length).toBe(3);
  }));

  it("should create a new bookshelf when form is valid", fakeAsync(() => {
    const newBookshelf: Bookshelf = {
      id: "new-bookshelf",
      name: "New Test Bookshelf",
      manufacturer: "org1MSP.manufacturer1",
      price: 0.8,
      status: "CREATED",
      width: 85,
      height: 125,
      depth: 32,
      material: "Bamboo",
    };

    bookshelfService.createBookshelf.and.returnValue(of({ success: true }));

    component.ngOnInit();
    tick();

    component.bookshelfForm.patchValue({
      name: newBookshelf.name,
      price: newBookshelf.price,
      width: newBookshelf.width,
      height: newBookshelf.height,
      depth: newBookshelf.depth,
      material: newBookshelf.material,
    });

    component.onSubmit();
    tick();

    expect(bookshelfService.createBookshelf).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      "Bookshelf created successfully",
      "Close",
      jasmine.any(Object),
    );
  }));

  it("should handle errors when creating bookshelf", fakeAsync(() => {
    bookshelfService.createBookshelf.and.returnValue(
      throwError({ error: "Test error" }),
    );

    component.ngOnInit();
    tick();

    component.bookshelfForm.patchValue({
      name: "Error Test Bookshelf",
      price: 0.8,
      width: 85,
      height: 125,
      depth: 32,
      material: "Bamboo",
    });

    component.onSubmit();
    tick();

    expect(bookshelfService.createBookshelf).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      "Error creating bookshelf: Test error",
      "Close",
      jasmine.any(Object),
    );
  }));

  it("should pay for a bookshelf", fakeAsync(() => {
    bookshelfService.payForBookshelf.and.returnValue(of({ success: true }));

    component.ngOnInit();
    tick();

    component.payForBookshelf(mockBookshelf);
    tick();

    expect(bookshelfService.payForBookshelf).toHaveBeenCalledWith(
      mockBookshelf.id,
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      "Payment successful",
      "Close",
      jasmine.any(Object),
    );
  }));

  it("should update bookshelf status", fakeAsync(() => {
    bookshelfService.updateBookshelfStatus.and.returnValue(
      of({ success: true }),
    );

    component.ngOnInit();
    tick();

    component.updateStatus(mockBookshelf, "SHIPPED");
    tick();

    expect(bookshelfService.updateBookshelfStatus).toHaveBeenCalledWith(
      mockBookshelf.id,
      "SHIPPED",
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      "Status updated successfully",
      "Close",
      jasmine.any(Object),
    );
  }));

  it("should trace material and show results", fakeAsync(() => {
    bookshelfService.traceMaterial.and.returnValue(of(mockMaterialTrace));

    component.ngOnInit();
    tick();

    // Find a bookshelf with the specific material
    const bookshelfWithTraceMaterial = mockBookshelfList.find(
      (bs) => bs.material === "BH-2023-0342",
    );
    expect(bookshelfWithTraceMaterial).toBeTruthy();

    component.traceMaterial(bookshelfWithTraceMaterial);
    tick();

    expect(bookshelfService.traceMaterial).toHaveBeenCalledWith("BH-2023-0342");
    expect(component.materialTraceInfo).toEqual(mockMaterialTrace);
    expect(component.showTraceResults).toBeTruthy();
  }));

  it("should initiate product recall", fakeAsync(() => {
    dialog.open.and.returnValue({
      afterClosed: () => of({ reason: "Structural defect in bamboo joints" }),
    } as any);

    bookshelfService.initiateRecall.and.returnValue(
      of({ success: true, affectedProducts: 3 }),
    );

    component.ngOnInit();
    tick();

    component.initiateRecall(mockBookshelf);
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(bookshelfService.initiateRecall).toHaveBeenCalledWith(
      mockBookshelf.id,
      "Structural defect in bamboo joints",
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      "Recall initiated successfully. 3 affected products identified.",
      "Close",
      jasmine.any(Object),
    );
  }));

  it("should handle recall of product with material supply chain", fakeAsync(() => {
    // Mock the trace material response first
    bookshelfService.traceMaterial.and.returnValue(of(mockMaterialTrace));

    // Mock the dialog response to confirm recall
    dialog.open.and.returnValue({
      afterClosed: () =>
        of({
          reason: "Defective bamboo batch",
          recallAllWithSameMaterial: true,
        }),
    } as any);

    // Mock the recall response
    bookshelfService.initiateRecall.and.returnValue(
      of({ success: true, affectedProducts: 3 }),
    );

    component.ngOnInit();
    tick();

    // Find a bookshelf with the specific material
    const bookshelfWithTraceMaterial = mockBookshelfList.find(
      (bs) => bs.material === "BH-2023-0342",
    );

    component.initiateRecall(bookshelfWithTraceMaterial);
    tick();

    // Should first trace the material
    expect(bookshelfService.traceMaterial).toHaveBeenCalledWith("BH-2023-0342");

    // Then show the dialog with the trace info
    expect(dialog.open).toHaveBeenCalled();

    // Then initiate recall with information from the dialog
    expect(bookshelfService.initiateRecall).toHaveBeenCalledWith(
      "BH-2023-0342", // Note: This should be the material ID for batch recall
      "Defective bamboo batch",
      true, // recallAllWithSameMaterial flag
    );

    // Notification should show affected products count
    expect(snackBar.open).toHaveBeenCalledWith(
      "Recall initiated successfully. 3 affected products identified.",
      "Close",
      jasmine.any(Object),
    );
  }));

  it("should hide trace results when close button is clicked", fakeAsync(() => {
    component.materialTraceInfo = mockMaterialTrace;
    component.showTraceResults = true;

    component.closeTraceResults();

    expect(component.showTraceResults).toBeFalsy();
  }));

  it("should handle permission denied based on user role", fakeAsync(() => {
    // Change role to customer
    authService.getCurrentUserRole.and.returnValue(Role.Customer);

    component.ngOnInit();
    tick();

    // Customer should not be able to create bookshelves
    expect(component.canCreateBookshelf()).toBeFalsy();

    // But should be able to view and pay
    expect(component.canPayForBookshelf(mockBookshelf)).toBeTruthy();

    // Customer should not be able to update status
    expect(component.canUpdateStatus(mockBookshelf)).toBeFalsy();

    // Change to manufacturer
    authService.getCurrentUserRole.and.returnValue(Role.Manufacturer);

    // Manufacturer should be able to create bookshelves
    expect(component.canCreateBookshelf()).toBeTruthy();

    // Manufacturer should be able to update status of their own bookshelves
    const manufacturerBookshelf = mockBookshelfList.find(
      (b) => b.manufacturer === "org1MSP.manufacturer1",
    );
    expect(component.canUpdateStatus(manufacturerBookshelf)).toBeTruthy();

    // But not bookshelves from other manufacturers
    const otherManufacturerBookshelf = mockBookshelfList.find(
      (b) => b.manufacturer === "org1MSP.manufacturer2",
    );
    expect(component.canUpdateStatus(otherManufacturerBookshelf)).toBeFalsy();
  }));

  // Cross-chain communication test
  it("should handle cross-chain status updates", fakeAsync(() => {
    // Mock the bookshelf service to simulate cross-chain update
    bookshelfService.updateBookshelfStatus.and.returnValue(
      of({
        success: true,
        ethereumTxHash: "0x123456789",
        fabricTxId: "fabric-tx-123",
      }),
    );

    component.ngOnInit();
    tick();

    component.updateStatus(mockBookshelf, "SHIPPED");
    tick();

    // Should have called update with correct params
    expect(bookshelfService.updateBookshelfStatus).toHaveBeenCalledWith(
      mockBookshelf.id,
      "SHIPPED",
    );

    // Should show success message
    expect(snackBar.open).toHaveBeenCalledWith(
      "Status updated successfully",
      "Close",
      jasmine.any(Object),
    );
  }));

  // Test handling of product recall scenario
  it("should display trace information for recalled products", fakeAsync(() => {
    // Prepare a recalled bookshelf
    const recalledBookshelf = { ...mockBookshelf, status: "RECALLED" };

    // Mock the trace material response
    bookshelfService.traceMaterial.and.returnValue(of(mockMaterialTrace));

    component.traceMaterial(recalledBookshelf);
    tick();

    // Should call trace material and show results with recall info
    expect(bookshelfService.traceMaterial).toHaveBeenCalled();
    expect(component.materialTraceInfo).toEqual(mockMaterialTrace);
    expect(component.showTraceResults).toBeTruthy();

    // When a product is recalled, the component should highlight this
    expect(component.isProductRecalled(recalledBookshelf)).toBeTruthy();
    expect(component.isProductRecalled(mockBookshelfList[1])).toBeFalsy();
  }));

  it("should handle error when loading bookshelves fails", () => {
    bookshelfService.getBookshelfList.and.returnValue(
      throwError(() => new Error("Failed to load")),
    );

    spyOn(console, "error");
    component.loadBookshelves();

    expect(console.error).toHaveBeenCalled();
  });

  it("should create a new bookshelf", () => {
    const newBookshelf = {
      id: "bookshelf-003",
      name: "New Test Shelf",
      width: 75.0,
      height: 110.0,
      depth: 25.0,
      material: "Bamboo",
      manufacturer: "org1MSP.manufacturer1",
      price: 0.6,
      status: "CREATED",
    };

    bookshelfService.createBookshelf.and.returnValue(of(newBookshelf));

    // Set form values
    component.bookshelfForm.patchValue({
      name: "New Test Shelf",
      width: 75.0,
      height: 110.0,
      depth: 25.0,
      material: "Bamboo",
      price: 0.6,
    });

    component.onSubmit();

    expect(bookshelfService.createBookshelf).toHaveBeenCalled();
    expect(component.bookshelves.length).toBe(3);
    expect(component.bookshelves[2].name).toBe("New Test Shelf");
  });

  it("should purchase a bookshelf", () => {
    const bookshelf = mockBookshelfList[0];
    const mockPayment = {
      id: 1,
      payer: "0x123",
      payee: "0x456",
      amount: 0.5,
      productId: bookshelf.id,
      productType: "bookshelf",
      status: 0, // Pending
      timestamp: Date.now(),
      transactionReference: "",
    };

    paymentService.createPayment.and.returnValue(of(mockPayment));
    paymentService.processPayment.and.returnValue(of({ success: true }));
    bookshelfService.updateBookshelfStatus.and.returnValue(
      of({ ...bookshelf, status: "PAID" }),
    );

    component.purchaseBookshelf(bookshelf);

    expect(paymentService.createPayment).toHaveBeenCalled();
    expect(paymentService.processPayment).toHaveBeenCalled();
    expect(bookshelfService.updateBookshelfStatus).toHaveBeenCalledWith(
      bookshelf.id,
      "PAID",
    );
  });

  it("should handle error during payment processing", () => {
    const bookshelf = mockBookshelfList[0];
    const mockPayment = {
      id: 1,
      payer: "0x123",
      payee: "0x456",
      amount: 0.5,
      productId: bookshelf.id,
      productType: "bookshelf",
      status: 0, // Pending
      timestamp: Date.now(),
      transactionReference: "",
    };

    paymentService.createPayment.and.returnValue(of(mockPayment));
    paymentService.processPayment.and.returnValue(
      throwError(() => new Error("Payment failed")),
    );

    spyOn(console, "error");
    component.purchaseBookshelf(bookshelf);

    expect(paymentService.createPayment).toHaveBeenCalled();
    expect(paymentService.processPayment).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(bookshelfService.updateBookshelfStatus).not.toHaveBeenCalled();
  });

  it("should track bookshelf by ID", () => {
    const trackResult = component.trackByFn(0, mockBookshelfList[0]);
    expect(trackResult).toBe("bookshelf-001");
  });

  it("should reset form after submission", () => {
    const newBookshelf = {
      id: "bookshelf-003",
      name: "New Test Shelf",
      width: 75.0,
      height: 110.0,
      depth: 25.0,
      material: "Bamboo",
      manufacturer: "org1MSP.manufacturer1",
      price: 0.6,
      status: "CREATED",
    };

    bookshelfService.createBookshelf.and.returnValue(of(newBookshelf));

    // Set form values
    component.bookshelfForm.patchValue({
      name: "New Test Shelf",
      width: 75.0,
      height: 110.0,
      depth: 25.0,
      material: "Bamboo",
      price: 0.6,
    });

    component.onSubmit();

    // Check if form was reset
    expect(component.bookshelfForm.pristine).toBeTruthy();
    expect(component.bookshelfForm.value.name).toBeFalsy();
  });

  it("should filter bookshelves by material", () => {
    component.filterMaterial = "Bamboo";
    component.applyFilter();

    expect(component.filteredBookshelves.length).toBe(1);
    expect(component.filteredBookshelves[0].material).toBe("Bamboo");
  });

  it("should clear filter when reset is called", () => {
    component.filterMaterial = "Bamboo";
    component.applyFilter();

    expect(component.filteredBookshelves.length).toBe(1);

    component.resetFilter();

    expect(component.filterMaterial).toBe("");
    expect(component.filteredBookshelves.length).toBe(3);
  });
});
