import { Status } from "./Status";

export * from "./loopBodies";

export interface LoopBody<T> {
    (done: (result: T) => void): void;
}

export interface YieldOptions {
    readonly timeBetweenYields?: number;
    getTimeFn?(): number;
    yieldFn?(action: () => void): void;
}

interface AllYieldOptions {
    readonly timeBetweenYields: number;
    getTimeFn(): number;
    yieldFn(action: () => void): void;
}

export const DEFAULT_TIME_BETWEEN_YIELDS = 14;

const DEFAULT_OPTIONS: AllYieldOptions = {
    timeBetweenYields: DEFAULT_TIME_BETWEEN_YIELDS,
    getTimeFn: () => Date.now(),
    yieldFn: action => { window.requestAnimationFrame(action); },
};

export function loopSynchronous<T>(body: LoopBody<T>): T {
    let status = Status.inProgress<T>();
    while (status.type === Status.Type.InProgress) {
        body(result => { status = Status.success(result); });
    }
    if (status.type === Status.Type.Success) {
        return status.result;
    } else {
        throw status.error;
    }
}

export function loopSynchronousWhile<T>(condition: () => boolean, body: () => void, result: () => T): T {
    return loopSynchronous<T>(done => {
        if (condition()) {
            body();
        } else {
            done(result());
        }
    });
}

interface LoopAction {
    (done: () => void): void;
}

export class Looper {
    private readonly options: AllYieldOptions;
    private readonly runningLoopActions: Set<LoopAction> = new Set();

    constructor(options: YieldOptions = {}) {
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    }

    public loopYieldingly<T>(body: LoopBody<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.runningLoopActions.add(done => {
                try {
                    body(result => {
                        resolve(result);
                        done();
                    });
                } catch (error) {
                    reject(error);
                    done();
                }
            });
            if (this.runningLoopActions.size === 1) {
                this.runNextPeriod();
            }
        });
    }

    private runNextPeriod(): void {
        const {
            timeBetweenYields,
            getTimeFn,
            yieldFn,
        } = this.options;
        const timePerLoop = timeBetweenYields / this.runningLoopActions.size;
        [...this.runningLoopActions].forEach(action => {
            const startTime = getTimeFn();
            let isDone = false;
            while (!isDone && getTimeFn() - startTime < timePerLoop) {
                action(() => {
                    isDone = true;
                    this.runningLoopActions.delete(action);
                });
            }
        });
        if (this.runningLoopActions.size > 0) {
            yieldFn(() => this.runNextPeriod());
        }
    }
}

const DEFAULT_LOOPER = new Looper();

export function loopYieldingly<T>(body: LoopBody<T>): Promise<T> {
    return DEFAULT_LOOPER.loopYieldingly(body);
}
