// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RoleManager.sol";

/**
 * @title Payment
 * @dev Contract for handling payments in the supply chain system
 */
contract Payment {
    address public owner;
    RoleManager public roleManager;

    // Payment statuses
    enum PaymentStatus { Pending, Paid, Refunded, Cancelled }

    // Payment record structure
    struct PaymentRecord {
        uint256 id;
        address payer;
        address payee;
        uint256 amount;
        string productId; // ID of the bookshelf or shipment
        string productType; // "bookshelf" or "shipment"
        PaymentStatus status;
        uint256 timestamp;
        string transactionReference; // Additional reference info
    }

    // Mapping from payment ID to payment record
    mapping(uint256 => PaymentRecord) public payments;
    
    // Mapping from product ID to payment ID
    mapping(string => uint256) public productPayments;
    
    // Counter for generating payment IDs
    uint256 private paymentCounter;

    // Events
    event PaymentCreated(uint256 paymentId, address payer, address payee, uint256 amount, string productId, string productType);
    event PaymentStatusChanged(uint256 paymentId, PaymentStatus newStatus);
    event PaymentProcessed(uint256 paymentId, string transactionReference);
    event EthReceived(address sender, uint amount);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    /**
     * @dev Constructor sets the owner and RoleManager contract address
     * @param _roleManagerAddress Address of the RoleManager contract
     */
    constructor(address _roleManagerAddress) {
        owner = msg.sender;
        roleManager = RoleManager(_roleManagerAddress);
        paymentCounter = 1; // Start payment IDs from 1
    }

    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @dev Create a new payment record
     * @param _payer Address of the payer (customer)
     * @param _payee Address of the payee (manufacturer)
     * @param _amount Payment amount
     * @param _productId ID of the bookshelf or shipment
     * @param _productType Type of product ("bookshelf" or "shipment")
     * @return paymentId The ID of the created payment
     */
    function createPayment(
        address _payer, 
        address _payee, 
        uint256 _amount, 
        string memory _productId, 
        string memory _productType
    ) 
        public 
        returns (uint256) 
    {
        // Validate parameters
        require(_payer != address(0), "Invalid payer address");
        require(_payee != address(0), "Invalid payee address");
        require(_amount > 0, "Amount must be greater than zero");
        require(bytes(_productId).length > 0, "Product ID cannot be empty");
        
        // Validate product type
        require(
            keccak256(bytes(_productType)) == keccak256(bytes("bookshelf")) || 
            keccak256(bytes(_productType)) == keccak256(bytes("shipment")),
            "Invalid product type"
        );
        
        // Generate new payment ID
        uint256 paymentId = paymentCounter++;
        
        // Create payment record
        PaymentRecord memory newPayment = PaymentRecord({
            id: paymentId,
            payer: _payer,
            payee: _payee,
            amount: _amount,
            productId: _productId,
            productType: _productType,
            status: PaymentStatus.Pending,
            timestamp: block.timestamp,
            transactionReference: ""
        });
        
        // Store payment record
        payments[paymentId] = newPayment;
        
        // Link product to payment
        productPayments[_productId] = paymentId;
        
        // Emit event
        emit PaymentCreated(paymentId, _payer, _payee, _amount, _productId, _productType);
        
        return paymentId;
    }

    /**
     * @dev Process a payment (mark it as paid)
     * @param _paymentId ID of the payment
     * @param _transactionReference Reference to the transaction
     */
    function processPayment(uint256 _paymentId, string memory _transactionReference) public {
        require(_paymentId > 0 && _paymentId < paymentCounter, "Payment not found");
        require(bytes(_transactionReference).length > 0, "Transaction reference cannot be empty");
        
        PaymentRecord storage payment = payments[_paymentId];
        
        // Ensure payment exists and is in pending status
        require(payment.payer != address(0), "Payment not found");
        require(payment.status == PaymentStatus.Pending, "Payment already processed");
        
        // Only the payer, owner, or an admin can process payments
        require(
            msg.sender == payment.payer || 
            msg.sender == owner || 
            roleManager.isAdmin(msg.sender),
            "Not authorized to process this payment"
        );
        
        // Update payment status
        payment.status = PaymentStatus.Paid;
        payment.transactionReference = _transactionReference;
        
        // Emit events
        emit PaymentStatusChanged(_paymentId, PaymentStatus.Paid);
        emit PaymentProcessed(_paymentId, _transactionReference);
    }

    /**
     * @dev Refund a payment
     * @param _paymentId ID of the payment
     * @param _transactionReference Reference to the refund transaction
     */
    function refundPayment(uint256 _paymentId, string memory _transactionReference) public {
        require(_paymentId > 0 && _paymentId < paymentCounter, "Payment not found");
        require(bytes(_transactionReference).length > 0, "Transaction reference cannot be empty");
        
        PaymentRecord storage payment = payments[_paymentId];
        
        // Ensure payment exists and is in paid status
        require(payment.payer != address(0), "Payment not found");
        require(payment.status == PaymentStatus.Paid, "Payment must be paid to refund");
        
        // Only the payee, owner, or an admin can issue refunds
        require(
            msg.sender == payment.payee || 
            msg.sender == owner || 
            roleManager.isAdmin(msg.sender),
            "Not authorized to refund this payment"
        );
        
        // Update payment status
        payment.status = PaymentStatus.Refunded;
        payment.transactionReference = _transactionReference;
        
        // Emit event
        emit PaymentStatusChanged(_paymentId, PaymentStatus.Refunded);
    }

    /**
     * @dev Cancel a payment
     * @param _paymentId ID of the payment
     */
    function cancelPayment(uint256 _paymentId) public {
        require(_paymentId > 0 && _paymentId < paymentCounter, "Payment not found");
        
        PaymentRecord storage payment = payments[_paymentId];
        
        // Ensure payment exists
        require(payment.payer != address(0), "Payment not found");
        
        // Payment must be pending to be cancelled
        require(payment.status == PaymentStatus.Pending, "Only pending payments can be cancelled");
        
        // Only the payer, payee, owner, or an admin can cancel a payment
        require(
            msg.sender == payment.payer || 
            msg.sender == payment.payee || 
            msg.sender == owner || 
            roleManager.isAdmin(msg.sender),
            "Not authorized to cancel this payment"
        );
        
        // Update payment status
        payment.status = PaymentStatus.Cancelled;
        
        // Emit event
        emit PaymentStatusChanged(_paymentId, PaymentStatus.Cancelled);
    }

    /**
     * @dev Get payment details by ID
     * @param _paymentId ID of the payment
     * @return id Payment ID
     * @return payer Address of the payer
     * @return payee Address of the payee
     * @return amount Payment amount
     * @return productId ID of the product
     * @return productType Type of product
     * @return status Payment status
     * @return timestamp Timestamp of the payment
     * @return transactionReference Reference information
     */
    function getPayment(uint256 _paymentId) public view returns (
        uint256 id,
        address payer,
        address payee,
        uint256 amount,
        string memory productId,
        string memory productType,
        PaymentStatus status,
        uint256 timestamp,
        string memory transactionReference
    ) {
        require(_paymentId > 0 && _paymentId < paymentCounter, "Invalid payment ID");
        
        PaymentRecord storage payment = payments[_paymentId];
        require(payment.payer != address(0), "Payment not found");
        
        return (
            payment.id,
            payment.payer,
            payment.payee,
            payment.amount,
            payment.productId,
            payment.productType,
            payment.status,
            payment.timestamp,
            payment.transactionReference
        );
    }

    /**
     * @dev Check if a product has been paid for
     * @param _productId ID of the product
     * @return bool True if product has been paid, false otherwise
     */
    function isProductPaid(string memory _productId) public view returns (bool) {
        uint256 paymentId = productPayments[_productId];
        
        // If there's no payment record for this product, it's not paid
        if (paymentId == 0) {
            return false;
        }
        
        PaymentRecord storage payment = payments[paymentId];
        
        // Consider a product paid if payment status is Paid
        return payment.status == PaymentStatus.Paid;
    }

    /**
     * @dev Get payment ID by product ID
     * @param _productId ID of the product
     * @return uint256 Payment ID (0 if not found)
     */
    function getPaymentIdByProduct(string memory _productId) public view returns (uint256) {
        return productPayments[_productId];
    }

    /**
     * @dev Transfer ownership of the contract
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        owner = _newOwner;
    }

    /**
     * @dev Update RoleManager contract address
     * @param _newRoleManagerAddress Address of the new RoleManager contract
     */
    function updateRoleManager(address _newRoleManagerAddress) public onlyOwner {
        require(_newRoleManagerAddress != address(0), "New RoleManager address cannot be zero address");
        roleManager = RoleManager(_newRoleManagerAddress);
    }
} 