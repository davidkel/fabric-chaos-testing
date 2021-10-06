import {NodeManager, NodeManagerActions} from './nodemanager'
import { promises as fs } from 'fs';
import * as path from 'path'
import * as yaml from 'js-yaml'

//TODO: add error handling
//TODO: add more step mapping once actions are implemented

class Scenario {
    name: string = ''
    description: string = ''
    steps: string[] = []
}

type GatewaySteps = 'stopgateway' | 'restartgateway' | 'pausegateway' | 'unpausegateway';
type PeerSteps = 'unpausepeer' | 'restartpeer' | 'pausepeer' |'stoppeer';
type OrdererSteps = 'pauseorderer' | 'stoporderer' | 'restartorderer' | 'unpauseorderer';
type GenericSteps =  'delay' | 'sleep';
type Steps = GatewaySteps | PeerSteps | OrdererSteps | GenericSteps;

const stepMapper: Map<Steps, keyof NodeManager> = new Map<Steps, keyof NodeManager>();
stepMapper.set('stopgateway', 'stopGatewayPeer');
stepMapper.set('restartgateway', 'restartGatewayPeer');
stepMapper.set('pausegateway', 'pauseGatewayPeer');
stepMapper.set('unpausegateway', 'unpauseGatewayPeer');
stepMapper.set('stoppeer', 'stopNonGatewayPeer');
stepMapper.set('pausepeer', 'pauseNonGatewayPeer');
stepMapper.set('unpausepeer', 'unpauseNonGatewayPeer');
stepMapper.set('restartpeer', 'restartNonGatewayPeer');
stepMapper.set('pauseorderer', 'pauseOrderer');
stepMapper.set('restartorderer', 'restartOrderer');

//TODO: AllOrderer Actions
//TODO: Org Actions


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
        this.logPoint(`running scenario ${scenarioName}:${scenario?.description}`);

        for (const step of scenario!.steps) {
            const actionAndParameters = step.split(' ');
            const stepMethod = stepMapper.get(actionAndParameters[0].toLowerCase() as Steps);
            if (!stepMethod) {
                throw new Error(`No step called ${stepMethod} exists`);
            }

            const toInvoke = nodeManager[stepMethod as keyof NodeManager] as NodeManagerActions;
            actionAndParameters.shift();
            await toInvoke.call(nodeManager, actionAndParameters);
        }

        this.logPoint(`scenario ${scenarioName}:${scenario?.description} completed successfully`);

    }

    //TODO: Change to a JSON format
    private logPoint(message: string) {
        const timestamp = new Date().toISOString();
        console.log(`CHAOS : ${timestamp} : ${message}`);
    }
}