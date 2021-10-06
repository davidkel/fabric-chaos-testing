import Dockerode, { ContainerInfo } from 'dockerode';

export type NodeManagerActions = (params: string[]) => Promise<void>;

type ContainerType = 'orderer' | 'peer' | 'gateway';
type StopType = 'stop' | 'pause';
type StartType = 'restart' | 'unpause';

//TODO: Error Handling
//TODO: complete actions

export class NodeManager {

    private docker: Dockerode;
    private stoppedContainers: ContainerInfo[] = [];

    constructor(private readonly gatewayPeer: string) {
        this.docker = new Dockerode();
    }

    private async getGatewayPeer(): Promise<ContainerInfo> {
        const containers = await this.docker.listContainers();
        for (const container of containers) {
            if (container.Names[0].substr(1).toLowerCase() === this.gatewayPeer) {
                return container;
            }
        }
        throw new Error(`Gateway peer ${this.gatewayPeer} not found`);
    }

    private async getAllRunningPeerContainers(organisation: string | null = null): Promise<ContainerInfo[]> {
        const containers = await this.docker.listContainers();
        const peerContainers: ContainerInfo[] = [];
        for (const container of containers) {
            const containerName = container.Names[0].substr(1).toLowerCase();
            if (containerName.startsWith('peer') && containerName !== this.gatewayPeer) {
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
            if (container.Names[0].startsWith('orderer')) {
                ordererContainers.push(container);
            }
        }
        return ordererContainers;
    }

    private async stopContainer(containerInfo: ContainerInfo, stop: StopType, containerType: ContainerType) {
        const containerName = containerInfo.Names[0].substr(1);
        this.logPoint(`${stop === 'stop' ? 'stopping' : 'pausing'} ${containerType} ${containerName} ${containerInfo.Id}`);
        const container = this.docker.getContainer(containerInfo.Id);
        await (stop === 'stop' ? container.stop() : container.pause());
        this.logPoint(`${stop === 'stop'? 'stopped' : 'paused'}  ${containerType} ${containerName} ${containerInfo.Id}`);
        this.stoppedContainers.push(containerInfo);
    }

    private async restartStoppedContainer(start: StartType, containerType: ContainerType, org: string | undefined = undefined) {
        if (this.stoppedContainers.length === 0) {
            this.logPoint("No containers to start");
            return;
        }

        let containerToStart: ContainerInfo | undefined;
        let containerName: string = '';

        for (const stoppedContainer of this.stoppedContainers) {
            containerName = stoppedContainer.Names[0].substr(1).toLowerCase();
            if (containerType === 'gateway' && containerName === this.gatewayPeer) {
                containerToStart = stoppedContainer;
                break;
            }

            if (containerType === 'peer' && containerName.startsWith('peer')) {
                if (!org || containerName.includes(org)) {
                    containerToStart = stoppedContainer;
                    break;
                }
            }

            if (containerType === 'orderer' && containerName.startsWith('orderer')) {
                containerToStart = stoppedContainer;
                break;
            }
        }

        if (!containerToStart) {
            this.logPoint('No container found to start');
        }

        this.logPoint(`${start === 'restart' ? 'restarting' : 'unpausing'} ${containerType} ${containerName} ${containerToStart!.Id}`);
        const container = this.docker.getContainer(containerToStart!.Id);
        await (start === 'restart' ? container.start() : container.unpause());
        this.logPoint(`${start === 'restart' ? 'restarted' : 'unpaused'} ${containerType} ${containerName} ${containerToStart!.Id}`);
    }

    // TODO: move to JSON
    private logPoint(message: string) {
        const timestamp = new Date().toISOString();
        console.log(`CHAOS : ${timestamp} : ${message}`);
    }


    // Node actions

    // Peer Actions

    async pauseGatewayPeer(): Promise<void> {
        const gatewayPeerInfo = await this.getGatewayPeer();
        await this.stopContainer(gatewayPeerInfo, 'pause', 'gateway');
    }

    async stopGatewayPeer(): Promise<void> {
        const gatewayPeerInfo = await this.getGatewayPeer();
        await this.stopContainer(gatewayPeerInfo, 'stop', 'gateway');
    }

    async unpauseGatewayPeer(): Promise<void> {
        await this.restartStoppedContainer('unpause', 'gateway');
    }

    async restartGatewayPeer(): Promise<void> {
        await this.restartStoppedContainer('restart', 'gateway');
    }

    async pauseNonGatewayPeer(params: string[]): Promise<void> {
        await this.stopNonGatewayPeer(params, false);
    }

    async stopNonGatewayPeer(params: string[], stop = true): Promise<void> {
        const peers = await this.getAllRunningPeerContainers(params[0]);
        if (peers.length === 0) {
            throw new Error('No peers');
        }

        const randomPeerIndex = Math.round(Math.random() * (peers.length - 1));
        const nonGatewayPeer = peers[randomPeerIndex];
        await this.stopContainer(nonGatewayPeer, 'stop', 'peer');
    }

    async unpauseNonGatewayPeer(params: string[]): Promise<void> {
        await this.restartStoppedContainer('unpause', 'peer', params[0]);
    }

    async restartNonGatewayPeer(params: string[]): Promise<void> {
        await this.restartStoppedContainer('restart', 'peer', params[0]);
    }

    // Org Actions TODO

    async stopAllOrgPeers(params: string[]): Promise<void> {
        // get all the peers in the org
        // stop them and save them
    }

    async restartAllOrgPeers(params: string[]): Promise<void> {
        // get all the peers in the org
        // stop them and save them
    }

    async pauseAllOrgPeers(params: string[]): Promise<void> {
        // get all the peers in the org
        // stop them and save them
    }

    async unpauseAllOrgPeers(params: string[]): Promise<void> {
        // get all the peers in the org
        // stop them and save them
    }


    // Orderer Actions

    async stopOrderer(): Promise<void> {
        const orderers = await this.getAllOrdererContainers();
        if (orderers.length === 0) {
            throw new Error('No orderers');
        }

        const randomOrdererIndex = Math.round(Math.random() * (orderers.length - 1));
        const orderer = orderers[randomOrdererIndex];
        this.stopContainer(orderer, 'stop', 'orderer');

    }
    async pauseOrderer(): Promise<void> {
        const orderers = await this.getAllOrdererContainers();
        if (orderers.length === 0) {
            throw new Error('No orderers');
        }

        const randomOrdererIndex = Math.round(Math.random() * (orderers.length - 1));
        const orderer = orderers[randomOrdererIndex];
        this.stopContainer(orderer, 'pause', 'orderer');
    }

    async restartOrderer(): Promise<void> {
        this.restartStoppedContainer('restart', 'orderer');
    }

    async unpauseOrderer(): Promise<void> {
        this.restartStoppedContainer('unpause', 'orderer');
    }

    async stopAllOrderers(): Promise<void> {
        // TODO
    }

    async restartAllOrderers(): Promise<void> {
        // TODO

    }

    async pauseAllOrderers(): Promise<void> {
        // TODO
    }

    async unpauseAllOrderers(): Promise<void> {
        // TODO
    }

    async sleep(params: string[]): Promise<void> {
        this.logPoint(`sleeping for ${params[0]}`);
        return new Promise(resolve => setTimeout(resolve, parseInt(params[0])));
    }
}