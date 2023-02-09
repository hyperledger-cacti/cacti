import * as fs from 'fs'
import * as path from 'path'
import { GluegunCommand } from 'gluegun'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'
import { GluegunPrint } from 'gluegun/build/types/toolbox/print-types'
import logger from './logger'

// Used for getting network configuration from config.json file.
const getNetworkConfig = (
	networkId: string
	): { networkHost: string; networkPort: string; tokenContract: string; interopContract: string; senderAccountIndex: string; recipientAccountIndex: string } => {
	const configPath = process.env.CONFIG_PATH
		? path.join(process.env.CONFIG_PATH)
		: path.join(__dirname, '../../config.json')
	try {
		const configJSON = JSON.parse(fs.readFileSync(configPath).toString())
		if (!configJSON[networkId]) {
			logger.error(
				`Network: ${networkId} does not exist in the config.json file`
			)
			return { networkHost: '', networkPort: '', tokenContract: '', interopContract: '', senderAccountIndex: '', recipientAccountIndex: '' }
		}
		// console.log(configJSON[networkId])
		return configJSON[networkId]
	} catch (err) {
		logger.error(`Network: ${networkId} does not exist in the config.json file`)
		return { networkHost: '', networkPort: '', tokenContract: '', interopContract: '', senderAccountIndex: '', recipientAccountIndex: '' }
	}
}

// Custom Command help is to generate the help text used when running --help on a command.
// 1. If usage string is provided print usage section
// 2. if example string is provided print example section
// 3. if options list has options provided print options section
// 4. If there are subcommands it will print subcommands, this uses the commandRoot array where each item are the commands in order.
// Logic is also in place to fix spacing based on length.
const commandHelp = (
	print: GluegunPrint,
	toolbox: Toolbox,
	exampleString: string,
	usageString: string,
	optionsList: { name: string; description: string }[],
	command: GluegunCommand,
	commandRoot: string[]
): void => {
	print.info(command.description)
	print.info('')
	// 1
	if (usageString) {
		print.info(toolbox.print.colors.bold('USAGE'))
		print.info('')
		print.info(usageString)
		print.info('')
	}
	// 2
	if (exampleString) {
		print.info(toolbox.print.colors.bold('EXAMPLE'))
		print.info('')
		print.info(`$ ${exampleString}`)
		print.info('')
	}
	// 3
	if (optionsList.length > 0) {
		// To calculate how long each title should be to make the formatting consistent
		const spaces = optionsList.reduce((acc, val) => {
			const stringLength = val.name.length
			if (stringLength > acc) {
				return stringLength
			} else {
				return acc
			}
		}, 0)
		print.info(toolbox.print.colors.bold('OPTIONS'))
		print.info('')
		optionsList.forEach(command => {
			const val = spaces - command.name.length
			const numberOfSpaces = val > 0 ? val : 0
			toolbox.print.info(
				`${command.name} ${Array(numberOfSpaces)
					.fill('\xa0')
					.join('')} ${command.description}`
			)
		})
		print.info('')
	}
	// 4
	toolbox.print.info(toolbox.print.colors.bold('COMMANDS'))
	toolbox.print.printCommands(toolbox, commandRoot)
	toolbox.print.info('')
}


export {
	getNetworkConfig, 
	commandHelp
}
