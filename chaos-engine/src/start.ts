import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import {ScenarioRunner} from './scenariorunner'

const INTERVAL_SCENARIO = '_interval';

type ChaosMode = 'random' | 'cycle';

let keepRunning = true;
process.on('SIGINT', () => {
    console.log('request to terminate received, will stop when current scenario ends');
    keepRunning = false;
});

// Arguments are
// path to scenarios
// name of gateway peer
// mode (defaults to random if not specified)

(async () => {
    const scenarioRunner = new ScenarioRunner(process.argv[2], process.argv[3]);
    let mode = process.argv[4] as ChaosMode;
    let singleScenario = process.argv[4];
    if (!mode) {
        mode = 'random';
    }
    mode.toLowerCase();

    try {
        await scenarioRunner.loadScenarios(INTERVAL_SCENARIO);
        const scenarioNames = scenarioRunner.getScenarioNames();

        if (scenarioNames.length === 0) {
            throw new Error(`No scenarios found in ${process.argv[2]}`);
        }

        if (mode !== 'random' && mode !== 'cycle' && !scenarioNames.includes(mode)) {
            throw new Error(`No scenario with name ${mode} exists`);
        }

        let scenarioIndex = 0;

        while (keepRunning) {

            if (mode === 'random') {
                scenarioIndex = Math.round(Math.random() * (scenarioNames.length - 1));
            }

            if (mode !== 'cycle' && mode !== 'random') {
                await scenarioRunner.runScenario(singleScenario);
                console.log('Single scenario run only, terminating');
                keepRunning = false;
            } else {
                await scenarioRunner.runScenario(scenarioNames[scenarioIndex]);
            }

            if (keepRunning && scenarioRunner.scenarioExists(INTERVAL_SCENARIO)) {
                await scenarioRunner.runScenario(INTERVAL_SCENARIO);

                if (mode === 'cycle') {
                    scenarioIndex++;
                    if (scenarioIndex >= scenarioNames.length) {
                        scenarioIndex = 0;
                    }
                }
            }
        }

    } catch(error) {
        console.log(error);
        console.log('Terminating due to error');
    }

})();