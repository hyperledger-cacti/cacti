export const MANUFACTURER_DATA_CONTRACT_GO_SOURCE = `package main

import (
    "encoding/json"
    "fmt"
    "log"
    "strings"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func isNonBlank(str *string) bool {
    if str == nil {
        return false
    }
    return strings.TrimSpace(*str) != ""
}

type ManufacturerDataChaincode struct {
    contractapi.Contract
}

// Define private data collection
const manufacturerPrivateDataCollection = "manufacturerPrivateData"

// Define the ManufacturerData struct for enhanced records
type ManufacturerData struct {
    ID              string \`json:"id"\`
    Name            string \`json:"name"\`
    CostPrice       string \`json:"costPrice"\`
    Inventory       string \`json:"inventory"\`
    SupplierInfo    string \`json:"supplierInfo"\`
    ShippingAddress string \`json:"shippingAddress"\`
    CustomerContact string \`json:"customerContact"\`
    PrivateNotes    string \`json:"privateNotes,omitempty"\`
}

// Define what data should be private
type PrivateProductData struct {
    CostPrice    string \`json:"costPrice"\`    // Manufacturing cost
    Inventory    string \`json:"inventory"\`    // Current stock
    SupplierInfo string \`json:"supplierInfo"\` // Supplier details
}

// Define what data should be public
type PublicProductData struct {
    Id              string \`json:"id"\`
    Name            string \`json:"name"\`
    PublicPrice     string \`json:"publicPrice"\`     // Price shown to consumers
    ShippingAddress string \`json:"shippingAddress"\` // Customer shipping address
    CustomerContact string \`json:"customerContact"\` // Customer contact info
    ShipmentId      string \`json:"shipmentId"\`      // For backward compatibility
    PublicProductId string \`json:"publicProductId"\` // Reference to public chain product
    PublicChain     string \`json:"publicChain"\`     // "bamboo" or "bookshelf"
    Origin          string \`json:"origin"\`          // Product origin
}

type ProductData struct {
    Id              string \`json:"id"\`
    Name            string \`json:"name"\`
    CostPrice       string \`json:"costPrice"\`       // PRIVATE: Manufacturing cost
    PublicPrice     string \`json:"publicPrice"\`     // Price shown to consumers
    Inventory       string \`json:"inventory"\`       // PRIVATE: Current stock
    SupplierInfo    string \`json:"supplierInfo"\`    // PRIVATE: Supplier details
    ShippingAddress string \`json:"shippingAddress"\` // Customer shipping address
    CustomerContact string \`json:"customerContact"\` // Customer contact info
    ShipmentId      string \`json:"shipmentId"\`      // For backward compatibility
    PublicProductId string \`json:"publicProductId"\` // Reference to public chain product
    PublicChain     string \`json:"publicChain"\`     // "bamboo" or "bookshelf"
    Origin          string \`json:"origin"\`          // Product origin
}

type OrderData struct {
    OrderId         string \`json:"orderId"\`
    ShippingAddress string \`json:"shippingAddress"\`
    CustomerContact string \`json:"customerContact"\`
    ProductId       string \`json:"productId"\`       // Reference to product
    PublicOrderId   string \`json:"publicOrderId"\`   // Reference to public chain order
    Status          string \`json:"status"\`          // Order status
}

func main() {
    manufacturerChaincode, err := contractapi.NewChaincode(&ManufacturerDataChaincode{})
    if err != nil {
        log.Panicf("Error creating manufacturer data chaincode: %v", err)
    }

    if err := manufacturerChaincode.Start(); err != nil {
        log.Panicf("Error starting manufacturer data chaincode: %v", err)
    }
}

func (t *ManufacturerDataChaincode) InitLedger(ctx contractapi.TransactionContextInterface) error {
    log.Println("InitLedger ran for manufacturer data chaincode")
    return nil
}

// Existing function - preserved for backward compatibility
func (t *ManufacturerDataChaincode) StoreProductData(ctx contractapi.TransactionContextInterface, productId string, name string, costPrice string, inventory string, supplierInfo string, shippingAddress string, customerContact string) (string, error) {
    if !isNonBlank(&productId) {
        return "E_PRODUCT_ID_BLANK", fmt.Errorf("Incorrect arguments. Expecting a product ID as a non-blank string.")
    }

    var newProduct ProductData
    newProduct.Id = productId
    newProduct.Name = name
    newProduct.CostPrice = costPrice
    newProduct.Inventory = inventory
    newProduct.SupplierInfo = supplierInfo
    newProduct.ShippingAddress = shippingAddress
    newProduct.CustomerContact = customerContact
    newProduct.ShipmentId = ""
    newProduct.PublicProductId = ""
    newProduct.PublicChain = ""
    newProduct.Origin = ""
    newProduct.PublicPrice = ""

    newProductJSON, err := json.Marshal(newProduct)
    if err != nil {
        return "OP_FAILED", fmt.Errorf("Failed to JSON marshal new product data: %v", err)
    }

    stub := ctx.GetStub()

    err2 := stub.PutState(productId, newProductJSON)
    if err2 != nil {
        return "E_PUT_STATE_FAIL", fmt.Errorf("Failed to insert new product to ledger state: %v --- %v", newProductJSON, err2)
    }

    return productId, nil
}

// Modify StoreCompleteProductData to use private data collection
func (t *ManufacturerDataChaincode) StoreCompleteProductData(ctx contractapi.TransactionContextInterface, 
    productId string, name string, costPrice string, publicPrice string,
    inventory string, supplierInfo string, origin string) (string, error) {
    
    if !isNonBlank(&productId) {
        return "E_PRODUCT_ID_BLANK", fmt.Errorf("Product ID cannot be empty")
    }
    
    // Create public data
    publicData := PublicProductData{
        Id:          productId,
        Name:        name,
        PublicPrice: publicPrice,
        Origin:      origin,
    }
    
    // Create private data
    privateData := PrivateProductData{
        CostPrice:    costPrice,
        Inventory:    inventory,
        SupplierInfo: supplierInfo,
    }
    
    // Store public data in world state
    publicDataJSON, err := json.Marshal(publicData)
    if err != nil {
        return "OP_FAILED", fmt.Errorf("Failed to marshal public data: %v", err)
    }
    
    err = ctx.GetStub().PutState(productId, publicDataJSON)
    if err != nil {
        return "E_PUT_STATE_FAIL", fmt.Errorf("Failed to store public data: %v", err)
    }
    
    // Store private data in private collection
    privateDataJSON, err := json.Marshal(privateData)
    if err != nil {
        return "OP_FAILED", fmt.Errorf("Failed to marshal private data: %v", err)
    }
    
    err = ctx.GetStub().PutPrivateData(manufacturerPrivateDataCollection, productId, privateDataJSON)
    if err != nil {
        return "E_PUT_PRIVATE_DATA_FAIL", fmt.Errorf("Failed to store private data: %v", err)
    }
    
    return productId, nil
}

// New function - Link to public chain product
func (t *ManufacturerDataChaincode) LinkToPublicProduct(ctx contractapi.TransactionContextInterface, 
    privateProductId string, publicProductId string, publicChain string) (string, error) {
    
    productJSON, err := ctx.GetStub().GetState(privateProductId)
    if err != nil {
        return "E_GET_STATE_FAIL", fmt.Errorf("Failed to read product: %v", err)
    }
    if productJSON == nil {
        return "E_PRODUCT_NOT_FOUND", fmt.Errorf("Product not found with ID: %s", privateProductId)
    }
    
    var product ProductData
    err = json.Unmarshal(productJSON, &product)
    if err != nil {
        return "E_UNMARSHAL_FAIL", fmt.Errorf("Failed to unmarshal product: %v", err)
    }
    
    // Update links to public chain
    product.PublicProductId = publicProductId
    product.PublicChain = publicChain
    
    updatedJSON, err := json.Marshal(product)
    if err != nil {
        return "E_MARSHAL_FAIL", fmt.Errorf("Failed to marshal updated product: %v", err)
    }
    
    err = ctx.GetStub().PutState(privateProductId, updatedJSON)
    if err != nil {
        return "E_PUT_STATE_FAIL", fmt.Errorf("Failed to update product: %v", err)
    }
    
    return privateProductId, nil
}

// New function - Update order details
func (t *ManufacturerDataChaincode) UpdateOrderDetails(ctx contractapi.TransactionContextInterface,
    productId string, publicOrderId string, customerAddress string, customerContact string) (string, error) {
    
    productJSON, err := ctx.GetStub().GetState(productId)
    if err != nil {
        return "E_GET_STATE_FAIL", fmt.Errorf("Failed to read product: %v", err)
    }
    if productJSON == nil {
        return "E_PRODUCT_NOT_FOUND", fmt.Errorf("Product not found with ID: %s", productId)
    }
    
    var product ProductData
    err = json.Unmarshal(productJSON, &product)
    if err != nil {
        return "E_UNMARSHAL_FAIL", fmt.Errorf("Failed to unmarshal product: %v", err)
    }
    
    // Update customer information
    product.ShippingAddress = customerAddress
    product.CustomerContact = customerContact
    
    // Create order record
    orderId := publicOrderId
    order := OrderData{
        OrderId: orderId,
        ShippingAddress: customerAddress,
        CustomerContact: customerContact,
        ProductId: productId,
        PublicOrderId: publicOrderId,
        Status: "PROCESSING",
    }
    
    // Save order
    orderJSON, err := json.Marshal(order)
    if err != nil {
        return "E_MARSHAL_FAIL", fmt.Errorf("Failed to marshal order data: %v", err)
    }
    
    err = ctx.GetStub().PutState(orderId, orderJSON)
    if err != nil {
        return "E_PUT_STATE_FAIL", fmt.Errorf("Failed to store order: %v", err)
    }
    
    // Save updated product
    updatedProductJSON, err := json.Marshal(product)
    if err != nil {
        return "E_MARSHAL_FAIL", fmt.Errorf("Failed to marshal updated product: %v", err)
    }
    
    err = ctx.GetStub().PutState(productId, updatedProductJSON)
    if err != nil {
        return "E_PUT_STATE_FAIL", fmt.Errorf("Failed to update product: %v", err)
    }
    
    return orderId, nil
}

func (t *ManufacturerDataChaincode) GetAllProducts(ctx contractapi.TransactionContextInterface) ([]ProductData, error) {
    stub := ctx.GetStub()

    resultsIterator, _, err := stub.GetStateByRangeWithPagination("", "", 25, "")
    if err != nil {
        return nil, fmt.Errorf("Error in GetAllProducts: %v", err)
    }
    defer resultsIterator.Close()

    var products []ProductData

    for resultsIterator.HasNext() {
        response, err := resultsIterator.Next()
        if err != nil {
            return nil, fmt.Errorf("Error in product result iterator: %v", err)
        }

        var aux ProductData
        if err := json.Unmarshal(response.Value, &aux); err != nil {
            return nil, fmt.Errorf("Error un-marshalling product: %v", err)
        }

        products = append(products, aux)
    }

    return products, nil
}

func (t *ManufacturerDataChaincode) StoreOrderData(ctx contractapi.TransactionContextInterface, orderId string, shippingAddress string, customerContact string) (string, error) {
    if !isNonBlank(&orderId) {
        return "", fmt.Errorf("Order ID cannot be empty")
    }

    data := OrderData{
        OrderId: orderId,
        ShippingAddress: shippingAddress,
        CustomerContact: customerContact,
        ProductId: "",
        PublicOrderId: "",
        Status: "PROCESSING",
    }

    dataJSON, err := json.Marshal(data)
    if err != nil {
        return "", fmt.Errorf("Failed to marshal order data: %v", err)
    }

    err = ctx.GetStub().PutState(orderId, dataJSON)
    if err != nil {
        return "", fmt.Errorf("Failed to store order data: %v", err)
    }

    return orderId, nil
}

func (t *ManufacturerDataChaincode) GetProductData(ctx contractapi.TransactionContextInterface, productId string) (*ProductData, error) {
    if !isNonBlank(&productId) {
        return nil, fmt.Errorf("Product ID cannot be empty")
    }

    dataJSON, err := ctx.GetStub().GetState(productId)
    if err != nil {
        return nil, fmt.Errorf("Failed to read product data: %v", err)
    }
    if dataJSON == nil {
        return nil, fmt.Errorf("Product data not found for ID: %s", productId)
    }

    var data ProductData
    err = json.Unmarshal(dataJSON, &data)
    if err != nil {
        return nil, fmt.Errorf("Failed to unmarshal product data: %v", err)
    }

    return &data, nil
}

func (t *ManufacturerDataChaincode) GetOrderData(ctx contractapi.TransactionContextInterface, orderId string) (*OrderData, error) {
    if !isNonBlank(&orderId) {
        return nil, fmt.Errorf("Order ID cannot be empty")
    }

    dataJSON, err := ctx.GetStub().GetState(orderId)
    if err != nil {
        return nil, fmt.Errorf("Failed to read order data: %v", err)
    }
    if dataJSON == nil {
        return nil, fmt.Errorf("Order data not found for ID: %s", orderId)
    }

    var data OrderData
    err = json.Unmarshal(dataJSON, &data)
    if err != nil {
        return nil, fmt.Errorf("Failed to unmarshal order data: %v", err)
    }

    return &data, nil
}

func (t *ManufacturerDataChaincode) AssignShipment(ctx contractapi.TransactionContextInterface, productId string, shipmentId string) error {
    if !isNonBlank(&productId) {
        return fmt.Errorf("Product ID cannot be empty")
    }
    if !isNonBlank(&shipmentId) {
        return fmt.Errorf("Shipment ID cannot be empty")
    }

    // Get the current product data
    productJSON, err := ctx.GetStub().GetState(productId)
    if err != nil {
        return fmt.Errorf("Failed to read product data: %v", err)
    }
    if productJSON == nil {
        return fmt.Errorf("Product not found with ID: %s", productId)
    }

    var product ProductData
    err = json.Unmarshal(productJSON, &product)
    if err != nil {
        return fmt.Errorf("Failed to unmarshal product data: %v", err)
    }

    // Update the shipment ID
    product.ShipmentId = shipmentId

    // Save the updated product
    updatedProductJSON, err := json.Marshal(product)
    if err != nil {
        return fmt.Errorf("Failed to marshal updated product data: %v", err)
    }

    err = ctx.GetStub().PutState(productId, updatedProductJSON)
    if err != nil {
        return fmt.Errorf("Failed to update product with shipment ID: %v", err)
    }

    return nil
}

// Add function to get private data (only accessible by Org1)
func (t *ManufacturerDataChaincode) GetPrivateProductData(ctx contractapi.TransactionContextInterface, productId string) (*PrivateProductData, error) {
    if !isNonBlank(&productId) {
        return nil, fmt.Errorf("Product ID cannot be empty")
    }

    // Get private data from collection
    privateDataJSON, err := ctx.GetStub().GetPrivateData(manufacturerPrivateDataCollection, productId)
    if err != nil {
        return nil, fmt.Errorf("Failed to read private data: %v", err)
    }
    if privateDataJSON == nil {
        return nil, fmt.Errorf("Private data not found for ID: %s", productId)
    }

    var privateData PrivateProductData
    err = json.Unmarshal(privateDataJSON, &privateData)
    if err != nil {
        return nil, fmt.Errorf("Failed to unmarshal private data: %v", err)
    }

    return &privateData, nil
}

// GetAllEnhancedProducts returns all product data records with enhanced private information
func (s *ManufacturerDataChaincode) GetAllEnhancedProducts(ctx contractapi.TransactionContextInterface) ([]*ManufacturerData, error) {
    // Return all products with enhanced data (for manufacturers only)
    // Range query with empty string for startKey and endKey does an open-ended query of all products in the chaincode namespace.
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get all products: %v", err)
    }
    defer resultsIterator.Close()

    var products []*ManufacturerData
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, fmt.Errorf("failed to get next product: %v", err)
        }

        // Check if this is a product (starts with PRODUCT-)
        if strings.HasPrefix(queryResponse.Key, "PRODUCT-") || !strings.HasPrefix(queryResponse.Key, "ORDER-") {
            var product ManufacturerData
            if err := json.Unmarshal(queryResponse.Value, &product); err != nil {
                return nil, fmt.Errorf("failed to unmarshal product: %v", err)
            }

            // Try to get private data
            privateKey := fmt.Sprintf("PRIVATE-%s", product.ID)
            privateData, err := ctx.GetStub().GetPrivateData(manufacturerPrivateDataCollection, privateKey)
            if err == nil && privateData != nil {
                var pvtData PrivateProductData
                if err := json.Unmarshal(privateData, &pvtData); err == nil {
                    // Enhance the product with private data
                    product.CostPrice = pvtData.CostPrice
                    product.Inventory = pvtData.Inventory
                    product.SupplierInfo = pvtData.SupplierInfo
                }
            }
            
            // IMPORTANT: Always ensure the privateNotes field is set
            if product.PrivateNotes == "" {
                product.PrivateNotes = fmt.Sprintf("Private manufacturer information for %s. Cost: %s, Inventory: %s", 
                                           product.ID, product.CostPrice, product.Inventory)
            }

            products = append(products, &product)
        }
    }

    return products, nil
}

// StorePublicProductData stores the basic public product data
func (t *ManufacturerDataChaincode) StorePublicProductData(ctx contractapi.TransactionContextInterface, 
    id string, name string, inventory string) error {
    
    if !isNonBlank(&id) {
        return fmt.Errorf("product ID cannot be empty")
    }
    
    productKey := "PRODUCT-" + id
    
    // Check if already exists
    existing, err := ctx.GetStub().GetState(productKey)
    if err != nil {
        return fmt.Errorf("failed to read from world state: %v", err)
    }
    if existing != nil {
        return fmt.Errorf("product %s already exists", id)
    }
    
    // Create a public version with limited data
    publicProduct := ManufacturerData{
        ID:              id,
        Name:            name,
        Inventory:       inventory,
        CostPrice:       "0", // Hide actual cost price in public data
        SupplierInfo:    "Contact manufacturer for details",
        ShippingAddress: "Contact manufacturer for details", 
        CustomerContact: "Contact manufacturer for details",
    }
    
    productJSON, err := json.Marshal(publicProduct)
    if err != nil {
        return fmt.Errorf("failed to marshal product: %v", err)
    }
    
    err = ctx.GetStub().PutState(productKey, productJSON)
    if err != nil {
        return fmt.Errorf("failed to put state: %v", err)
    }
    
    return nil
}
`;

const exportSourceToFs = async () => {
  const path = await import("path");
  const fs = await import("fs");
  const fileName = "./manufacturer-data.go";
  const scriptPath = path.join(__dirname, fileName);
  fs.writeFileSync(scriptPath, MANUFACTURER_DATA_CONTRACT_GO_SOURCE);
};

if (require.main === module) {
  exportSourceToFs();
}
