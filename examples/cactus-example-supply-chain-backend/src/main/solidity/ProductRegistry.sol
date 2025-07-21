// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract ProductRegistry {
    struct Product {
        string id;
        string name;
        string origin;
        address manufacturer;
        uint256 price;
        string status; // "Available", "Sold", "Shipped", "Delivered"
        uint256 timestamp;
    }

    struct Order {
        string id;
        string productId;
        address buyer;
        uint256 amount;
        string status; // "Pending", "Paid", "Shipped", "Delivered"
        uint256 timestamp;
    }

    mapping(string => Product) private products;
    mapping(string => Order) private orders;
    string[] private productIds;
    string[] private orderIds;

    event ProductListed(string id, string name, uint256 price);
    event OrderCreated(string orderId, string productId, address buyer);
    event OrderStatusUpdated(string orderId, string status);
    event ProductStatusUpdated(string productId, string status);

    modifier onlyManufacturer(string memory productId) {
        require(products[productId].manufacturer == msg.sender, "Not the manufacturer");
        _;
    }

    modifier onlyBuyer(string memory orderId) {
        require(orders[orderId].buyer == msg.sender, "Not the buyer");
        _;
    }

    function listProduct(
        string memory id,
        string memory name,
        string memory origin,
        uint256 price
    ) public {
        require(bytes(id).length > 0, "Product ID cannot be empty");
        require(price > 0, "Price must be greater than 0");

        products[id] = Product({
            id: id,
            name: name,
            origin: origin,
            manufacturer: msg.sender,
            price: price,
            status: "Available",
            timestamp: block.timestamp
        });

        productIds.push(id);
        emit ProductListed(id, name, price);
    }

    function createOrder(string memory orderId, string memory productId) public payable {
        require(bytes(productId).length > 0, "Product ID cannot be empty");
        require(bytes(products[productId].id).length > 0, "Product does not exist");
        require(keccak256(bytes(products[productId].status)) == keccak256(bytes("Available")), "Product not available");
        require(msg.value >= products[productId].price, "Insufficient payment");

        orders[orderId] = Order({
            id: orderId,
            productId: productId,
            buyer: msg.sender,
            amount: msg.value,
            status: "Paid",
            timestamp: block.timestamp
        });

        products[productId].status = "Sold";
        orderIds.push(orderId);

        // Transfer payment to manufacturer
        payable(products[productId].manufacturer).transfer(msg.value);

        emit OrderCreated(orderId, productId, msg.sender);
        emit ProductStatusUpdated(productId, "Sold");
    }

    function updateOrderStatus(string memory orderId, string memory status) public onlyManufacturer(orders[orderId].productId) {
        require(bytes(orders[orderId].id).length > 0, "Order does not exist");
        orders[orderId].status = status;
        emit OrderStatusUpdated(orderId, status);
    }

    function getAllProducts() public view returns (Product[] memory) {
        Product[] memory allProducts = new Product[](productIds.length);
        for (uint i = 0; i < productIds.length; i++) {
            allProducts[i] = products[productIds[i]];
        }
        return allProducts;
    }

    function getProduct(string memory productId) public view returns (Product memory) {
        require(bytes(products[productId].id).length > 0, "Product does not exist");
        return products[productId];
    }

    function getOrder(string memory orderId) public view returns (Order memory) {
        require(bytes(orders[orderId].id).length > 0, "Order does not exist");
        return orders[orderId];
    }

    function getAllOrders() public view returns (Order[] memory) {
        Order[] memory allOrders = new Order[](orderIds.length);
        for (uint i = 0; i < orderIds.length; i++) {
            allOrders[i] = orders[orderIds[i]];
        }
        return allOrders;
    }
} 