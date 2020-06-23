import {
  describeTaskDef,
  createTaskDefFromStack,
  compareDefs,
  registerTaskDef,
} from '../src/createTaskDefinition';
import stack from './assets/stack.json';
import taskDefExample from './assets/taskdef.json';
import exampleTaskDefResponse from './assets/exampleTaskDefResponse.json';

describe('describeTaskDef', () => {
  test('Can describe a task', async () => {
    const d = await describeTaskDef('telescope-services-test-ati-s3-visits-cache');
    expect(d).toEqual(exampleTaskDefResponse)
  })
});

describe('createTaskDefFromStack', () => {
  test('Can create Task def from Stack', () => {
    const env = 'test';
    const name = 'ati-s3-visits-cache';
    const tranformation = {
      clusterName: `${stack.stack}-${stack.type}-${env}`,
      imageName: `${stack[env].aws}.dkr.ecr.${stack[env].region}.amazonaws.com/${stack.stack}-${stack.type}-${env}/${name}`,
      taskFamily: `${stack.stack}-${stack.type}-${env}-${name}`,
    };
    const def = createTaskDefFromStack(tranformation, stack, name, 'test');
    console.log(JSON.stringify(def))
    expect(def).toEqual(taskDefExample);
  })
});


describe('createTaskDefFromStack', () => {
  test('Can create Task def from Stack', () => {
    const env = 'test';
    const name = 'ati-s3-visits-cache';
    const tranformation = {
      clusterName: `${stack.stack}-${stack.type}-${env}`,
      imageName: `${stack[env].aws}.dkr.ecr.${stack[env].region}.amazonaws.com/${stack.stack}-${stack.type}-${env}/${name}`,
      taskFamily: `${stack.stack}-${stack.type}-${env}-${name}`,
    };
    const def = createTaskDefFromStack(tranformation, stack, name, 'test');
    console.log(JSON.stringify(def))
    expect(def).toEqual(taskDefExample);
  })
});


describe('compareDefs', () => {
  test('no changes', () => {
    const res = compareDefs(exampleTaskDefResponse, taskDefExample);
    expect(res).toBe(true);
  });

  test('changes', () => {
    const res = compareDefs(exampleTaskDefResponse, taskDefExample);
    expect(res).toBe(false);
  });
});

describe.only('registerTaskDef', () => {
  test('Can add taskdef to ecs', async () => {
    
    await registerTaskDef(taskDefExample);
  });
});
