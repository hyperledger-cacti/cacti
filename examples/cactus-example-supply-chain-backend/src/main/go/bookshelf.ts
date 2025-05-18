export const BOOKSHELF_CONTRACT_GO_SOURCE = `package main

import (
    "encoding/json"
    "fmt"
    "log"
    "strconv"
    "strings"
    "time"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func isNonBlank(str *string) bool {
    if str == nil {
        return false
    }
    return strings.TrimSpace(*str) != ""
}

type BookshelfChaincode struct {
    contractapi.Contract
}

// Basic Bookshelf record structure
type Bookshelf struct {
    ID            string \`json:"id"\`
    ShelfCount    string \`json:"shelfCount"\`
    BambooHarvestId string \`json:"bambooHarvestId"\`
}

// Enhanced Bookshelf with additional fields
type EnhancedBookshelf struct {
    ID              string \`json:"id"\`
    FabricProductID string \`json:"fabricProductId"\`
    Name            string \`json:"name"\`
    ShelfType       string \`json:"shelfType"\`
    Price           string \`json:"price"\`
    CreationDate    string \`json:"creationDate"\`
}

// Order represents a purchase order
type Order struct {
    OrderID     string \`json:"orderId"\`
    BookshelfID string \`json:"bookshelfId"\`
    Buyer       string \`json:"buyer"\`
    Amount      string \`json:"amount"\`
    Timestamp   string \`json:"timestamp"\`
}

func main() {
    chaincode, err := contractapi.NewChaincode(&BookshelfChaincode{})
    if err != nil {
        log.Panicf("Error creating bookshelf chaincode: %v", err)
    }

    if err := chaincode.Start(); err != nil {
        log.Panicf("Error starting bookshelf chaincode: %v", err)
    }
}

// InitLedger initializes the chaincode
func (t *BookshelfChaincode) InitLedger(ctx contractapi.TransactionContextInterface) error {
    log.Println("InitLedger ran for bookshelf chaincode")
    return nil
}

// GetAllRecords returns all bookshelf records
func (t *BookshelfChaincode) GetAllRecords(ctx contractapi.TransactionContextInterface) ([]Bookshelf, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get state by range: %v", err)
    }
    defer resultsIterator.Close()

    var records []Bookshelf
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        // Only include records with BS- prefix
        if strings.HasPrefix(queryResponse.Key, "BS-") {
            var record Bookshelf
            err = json.Unmarshal(queryResponse.Value, &record)
            if err != nil {
                return nil, err
            }
            records = append(records, record)
        }
    }
    
    return records, nil
}

// InsertRecord adds a basic bookshelf record
func (t *BookshelfChaincode) InsertRecord(ctx contractapi.TransactionContextInterface, 
    id string, shelfCount string, bambooHarvestId string) (string, error) {
    
    if !isNonBlank(&id) {
        return "", fmt.Errorf("ID cannot be empty")
    }
    
    recordKey := "BS-" + id
    
    // Check if already exists
    existing, err := ctx.GetStub().GetState(recordKey)
    if err != nil {
        return "", fmt.Errorf("failed to read from world state: %v", err)
    }
    if existing != nil {
        return "", fmt.Errorf("record %s already exists", id)
    }
    
    record := Bookshelf{
        ID:              id,
        ShelfCount:      shelfCount,
        BambooHarvestId: bambooHarvestId,
    }
    
    recordJSON, err := json.Marshal(record)
    if err != nil {
        return "", fmt.Errorf("failed to marshal record: %v", err)
    }
    
    err = ctx.GetStub().PutState(recordKey, recordJSON)
    if err != nil {
        return "", fmt.Errorf("failed to put state: %v", err)
    }
    
    return id, nil
}

// InsertEnhancedRecord adds an enhanced bookshelf record with private data
func (t *BookshelfChaincode) InsertEnhancedRecord(ctx contractapi.TransactionContextInterface, 
    id string, name string, shelfCount string, bambooHarvestId string, 
    width string, height string, depth string, material string, price string) (string, error) {
    
    if !isNonBlank(&id) {
        return "", fmt.Errorf("ID cannot be empty")
    }
    
    recordKey := "EBS-" + id
    
    // Check if already exists
    existing, err := ctx.GetStub().GetState(recordKey)
    if err != nil {
        return "", fmt.Errorf("failed to read from world state: %v", err)
    }
    if existing != nil {
        return "", fmt.Errorf("enhanced bookshelf record %s already exists", id)
    }
    
    // Create enhanced record with private data
    enhancedBookshelf := struct {
        ID             string \`json:"id"\`
        Name           string \`json:"name"\`
        ShelfCount     string \`json:"shelfCount"\`
        BambooHarvestId string \`json:"bambooHarvestId"\`
        Width          string \`json:"width"\`
        Height         string \`json:"height"\`
        Depth          string \`json:"depth"\`
        Material       string \`json:"material"\`
        Price          string \`json:"price"\`
    }{
        ID:             id,
        Name:           name,
        ShelfCount:     shelfCount,
        BambooHarvestId: bambooHarvestId,
        Width:          width,
        Height:         height,
        Depth:          depth,
        Material:       material,
        Price:          price,
    }
    
    recordJSON, err := json.Marshal(enhancedBookshelf)
    if err != nil {
        return "", fmt.Errorf("failed to marshal enhanced bookshelf: %v", err)
    }
    
    err = ctx.GetStub().PutState(recordKey, recordJSON)
    if err != nil {
        return "", fmt.Errorf("failed to put state: %v", err)
    }
    
    // Store index
    indexKey := "enhancedBookshelfIndex"
    var indexList []string
    
    indexData, err := ctx.GetStub().GetState(indexKey)
    if err != nil {
        return "", fmt.Errorf("failed to get index: %v", err)
    }
    
    if indexData != nil {
        err = json.Unmarshal(indexData, &indexList)
        if err != nil {
            return "", fmt.Errorf("failed to unmarshal index: %v", err)
        }
    }
    
    // Add to index if not already there
    found := false
    for _, existingId := range indexList {
        if existingId == id {
            found = true
            break
        }
    }
    
    if !found {
        indexList = append(indexList, id)
        indexJSON, err := json.Marshal(indexList)
        if err != nil {
            return "", fmt.Errorf("failed to marshal index: %v", err)
        }
        
        err = ctx.GetStub().PutState(indexKey, indexJSON)
        if err != nil {
            return "", fmt.Errorf("failed to update index: %v", err)
        }
    }
    
    return id, nil
}

// GetAllEnhancedRecords returns all enhanced bookshelf records
func (t *BookshelfChaincode) GetAllEnhancedRecords(ctx contractapi.TransactionContextInterface) ([]interface{}, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get state by range: %v", err)
    }
    defer resultsIterator.Close()

    var records []interface{}
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        // Only include records with EBS- prefix
        if strings.HasPrefix(queryResponse.Key, "EBS-") {
            var record map[string]interface{}
            err = json.Unmarshal(queryResponse.Value, &record)
            if err != nil {
                return nil, err
            }
            records = append(records, record)
        }
    }
    
    return records, nil
}

// PlaceOrder creates a new order for a bookshelf
func (t *BookshelfChaincode) PlaceOrder(ctx contractapi.TransactionContextInterface, 
    bookshelfId string, buyer string, amount string) (string, error) {
    
    if !isNonBlank(&bookshelfId) {
        return "", fmt.Errorf("bookshelf ID cannot be empty")
    }
    
    productKey := "EBS-" + bookshelfId
    
    // Get the product
    productJSON, err := ctx.GetStub().GetState(productKey)
    if err != nil {
        return "", fmt.Errorf("failed to read bookshelf: %v", err)
    }
    if productJSON == nil {
        return "", fmt.Errorf("bookshelf %s not found", bookshelfId)
    }
    
    var product map[string]interface{}
    err = json.Unmarshal(productJSON, &product)
    if err != nil {
        return "", fmt.Errorf("failed to unmarshal bookshelf: %v", err)
    }
    
    // Validate payment (simplified)
    priceStr, ok := product["price"].(string)
    if !ok {
        return "", fmt.Errorf("invalid price format")
    }
    
    priceFloat, err := strconv.ParseFloat(priceStr, 64)
    if err != nil {
        return "", fmt.Errorf("invalid price: %v", err)
    }
    
    amountFloat, err := strconv.ParseFloat(amount, 64)
    if err != nil {
        return "", fmt.Errorf("invalid amount: %v", err)
    }
    
    if amountFloat < priceFloat {
        return "", fmt.Errorf("insufficient payment: got %.2f, need %.2f", amountFloat, priceFloat)
    }
    
    // Generate order ID
    timestamp := time.Now().Unix()
    orderId := fmt.Sprintf("ORDER-SHELF-%d", timestamp)
    
    // Create order
    order := Order{
        OrderID:     orderId,
        BookshelfID: bookshelfId,
        Buyer:       buyer,
        Amount:      amount,
        Timestamp:   strconv.FormatInt(timestamp, 10),
    }
    
    // Save order
    orderJSON, err := json.Marshal(order)
    if err != nil {
        return "", fmt.Errorf("failed to marshal order: %v", err)
    }
    
    err = ctx.GetStub().PutState("BSO-"+orderId, orderJSON)
    if err != nil {
        return "", fmt.Errorf("failed to save order: %v", err)
    }
    
    // Update order index
    indexKey := "bookshelfOrderIndex"
    var indexList []string
    
    indexData, err := ctx.GetStub().GetState(indexKey)
    if err != nil {
        return "", fmt.Errorf("failed to get order index: %v", err)
    }
    
    if indexData != nil {
        err = json.Unmarshal(indexData, &indexList)
        if err != nil {
            return "", fmt.Errorf("failed to unmarshal order index: %v", err)
        }
    }
    
    // Add to index
    indexList = append(indexList, orderId)
    indexJSON, err := json.Marshal(indexList)
    if err != nil {
        return "", fmt.Errorf("failed to marshal order index: %v", err)
    }
    
    err = ctx.GetStub().PutState(indexKey, indexJSON)
    if err != nil {
        return "", fmt.Errorf("failed to update order index: %v", err)
    }
    
    return orderId, nil
}

// GetAllOrders returns all bookshelf orders
func (t *BookshelfChaincode) GetAllOrders(ctx contractapi.TransactionContextInterface) ([]Order, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get state by range: %v", err)
    }
    defer resultsIterator.Close()

    var orders []Order
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        // Only include records with BSO- prefix
        if strings.HasPrefix(queryResponse.Key, "BSO-") {
            var order Order
            err = json.Unmarshal(queryResponse.Value, &order)
            if err != nil {
                return nil, err
            }
            orders = append(orders, order)
        }
    }
    
    return orders, nil
}

// GetOrder retrieves a bookshelf order by ID
func (t *BookshelfChaincode) GetOrder(ctx contractapi.TransactionContextInterface, orderId string) (*Order, error) {
    if !isNonBlank(&orderId) {
        return nil, fmt.Errorf("order ID cannot be empty")
    }
    
    orderKey := "BSO-" + orderId
    orderJSON, err := ctx.GetStub().GetState(orderKey)
    if err != nil {
        return nil, fmt.Errorf("failed to read order: %v", err)
    }
    if orderJSON == nil {
        return nil, fmt.Errorf("order %s not found", orderId)
    }
    
    var order Order
    err = json.Unmarshal(orderJSON, &order)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal order: %v", err)
    }
    
    return &order, nil
}

// UpdateOrderStatus updates a bookshelf order's status
func (t *BookshelfChaincode) UpdateOrderStatus(ctx contractapi.TransactionContextInterface, orderId string, status string) error {
    if !isNonBlank(&orderId) {
        return fmt.Errorf("order ID cannot be empty")
    }
    
    orderKey := "BSO-" + orderId
    orderJSON, err := ctx.GetStub().GetState(orderKey)
    if err != nil {
        return fmt.Errorf("failed to read order: %v", err)
    }
    if orderJSON == nil {
        return fmt.Errorf("order %s not found", orderId)
    }
    
    // The UpdateOrderStatus function is no longer needed as status is removed
    // Just log that the function was called but is deprecated
    log.Printf("UpdateOrderStatus called for order %s but status functionality is removed", orderId)
    
    return nil
}

// Get a specific bookshelf product by ID
func (t *BookshelfChaincode) GetProduct(ctx contractapi.TransactionContextInterface, bookshelfId string) (*EnhancedBookshelf, error) {
    if !isNonBlank(&bookshelfId) {
        return nil, fmt.Errorf("ID cannot be empty")
    }
    
    productKey := "EBS-" + bookshelfId
    productJSON, err := ctx.GetStub().GetState(productKey)
    if err != nil {
        return nil, fmt.Errorf("failed to read product: %v", err)
    }
    if productJSON == nil {
        return nil, fmt.Errorf("bookshelf %s not found", bookshelfId)
    }
    
    var product EnhancedBookshelf
    err = json.Unmarshal(productJSON, &product)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal product: %v", err)
    }
    
    return &product, nil
}`;

const exportSourceToFs = async () => {
  const path = await import("path");
  const fs = await import("fs");
  const fileName = "./bookshelf.go";
  const scriptPath = path.join(__dirname, fileName);
  fs.writeFileSync(scriptPath, BOOKSHELF_CONTRACT_GO_SOURCE);
};

if (require.main === module) {
  exportSourceToFs();
}
