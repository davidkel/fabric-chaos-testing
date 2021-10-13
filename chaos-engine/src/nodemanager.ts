import Dockerode, { ContainerInfo } from 'dockerode';
import {Logger} from './logger';

export type NodeManagerActions = (params: string[]) => Promise<void>;

type ContainerType = 'orderer' | 'peer' | 'gateway';
type StopType = 'stop' | 'pause';
type StartType = 'restart' | 'unpause';
type RestartCount = 'first' | 'all';

export class NodeManager {

    private docker: Dockerode;
    private stoppedContainers: ContainerInfo[] = [];

    constructor(private readonly gatewayPeer: string, private readonly scenarioName: string) {
        this.docker = new Dockerode();
    }

    private async getGatewayPeer(): Promise<ContainerInfo | null> {
        const containers = await this.docker.listContainers();

        for (const container of containers) {
            if (container.State !== 'paused' && container.Names[0].substr(1).toLowerCase() === this.gatewayPeer) {
                return container;
            }
        }

        Logger.logPoint('Running', this.scenarioName, `Gateway peer ${this.gatewayPeer} paused or not found`);
        return null;
    }

    private async getAllRunningPeerContainers(organisation: string | null = null): Promise<ContainerInfo[]> {
        const containers = await this.docker.listContainers();
        const peerContainers: ContainerInfo[] = [];

        for (const container of containers) {
            const containerName = container.Names[0].substr(1).toLowerCase();
            if (containerName.startsWith('peer') && containerName !== this.gatewayPeer && container.State !== 'paused') {
                const splitName = container.Names[0].split('.');
                if (!organisation) {
                    peerContainers.push(container);
                } else if (splitName[1] === organisation) {
                    peerContainers.push(container);
                }
            }
        }

        return peerContainers;
    }

    private async getAllOrdererContainers() {
        const containers = await this.docker.listContainers();
        const ordererContainers: ContainerInfo[] = [];

        for (const container of containers) {
            const containerName = container.Names[0].substr(1).toLowerCase();
            if (containerName.startsWith('orderer') && container.State !== 'paused') {
                ordererContainers.push(container);
            }
        }

        return ordererContainers;
    }

    private async stopContainer(containerInfo: ContainerInfo, stop: StopType, containerType: ContainerType) {
        const containerName = containerInfo.Names[0].substr(1);
        Logger.logPoint('Running', this.scenarioName, `${stop === 'stop' ? 'stopping' : 'pausing'} ${containerType} ${containerName} ${containerInfo.Id}`);
        const container = this.docker.getContainer(containerInfo.Id);
        await (stop === 'stop' ? container.stop() : container.pause());
        Logger.logPoint('Running', this.scenarioName, `${stop === 'stop'? 'stopped' : 'paused'}  ${containerType} ${containerName} ${containerInfo.Id}`);
        this.stoppedContainers.push(containerInfo);
    }

    private async restartStoppedContainers(start: StartType, containerType: ContainerType, org: string | undefined = undefined, restartType: RestartCount = 'first') {
        if (this.stoppedContainers.length === 0) {
            Logger.logPoint('Running', this.scenarioName, 'No containers to start');
            return;
        }

        let containersToStart: ContainerInfo[] = [];
        let containerName: string = '';

        for (const stoppedContainer of this.stoppedContainers) {
            containerName = stoppedContainer.Names[0].substr(1).toLowerCase();
            if (containerType === 'gateway' && containerName === this.gatewayPeer) {
                containersToStart.push(stoppedContainer);
                break;
            }

            if (containerType === 'peer' && containerName.startsWith('peer')) {
                if (!org || containerName.includes(org)) {
                    containersToStart.push(stoppedContainer);
                    if (restartType === 'first') {
                        break;
                    }
                }
            }

            if (containerType === 'orderer' && containerName.startsWith('orderer')) {
                containersToStart.push(stoppedContainer);
                if (restartType === 'first') {
                    break;
                }
        }
        }

        if (containersToStart.length === 0) {
            Logger.logPoint('Running', this.scenarioName, 'No container found to start');
        }

        for (const containerToStart of containersToStart) {
            containerName = containerToStart.Names[0].substr(1).toLowerCase();
            Logger.logPoint('Running', this.scenarioName, `${start === 'restart' ? 'restarting' : 'unpausing'} ${containerType} ${containerName} ${containerToStart!.Id}`);
            const container = this.docker.getContainer(containerToStart!.Id);
            await (start === 'restart' ? container.start() : container.unpause());
            Logger.logPoint('Running', this.scenarioName, `${start === 'restart' ? 'restarted' : 'unpaused'} ${containerType} ${containerName} ${containerToStart!.Id}`);
            const indexOfContainer = this.stoppedContainers.indexOf(containerToStart);
            this.stoppedContainers.splice(indexOfContainer, 1);
        }
    }

    // Node actions

    // Peer Actions

    async pauseGatewayPeer(): Promise<void> {
        const gatewayPeerInfo = await this.getGatewayPeer();
        if (gatewayPeerInfo) {
            await this.stopContainer(gatewayPeerInfo, 'pause', 'gateway');
        }
    }

    async stopGatewayPeer(): Promise<void> {
        const gatewayPeerInfo = await this.getGatewayPeer();
        if (gatewayPeerInfo) {
            await this.stopContainer(gatewayPeerInfo, 'stop', 'gateway');
        }
    }

    async unpauseGatewayPeer(): Promise<void> {
        await this.restartStoppedContainers('unpause', 'gateway');
    }

    async restartGatewayPeer(): Promise<void> {
        await this.restartStoppedContainers('restart', 'gateway');
    }

    async pauseNonGatewayPeer(params: string[]): Promise<void> {
        await this.stopNonGatewayPeer(params, false);
    }

    async stopNonGatewayPeer(params: string[], stop = true): Promise<void> {
        const organisation = params[0];
        const peers = await this.getAllRunningPeerContainers(organisation);

        if (peers.length === 0) {
            if (organisation) {
                Logger.logPoint('Running', this.scenarioName, `No running non gateway peers for ${organisation} found`)
            } else {
                Logger.logPoint('Running', this.scenarioName, `No running non gateway peers found`)
            }
            return;
        }

        const randomPeerIndex = Math.round(Math.random() * (peers.length - 1));
        const nonGatewayPeer = peers[randomPeerIndex];
        await this.stopContainer(nonGatewayPeer, stop ? 'stop' : 'pause', 'peer');
    }

    async unpauseNonGatewayPeer(params: string[]): Promise<void> {
        await this.restartStoppedContainers('unpause', 'peer', params[0]);
    }

    async restartNonGatewayPeer(params: string[]): Promise<void> {
        await this.restartStoppedContainers('restart', 'peer', params[0]);
    }

    // Peer Org Actions

    async stopAllOrgPeers(params: string[], stop = true): Promise<void> {
        const peers = await this.getAllRunningPeerContainers(params[0]);
        for (const peer of peers) {
            await this.stopContainer(peer, stop ? 'stop' : 'pause', 'peer');
        }
    }

    async restartAllOrgPeers(params: string[], start = true): Promise<void> {
        const organisation = params[0];
        await this.restartStoppedContainers('restart', 'peer', organisation, 'all');
    }

    async pauseAllOrgPeers(params: string[]): Promise<void> {
        await this.stopAllOrgPeers(params, false);
    }

    async unpauseAllOrgPeers(params: string[]): Promise<void> {
        const organisation = params[0];
        await this.restartStoppedContainers('unpause', 'peer', organisation, 'all');
    }


    // Orderer Actions

    async stopOrderer(stop = true): Promise<void> {
        const orderers = await this.getAllOrdererContainers();

        if (orderers.length === 0) {
            Logger.logPoint('Running', this.scenarioName, 'No running orderers found');
            return;
        }

        const randomOrdererIndex = Math.round(Math.random() * (orderers.length - 1));
        const orderer = orderers[randomOrdererIndex];
        await this.stopContainer(orderer, stop ? 'stop' : 'pause', 'orderer');
    }

    async pauseOrderer(): Promise<void> {
        await this.stopOrderer(false);
    }

    async restartOrderer(): Promise<void> {
        await this.restartStoppedContainers('restart', 'orderer');
    }

    async unpauseOrderer(): Promise<void> {
        await this.restartStoppedContainers('unpause', 'orderer');
    }

    async stopAllOrderers(stop = true): Promise<void> {
        const orderers = await this.getAllOrdererContainers();
        for (const orderer of orderers) {
            await this.stopContainer(orderer, stop ? 'stop' : 'pause', 'orderer');
        }
    }

    async restartAllOrderers(): Promise<void> {
        await this.restartStoppedContainers('restart', 'orderer', undefined, 'all');
    }

    async pauseAllOrderers(): Promise<void> {
        await this.stopAllOrderers(false);
    }

    async unpauseAllOrderers(): Promise<void> {
        await this.restartStoppedContainers('unpause', 'orderer', undefined, 'all');
    }

    async sleep(params: string[]): Promise<void> {
        let ms = params[0].toLowerCase();
        let delay: number;

        if (ms.startsWith('random[')) {
            const randomRange = ms.substr(7, ms.length - 8).split(',');
            delay = Math.round(Math.random() * (parseInt(randomRange[1]) - parseInt(randomRange[0]))) + parseInt(randomRange[0]);
        } else {
            delay = parseInt(params[0]);
            if (delay === NaN) {
                delay = 1000;
            }
        }

        Logger.logPoint('Running', this.scenarioName, `sleeping for ${delay}`);
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    static validateStep(stepMethod: string, actionAndParameters: string[]) {
        if (stepMethod === 'sleep') {

            if (!actionAndParameters[1]) {
                throw new Error(`${actionAndParameters[0]} requires a parameter`);
            }

            if (actionAndParameters[1].startsWith('random[')) {
                const randomRange = actionAndParameters[1].substr(7, actionAndParameters[1].length - 8).split(',');
                if (randomRange.length != 2 || parseInt(randomRange[0]) === NaN || parseInt(randomRange[1]) === NaN) {
                    throw new Error(`${actionAndParameters[0]} parameter is not a valid random declaration`);
                }
            } else if (parseInt(actionAndParameters[1]) === NaN) {
                throw new Error(`${actionAndParameters[0]} parameter is not a number`);
            }
        }
    }
}