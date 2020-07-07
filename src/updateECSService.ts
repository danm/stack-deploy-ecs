import aws from 'aws-sdk';
import { IStack, ENV } from './createTaskDefinition';

const ecs = new aws.ECS({
  apiVersion: '2014-11-13',
  region: 'eu-west-1',
});

function createService(opts: IStack, name: string, env: ENV) {
  return new Promise((resolve, reject) => {
    const params: aws.ECS.CreateServiceRequest = {
      cluster: `${opts.stack}-${opts.type}-${env}`,
      serviceName: `${name}-${env}`,
      taskDefinition: `${opts.stack}-${opts.type}-${env}-${name}`,
      desiredCount: opts[env].desiredCount,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: opts[env].subnets,
          assignPublicIp: 'DISABLED',
        },
      },
    };
    ecs.createService(params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

function updateService(opts: IStack, name: string, env: ENV) {
  return new Promise((resolve, reject) => {
    const params: aws.ECS.UpdateServiceRequest = {
      cluster: `${opts.stack}-${opts.type}-${env}`,
      service: `${name}-${env}`,
      desiredCount: opts[env].desiredCount,
      forceNewDeployment: true
    };
    ecs.updateService(params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function updateECSService(opts: IStack, name: string, env: ENV) {
  // can we update the service?
  try {
    const res = await updateService(opts, name, env);
    console.log('Service updated');
    return res;
  } catch (e) {
    if (e.statusCode === 400) {
      console.log('Service not found, trying to create it...');
    } else {
      return e;
    }
  }

  try {
    await createService(opts, name, env);
    console.log('Service created');
    return 'created';
  } catch (e) {
    console.log(e);
    return e;
  }
}

export default updateECSService;
