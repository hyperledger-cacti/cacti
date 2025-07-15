// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import { SupplyChainAppDataModelLib as model } from "./SupplyChainAppDataModel.sol";

contract BookshelfRepository {

    // Original records array - preserved for backward compatibility
    model.BookshelfEntity[] records;

    // New structs for enhanced functionality
    struct Order {
        string orderId;
        string bookshelfId;         // Reference to bookshelf product ID
        address buyer;
        uint256 amount;
        string status;              // "PENDING", "PAID", "SHIPPED", "DELIVERED"
        uint256 timestamp;
    }
    
    struct EnhancedBookshelf {
        string id;
        string fabricProductId;     // Reference to private manufacturer data
        string name;
        string shelfType;
        uint256 price;
        uint256 creationDate;
        string status;              // "AVAILABLE", "SOLD"
    }
    
    // Storage for enhanced records and orders
    EnhancedBookshelf[] public enhancedRecords;
    mapping(string => Order) public orders;
    string[] public orderIds;

    // Original function - preserved for backward compatibility
    function getAllRecords() public view returns(model.BookshelfEntity[] memory)
    {
        return records;
    }

    // Original function - preserved for backward compatibility
    function insertRecord(
        model.BookshelfEntity memory record
    )
        public
        returns(bool success)
    {
        records.push(record);
        return true;
    }
    
    // New function - Create bookshelf linked to manufacturer data
    function insertEnhancedRecord(
        string memory id,
        string memory fabricProductId,
        string memory name,
        string memory shelfType,
        uint256 price,
        uint256 creationDate
    ) public returns (string memory) {
        EnhancedBookshelf memory record = EnhancedBookshelf({
            id: id,
            fabricProductId: fabricProductId,
            name: name,
            shelfType: shelfType,
            price: price,
            creationDate: creationDate,
            status: "AVAILABLE"
        });
        
        enhancedRecords.push(record);
        return id;
    }
    
    // Function to place order
    function placeOrder(string memory bookshelfId) public payable returns (string memory) {
        // Find product in enhanced records
        bool found = false;
        uint productIndex;
        for (uint i = 0; i < enhancedRecords.length; i++) {
            if (keccak256(bytes(enhancedRecords[i].id)) == keccak256(bytes(bookshelfId))) {
                require(keccak256(bytes(enhancedRecords[i].status)) == keccak256(bytes("AVAILABLE")), "Bookshelf not available");
                require(msg.value >= enhancedRecords[i].price, "Insufficient payment");
                found = true;
                productIndex = i;
                break;
            }
        }
        require(found, "Bookshelf not found");
        
        // Generate order ID
        string memory orderId = string(abi.encodePacked("ORDER-SHELF-", uint256(blockhash(block.number - 1)) % 10000));
        
        // Create order
        orders[orderId] = Order({
            orderId: orderId,
            bookshelfId: bookshelfId,
            buyer: msg.sender,
            amount: msg.value,
            status: "PAID",
            timestamp: block.timestamp
        });
        
        // Update product status
        enhancedRecords[productIndex].status = "SOLD";
        
        orderIds.push(orderId);
        return orderId;
    }
    
    // Get all enhanced records
    function getAllEnhancedRecords() public view returns (EnhancedBookshelf[] memory) {
        return enhancedRecords;
    }
    
    // Get all orders
    function getAllOrders() public view returns (Order[] memory) {
        Order[] memory allOrders = new Order[](orderIds.length);
        for (uint i = 0; i < orderIds.length; i++) {
            allOrders[i] = orders[orderIds[i]];
        }
        return allOrders;
    }
    
    // Get order by ID
    function getOrder(string memory orderId) public view returns (Order memory) {
        require(bytes(orders[orderId].orderId).length != 0, "Order not found");
        return orders[orderId];
    }
    
    // Get product by ID
    function getProduct(string memory bookshelfId) public view returns (EnhancedBookshelf memory) {
        for (uint i = 0; i < enhancedRecords.length; i++) {
            if (keccak256(bytes(enhancedRecords[i].id)) == keccak256(bytes(bookshelfId))) {
                return enhancedRecords[i];
            }
        }
        revert("Bookshelf not found");
    }
    
    // Update order status (e.g., when shipment is created)
    function updateOrderStatus(string memory orderId, string memory status) public {
        require(bytes(orders[orderId].orderId).length != 0, "Order not found");
        orders[orderId].status = status;
    }
}
