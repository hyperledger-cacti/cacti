// RoleManager.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./SupplyChainAppDataModel.sol";

contract RoleManager {
    // Role constants
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER");
    bytes32 public constant CUSTOMER_ROLE = keccak256("CUSTOMER");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    
    // Role assignments
    mapping(address => mapping(bytes32 => bool)) private _roles;
    
    // Fabric identity mapping (address => fabricIdentity)
    mapping(address => string) private _fabricIdentities;
    mapping(address => string) private _mspIds;
    
    // Owner address (contract deployer)
    address private _owner;
    
    // Events
    event RoleGranted(bytes32 indexed role, address indexed account, string fabricIdentity, string mspId);
    event RoleRevoked(bytes32 indexed role, address indexed account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Constructor assigns deployer as owner and admin
    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        
        // Owner automatically gets admin role
        _roles[msg.sender][ADMIN_ROLE] = true;
        emit RoleGranted(ADMIN_ROLE, msg.sender, "", "");
    }
    
    // Modifier for owner-only functions
    modifier onlyOwner() {
        require(msg.sender == _owner, "Caller is not the owner");
        _;
    }
    
    // Basic role check function
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[account][role];
    }
    
    // Role-specific check functions
    function isManufacturer(address account) public view returns (bool) {
        return _roles[account][MANUFACTURER_ROLE];
    }
    
    function isCustomer(address account) public view returns (bool) {
        return _roles[account][CUSTOMER_ROLE];
    }
    
    function isAdmin(address account) public view returns (bool) {
        return _roles[account][ADMIN_ROLE];
    }
    
    // Identity getter functions
    function getFabricIdentity(address account) public view returns (string memory) {
        return _fabricIdentities[account];
    }
    
    function getMspId(address account) public view returns (string memory) {
        return _mspIds[account];
    }
    
    // General role assignment function
    function grantRole(bytes32 role, address account, string memory fabricIdentity, string memory mspId) public onlyOwner {
        _grantRole(role, account, fabricIdentity, mspId);
    }
    
    // Role-specific assignment functions to match test names
    function assignManufacturerRole(address account, string memory fabricIdentity, string memory mspId) public onlyOwner {
        require(account != address(0), "Account is zero address");
        _grantRole(MANUFACTURER_ROLE, account, fabricIdentity, mspId);
    }
    
    function assignCustomerRole(address account, string memory fabricIdentity, string memory mspId) public onlyOwner {
        require(account != address(0), "Account is zero address");
        _grantRole(CUSTOMER_ROLE, account, fabricIdentity, mspId);
    }
    
    function assignAdminRole(address account) public onlyOwner {
        require(account != address(0), "Account is zero address");
        _grantRole(ADMIN_ROLE, account, "", "");
    }
    
    // General role revocation function
    function revokeRole(bytes32 role, address account) public onlyOwner {
        _roles[account][role] = false;
        emit RoleRevoked(role, account);
    }
    
    // Role-specific revocation functions to match test names
    function revokeManufacturerRole(address account) public onlyOwner {
        revokeRole(MANUFACTURER_ROLE, account);
    }
    
    function revokeCustomerRole(address account) public onlyOwner {
        revokeRole(CUSTOMER_ROLE, account);
    }
    
    function revokeAdminRole(address account) public onlyOwner {
        require(account != _owner, "Cannot revoke admin role from owner");
        revokeRole(ADMIN_ROLE, account);
    }
    
    // Internal helper for role assignment
    function _grantRole(bytes32 role, address account, string memory fabricIdentity, string memory mspId) internal {
        require(account != address(0), "Account is zero address");
        _roles[account][role] = true;
        
        // Only update identity info if provided
        if (bytes(fabricIdentity).length > 0) {
            _fabricIdentities[account] = fabricIdentity;
        }
        
        if (bytes(mspId).length > 0) {
            _mspIds[account] = mspId;
        }
        
        emit RoleGranted(role, account, fabricIdentity, mspId);
    }
    
    // Legacy functions maintained for backwards compatibility
    
    // Add manufacturer (maps to user2/Org2MSP)
    function addManufacturer(address account) public onlyOwner {
        require(account != address(0), "Account is zero address");
        _grantRole(MANUFACTURER_ROLE, account, "user2", "Org2MSP");
    }
    
    // Add multiple manufacturers at once
    function addManufacturers(address[] memory accounts) public onlyOwner {
        for (uint i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Account is zero address");
            _grantRole(MANUFACTURER_ROLE, accounts[i], "user2", "Org2MSP");
        }
    }
    
    // Add customer (maps to user1/Org1MSP)
    function addCustomer(address account) public onlyOwner {
        require(account != address(0), "Account is zero address");
        _grantRole(CUSTOMER_ROLE, account, "user1", "Org1MSP");
    }
    
    // Transfer ownership - only owner can call
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        address oldOwner = _owner;
        _owner = newOwner;
        
        // New owner gets admin role automatically
        _roles[newOwner][ADMIN_ROLE] = true;
        
        emit OwnershipTransferred(oldOwner, newOwner);
        emit RoleGranted(ADMIN_ROLE, newOwner, "", "");
    }
    
    // Specialized getter for manufacturer identities
    function getManufacturerFabricIdentity(address account) public view returns (string memory identity, string memory mspId) {
        require(_roles[account][MANUFACTURER_ROLE], "Account is not a manufacturer");
        return (_fabricIdentities[account], _mspIds[account]);
    }
}