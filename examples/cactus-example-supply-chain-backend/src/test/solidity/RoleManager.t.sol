// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../../main/solidity/RoleManager.sol";

contract RoleManagerTest is Test {
    RoleManager roleManager;
    address owner;
    address manufacturer;
    address customer;
    address admin;

    function setUp() public {
        // Deploy the RoleManager contract
        owner = address(this);
        roleManager = new RoleManager();
        
        // Setup test accounts
        manufacturer = makeAddr("manufacturer");
        customer = makeAddr("customer");
        admin = makeAddr("admin");
    }

    function testOwnerIsAdmin() public view {
        assertTrue(roleManager.isAdmin(owner), "Owner should have admin role by default");
    }

    function testAssignManufacturerRole() public {
        string memory fabricId = "user2";
        string memory mspId = "Org2MSP";
        
        roleManager.assignManufacturerRole(manufacturer, fabricId, mspId);
        
        assertTrue(roleManager.isManufacturer(manufacturer), "Account should be assigned manufacturer role");
        assertEq(roleManager.getFabricIdentity(manufacturer), fabricId, "Fabric identity should match");
        assertEq(roleManager.getMspId(manufacturer), mspId, "MSP ID should match");
    }

    function testAssignCustomerRole() public {
        string memory fabricId = "user1";
        string memory mspId = "Org1MSP";
        
        roleManager.assignCustomerRole(customer, fabricId, mspId);
        
        assertTrue(roleManager.isCustomer(customer), "Account should be assigned customer role");
        assertEq(roleManager.getFabricIdentity(customer), fabricId, "Fabric identity should match");
        assertEq(roleManager.getMspId(customer), mspId, "MSP ID should match");
    }

    function testAssignAdminRole() public {
        roleManager.assignAdminRole(admin);
        
        assertTrue(roleManager.isAdmin(admin), "Account should be assigned admin role");
    }

    function testRevokeManufacturerRole() public {
        // First assign the role
        roleManager.assignManufacturerRole(manufacturer, "user2", "Org2MSP");
        assertTrue(roleManager.isManufacturer(manufacturer), "Account should be assigned manufacturer role");
        
        // Then revoke it
        roleManager.revokeManufacturerRole(manufacturer);
        assertFalse(roleManager.isManufacturer(manufacturer), "Account should no longer have manufacturer role");
    }

    function testRevokeCustomerRole() public {
        // First assign the role
        roleManager.assignCustomerRole(customer, "user1", "Org1MSP");
        assertTrue(roleManager.isCustomer(customer), "Account should be assigned customer role");
        
        // Then revoke it
        roleManager.revokeCustomerRole(customer);
        assertFalse(roleManager.isCustomer(customer), "Account should no longer have customer role");
    }

    function testRevokeAdminRole() public {
        // First assign the role to non-owner
        roleManager.assignAdminRole(admin);
        assertTrue(roleManager.isAdmin(admin), "Account should be assigned admin role");
        
        // Then revoke it
        roleManager.revokeAdminRole(admin);
        assertFalse(roleManager.isAdmin(admin), "Account should no longer have admin role");
    }

    function testFailRevokeOwnerAdminRole() public {
        // Should fail when trying to revoke admin role from owner
        roleManager.revokeAdminRole(owner);
    }

    function testLegacyAddManufacturer() public {
        roleManager.addManufacturer(manufacturer);
        
        assertTrue(roleManager.isManufacturer(manufacturer), "Account should be assigned manufacturer role");
        assertEq(roleManager.getFabricIdentity(manufacturer), "user2", "Fabric identity should be user2");
        assertEq(roleManager.getMspId(manufacturer), "Org2MSP", "MSP ID should be Org2MSP");
    }

    function testLegacyAddManufacturers() public {
        address[] memory manufacturers = new address[](3);
        manufacturers[0] = makeAddr("manufacturer1");
        manufacturers[1] = makeAddr("manufacturer2");
        manufacturers[2] = makeAddr("manufacturer3");
        
        roleManager.addManufacturers(manufacturers);
        
        for (uint i = 0; i < manufacturers.length; i++) {
            assertTrue(roleManager.isManufacturer(manufacturers[i]), "Account should be assigned manufacturer role");
            assertEq(roleManager.getFabricIdentity(manufacturers[i]), "user2", "Fabric identity should be user2");
            assertEq(roleManager.getMspId(manufacturers[i]), "Org2MSP", "MSP ID should be Org2MSP");
        }
    }

    function testLegacyAddCustomer() public {
        roleManager.addCustomer(customer);
        
        assertTrue(roleManager.isCustomer(customer), "Account should be assigned customer role");
        assertEq(roleManager.getFabricIdentity(customer), "user1", "Fabric identity should be user1");
        assertEq(roleManager.getMspId(customer), "Org1MSP", "MSP ID should be Org1MSP");
    }

    function testTransferOwnership() public {
        address newOwner = makeAddr("newOwner");
        
        roleManager.transferOwnership(newOwner);
        
        assertTrue(roleManager.isAdmin(newOwner), "New owner should have admin role");
        
        // The old owner (this contract) should still have admin role
        assertTrue(roleManager.isAdmin(owner), "Old owner should still have admin role");
    }

    function testCrosschainIdentityMapping() public {
        // Test the cross-chain identity mapping functionality
        
        string memory fabricId = "user2";
        string memory mspId = "Org2MSP";
        
        roleManager.assignManufacturerRole(manufacturer, fabricId, mspId);
        
        (string memory identity, string memory orgId) = roleManager.getManufacturerFabricIdentity(manufacturer);
        
        assertEq(identity, fabricId, "Retrieved fabric identity should match assigned value");
        assertEq(orgId, mspId, "Retrieved MSP ID should match assigned value");
    }
} 