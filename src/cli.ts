#!/usr/bin/env node
// #!/usr/bin/env node -r ts-node/register

import { program } from 'commander';
import main from './index';

program
  .arguments('<name>')
  .option('-f, --file <file>', 'location ', '.')
  .option('-e, --env <env>', 'environment to build', 'test')
  .action((a, b) => {
    try {
      console.log('running version 1.0.5');
      main(a, b.file, b.env);
    } catch (e) {
      console.log(e.message);
    }
  });

program.parse(process.argv);
