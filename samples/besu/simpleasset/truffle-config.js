module.exports = {
	networks: {
		development: {
			host: "localhost",
			port: 9544, // 7545 - default for Ganache
			network_id: "1338", // 4447 - default for Ganache
			//type: "fabric-evm",
			from: "0x3c7F5262b873F637F8AdA2B09C34624B7F5fbCBF",
			gasPrice: 0,
			gas: "0x1ffffffffffffe"
		}
	},
	compilers: {
		solc: {
			version: "^0.8.8",
			settings: {
				optimizer: {
				  enabled: true,
				  runs: 1500
				},
				viaIR: true,
			  }
			
		},
		
	}
}
