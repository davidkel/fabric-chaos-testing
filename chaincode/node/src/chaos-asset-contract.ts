/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract } from 'fabric-contract-api';
import { chown } from 'fs';
import { ChaosAsset } from './chaos-asset';
import {Logger} from './logger';

export class ChaosAssetContract extends Contract {

    public async beforeTransaction(ctx: Context) {
        Logger.logPoint(ctx);
    }

    public async afterTransaction(ctx: Context) {
        Logger.logPoint(ctx, true);
    }

    public async chaosAssetExists(ctx: Context, chaosAssetId: string): Promise<boolean> {
        const data = await ctx.stub.getState(chaosAssetId);
        return (!!data && data.length > 0);
    }

    public async createChaosAsset(ctx: Context, chaosAssetId: string, value: string): Promise<void> {
        // const exists = await this.chaosAssetExists(ctx, chaosAssetId);
        // if (exists) {
        //     throw new Error(`The chaos asset ${chaosAssetId} already exists`);
        // }
        const chaosAsset = new ChaosAsset();
        chaosAsset.value = value;
        const buffer = Buffer.from(JSON.stringify(chaosAsset));
        await ctx.stub.putState(chaosAssetId, buffer);
    }

    public async readChaosAsset(ctx: Context, chaosAssetId: string): Promise<ChaosAsset> {
        const exists = await this.chaosAssetExists(ctx, chaosAssetId);
        if (!exists) {
            const noChaosAsset = new ChaosAsset();
            noChaosAsset.value = `The chaos asset ${chaosAssetId} does not exist`;
            return noChaosAsset;
        }
        const data = await ctx.stub.getState(chaosAssetId);
        const chaosAsset = JSON.parse(data.toString()) as ChaosAsset;
        return chaosAsset;
    }

    public async updateChaosAsset(ctx: Context, chaosAssetId: string, newValue: string): Promise<void> {
        // const exists = await this.chaosAssetExists(ctx, chaosAssetId);
        // if (!exists) {
        //     throw new Error(`The chaos asset ${chaosAssetId} does not exist`);
        // }
        const chaosAsset = new ChaosAsset();
        chaosAsset.value = newValue;
        const buffer = Buffer.from(JSON.stringify(chaosAsset));
        await ctx.stub.putState(chaosAssetId, buffer);
    }

    public async deleteChaosAsset(ctx: Context, chaosAssetId: string): Promise<void> {
        // const exists = await this.chaosAssetExists(ctx, chaosAssetId);
        // if (!exists) {
        //     throw new Error(`The chaos asset ${chaosAssetId} does not exist`);
        // }
        await ctx.stub.deleteState(chaosAssetId);
    }

    public async longRunningQuery(ctx: Context, repeat: number) : Promise<void> {
        for (let i = 0; i < repeat; i++) {
            await ctx.stub.getStateByRange(null, null);
        }
    }
    public async longRunningEvaluate(ctx: Context, start: number, end: number) : Promise<void> {
        for (let id = start; id <= end; id++) {
            await ctx.stub.getState('' + id);
        }
    }

    public async addUpdateAssets(ctx: Context, start: number, end: number): Promise<void> {
        for (let id = start; id <= end; id++) {
            const chaosAsset = new ChaosAsset();
            chaosAsset.value = '' + id;
            const buffer = Buffer.from(JSON.stringify(chaosAsset));
            await ctx.stub.putState('' + id, buffer);
        }
    }

    // could use logspout or CORE_VM_DOCKER_ATTACHSTDOUT=true
    public async crash() {
        process.exit(99);
    }

    public async nonDet(ctx: Context) {
        const rd = Math.random() * 100000;
        await ctx.stub.putState('random', Buffer.from(rd.toString()));
    }
}
