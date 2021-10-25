module.exports = {
	networks: {
    		development: {
			host: "localhost",
			port: 9544, // 7545 - default for Ganache
			network_id: "1338", // 4447 - default for Ganache
      			//type: "fabric-evm",
			from: "0x753896a408F143eA94381798BbdEC18007Df0958",
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
































