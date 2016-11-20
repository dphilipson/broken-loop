import { Status } from "./Status";

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

export const DEFAULT_TIME_BETWEEN_YIELDS = 12;

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

/**
 * Helper type holding a task to be executed in a loop.
 */
interface Task {
    task(): void;
    reject(error: any): void;
}

export class Looper {
    private readonly options: AllYieldOptions;
    private readonly tasksById = new Map<number, Task>();

    constructor(options: YieldOptions = {}) {
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    }

    public loopYieldingly<T>(body: LoopBody<T>): Promise<T> {
        const {
            timeBetweenYields,
            getTimeFn,
            yieldFn,
        } = this.options;
        let status = Status.inProgress<T>();
        return new Promise((resolve, reject) => {
            const loop = () => {
                const startTime = getTimeFn();
                while (
                    status.type === Status.Type.InProgress
                    && getTimeFn() - startTime < timeBetweenYields
                ) {
                    try {
                        body(result => { status = Status.success(result); });
                    } catch (error) {
                        status = Status.failure<T>(error);
                    }
                }
                switch (status.type) {
                    case Status.Type.Success:
                        return resolve(status.result);
                    case Status.Type.Failure:
                        return reject(status.error);
                    default:
                        return yieldFn(loop);
                }
            };
            loop();
        });
    }
}

const DEFAULT_LOOPER = new Looper();

export function loopYieldingly<T>(body: LoopBody<T>): Promise<T> {
    return DEFAULT_LOOPER.loopYieldingly(body);
}
