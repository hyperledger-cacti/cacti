// *****************************************************************************
// IMPORTANT: If you update this code then make sure to recompile
// it and update the .json file as well so that they
// remain in sync for consistent test executions.
// With that said, there shouldn't be any reason to recompile this, like ever...
// *****************************************************************************

pragma solidity >=0.7.0;

contract SayMessageContract {
  string private name = "CaptainCactus";

  uint256 private nonce = 0;

  event SayMessageEvent(
    bytes32 indexed messageHash,
    string message,
    uint256 nonce
  );

  function getNonce() public view returns (uint256) {
    return nonce;
  }

  function incrementNonce() internal {
    nonce += 1;
  }

  function sayMessage(string calldata message) public {
    incrementNonce();
    emit SayMessageEvent(keccak256(abi.encodePacked(message)), message, nonce);
  }
}
