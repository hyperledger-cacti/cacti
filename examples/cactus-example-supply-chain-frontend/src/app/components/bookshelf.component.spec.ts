import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";
import { of } from "rxjs";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from "@angular/material/dialog";
import { MatTableModule } from "@angular/material/table";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

// Mock interfaces and classes to replace missing imports
class BookshelfComponent {
  bookshelves: any[] = [];
  filteredBookshelves: any[] = [];
  filterStatus: string = "";
  filterMaterial: string = "";
  dialog: any = { open: () => {} };
  snackBar: any = { open: () => {} };
  sortBy: string = "";
  sortDirection: string = "asc";
  ngOnInit() {}
  applyFilters() {}
  openNewBookshelfDialog() {}
  payForBookshelf(bookshelf: any) {}
  createShipment(bookshelf: any) {}
  recallProduct(bookshelf: any) {}
  viewShipmentDetails(bookshelf: any) {}
  updateShipmentStatus(shipment: any, status: string) {}
  loadBookshelves() {}
  sortBookshelves() {}
}

class BookshelfService {
  getAllBookshelves() {
    return of({});
  }
  getBookshelf() {
    return of({});
  }
  insertBookshelf() {
    return of({});
  }
  updateBookshelfStatus() {
    return of({});
  }
  payForBookshelf() {
    return of({});
  }
  recallBookshelf() {
    return of({});
  }
}

class ShipmentService {
  getAllShipments() {
    return of({});
  }
  getShipment() {
    return of({});
  }
  insertShipment() {
    return of({});
  }
  updateShipmentStatus() {
    return of({});
  }
}

describe("BookshelfComponent", () => {
  let component: BookshelfComponent;
  let fixture: ComponentFixture<BookshelfComponent>;
  let bookshelfService: BookshelfService;
  let shipmentService: ShipmentService;

  const mockBookshelfData = [
    {
      id: "BOOKSHELF-001",
      name: "Modern Bamboo Bookshelf",
      width: 80,
      height: 120,
      depth: 30,
      material: "Bamboo",
      price: 199.99,
      status: "CREATED",
      manufacturer: "org1MSP.manufacturer1",
    },
    {
      id: "BOOKSHELF-002",
      name: "Classic Oak Bookshelf",
      width: 90,
      height: 180,
      depth: 40,
      material: "Oak",
      price: 299.99,
      status: "PAID",
      manufacturer: "org1MSP.manufacturer1",
    },
  ];

  const mockShipmentData = [
    {
      id: "SHIPMENT-001",
      bookshelfId: "BOOKSHELF-002",
      shipmentDate: "2023-06-01T10:00:00Z",
      status: "PROCESSING",
      carrier: "FastShip Inc.",
      shippingMethod: "Express",
      trackingNumber: "TRACK-12345",
    },
  ];

  beforeEach(async () => {
    const bookshelfServiceSpy = jasmine.createSpyObj("BookshelfService", [
      "getAllBookshelves",
      "getBookshelf",
      "insertBookshelf",
      "updateBookshelfStatus",
      "payForBookshelf",
      "recallBookshelf",
    ]);

    const shipmentServiceSpy = jasmine.createSpyObj("ShipmentService", [
      "getAllShipments",
      "getShipment",
      "insertShipment",
      "updateShipmentStatus",
    ]);

    await TestBed.configureTestingModule({
      declarations: [BookshelfComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule,
        FormsModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTableModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        BrowserAnimationsModule,
      ],
      providers: [
        { provide: BookshelfService, useValue: bookshelfServiceSpy },
        { provide: ShipmentService, useValue: shipmentServiceSpy },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();

    bookshelfService = TestBed.inject(BookshelfService);
    shipmentService = TestBed.inject(ShipmentService);

    // Setup mock responses
    (bookshelfService.getAllBookshelves as jasmine.Spy).and.returnValue(
      of({ success: true, bookshelves: mockBookshelfData }),
    );

    (bookshelfService.getBookshelf as jasmine.Spy).and.returnValue(
      of({ success: true, bookshelf: mockBookshelfData[0] }),
    );

    (shipmentService.getAllShipments as jasmine.Spy).and.returnValue(
      of({ success: true, shipments: mockShipmentData }),
    );

    fixture = TestBed.createComponent(BookshelfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load bookshelves on init", () => {
    component.ngOnInit();
    expect(bookshelfService.getAllBookshelves).toHaveBeenCalled();
    expect(component.bookshelves.length).toBe(2);
    expect(component.bookshelves[0].id).toBe("BOOKSHELF-001");
    expect(component.bookshelves[1].name).toBe("Classic Oak Bookshelf");
  });

  it("should filter bookshelves by status", () => {
    component.bookshelves = mockBookshelfData;
    component.filterStatus = "PAID";
    component.applyFilters();

    expect(component.filteredBookshelves.length).toBe(1);
    expect(component.filteredBookshelves[0].id).toBe("BOOKSHELF-002");
  });

  it("should filter bookshelves by material", () => {
    component.bookshelves = mockBookshelfData;
    component.filterMaterial = "Bamboo";
    component.applyFilters();

    expect(component.filteredBookshelves.length).toBe(1);
    expect(component.filteredBookshelves[0].id).toBe("BOOKSHELF-001");
  });

  it("should open new bookshelf dialog", () => {
    spyOn(component.dialog, "open").and.returnValue({
      afterClosed: () =>
        of({
          id: "BOOKSHELF-003",
          name: "New Test Bookshelf",
          width: 70,
          height: 150,
          depth: 25,
          material: "Pine",
          price: 149.99,
        }),
    } as any);

    (bookshelfService.insertBookshelf as jasmine.Spy).and.returnValue(
      of({ success: true }),
    );

    component.openNewBookshelfDialog();

    expect(component.dialog.open).toHaveBeenCalled();
    expect(bookshelfService.insertBookshelf).toHaveBeenCalled();
  });

  it("should handle payment for a bookshelf", () => {
    const bookshelf = mockBookshelfData[0];

    (bookshelfService.payForBookshelf as jasmine.Spy).and.returnValue(
      of({ success: true }),
    );

    spyOn(component.snackBar, "open");

    component.payForBookshelf(bookshelf);

    expect(bookshelfService.payForBookshelf).toHaveBeenCalledWith({
      id: bookshelf.id,
      web3SigningCredential: jasmine.any(Object),
      value: jasmine.any(String),
    });

    expect(component.snackBar.open).toHaveBeenCalledWith(
      "Payment processed successfully for BOOKSHELF-001",
      "Close",
      jasmine.any(Object),
    );
  });

  it("should create shipment for a paid bookshelf", () => {
    const bookshelf = mockBookshelfData[1]; // PAID status

    spyOn(component.dialog, "open").and.returnValue({
      afterClosed: () =>
        of({
          carrier: "FastShip Inc.",
          shippingMethod: "Express",
          trackingNumber: "TRACK-54321",
        }),
    } as any);

    (shipmentService.insertShipment as jasmine.Spy).and.returnValue(
      of({ success: true }),
    );

    component.createShipment(bookshelf);

    expect(component.dialog.open).toHaveBeenCalled();
    expect(shipmentService.insertShipment).toHaveBeenCalled();
  });

  it("should handle product recall", () => {
    const bookshelf = mockBookshelfData[0];

    spyOn(component.dialog, "open").and.returnValue({
      afterClosed: () =>
        of({
          reason: "Defective material",
        }),
    } as any);

    (bookshelfService.recallBookshelf as jasmine.Spy).and.returnValue(
      of({ success: true }),
    );

    component.recallProduct(bookshelf);

    expect(component.dialog.open).toHaveBeenCalled();
    expect(bookshelfService.recallBookshelf).toHaveBeenCalledWith({
      id: bookshelf.id,
      reason: "Defective material",
      web3SigningCredential: jasmine.any(Object),
    });
  });

  it("should show shipment details for a bookshelf", () => {
    const bookshelf = mockBookshelfData[1]; // Has shipment

    spyOn(component.dialog, "open");

    component.viewShipmentDetails(bookshelf);

    // Should find the shipment for this bookshelf
    expect(component.dialog.open).toHaveBeenCalled();
    // The dialog should be opened with the shipment data
    expect(component.dialog.open).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          shipment: mockShipmentData[0],
        }),
      }),
    );
  });

  it("should update shipment status", () => {
    const shipment = mockShipmentData[0];
    const newStatus = "DELIVERED";

    (shipmentService.updateShipmentStatus as jasmine.Spy).and.returnValue(
      of({ success: true }),
    );

    spyOn(component.snackBar, "open");

    component.updateShipmentStatus(shipment, newStatus);

    expect(shipmentService.updateShipmentStatus).toHaveBeenCalledWith({
      id: shipment.id,
      status: newStatus,
    });

    expect(component.snackBar.open).toHaveBeenCalledWith(
      "Shipment status updated successfully to DELIVERED",
      "Close",
      jasmine.any(Object),
    );
  });

  it("should handle error when loading bookshelves", () => {
    (bookshelfService.getAllBookshelves as jasmine.Spy).and.returnValue(
      of({ success: false, error: "Failed to load bookshelves" }),
    );

    spyOn(component.snackBar, "open");

    component.loadBookshelves();

    expect(bookshelfService.getAllBookshelves).toHaveBeenCalled();
    expect(component.snackBar.open).toHaveBeenCalledWith(
      "Error loading bookshelves: Failed to load bookshelves",
      "Close",
      jasmine.any(Object),
    );
  });

  it("should sort bookshelves by price", () => {
    component.bookshelves = mockBookshelfData;
    component.filteredBookshelves = [...mockBookshelfData];

    // Sort by price ascending
    component.sortBy = "price";
    component.sortDirection = "asc";
    component.sortBookshelves();

    expect(component.filteredBookshelves[0].id).toBe("BOOKSHELF-001"); // 199.99
    expect(component.filteredBookshelves[1].id).toBe("BOOKSHELF-002"); // 299.99

    // Sort by price descending
    component.sortDirection = "desc";
    component.sortBookshelves();

    expect(component.filteredBookshelves[0].id).toBe("BOOKSHELF-002"); // 299.99
    expect(component.filteredBookshelves[1].id).toBe("BOOKSHELF-001"); // 199.99
  });
});
