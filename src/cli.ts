#!/usr/bin/env node
// #!/usr/bin/env node -r ts-node/register

import { program } from 'commander';
import main from './index';

program
  .arguments('<name>')
  .option('-f, --file <file>', 'location ', '.')
  .option('-e, --env <env>', 'environment to build', 'test')
  .option('-t, --tag <tag>', 'image tag', 'latest')
  .action((a, b) => {
    try {
      console.log('running version 1.0.10');
      main(a, b.file, b.env, b.tag);
    } catch (e) {
      console.log(e.message);
    }
  });

program.parse(process.argv);
