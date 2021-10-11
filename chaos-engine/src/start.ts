import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import {ScenarioRunner} from './scenariorunner'

const INTERVAL_SCENARIO = '_interval';

let keepRunning = true;
process.on('SIGINT', () => {
    console.log('request to terminate received, will stop when current scenario ends');
    keepRunning = false;
});

(async () => {
    const scenarioRunner = new ScenarioRunner(process.argv[2], process.argv[3]);

    try {
        await scenarioRunner.loadScenarios(INTERVAL_SCENARIO);
        const scenarioNames = scenarioRunner.getScenarioNames();

        if (scenarioNames.length === 0) {
            throw new Error(`No scenarios found in ${process.argv[2]}`);
        }

        while (keepRunning) {
            const scenarioIndex = Math.round(Math.random() * (scenarioNames.length - 1));
            await scenarioRunner.runScenario(scenarioNames[scenarioIndex]);

            if (keepRunning && scenarioRunner.scenarioExists(INTERVAL_SCENARIO)) {
                await scenarioRunner.runScenario(INTERVAL_SCENARIO);
            }
        }

    } catch(error) {
        console.log(error);
        console.log('Terminating due to error');
    }

})();