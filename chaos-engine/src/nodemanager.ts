import Dockerode, { ContainerInfo } from 'dockerode';

export type NodeManagerActions = (params: string[]) => Promise<void>;

//TODO: Error Handling
//TODO: add more actions

export class NodeManager {

    private docker: Dockerode;
    private stoppedContainers: ContainerInfo[] = [];

    constructor(private readonly gatewayPeer: string) {
        this.docker = new Dockerode();
    }

    async getGatewayPeer(): Promise<ContainerInfo> {
        const containers = await this.docker.listContainers();
        for (const container of containers) {
            if (container.Names[0].substr(1).toLowerCase() === this.gatewayPeer) {
                return container;
            }
        }
        throw new Error(`Gateway peer ${this.gatewayPeer} not found`);
    }

    async getAllPeerContainers(organisation: string | null = null): Promise<ContainerInfo[]> {
        const containers = await this.docker.listContainers();
        const peerContainers: ContainerInfo[] = [];
        for (const container of containers) {
            if (container.Names[0].startsWith('peer')) {
                const splitName = container.Names[0].split('.');
                // TODO: Only include the running peers
                if (!organisation) {
                    peerContainers.push(container);
                } else if (splitName[1] === organisation) {
                    peerContainers.push(container);
                }
            }
        }
        return peerContainers;
    }

    async getAllOrdererContainers() {
        const containers = await this.docker.listContainers();
        const ordererContainers: ContainerInfo[] = [];
        for (const container of containers) {
            if (container.Names[0].startsWith('orderer')) {
                ordererContainers.push(container);
            }
        }
        return ordererContainers;
    }

    async pauseGatewayPeer(): Promise<void> {
        await this.stopGatewayPeer(false);
    }

    async stopGatewayPeer(stop = true): Promise<void> {
        const gatewayPeerInfo = await this.getGatewayPeer();
        this.logPoint(`${stop ? 'stopping' : 'pausing'} gateway peer ${this.gatewayPeer} ${gatewayPeerInfo.Id}`);
        const container = this.docker.getContainer(gatewayPeerInfo.Id);
        await (stop ? container.stop() : container.pause());
        this.logPoint(`${stop ? 'stopped' : 'paused'} gateway peer ${this.gatewayPeer} ${gatewayPeerInfo.Id}`);
        this.stoppedContainers.push(gatewayPeerInfo);
    }

    async unpauseGatewayPeer(): Promise<void> {
        await this.restartGatewayPeer(false);
    }

    async restartGatewayPeer(start = true): Promise<void> {
        // TODO: check if the stopped list is the gateway container
        // TODO: check it is actually stopped
        const gatewayContainerInfo = this.stoppedContainers.pop();
        this.logPoint(`${start ? 'restarting' : 'unpausing'} gateway peer ${this.gatewayPeer} ${gatewayContainerInfo?.Id}`);
        const container = this.docker.getContainer(gatewayContainerInfo!.Id);
        await (start ? container.start() : container.unpause());
        this.logPoint(`${start ? 'restarted' : 'unpaused'} gateway peer ${this.gatewayPeer} ${gatewayContainerInfo?.Id}`);
    }

    async pauseNonGatewayPeer(params: string[]) {
        const peers = await this.getAllPeerContainers(params[0]);
        if (peers.length <= 1) {
            // not enough peers
            throw new Error('not enough peers');
        }

        // find a random peer and stop it
        // save that peer
    }

    async unpausetNonGatewayPeer() {
        // restart the stopped peer
    }

    async stopNonGatewayPeer(params: string[]) {
        const peers = await this.getAllPeerContainers(params[0]);
        if (peers.length <= 1) {
            // not enough peers
            throw new Error('not enough peers');
        }

        // find a random peer and stop it
        // save that peer
    }

    async restartNonGatewayPeer() {
        // restart the stopped peer
    }

    async stopOrg(params: string[]) {
        // get all the peers in the org
        // stop them and save them
    }

    async restartOrg(params: string[]) {
        // get all the peers in the org
        // stop them and save them
    }

    async pauseOrg(params: string[]) {
        // get all the peers in the org
        // stop them and save them
    }

    async unpauseOrg(params: string[]) {
        // get all the peers in the org
        // stop them and save them
    }

    async stopOrderer() {
        // find a running orderer, stop it and save it
    }

    async restartOrderer() {
        // chose a stopped orderer and restart it
    }

    async pauseOrderer() {
        // find a running orderer, stop it and save it
    }

    async unpauseOrderer() {
        // chose a stopped orderer and restart it
    }

    async stopAllOrderers() {

    }

    async restartAllOrderers() {

    }

    async pauseAllOrderers() {

    }

    async unpauseAllOrderers() {

    }


    async sleep(params: string[]): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, parseInt(params[0])));
    }

    private logPoint(message: string) {
        const timestamp = new Date().toISOString();
        console.log(`CHAOS : ${timestamp} : ${message}`);
    }
}