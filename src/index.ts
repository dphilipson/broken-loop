export type LoopBody<T> = (
    onSuccess: (result: T) => void,
    onError: (error: any) => void
) => void;

export interface YieldOptions {

};

// ----- Status. Used internally to track loop state. -----

type Status<T> = Status.InProgress | Status.Success<T> | Status.Failure;

namespace Status {
    export enum Type { InProgress, Success, Failure };

    export interface InProgress {
        type: Type.InProgress;
    }

    export interface Success<T> {
        type: Type.Success;
        result: T;
    }

    export interface Failure {
        type: Type.Failure;
        error: any;
    }

    export function inProgress<T>(): Status<T> {
        return { type: Type.InProgress };
    }

    export function success<T>(result: T): Status<T> {
        return { type: Type.Success, result };
    }

    export function failure<T>(error: any): Status<T> {
        return { type: Type.Failure, error };
    }
}

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
