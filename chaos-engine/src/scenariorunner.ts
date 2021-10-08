import {NodeManager, NodeManagerActions} from './nodemanager'
import {Logger} from './logger';
import { promises as fs } from 'fs';
import * as path from 'path'
import * as yaml from 'js-yaml'

class Scenario {
    name: string = ''
    description: string = ''
    steps: string[] = []
}

type GatewaySteps = 'stopgateway' | 'restartgateway' | 'pausegateway' | 'unpausegateway';
type PeerSteps = 'unpausepeer' | 'restartpeer' | 'pausepeer' |'stoppeer' | 'stopallpeers' | 'pauseallpeers' | 'restartallpeers' | 'unpauseallpeers';
type OrdererSteps = 'pauseorderer' | 'stoporderer' | 'restartorderer' | 'unpauseorderer' | 'stopallorderers' | 'pauseallorderers' | 'restartallorderers' | 'unpauseallorderers';
type GenericSteps =  'delay' | 'sleep';
type Steps = GatewaySteps | PeerSteps | OrdererSteps | GenericSteps;

const stepMapper: Map<Steps, keyof NodeManager> = new Map<Steps, keyof NodeManager>();
stepMapper.set('stopgateway', 'stopGatewayPeer');
stepMapper.set('pausegateway', 'pauseGatewayPeer');
stepMapper.set('restartgateway', 'restartGatewayPeer');
stepMapper.set('unpausegateway', 'unpauseGatewayPeer');

stepMapper.set('stoppeer', 'stopNonGatewayPeer');
stepMapper.set('pausepeer', 'pauseNonGatewayPeer');
stepMapper.set('unpausepeer', 'unpauseNonGatewayPeer');
stepMapper.set('restartpeer', 'restartNonGatewayPeer');

stepMapper.set('stopallpeers', 'stopAllOrgPeers');
stepMapper.set('pauseallpeers', 'pauseAllOrgPeers');
stepMapper.set('restartallpeers', 'restartAllOrgPeers');
stepMapper.set('unpauseallpeers', 'unpauseAllOrgPeers');

stepMapper.set('stoporderer', 'stopOrderer');
stepMapper.set('pauseorderer', 'pauseOrderer');
stepMapper.set('restartorderer', 'restartOrderer');
stepMapper.set('unpauseorderer', 'unpauseOrderer');

stepMapper.set('stopallorderers', 'stopAllOrderers');
stepMapper.set('pauseallorderers', 'pauseAllOrderers');
stepMapper.set('restartallorderers', 'restartAllOrderers');
stepMapper.set('unpauseallorderers', 'unpauseAllOrderers');

stepMapper.set('delay', 'sleep');
stepMapper.set('sleep', 'sleep');

export class ScenarioRunner {

    private loadedScenarios: Map<string, Scenario> = new Map<string, Scenario>();

    constructor(private readonly scenariodir: string,
                private readonly gatewayPeer: string) {
    }

    async loadScenarios(): Promise<void> {
        const scenarioFiles = await fs.readdir(this.scenariodir);
        for (const scenarioFile of scenarioFiles) {
            if (scenarioFile.toLowerCase().endsWith('.yaml')) {
                const scenarioPath = path.join(this.scenariodir, scenarioFile)
                const scenarioContents = (await fs.readFile(scenarioPath)).toString();
                const scenario = yaml.load(scenarioContents) as Scenario;
                this.valiateSenario(scenario, scenarioPath);
                this.loadedScenarios.set(scenario.name, scenario);
            }
        }
    }

    getScenarioNames(): string[] {
        return Array.from(this.loadedScenarios.keys());
    }

    async runScenario(scenarioName: string) {
        const scenario = this.loadedScenarios.get(scenarioName);
        const nodeManager = new NodeManager(this.gatewayPeer);
        Logger.logPoint('Start', `running scenario ${scenarioName}:${scenario?.description}`);

        for (const step of scenario!.steps) {
            const actionAndParameters = step.split(' ');
            const stepMethod = stepMapper.get(actionAndParameters[0].toLowerCase() as Steps);
            if (!stepMethod) {
                throw new Error(`No step called ${actionAndParameters[0]} exists`);
            }

            const toInvoke = nodeManager[stepMethod as keyof NodeManager] as NodeManagerActions;
            actionAndParameters.shift();
            await toInvoke.call(nodeManager, actionAndParameters);
        }

        Logger.logPoint('End', `scenario ${scenarioName}:${scenario?.description} completed successfully`);
    }

    private valiateSenario(scenario: Scenario, scenarioPath: string) {
        if (!scenario.name) {
            throw new Error(`${scenarioPath} has no 'name' defined`);
        }

        if (!scenario.steps || !Array.isArray(scenario.steps)) {
            throw new Error(`${scenarioPath} has no 'steps' defined or steps is not an array`);
        }

        for (const step of scenario.steps) {
            const actionAndParameters = step.split(' ');
            const stepMethod = stepMapper.get(actionAndParameters[0].toLowerCase() as Steps);
            if (!stepMethod) {
                throw new Error(`${scenarioPath} has unknown step called ${actionAndParameters[0]} defined`);
            }
        }
    }
}