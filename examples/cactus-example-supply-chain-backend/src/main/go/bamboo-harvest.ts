export const BAMBOO_HARVEST_CONTRACT_GO_SOURCE = `package main

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

type BambooHarvestChaincode struct {
    contractapi.Contract
}

// Basic BambooHarvest record structure
type BambooHarvest struct {
    ID          string \`json:"id"\`
    Location    string \`json:"location"\`
    Acreage     string \`json:"acreage"\`
    BambooCount string \`json:"bambooCount"\`
    HarvestTime string \`json:"harvestTime"\`
}

// Enhanced BambooHarvest with additional fields
type EnhancedBambooHarvest struct {
    ID              string \`json:"id"\`
    FabricProductID string \`json:"fabricProductId"\`
    Location        string \`json:"location"\`
    Acreage         string \`json:"acreage"\`
    BambooCount     string \`json:"bambooCount"\`
    HarvestTime     string \`json:"harvestTime"\`
    Price           string \`json:"price"\`
}

// Order represents a purchase order
type Order struct {
    OrderID    string \`json:"orderId"\`
    ProductID  string \`json:"productId"\`
    Buyer      string \`json:"buyer"\`
    Amount     string \`json:"amount"\`
    Timestamp  string \`json:"timestamp"\`
}

func main() {
    chaincode, err := contractapi.NewChaincode(&BambooHarvestChaincode{})
    if err != nil {
        log.Panicf("Error creating bamboo harvest chaincode: %v", err)
    }

    if err := chaincode.Start(); err != nil {
        log.Panicf("Error starting bamboo harvest chaincode: %v", err)
    }
}

// InitLedger initializes the chaincode
func (t *BambooHarvestChaincode) InitLedger(ctx contractapi.TransactionContextInterface) error {
    log.Println("InitLedger ran for bamboo harvest chaincode")
    return nil
}

// getAllRecords returns all bamboo harvest records
func (t *BambooHarvestChaincode) GetAllRecords(ctx contractapi.TransactionContextInterface) ([]BambooHarvest, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get state by range: %v", err)
    }
    defer resultsIterator.Close()

    var records []BambooHarvest
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        // Only include records with BH- prefix
        if strings.HasPrefix(queryResponse.Key, "BH-") {
            var record BambooHarvest
            err = json.Unmarshal(queryResponse.Value, &record)
            if err != nil {
                return nil, err
            }
            records = append(records, record)
        }
    }
    
    return records, nil
}

// insertRecord adds a basic bamboo harvest record
func (t *BambooHarvestChaincode) InsertRecord(ctx contractapi.TransactionContextInterface, 
    id string, location string, acreage string, bambooCount string, harvestTime string) (string, error) {
    
    if !isNonBlank(&id) {
        return "", fmt.Errorf("ID cannot be empty")
    }
    
    recordKey := "BH-" + id
    
    // Check if already exists
    existing, err := ctx.GetStub().GetState(recordKey)
    if err != nil {
        return "", fmt.Errorf("failed to read from world state: %v", err)
    }
    if existing != nil {
        return "", fmt.Errorf("record %s already exists", id)
    }
    
    record := BambooHarvest{
        ID:          id,
        Location:    location,
        Acreage:     acreage,
        BambooCount: bambooCount,
        HarvestTime: harvestTime,
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

// InsertEnhancedRecord adds an enhanced bamboo harvest record with product reference
func (t *BambooHarvestChaincode) InsertEnhancedRecord(ctx contractapi.TransactionContextInterface, 
    id string, fabricProductId string, location string, acreage string, 
    bambooCount string, harvestTime string, price string) (string, error) {
    
    if !isNonBlank(&id) {
        return "", fmt.Errorf("ID cannot be empty")
    }
    
    recordKey := "EBH-" + id
    
    // Check if already exists
    existing, err := ctx.GetStub().GetState(recordKey)
    if err != nil {
        return "", fmt.Errorf("failed to read from world state: %v", err)
    }
    if existing != nil {
        return "", fmt.Errorf("enhanced record %s already exists", id)
    }
    
    record := EnhancedBambooHarvest{
        ID:              id,
        FabricProductID: fabricProductId,
        Location:        location,
        Acreage:         acreage,
        BambooCount:     bambooCount,
        HarvestTime:     harvestTime,
        Price:           price,
    }
    
    recordJSON, err := json.Marshal(record)
    if err != nil {
        return "", fmt.Errorf("failed to marshal enhanced record: %v", err)
    }
    
    err = ctx.GetStub().PutState(recordKey, recordJSON)
    if err != nil {
        return "", fmt.Errorf("failed to put state: %v", err)
    }
    
    // Store index
    indexKey := "enhancedIndex"
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

// GetAllEnhancedRecords returns all enhanced bamboo harvests
func (t *BambooHarvestChaincode) GetAllEnhancedRecords(ctx contractapi.TransactionContextInterface) ([]EnhancedBambooHarvest, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get state by range: %v", err)
    }
    defer resultsIterator.Close()

    var records []EnhancedBambooHarvest
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        // Only include records with EBH- prefix
        if strings.HasPrefix(queryResponse.Key, "EBH-") {
            var record EnhancedBambooHarvest
            err = json.Unmarshal(queryResponse.Value, &record)
            if err != nil {
                return nil, err
            }
            records = append(records, record)
        }
    }
    
    return records, nil
}

// PlaceOrder creates a new order for a bamboo harvest
func (t *BambooHarvestChaincode) PlaceOrder(ctx contractapi.TransactionContextInterface, 
    productId string, buyer string, amount string) (string, error) {
    
    if !isNonBlank(&productId) {
        return "", fmt.Errorf("product ID cannot be empty")
    }
    
    productKey := "EBH-" + productId
    
    // Get the product
    productJSON, err := ctx.GetStub().GetState(productKey)
    if err != nil {
        return "", fmt.Errorf("failed to read product: %v", err)
    }
    if productJSON == nil {
        return "", fmt.Errorf("product %s not found", productId)
    }
    
    var product map[string]interface{}
    err = json.Unmarshal(productJSON, &product)
    if err != nil {
        return "", fmt.Errorf("failed to unmarshal product: %v", err)
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
    orderId := fmt.Sprintf("ORDER-%d", timestamp)
    
    // Create order
    order := Order{
        OrderID:    orderId,
        ProductID:  productId,
        Buyer:      buyer,
        Amount:     amount,
        Timestamp:  strconv.FormatInt(timestamp, 10),
    }
    
    // Save order
    orderJSON, err := json.Marshal(order)
    if err != nil {
        return "", fmt.Errorf("failed to marshal order: %v", err)
    }
    
    err = ctx.GetStub().PutState("ORD-"+orderId, orderJSON)
    if err != nil {
        return "", fmt.Errorf("failed to save order: %v", err)
    }
    
    return orderId, nil
}

// GetAllOrders returns all orders
func (t *BambooHarvestChaincode) GetAllOrders(ctx contractapi.TransactionContextInterface) ([]Order, error) {
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

        // Only include records with ORD- prefix
        if strings.HasPrefix(queryResponse.Key, "ORD-") {
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

// GetOrder retrieves an order by ID
func (t *BambooHarvestChaincode) GetOrder(ctx contractapi.TransactionContextInterface, orderId string) (*Order, error) {
    if !isNonBlank(&orderId) {
        return nil, fmt.Errorf("order ID cannot be empty")
    }
    
    orderKey := "ORD-" + orderId
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

// DeleteBambooHarvest deletes a bamboo harvest record from the ledger
func (t *BambooHarvestChaincode) DeleteBambooHarvest(ctx contractapi.TransactionContextInterface, harvestId string) error {
    if !isNonBlank(&harvestId) {
        return fmt.Errorf("harvest ID cannot be empty")
    }
    
    // Check both basic and enhanced record keys
    basicKey := "BH-" + harvestId
    enhancedKey := "EBH-" + harvestId
    
    // Check if the basic record exists
    basicRecordJSON, err := ctx.GetStub().GetState(basicKey)
    if err != nil {
        return fmt.Errorf("failed to read basic record: %v", err)
    }
    
    // Check if the enhanced record exists
    enhancedRecordJSON, err := ctx.GetStub().GetState(enhancedKey)
    if err != nil {
        return fmt.Errorf("failed to read enhanced record: %v", err)
    }
    
    // If neither record exists, return an error
    if basicRecordJSON == nil && enhancedRecordJSON == nil {
        return fmt.Errorf("bamboo harvest with ID %s does not exist", harvestId)
    }
    
    // Create event for transaction tracking
    deleteEvent := struct {
        HarvestID  string \`json:"harvestId"\`
        Action     string \`json:"action"\`
        Timestamp  string \`json:"timestamp"\`
    }{
        HarvestID:  harvestId,
        Action:     "DELETED",
        Timestamp:  strconv.FormatInt(time.Now().Unix(), 10),
    }
    
    // Marshal and emit the event
    deleteEventJSON, err := json.Marshal(deleteEvent)
    if err != nil {
        return fmt.Errorf("failed to marshal delete event: %v", err)
    }
    
    err = ctx.GetStub().SetEvent("BambooHarvestDeleted", deleteEventJSON)
    if err != nil {
        return fmt.Errorf("failed to emit delete event: %v", err)
    }
    
    // Delete the records if they exist
    if basicRecordJSON != nil {
        err = ctx.GetStub().DelState(basicKey)
        if err != nil {
            return fmt.Errorf("failed to delete basic record: %v", err)
        }
    }
    
    if enhancedRecordJSON != nil {
        err = ctx.GetStub().DelState(enhancedKey)
        if err != nil {
            return fmt.Errorf("failed to delete enhanced record: %v", err)
        }
        
        // Remove from enhanced index
        indexKey := "enhancedIndex"
        var indexList []string
        
        indexData, err := ctx.GetStub().GetState(indexKey)
        if err != nil {
            return fmt.Errorf("failed to get index: %v", err)
        }
        
        if indexData != nil {
            err = json.Unmarshal(indexData, &indexList)
            if err != nil {
                return fmt.Errorf("failed to unmarshal index: %v", err)
            }
            
            // Filter out the deleted ID
            var updatedIndex []string
            for _, existingId := range indexList {
                if existingId != harvestId {
                    updatedIndex = append(updatedIndex, existingId)
                }
            }
            
            // Update the index
            if len(updatedIndex) != len(indexList) {
                indexJSON, err := json.Marshal(updatedIndex)
                if err != nil {
                    return fmt.Errorf("failed to marshal updated index: %v", err)
                }
                
                err = ctx.GetStub().PutState(indexKey, indexJSON)
                if err != nil {
                    return fmt.Errorf("failed to update index: %v", err)
                }
            }
        }
    }
    
    return nil
}
`;

const exportSourceToFs = async () => {
  const path = await import("path");
  const fs = await import("fs");
  const fileName = "./bamboo-harvest.go";
  const scriptPath = path.join(__dirname, fileName);
  fs.writeFileSync(scriptPath, BAMBOO_HARVEST_CONTRACT_GO_SOURCE);
};

if (require.main === module) {
  exportSourceToFs();
}
