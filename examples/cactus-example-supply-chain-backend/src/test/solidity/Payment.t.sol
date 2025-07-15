// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../main/solidity/Payment.sol";
import "../../main/solidity/RoleManager.sol";

contract PaymentTest is Test {
    Payment public payment;
    RoleManager public roleManager;
    
    // Test addresses
    address public admin = address(0x1);
    address public manufacturer = address(0x2);
    address public customer = address(0x3);
    address public noRole = address(0x4);
    
    // Test data
    string public constant PRODUCT_ID = "BOOKSHELF-001";
    string public constant SHIPMENT_ID = "SHIPMENT-001";
    uint256 public constant PAYMENT_AMOUNT = 0.5 ether;
    string public constant FABRIC_ID_MFG = "org1MSP.manufacturer1";
    string public constant MSP_ID_MFG = "Org1MSP";
    string public constant TRANSACTION_REF = "tx_reference_123";
    
    // Events for testing
    event PaymentCreated(uint256 paymentId, address payer, address payee, uint256 amount, string productId, string productType);
    event PaymentStatusChanged(uint256 paymentId, Payment.PaymentStatus newStatus);
    event PaymentProcessed(uint256 paymentId, string transactionReference);
    event EthReceived(address sender, uint amount);

    function setUp() public {
        // Deploy RoleManager and Payment contracts
        vm.startPrank(admin);
        roleManager = new RoleManager();
        payment = new Payment(address(roleManager));
        
        // Setup roles
        roleManager.grantRole(roleManager.MANUFACTURER_ROLE(), manufacturer, FABRIC_ID_MFG, MSP_ID_MFG);
        roleManager.grantRole(roleManager.CUSTOMER_ROLE(), customer, "", "");
        
        vm.stopPrank();
        
        // Fund the payment contract
        vm.deal(address(payment), 10 ether);
    }
    
    /* ========== PAYMENT CREATION TESTS ========== */
    
    function testCreatePayment() public {
        vm.startPrank(admin);
        
        vm.expectEmit(true, true, true, true);
        emit PaymentCreated(1, customer, manufacturer, PAYMENT_AMOUNT, PRODUCT_ID, "bookshelf");
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        vm.stopPrank();
        
        // Verify payment creation
        assertEq(paymentId, 1);
        
        (
            uint256 id,
            address payer,
            address payee,
            uint256 amount,
            string memory productId,
            string memory productType,
            Payment.PaymentStatus status,
            ,  // timestamp
            string memory txRef
        ) = payment.getPayment(paymentId);
        
        assertEq(id, 1);
        assertEq(payer, customer);
        assertEq(payee, manufacturer);
        assertEq(amount, PAYMENT_AMOUNT);
        assertEq(productId, PRODUCT_ID);
        assertEq(productType, "bookshelf");
        assertEq(uint(status), uint(Payment.PaymentStatus.Pending));
        assertEq(txRef, "");
    }
    
    function testCreatePaymentShipment() public {
        vm.startPrank(admin);
        
        uint256 paymentId = payment.createPayment(
            manufacturer, 
            admin, 
            PAYMENT_AMOUNT, 
            SHIPMENT_ID, 
            "shipment"
        );
        
        vm.stopPrank();
        
        (, , , , string memory productId, string memory productType, , , ) = payment.getPayment(paymentId);
        
        assertEq(productId, SHIPMENT_ID);
        assertEq(productType, "shipment");
    }
    
    function testCannotCreatePaymentWithInvalidType() public {
        vm.startPrank(admin);
        
        vm.expectRevert("Invalid product type");
        payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "invalid_type"
        );
        
        vm.stopPrank();
    }
    
    /* ========== PAYMENT PROCESSING TESTS ========== */
    
    function testProcessPayment() public {
        // Create payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        // Process payment as customer
        vm.startPrank(customer);
        
        vm.expectEmit(true, false, false, true);
        emit PaymentStatusChanged(paymentId, Payment.PaymentStatus.Paid);
        payment.processPayment(paymentId, TRANSACTION_REF);
        
        vm.stopPrank();
        
        // Verify payment processed
        (, , , , , , Payment.PaymentStatus status, , string memory txRef) = payment.getPayment(paymentId);
        
        assertEq(uint(status), uint(Payment.PaymentStatus.Paid));
        assertEq(txRef, TRANSACTION_REF);
        
        // Verify product is marked as paid
        bool isPaid = payment.isProductPaid(PRODUCT_ID);
        assertTrue(isPaid);
    }
    
    function testProcessPaymentAdmin() public {
        // Create payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        // Process payment as admin
        vm.prank(admin);
        payment.processPayment(paymentId, TRANSACTION_REF);
        
        // Verify payment processed
        (, , , , , , Payment.PaymentStatus status, , ) = payment.getPayment(paymentId);
        assertEq(uint(status), uint(Payment.PaymentStatus.Paid));
    }
    
    function testCannotProcessPaymentAsUnauthorized() public {
        // Create payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        // Try to process payment as unauthorized user
        vm.prank(noRole);
        vm.expectRevert("Not authorized to process this payment");
        payment.processPayment(paymentId, TRANSACTION_REF);
    }
    
    function testCannotProcessAlreadyProcessedPayment() public {
        // Create and process payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        vm.prank(customer);
        payment.processPayment(paymentId, TRANSACTION_REF);
        
        // Try to process again
        vm.prank(customer);
        vm.expectRevert("Payment already processed");
        payment.processPayment(paymentId, TRANSACTION_REF);
    }
    
    /* ========== PAYMENT REFUND TESTS ========== */
    
    function testRefundPayment() public {
        // Create and process payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        vm.prank(customer);
        payment.processPayment(paymentId, TRANSACTION_REF);
        
        // Refund payment
        vm.startPrank(manufacturer);
        
        vm.expectEmit(true, false, false, true);
        emit PaymentStatusChanged(paymentId, Payment.PaymentStatus.Refunded);
        payment.refundPayment(paymentId, "refund_tx_123");
        
        vm.stopPrank();
        
        // Verify refund
        (, , , , , , Payment.PaymentStatus status, , string memory txRef) = payment.getPayment(paymentId);
        
        assertEq(uint(status), uint(Payment.PaymentStatus.Refunded));
        assertEq(txRef, "refund_tx_123");
    }
    
    function testCannotRefundUnpaidPayment() public {
        // Create payment but don't process it
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        // Try to refund
        vm.prank(manufacturer);
        vm.expectRevert("Payment must be paid to refund");
        payment.refundPayment(paymentId, "refund_tx_123");
    }
    
    /* ========== PAYMENT CANCELLATION TESTS ========== */
    
    function testCancelPayment() public {
        // Create payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        // Cancel payment
        vm.startPrank(customer);
        
        vm.expectEmit(true, false, false, true);
        emit PaymentStatusChanged(paymentId, Payment.PaymentStatus.Cancelled);
        payment.cancelPayment(paymentId);
        
        vm.stopPrank();
        
        // Verify cancellation
        (, , , , , , Payment.PaymentStatus status, , ) = payment.getPayment(paymentId);
        assertEq(uint(status), uint(Payment.PaymentStatus.Cancelled));
    }
    
    function testCannotCancelProcessedPayment() public {
        // Create and process payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        vm.prank(customer);
        payment.processPayment(paymentId, TRANSACTION_REF);
        
        // Try to cancel
        vm.prank(customer);
        vm.expectRevert("Only pending payments can be cancelled");
        payment.cancelPayment(paymentId);
    }
    
    /* ========== PRODUCT PAYMENT LOOKUP TESTS ========== */
    
    function testGetPaymentIdByProduct() public {
        // Create payment
        vm.prank(admin);
        uint256 paymentId = payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        // Lookup payment by product
        uint256 foundId = payment.getPaymentIdByProduct(PRODUCT_ID);
        assertEq(foundId, paymentId);
    }
    
    function testIsProductPaid() public {
        // Create payment
        vm.prank(admin);
        payment.createPayment(
            customer, 
            manufacturer, 
            PAYMENT_AMOUNT, 
            PRODUCT_ID, 
            "bookshelf"
        );
        
        // Check product not paid initially
        assertFalse(payment.isProductPaid(PRODUCT_ID));
        
        // Process payment
        vm.prank(customer);
        payment.processPayment(1, TRANSACTION_REF);
        
        // Check product now paid
        assertTrue(payment.isProductPaid(PRODUCT_ID));
    }
    
    /* ========== ADMIN FUNCTION TESTS ========== */
    
    function testTransferOwnership() public {
        address newOwner = address(0x5);
        
        vm.prank(admin);
        payment.transferOwnership(newOwner);
        
        assertEq(payment.owner(), newOwner);
        
        // New owner should be able to call owner-only functions
        vm.prank(newOwner);
        payment.updateRoleManager(address(roleManager));
        
        // Original owner should no longer be able to call owner-only functions
        vm.prank(admin);
        vm.expectRevert("Only the owner can call this function");
        payment.transferOwnership(admin);
    }
    
    function testUpdateRoleManager() public {
        // Deploy a new RoleManager
        vm.prank(admin);
        RoleManager newRoleManager = new RoleManager();
        
        // Update RoleManager reference
        vm.prank(admin);
        payment.updateRoleManager(address(newRoleManager));
        
        // Verify update
        assertEq(address(payment.roleManager()), address(newRoleManager));
    }
    
    /* ========== CONTRACT FUNDING TESTS ========== */
    
    function testReceiveEth() public {
        // Make sure customer has enough ETH to send
        vm.deal(customer, 2 ether);
        
        vm.startPrank(customer);
        
        uint256 initialBalance = address(payment).balance;
        
        // Send ETH to contract
        (bool success, ) = address(payment).call{value: 1 ether}("");
        require(success, "ETH transfer failed");
        
        vm.stopPrank();
        
        // Verify balance increased
        uint256 finalBalance = address(payment).balance;
        assertEq(finalBalance, initialBalance + 1 ether);
    }
} 