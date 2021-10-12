export type ScenarioStatus = 'Start' | 'Running' | 'End' | '';

interface ChaosLogMessage {
    component: string;
    timestamp: string;
    scenarioStatus: ScenarioStatus;
    message: string;
}

export class Logger {
    static logPoint(scenarioStatus: ScenarioStatus, message: string) {
        const timestamp = new Date().toISOString();
        const logMessage: ChaosLogMessage = {
            component: 'CHAOS',
            timestamp,
            scenarioStatus,
            message
        }

        console.log(JSON.stringify(logMessage));
    }
}