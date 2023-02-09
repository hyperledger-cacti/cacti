import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
    name: 'get',
    description: 'Get value of key',
    run: async toolbox => {
        const {
            print,
            parameters: { options, array }
        } = toolbox
        if (options.help || options.h) {
            commandHelp(
                print,
                toolbox,
                `besu-cli state get --network=network1 a`,
                'besu-cli state get --network=<network1|network2> <key>' ,
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
                ['state', 'get']
            )
            return
        }
        print.info('Get value for key stored in simple state')
        if(!options.network){
            print.error('Network ID not provided.')
            return
        }
        if(array.length != 1) {
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
        //const web3N = new Web3(provider)
        const simpleStateContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
            console.log("Failed getting appContract!");
        })
        const key = array[0]

        // Transfer from the contract owner to the account specified
        const value = await simpleStateContract.get(key)
        //console.log(`${JSON.stringify(txRcpt)}`)
        //const value = web3N.eth.abi.decodeLog(['string'], txRcpt.logs[0].args[0])
        console.log(`Value for key: ${key} = ${value}`)
        process.exit()
    }
}

module.exports = command
