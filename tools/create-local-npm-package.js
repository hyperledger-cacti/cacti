/* eslint-disable no-console */
const { execSync } = require('child_process');
const fs = require('fs');
const { join } = require('path');

const TAG = '[create-local-npm-package]';
const PROJECT_ROOT = join(__dirname, '../'); // step out of the tools dir to project root
const TMP_DIR = join(PROJECT_ROOT, './.tmp');

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
    console.error(`${new Date().toJSON()} ${TAG} - Process crashed:`, ex);
    process.exit(1);
  });
