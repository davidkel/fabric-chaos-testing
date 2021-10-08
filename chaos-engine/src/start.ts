import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import {ScenarioRunner} from './scenariorunner'
import {Logger} from './logger';

//TODO: Make configurable
const MIN_DELAY_IN_MILLISECONDS = 100;
const MAX_DELAY_IN_MILLISECONDS = 1000;

let keepRunning = true;
process.on('SIGINT', () => {
    console.log('request to terminate received, will stop when current scenario ends');
    keepRunning = false;
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const scenarioRunner = new ScenarioRunner(process.argv[2], process.argv[3]);

    try {
        await scenarioRunner.loadScenarios();
        const scenarioNames = scenarioRunner.getScenarioNames();

        while (keepRunning) {
            const scenarioIndex = Math.round(Math.random() * (scenarioNames.length - 1));
            await scenarioRunner.runScenario(scenarioNames[scenarioIndex]);

            if (keepRunning) {
                const delay = Math.round(Math.random() * (MAX_DELAY_IN_MILLISECONDS - MIN_DELAY_IN_MILLISECONDS)) + MIN_DELAY_IN_MILLISECONDS;
                Logger.logPoint('', `sleeping for ${delay}ms before starting next scenario`);
                await sleep(delay);
            }
        }
    } catch(error) {
        console.log(error);
        console.log('Terminating due to error');
    }

})();