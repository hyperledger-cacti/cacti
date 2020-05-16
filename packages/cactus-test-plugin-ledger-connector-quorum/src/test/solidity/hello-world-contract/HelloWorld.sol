// *****************************************************************************
// IMPORTANT: If you update this code then make sure to recompile
// it and update the .json file as well so that they
// remain in sync for consistent test executions.
// With that said, there shouldn't be any reason to recompile this, like ever...
// *****************************************************************************

pragma solidity >0.5.0;

contract HelloWorld {
 function sayHello () public pure returns (string memory) {
   return 'Hello World!';
 }
}
