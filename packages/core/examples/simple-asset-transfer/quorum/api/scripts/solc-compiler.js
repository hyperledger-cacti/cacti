const Artifactor = require('truffle-artifactor');
const fs = require('fs');
const path = require('path');
const solc = require('solc');
// const { deleteFolderRecursive } = require('../utils/fsHandler');
const config = require('../config/config');
const logger = require('../utils/logger')('solcCompiler');

async function solcCompiler() {
  const input = {};
  const version = process.argv[2] || '';
  const contractsDir = path.join(config.solidity.contractsFolder, version);
  const buildDir = path.join(config.solidity.buildFolder, version);
  // TODO: You must not delete the folder shared with other node. Please, delete the files, not the folder.
  // deleteFolderRecursive(buildDir);

  fs.readdirSync(contractsDir).forEach(file => {
    if (file.endsWith('.sol')) {
      input[file] = { content: fs.readFileSync(path.join(contractsDir, file), 'utf8') };
    }
  });
  logger.log('info', Object.keys(input).length ? 'Solidity input successfully prepared' : 'Solidity input is Empty');

  const findImports = file => {
    logger.log('info', 'Including base file %s...', file);
    return { contents: fs.readFileSync(path.join(contractsDir, file), 'utf8') };
  };

  const output = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: 'Solidity',
        sources: input,
        settings: {
          outputSelection: {
            '*': {
              '*': ['*'],
            },
          },
        },
      }),
      findImports
    )
  );
  if (output.errors) {
    throw new Error(JSON.stringify(output.errors, null, 4));
  }

  const artifactor = new Artifactor(buildDir);
  await Promise.all(
    Object.keys(output.contracts).map(filename =>
      Promise.all(
        Object.keys(output.contracts[filename]).map(contractName => {
          logger.log('info', 'Processing %s: %s.', filename, contractName);
          const content = output.contracts[filename][contractName];
          const { abi } = content;
          const binary = content.evm.bytecode.object;
          const events = content.allEvents;
          const contractData = {
            contract_name: contractName,
            abi,
            binary,
            events,
          };
          return artifactor.save(contractData, path.join(buildDir, contractName));
        })
      )
    )
  );
}

solcCompiler()
  .then(() => logger.log('info', 'Contracts successfully compiled!'))
  .catch(error => logger.log('error', 'Contracts compiling was not finished: %s', error.stack));
