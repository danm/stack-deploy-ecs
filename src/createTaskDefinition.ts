import aws from 'aws-sdk';
import dequal from 'fast-deep-equal';

export interface IEnvVar {
  key: string;
  value: string;
  secret: boolean;
}

export interface IEnvStack {
  aws: string;
  region: string;
  cpu: number;
  memory: number;
  desiredCount: number;
  cron?: string;
  cronName?: string;
  env: IEnvVar[],
  subnets: string[],
  securityGroups: string[],
}

export interface IStack {
  stack: string;
  type: string;
  test: IEnvStack,
  live: IEnvStack,
}

export type ENV = 'live' | 'test';

interface ITransformation {
  clusterName: string;
  imageName: string;
  taskFamily: string;
}

export function registerTaskDef(params: aws.ECS.RegisterTaskDefinitionRequest) {
  return new Promise((resolve, reject) => {
    const ecs = new aws.ECS({ apiVersion: '2014-11-13', region: 'eu-west-1' });
    ecs.registerTaskDefinition(params, (err, res) => {
      if (err) {
        console.log('Error writing Task Definition', JSON.stringify(params));
        reject(err);
        return;
      }
      resolve(res);
    });
  });
}

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ECS.html#describeTaskDefinition-property
export function describeTaskDef(taskDef: string): Promise<aws.ECS.DescribeTaskDefinitionResponse> {
  return new Promise((resolve, reject) => {
    const ecs = new aws.ECS({ apiVersion: '2014-11-13', region: 'eu-west-1' });
    const params = {
      taskDefinition: taskDef,
    };
    ecs.describeTaskDefinition(params, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

function orderArray(input: [], key: string) {
  return input.sort((a, b) => {
    if (a[key] > b[key]) return 1;
    if (a[key] < b[key]) return -1;
    return 0;
  });
}

// I've added any because the types do not match the payl

// false = they are not the same
// true = they are the same
export function compareDefs(
  old: any | aws.ECS.DescribeTaskDefinitionResponse,
  recent: any | aws.ECS.RegisterTaskDefinitionRequest,
) {
  const server = old.taskDefinition;
  const local = recent;
  const localContainer = local.containerDefinitions[0];
  const serverContainer = server.containerDefinitions[0];

  if (server?.cpu !== local.cpu) return false;
  if (server?.memory !== local.memory) return false;
  if (localContainer?.image !== serverContainer.image) return false;
  if (localContainer?.name !== serverContainer.name) return false;

  const orderedLocalEnv = orderArray(local.containerDefinitions[0].environment, 'name');
  const orderedLocalSec = orderArray(local.containerDefinitions[0].secrets, 'name');
  const orderedServerEnv = orderArray(server.containerDefinitions[0].environment, 'name');
  const orderedServerSec = orderArray(server.containerDefinitions[0].secrets, 'name');

  const environment = dequal(
    orderedLocalEnv,
    orderedServerEnv,
  );
  const secrets = dequal(
    orderedLocalSec,
    orderedServerSec,
  );

  if (environment === false || secrets === false) return false;
  return true;
}

export function createTaskDefFromStack(
  tranformation: ITransformation,
  opts: IStack,
  name: string,
  env: ENV,
) {
  const params: aws.ECS.RegisterTaskDefinitionRequest = {
    family: tranformation.taskFamily,
    executionRoleArn: `arn:aws:iam::${opts[env].aws}:role/ecsTaskExecutionRole`,
    containerDefinitions: [{
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': `/ecs/${tranformation.clusterName}`,
          'awslogs-region': opts[env].region,
          'awslogs-stream-prefix': 'ecs',
        },
      },
      portMappings: [],
      cpu: 0,
      environment: [],
      mountPoints: [],
      secrets: [],
      volumesFrom: [],
      image: tranformation.imageName,
      essential: true,
      name: `${tranformation.clusterName}-${name}`,
    }],
    placementConstraints: [],
    memory: String(opts[env].memory),
    cpu: String(opts[env].cpu),
    taskRoleArn: `arn:aws:iam::${opts[env].aws}:role/ecsTaskExecutionRole`,
    requiresCompatibilities: ['FARGATE'],
    networkMode: 'awsvpc',
    volumes: [],
  };
  opts[env].env.forEach((e: any) => {
    if (e.secret === true && params.containerDefinitions[0].secrets) {
      params.containerDefinitions[0].secrets.push({
        name: e.key,
        valueFrom: e.value,
      });
    } else if (params.containerDefinitions[0].environment) {
      params.containerDefinitions[0].environment.push({
        name: e.key,
        value: e.value,
      });
    }
  });
  return params;
}

async function taskDefinition(opts: IStack, name: string, env: ENV, tag: string) {
  const tranformation = {
    clusterName: `${opts.stack}-${opts.type}-${env}`,
    imageName: `${opts[env].aws}.dkr.ecr.${opts[env].region}.amazonaws.com/${opts.stack}-${opts.type}/${name}:${tag}`,
    taskFamily: `${opts.stack}-${opts.type}-${env}-${name}`,
  } as ITransformation;

  const taskDef = createTaskDefFromStack(tranformation, opts, name, env);
  if (env === 'live') {
    console.log('register new task def with latest of specific tag for live promotion');
    await registerTaskDef(taskDef);
    return;
  }
  if (opts[env].cron) {
    console.log('register new task def for crons');
    await registerTaskDef(taskDef);
    return;
  }
  let oldTaskDef;
  try {
    oldTaskDef = await describeTaskDef(tranformation.taskFamily);

  } catch (e) {
    console.log('No previous version of the task def found');
  }

  if (!oldTaskDef) {
    console.log('Previous version of task def not found, registering a new one,');
    await registerTaskDef(taskDef);
    return;
  }

  // there was a match, so lets compare and see if there is any need to update the task def
  const defsMatch = compareDefs(oldTaskDef, taskDef);

  if (defsMatch === false) {
    console.log('Task defs do not match, updating');
    await registerTaskDef(taskDef);
    console.log('Task defs has been updated');
    return;
  }

  console.log('No change detected in Task defs');
}

export default taskDefinition;
