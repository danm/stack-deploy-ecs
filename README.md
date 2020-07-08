# stack-deploy-ecs

Convert a stack.json file and deploy in ECS.

WIP, aws creds need to be store as env vars at the moment.


## Install

`npm i -g stack-deploy-ecs` or install via jenkins global settings

## Publish

Update the version number in the `package.json` abd then

`npm run build && npm publish`
