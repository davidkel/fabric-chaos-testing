
export function resetDelay(min:number,max:number):number{
    return Math.floor(Math.random() * (max - min + 1) + min)*1000;
}
export function sleep(max:number,min:number):Promise<void>{
    return new Promise((resolve)=>{
        setTimeout(()=>{
            resolve();
        },resetDelay(min,max)
        );
    })
}
export function promiseTimeout(
    timeout: number,
    callback: () => Promise<any>
): Promise<any> {
    return new Promise((resolve, reject) => {

        const timer = setTimeout(() => {
            reject(new Error(`Promise timed out after ${timeout} ms for txnID`));
        }, timeout);

        callback()
            .then((result: any) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}
