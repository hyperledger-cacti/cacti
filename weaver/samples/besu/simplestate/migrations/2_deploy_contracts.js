// const Interop = artifacts.require('Interop') // Update this for interop contract after implementing data-sharing in besu and uncomment
const SimpleState = artifacts.require('./SimpleState.sol')

module.exports = function (deployer) {
	// deployer.deploy(Interop)
	deployer.deploy(SimpleState, 1000) // Change intialSupply from 1000 as required
}
