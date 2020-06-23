#!/usr/bin/env node --max_old_space_size=8192 -r ts-node/register
// #!/usr/bin/env node --max_old_space_size=8192

import { program } from 'commander';
import main from './index';

program
  .arguments('<name>')
  .option('-f, --file <file>', 'location ', '.')
  .option('-e, --env <env>', 'environment to build', 'test')
  .action((a, b) => {
    try {
      main(a, b.file, b.env)
    } catch (e) {
      console.log(e.message);
    }
  });

program.parse(process.argv);

