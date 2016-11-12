import {Status} from "./Status";

export type LoopBody<T> = (
    onSuccess: (result: T) => void,
    onError: (error: any) => void
) => void;

export interface YieldOptions {

};

export function loopSynchronous<T>(body: LoopBody<T>): T {
    let status = Status.inProgress<T>();
    while (status.type === Status.Type.InProgress) {
        body(
            result => { status = Status.success(result); },
            error => { status = Status.failure<T>(error); });
    }
    if (status.type === Status.Type.Success) {
        return status.result;
    } else {
        throw status.error;
    }
}

export function loopYieldingly<T>(body: LoopBody<T>): Promise<T> {
    let status = Status.inProgress<T>();
    while (status.type === Status.Type.InProgress) {
        body(
            result => { status = Status.success(result); },
            error => { status = Status.failure<T>(error); });
    }
    if (status.type === Status.Type.Success) {
        return Promise.resolve(status.result);
    } else {
        return Promise.reject(status.error);
    }
}
