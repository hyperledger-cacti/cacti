// *****************************************************************************
// IMPORTANT: If you update this code then make sure to recompile
// it and update the .json file as well so that they
// remain in sync for consistent test executions.
// With that said, there shouldn't be any reason to recompile this, like ever...
// *****************************************************************************

pragma solidity >=0.7.0;

contract HelloWorld {
  string private name = "CaptainCactus";
  mapping (address => uint256) deposits;
  string[] private names; 

  function sayHello () public pure returns (string memory) {
    return 'Hello World!';
  }

  function getName() public view returns (string memory)
  {
      return name;
  }

  function getNameByIndex(uint256 index) public view returns (string memory)
  {
      return names[index];
  }

  function setName(string memory newName) public
  {
      name = newName;
      names.push(newName);
  }

  function deposit() public payable {
    require(msg.value > 0, "Value must be diferent of 0");
    deposits[msg.sender] += msg.value;
  }

}
