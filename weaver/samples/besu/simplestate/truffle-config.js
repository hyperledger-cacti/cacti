module.exports = {
	networks: {
		development: {
			host: "localhost",
			port: 8545, // 7545 - default for Ganache
			network_id: "1337", // 4447 - default for Ganache
			//type: "fabric-evm",
			from: "0x78e5A2632b4F0F53789533443787C647473dB66B",
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
