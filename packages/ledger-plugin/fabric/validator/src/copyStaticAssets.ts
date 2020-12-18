import * as shell from 'shelljs';
shell.cp('-R', 'core/CA/', '../dist/core');
shell.cp('dependent/connection.json', '../dist/dependent');
