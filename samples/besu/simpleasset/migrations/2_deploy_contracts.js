const InteroperationBaseClassERC20 = artifacts.require('InteroperationBaseClassERC20')
const AliceERC20 = artifacts.require('./AliceERC20.sol')
const BobERC20 = artifacts.require('./BobERC20.sol')

module.exports = function (deployer) {
	deployer.deploy(InteroperationBaseClassERC20)
	deployer.deploy(AliceERC20, 1000) // Change intialSupply from 1000 as required
	deployer.deploy(BobERC20, 1000) // Change intialSupply from 1000 as required
}
