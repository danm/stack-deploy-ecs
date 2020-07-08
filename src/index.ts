import fs from 'fs';
import taskDefinition, { IStack, ENV } from './createTaskDefinition';
import updateECSService from './updateECSService';

async function main(name: string, loc: string, env: ENV, tag: string) {
  const f = fs.readFileSync(`${loc}/stack.json`, { encoding: 'utf8' });
  const stack: IStack = JSON.parse(f);

  try {
    await taskDefinition(stack, name, env, tag);
  } catch (e) {
    console.log(`Problem with Taskdef: ${e.message}`);
    return;
  }

  try {
    await updateECSService(stack, name, env);
  } catch (e) {
    console.log(`Problem updating service: ${e.message}`);
  }
}

export default main;
