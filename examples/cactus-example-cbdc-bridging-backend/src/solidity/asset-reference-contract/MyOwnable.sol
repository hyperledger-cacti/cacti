// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

contract MyOwnable {
    address[] private _owners;

    event OwnershipRemoved(address indexed previousOwner);
    event OwnershipAdded(address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _addNewOwner(_msgSender());
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owners.
     */
    function owners() public view virtual returns (address[] memory) {
        return _owners;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        bool flag = false;
        for (uint i = 0; i < _owners.length; i++) {
            if (_owners[i] == _msgSender()) {
                flag = true;
            }
        }
        require(flag == true, "Ownable: caller is not an owner");
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function addOwner(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _addNewOwner(newOwner);
    }

    function removeOwner(address oldOwner) public virtual onlyOwner {
        require(oldOwner != address(0), "Ownable: old owner is the zero address");
        _removeOwner(oldOwner);
    }

    function _addNewOwner(address newOwner) internal virtual {
        _owners.push(newOwner);
        emit OwnershipAdded(newOwner);
    }

    function _removeOwner(address owner) internal virtual {
        for (uint i = 0; i < _owners.length; i++) {
            if (_owners[i] == owner) {
                _owners[i] = _owners[_owners.length - 1];
                _owners.pop();
            }
        }
        emit OwnershipRemoved(owner);
    }

    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}
