import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import {ScenarioRunner} from './scenariorunner'

//TODO: add error handling
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
    await scenarioRunner.loadScenarios();
    const scenarioNames = scenarioRunner.getScenarioNames();

    while (keepRunning) {
        const scenarioIndex = Math.round(Math.random() * (scenarioNames.length - 1));
        await scenarioRunner.runScenario(scenarioNames[scenarioIndex]);

        if (keepRunning) {
            const delay = Math.round(Math.random() * (MAX_DELAY_IN_MILLISECONDS - MIN_DELAY_IN_MILLISECONDS)) + MIN_DELAY_IN_MILLISECONDS;
            // TODO: Centralise the logging
            const timestamp = new Date().toISOString();
            const message = `sleeping for ${delay}ms before starting next scenario`;
            console.log(`CHAOS : ${timestamp} : ${message}`);
            await sleep(delay);
        }
    }

})();