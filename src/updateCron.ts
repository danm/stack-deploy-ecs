import aws from 'aws-sdk';
import { IStack, ENV, describeTaskDef } from './createTaskDefinition';

const eventbridge = new aws.EventBridge({ apiVersion: '2015-10-07', region: 'eu-west-1' });
function createCronEvent(opts: IStack, name: string, env: ENV) {
  return new Promise(async (resolve, reject) => {
    const params: aws.EventBridge.PutRuleRequest = {
      Name: opts[env].cronName || `${name}-cron`,
      // cron's initial value is null but this property accepts undefined
      ScheduleExpression: opts[env].cron || undefined,
      State: "ENABLED"
    };
    eventbridge.putRule(params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}
function updateCronEvent(opts: IStack, name: string, env: ENV) {
  return new Promise(async (resolve, reject) => {
    const taskFamily = `${opts.stack}-${opts.type}-${env}-${name}`;
    const latestTaskDef = await describeTaskDef(taskFamily);
    const taskRevision = latestTaskDef.taskDefinition?.revision;
    const cluster = `${opts.stack}-${opts.type}`;

    const params: aws.EventBridge.PutTargetsRequest = {
      Rule: opts[env].cronName || `${name}-cron`,
      Targets:
        [
          {
            Id: opts[env].cronName || `${name}-cron`,
            Arn: `arn:aws:ecs:${opts[env].region}:${opts[env].aws}:cluster/${cluster}`,
            RoleArn: `arn:aws:iam::${opts[env].aws}:role/ecsEventsRole`,
            EcsParameters: {
              TaskDefinitionArn: `arn:aws:ecs:${opts[env].region}:${opts[env].aws}:task-definition/${taskFamily}:${taskRevision}`,
              TaskCount: opts[env].cronTaskCount || 1,
              LaunchType: "FARGATE",
              PlatformVersion: "LATEST",
              NetworkConfiguration: {
                awsvpcConfiguration: {
                  Subnets: ["subnet-d1e59d88", "subnet-b8a59ddd", "subnet-bb1e3ecc"],
                  SecurityGroups: ["sg-0867b0942f4dd8798"],
                  AssignPublicIp: "ENABLED"
                }
              }
            }
          }
        ]
    }
    eventbridge.putTargets(params, (err, res) => {
      if (err) {
        console.log(`failed puting targets ${err}`)
        reject(err)
      }
      else { resolve(res) };
    });
  });
}
async function updateCron(opts: IStack, name: string, env: ENV) {
  // can we update the service?
  try {
    const res = await updateCronEvent(opts, name, env);
    console.log('cron updated');
  } catch (e) {
    console.log(`error updating cron ${e}`)
    if (e.statusCode === 400) {
      console.log('cron not found, trying to create it...');
    } else {
      return e;
    }
  }

  try {
    await createCronEvent(opts, name, env);
    console.log('cron created');
  } catch (e) {
    if (e.code === 'ValidationException') {
      throw new Error('cron expression is not valid. Please double check it.')
    }
    console.log(e);
    return e;
  }
}

export default updateCron;
