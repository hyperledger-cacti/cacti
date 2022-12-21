import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
    name: 'set',
    description: 'Set value of key',
    run: async toolbox => {
        const {
            print,
            parameters: { options, array }
        } = toolbox
        if (options.help || options.h) {
            commandHelp(
                print,
                toolbox,
                `besu-cli state set --network=network1 a 10`,
                'besu-cli state set --network=<network1|network2> <key> <value>' ,
                [
                    {
                        name: '--network',
                        description:
                            'network for command. <network1|network2>'
                    },
                    {
                        name: '--network_host',
                        description:
                            'The network host. Default value is taken from config.json'
                    },
                    {
                        name: '--network_port',
                        description:
                            'The network port. Default value is taken from config.json'
                    }
                ],
                command,
                ['state', 'set']
            )
            return
        }
        print.info('Set key, value in simple state')
        if(!options.network){
            print.error('Network ID not provided.')
            return
        }
        if(array.length != 2) {
            print.error('Not enough arguments provided.')
            return
        }
        const networkConfig = getNetworkConfig(options.network)
        console.log('networkConfig', networkConfig)

        var networkPort = networkConfig.networkPort
        if(options.network_port){
            networkPort = options.network_port
            console.log('Use network port : ', networkPort)
        }
        var networkHost = networkConfig.networkHost
        if(options.network_host){
            networkHost = options.network_host
            console.log('Use network host : ', networkHost)
        }

        const provider = new Web3.providers.HttpProvider('http://'+networkHost+':'+networkPort)
        const web3N = new Web3(provider)
        const accounts = await web3N.eth.getAccounts()
        var contractOwner = accounts[0]
        const simpleStateContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
            console.log("Failed getting appContract!");
            process.exit()
        })
        const key = array[0]
        const value = array[1].toString()

        // Transfer from the contract owner to the account specified
        await simpleStateContract.set(key, value, {from: contractOwner}).catch(function () {
            console.log("Failed setting key, value in simplestate!");
        })
        process.exit()
    }
}

module.exports = command
