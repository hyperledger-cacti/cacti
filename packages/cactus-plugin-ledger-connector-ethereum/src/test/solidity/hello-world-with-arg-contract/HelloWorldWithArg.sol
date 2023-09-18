// *****************************************************************************
// IMPORTANT: If you update this code then make sure to recompile
// it and update the .json file as well so that they
// remain in sync for consistent test executions.
// With that said, there shouldn't be any reason to recompile this, like ever...
// *****************************************************************************

pragma solidity >=0.7.0;

contract HelloWorldWithArg {
  string private name;

  constructor(string memory _name) {
    name = _name;
  }

  function sayHello() public view returns (string memory) {
    return string(abi.encodePacked("Hello ", name, "!"));
  }

  function getName() public view returns (string memory) {
    return name;
  }

  function setName(string memory newName) public {
    name = newName;
  }
}
