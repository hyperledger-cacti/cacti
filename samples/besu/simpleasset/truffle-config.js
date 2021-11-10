module.exports = {
	networks: {
		development: {
			host: "localhost",
			port: 8545, // 7545 - default for Ganache
			network_id: "1337", // 4447 - default for Ganache
			//type: "fabric-evm",
			from: "0x4698856Ea77B1939914462e319756E7B2136f318",
			gasPrice: 0,
			gas: "0x1ffffffffffffe"
		}
	},
  
	compilers: {
		solc: {
			version: "^0.8.8"
		}
	}
}
