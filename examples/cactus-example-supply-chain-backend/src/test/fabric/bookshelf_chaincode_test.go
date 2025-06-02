package bookshelf_chaincode_test

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"
)

// BookshelfContract represents the chaincode implementation
type BookshelfContract struct {
	// contractapi.Contract - commenting out to avoid import errors
}

// Bookshelf represents a bookshelf in the supply chain
type Bookshelf struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Width        float64 `json:"width"`
	Height       float64 `json:"height"`
	Depth        float64 `json:"depth"`
	Material     string  `json:"material"`
	Manufacturer string  `json:"manufacturer"`
	Price        float64 `json:"price"`
	Status       string  `json:"status"`
}

// LocalMockStub mocks the chaincode stub interface
type LocalMockStub struct {
	state                map[string][]byte
	bookshelvesByMaterial map[string][]string
}

// NewLocalMockStub creates a new LocalMockStub instance
func NewLocalMockStub() *LocalMockStub {
	return &LocalMockStub{
		state:                make(map[string][]byte),
		bookshelvesByMaterial: make(map[string][]string),
	}
}

// MockInit mocks the Init method
func (s *LocalMockStub) MockInit(txID string, args [][]byte) MockResponse {
	return MockResponse{
		Status:  200,
		Message: "Initialization successful",
	}
}

// MockInvoke mocks the Invoke method
func (s *LocalMockStub) MockInvoke(txID string, args [][]byte) MockResponse {
	if len(args) == 0 {
		return MockResponse{
			Status:  500,
			Message: "No function specified",
		}
	}

	function := string(args[0])
	params := args[1:]

	switch function {
	case "InsertBookshelf":
		return s.insertBookshelf(params)
	case "GetBookshelf":
		return s.getBookshelf(params)
	case "UpdateBookshelfStatus":
		return s.updateBookshelfStatus(params)
	case "GetAllBookshelves":
		return s.getAllBookshelves()
	default:
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Unknown function: %s", function),
		}
	}
}

// MockResponse represents a chaincode response
type MockResponse struct {
	Status  int32
	Message string
	Payload []byte
}

// PutState mocks the PutState method
func (s *LocalMockStub) PutState(key string, value []byte) error {
	s.state[key] = value
	return nil
}

// GetState mocks the GetState method
func (s *LocalMockStub) GetState(key string) ([]byte, error) {
	value, exists := s.state[key]
	if !exists {
		return nil, nil
	}
	return value, nil
}

// insertBookshelf handles InsertBookshelf function
func (s *LocalMockStub) insertBookshelf(args [][]byte) MockResponse {
	if len(args) != 1 {
		return MockResponse{
			Status:  500,
			Message: "Incorrect number of arguments. Expecting 1",
		}
	}
	
	var bookshelf Bookshelf
	err := json.Unmarshal(args[0], &bookshelf)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to unmarshal bookshelf: %s", err.Error()),
		}
	}
	
	bookshelfBytes, err := json.Marshal(bookshelf)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to marshal bookshelf: %s", err.Error()),
		}
	}
	
	err = s.PutState(bookshelf.ID, bookshelfBytes)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to store bookshelf: %s", err.Error()),
		}
	}
	
	// Add to material mapping
	if bookshelf.Material != "" {
		s.bookshelvesByMaterial[bookshelf.Material] = append(
			s.bookshelvesByMaterial[bookshelf.Material],
			bookshelf.ID,
		)
	}
	
	return MockResponse{
		Status:  200,
		Message: "Bookshelf inserted successfully",
	}
}

// getBookshelf handles GetBookshelf function
func (s *LocalMockStub) getBookshelf(args [][]byte) MockResponse {
	if len(args) != 1 {
		return MockResponse{
			Status:  500,
			Message: "Incorrect number of arguments. Expecting 1",
		}
	}
	
	bookshelfID := string(args[0])
	
	bookshelfBytes, err := s.GetState(bookshelfID)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to get bookshelf: %s", err.Error()),
		}
	}
	if bookshelfBytes == nil {
		return MockResponse{
			Status:  404,
			Message: fmt.Sprintf("Bookshelf not found: %s", bookshelfID),
		}
	}
	
	return MockResponse{
		Status:  200,
		Payload: bookshelfBytes,
	}
}

// getAllBookshelves handles GetAllBookshelves function
func (s *LocalMockStub) getAllBookshelves() MockResponse {
	// For a real implementation, we would use GetStateByRange
	// Here we just return all entries in our map that are bookshelves
	
	bookshelves := []Bookshelf{}
	
	for _, stateBytes := range s.state {
		var bookshelf Bookshelf
		err := json.Unmarshal(stateBytes, &bookshelf)
		if err == nil && bookshelf.ID != "" {
			bookshelves = append(bookshelves, bookshelf)
		}
	}
	
	bookshelvesBytes, err := json.Marshal(bookshelves)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to marshal bookshelves: %s", err.Error()),
		}
	}
	
	return MockResponse{
		Status:  200,
		Payload: bookshelvesBytes,
	}
}

// updateBookshelfStatus handles UpdateBookshelfStatus function
func (s *LocalMockStub) updateBookshelfStatus(args [][]byte) MockResponse {
	if len(args) != 2 {
		return MockResponse{
			Status:  500,
			Message: "Incorrect number of arguments. Expecting 2",
		}
	}
	
	bookshelfID := string(args[0])
	newStatus := string(args[1])
	
	bookshelfBytes, err := s.GetState(bookshelfID)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to get bookshelf: %s", err.Error()),
		}
	}
	if bookshelfBytes == nil {
		return MockResponse{
			Status:  404,
			Message: fmt.Sprintf("Bookshelf not found: %s", bookshelfID),
		}
	}
	
	var bookshelf Bookshelf
	err = json.Unmarshal(bookshelfBytes, &bookshelf)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to unmarshal bookshelf: %s", err.Error()),
		}
	}
	
	// Update status
	bookshelf.Status = newStatus
	
	// Store updated bookshelf
	updatedBookshelfBytes, err := json.Marshal(bookshelf)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to marshal updated bookshelf: %s", err.Error()),
		}
	}
	
	err = s.PutState(bookshelfID, updatedBookshelfBytes)
	if err != nil {
		return MockResponse{
			Status:  500,
			Message: fmt.Sprintf("Failed to store updated bookshelf: %s", err.Error()),
		}
	}
	
	return MockResponse{
		Status:  200,
		Message: "Bookshelf status updated successfully",
	}
}

// TestBookshelfChaincode tests the bookshelf chaincode functions
func TestBookshelfChaincode(t *testing.T) {
	// Setup mock chaincode
	stub := NewLocalMockStub()

	// Set the client identity
	stub.MockInit("1", [][]byte{[]byte("init")})

	// Test 1: Insert a bookshelf
	t.Run("Insert Bookshelf", func(t *testing.T) {
		bookshelf := Bookshelf{
			ID:           "bookshelf-001",
			Name:         "Modern Bamboo Shelf",
			Width:        80.0,
			Height:       120.0,
			Depth:        30.0,
			Material:     "Bamboo",
			Manufacturer: "org1MSP.manufacturer1",
			Price:        0.5,
			Status:       "CREATED",
		}

		bookshelfBytes, err := json.Marshal(bookshelf)
		if err != nil {
			t.Fatalf("failed to marshal bookshelf: %v", err)
		}

		response := stub.MockInvoke("2", [][]byte{
			[]byte("InsertBookshelf"),
			bookshelfBytes,
		})

		if response.Status != 200 {
			t.Fatalf("failed to insert bookshelf: %s", response.Message)
		}
		if response.Message != "Bookshelf inserted successfully" {
			t.Fatalf("incorrect response message: %s", response.Message)
		}
	})

	// Test 2: Get the bookshelf
	t.Run("Get Bookshelf", func(t *testing.T) {
		response := stub.MockInvoke("3", [][]byte{
			[]byte("GetBookshelf"),
			[]byte("bookshelf-001"),
		})

		if response.Status != 200 {
			t.Fatalf("failed to get bookshelf: %s", response.Message)
		}

		var bookshelf Bookshelf
		err := json.Unmarshal(response.Payload, &bookshelf)
		if err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}
		if bookshelf.ID != "bookshelf-001" {
			t.Fatalf("incorrect bookshelf ID: %s", bookshelf.ID)
		}
		if bookshelf.Name != "Modern Bamboo Shelf" {
			t.Fatalf("incorrect bookshelf name: %s", bookshelf.Name)
		}
		if bookshelf.Status != "CREATED" {
			t.Fatalf("incorrect bookshelf status: %s", bookshelf.Status)
		}
	})

	// Test 3: Update bookshelf status (simulating cross-chain update)
	t.Run("Update Bookshelf Status", func(t *testing.T) {
		response := stub.MockInvoke("4", [][]byte{
			[]byte("UpdateBookshelfStatus"),
			[]byte("bookshelf-001"),
			[]byte("PAID"),
		})

		if response.Status != 200 {
			t.Fatalf("failed to update bookshelf status: %s", response.Message)
		}
		if response.Message != "Bookshelf status updated successfully" {
			t.Fatalf("incorrect response message: %s", response.Message)
		}

		// Verify status update
		response = stub.MockInvoke("5", [][]byte{
			[]byte("GetBookshelf"),
			[]byte("bookshelf-001"),
		})

		var bookshelf Bookshelf
		err := json.Unmarshal(response.Payload, &bookshelf)
		if err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}
		if bookshelf.Status != "PAID" {
			t.Fatalf("status not updated correctly: %s", bookshelf.Status)
		}
	})

	// Test 4: Create bookshelves from same bamboo batch for recall testing
	t.Run("Create Bookshelves from Same Batch", func(t *testing.T) {
		bambooBatch := "BH-2023-0342" // Defective bamboo batch

		for i := 1; i <= 5; i++ {
			bookshelfID := fmt.Sprintf("bookshelf-batch-%d", i)
			bookshelf := Bookshelf{
				ID:           bookshelfID,
				Name:         fmt.Sprintf("Bamboo Bookshelf Model %d", i),
				Width:        80.0 + float64(i*10),
				Height:       120.0,
				Depth:        30.0,
				Material:     bambooBatch,
				Manufacturer: "org1MSP.manufacturer1",
				Price:        0.5,
				Status:       "CREATED",
			}

			bookshelfBytes, err := json.Marshal(bookshelf)
			if err != nil {
				t.Fatalf("failed to marshal bookshelf: %v", err)
			}

			response := stub.MockInvoke(fmt.Sprintf("batch-%d", i), [][]byte{
				[]byte("InsertBookshelf"),
				bookshelfBytes,
			})

			if response.Status != 200 {
				t.Fatalf("failed to insert bookshelf from batch: %s", response.Message)
			}
		}
	})

	// Test 5: Query bookshelves by material for product recall
	t.Run("Query Bookshelves by Material", func(t *testing.T) {
		bambooBatch := "BH-2023-0342"
		
		// This is a mock implementation to test the query functionality
		// In a real chaincode test, we would use CouchDB queries
		bookshelves := []Bookshelf{}
		for _, id := range stub.bookshelvesByMaterial[bambooBatch] {
			response := stub.MockInvoke(fmt.Sprintf("get-%s", id), [][]byte{
				[]byte("GetBookshelf"),
				[]byte(id),
			})
			
			var bookshelf Bookshelf
			err := json.Unmarshal(response.Payload, &bookshelf)
			if err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}
			bookshelves = append(bookshelves, bookshelf)
		}
		
		if len(bookshelves) != 5 {
			t.Fatalf("incorrect number of bookshelves found: %d", len(bookshelves))
		}
		
		for _, bookshelf := range bookshelves {
			if bookshelf.Material != bambooBatch {
				t.Fatalf("incorrect material in query result: %s", bookshelf.Material)
			}
		}
	})

	// Test 6: Initiate product recall (update status to RECALLED)
	t.Run("Initiate Product Recall", func(t *testing.T) {
		bambooBatch := "BH-2023-0342"
		
		// Update status for all affected products
		startTime := time.Now().UnixNano() / int64(time.Millisecond)
		for _, id := range stub.bookshelvesByMaterial[bambooBatch] {
			response := stub.MockInvoke(fmt.Sprintf("recall-%s", id), [][]byte{
				[]byte("UpdateBookshelfStatus"),
				[]byte(id),
				[]byte("RECALLED"),
			})
			
			if response.Status != 200 {
				t.Fatalf("failed to update bookshelf status to RECALLED: %s", response.Message)
			}
		}
		endTime := time.Now().UnixNano() / int64(time.Millisecond)
		recallTime := endTime - startTime
		
		t.Logf("Completed product recall process in %d milliseconds", recallTime)
		
		// Verify all products are recalled
		for _, id := range stub.bookshelvesByMaterial[bambooBatch] {
			response := stub.MockInvoke(fmt.Sprintf("verify-%s", id), [][]byte{
				[]byte("GetBookshelf"),
				[]byte(id),
			})
			
			var bookshelf Bookshelf
			err := json.Unmarshal(response.Payload, &bookshelf)
			if err != nil {
				t.Fatalf("failed to unmarshal response: %v", err)
			}
			if bookshelf.Status != "RECALLED" {
				t.Fatalf("bookshelf not properly recalled: %s", bookshelf.Status)
			}
		}
	})

	// Test 7: Cross-chain communication - validate manufacturer identity
	t.Run("Validate Manufacturer Identity", func(t *testing.T) {
		response := stub.MockInvoke("validate-manufacturer", [][]byte{
			[]byte("GetBookshelf"),
			[]byte("bookshelf-001"),
		})
		
		var bookshelf Bookshelf
		err := json.Unmarshal(response.Payload, &bookshelf)
		if err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}
		
		manufacturerID := bookshelf.Manufacturer
		
		// In a real test, we'd validate this against Ethereum identity through Cacti
		// For the mock test, we'll just check the expected format
		if manufacturerID != "org1MSP.manufacturer1" {
			t.Fatalf("incorrect manufacturer identity: %s", manufacturerID)
		}
		
		// Validate format (MSP.identity)
		mspParts := splitManufacturerID(manufacturerID)
		if len(mspParts) != 2 {
			t.Fatalf("invalid manufacturer ID format: %s", manufacturerID)
		}
		if mspParts[0] != "org1MSP" {
			t.Fatalf("incorrect MSP ID: %s", mspParts[0])
		}
		if mspParts[1] != "manufacturer1" {
			t.Fatalf("incorrect identity: %s", mspParts[1])
		}
	})
}

// Helper function to split manufacturer ID
func splitManufacturerID(manufacturerID string) []string {
	parts := make([]string, 0)
	var currentPart string
	
	for i := 0; i < len(manufacturerID); i++ {
		if manufacturerID[i] == '.' {
			parts = append(parts, currentPart)
			currentPart = ""
		} else {
			currentPart += string(manufacturerID[i])
		}
	}
	
	if len(currentPart) > 0 {
		parts = append(parts, currentPart)
	}
	
	return parts
} 