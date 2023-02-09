const AliceERC20 = artifacts.require('./AliceERC20.sol')
const BobERC20 = artifacts.require('./BobERC20.sol')
const AliceERC721 = artifacts.require('./AliceERC721.sol')
const AssetExchangeContract = artifacts.require('AssetExchangeContract')
const AliceERC1155 = artifacts.require('./AliceERC1155.sol')


module.exports = function (deployer) {
	deployer.deploy(AliceERC20, 1000) // Change intialSupply from 1000 as required
	deployer.deploy(BobERC20, 1000) // Change intialSupply from 1000 as required
	deployer.deploy(AliceERC721)
	deployer.deploy(AssetExchangeContract)
	deployer.deploy(AliceERC1155)
}
