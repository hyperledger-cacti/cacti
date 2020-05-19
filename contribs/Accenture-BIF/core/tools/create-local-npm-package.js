/* eslint-disable no-console */
const { execSync } = require('child_process');
const fs = require('fs');
const { join } = require('path');

const TAG = '[create-local-npm-package]';
const PROJECT_ROOT = join(__dirname, '../'); // step out of the tools dir to project root
const TMP_DIR = join(PROJECT_ROOT, './.tmp');

/**
 * A short, self-contained script with zero dependencies (so that it doesn't require package.sjon/npm install)
 * to be executed. It just needs NodeJS installed on the host operating system to be ready to go.
 *
 * The script is responsible for generating an npm package archivel file with a fixed name that can be used to install
 * Cactus locally for the examples without having to depend on remote Github URLs/registries for installation (which
 * hugely complicates things and makes the whole process less deterministic)
 *
 * CWD (current working directory) agnostic: script anchors paths based on assumption that it is one level down from
 * the root directory in the tools sub-folder so it will work regardless of where it was invoked from. This was
 * necessary to make it easy to call the script from the examples/ sub-folders without having to bother about relative
 * paths/project root resolution/normalization.
 *
 * Step by step this is what the script does:
 * 1. Prints diagnostic info for debugging purposes about node and npm versions.
 * 2. Reads the package.json file's contents form the project root directory
 * 3. Gets version, package name from package.json contents (after parsing the JSON string)
 * 4. Assembles the package file name that npm pack will produce based on the metadata (version, name) of the package
 *      obtained in step 3).
 * 5. Invokes shell `npm pack` so that npm generates the package file that we already know the name of from step 4)
 * 6. Renames and moves the generated package file so that a) it does not have a version in it's name and b) it resides
 *      in a directory that is not under version control (.tmp directory).
 * 7. Prints success or failure depending on what happened.
 *
 */
const main = async () => {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR);
  }

  const nodeVersion = execSync('node --version')
    .toString()
    .trim();

  const npmVersion = execSync('npm --version')
    .toString()
    .trim();

  console.log(`${new Date().toJSON()} ${TAG} - NodeVersion=${nodeVersion}, npmVersion=${npmVersion}`);

  const packageFileName = execSync('npm pack', { cwd: PROJECT_ROOT })
    .toString()
    .trim();

  console.log(`${new Date().toJSON()} ${TAG} - packageFileName: "${packageFileName}"`);

  const packageJsonRaw = fs.readFileSync(join(PROJECT_ROOT, 'package.json'));
  const packageJson = JSON.parse(packageJsonRaw);
  console.log(`${new Date().toJSON()} ${TAG} - packageJson.version=${packageJson.version}`);

  const newPackageFileName = packageFileName.replace(packageJson.version, 'dev');
  fs.renameSync(join(PROJECT_ROOT, packageFileName), join(TMP_DIR, newPackageFileName));
  return newPackageFileName;
};

main()
  .then(newPackageFileName => {
    console.log(`${new Date().toJSON()} ${TAG} - SUCCESS_4d21b660-7676-4394-b853-642ce3617bed ${newPackageFileName}`);
    process.exit(0);
  })
  .catch(ex => {
    console.error(`${new Date().toJSON()} ${TAG} - FAILURE_4d21b660-7676-4394-b853-642ce3617bed Process crashed:`, ex);
    process.exit(1);
  });
