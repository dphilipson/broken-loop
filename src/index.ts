import {Status} from "./Status";

export interface LoopBody<T> {
    (done: (result: T) => void): void;
}

export interface YieldOptions {
    readonly timeBetweenYields?: number;
    getTimeFn?(): number;
    yieldFn?(action: () => void): void;
}

export const DEFAULT_TIME_BETWEEN_YIELDS = 12;

const defaultYieldOptions: YieldOptions = {
    timeBetweenYields: DEFAULT_TIME_BETWEEN_YIELDS,

    getTimeFn() {
        return Date.now();
    },

    yieldFn(action) {
        requestAnimationFrame(action);
    },
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

export function loopYieldingly<T>(body: LoopBody<T>, options: YieldOptions = {}): Promise<T> {
    let status = Status.inProgress<T>();
    while (status.type === Status.Type.InProgress) {
        try {
            body(result => { status = Status.success(result); });
        } catch (error) {
            status = Status.failure<T>(error);
        }
    }
    if (status.type === Status.Type.Success) {
        return Promise.resolve(status.result);
    } else {
        return Promise.reject(status.error);
    }
}
