
export function resetDelay(min:number,max:number):number{
    return Math.floor(Math.random() * (max - min + 1) + min);
}
export function sleep(max:number,min:number):Promise<void>{
    return new Promise((resolve)=>{
        setTimeout(()=>{
            resolve();
        },resetDelay(min,max)
        );
    })
}

export function timeout(timeout:number):Promise<void>{
    return new Promise((_resolve,reject)=>{
        setTimeout(()=>{
            reject(new Error(`Promise timed out after ${timeout} ms`));
        },timeout
        );
    })
}

export function getRandomNumber(length:number):number{
    return Math.round(Math.random() * (length - 1));
}