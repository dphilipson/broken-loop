export type LoopBody<T> = (
    onSuccess: (result: T) => void,
    onError: (error: any) => void
) => void;

enum StatusType { InProgress, Success, Failure };

type Status<T> =
    { type: StatusType.InProgress }
    | { type: StatusType.Success, result: T }
    | { type: StatusType.Failure, error: any };

function statusInProgress<T>(): Status<T> {
    return { type: StatusType.InProgress };
}

function statusSuccess<T>(result: T): Status<T> {
    return { type: StatusType.Success, result };
}

function statusFailure<T>(error: any): Status<T> {
    return { type: StatusType.Failure, error };
}

export function loopSynchronous<T>(body: LoopBody<T>): T {
    let status = statusInProgress<T>();
    while (status.type === StatusType.InProgress) {
        body(
            result => { status = statusSuccess(result); },
            error => { status = statusFailure<T>(error); });
    }
    if (status.type === StatusType.Success) {
        return status.result;
    } else {
        throw status.error;
    }
}

export function loopYieldingly<T>(body: LoopBody<T>): Promise<T> {
    let status = statusInProgress<T>();
    while (status.type === StatusType.InProgress) {
        body(
            result => { status = statusSuccess(result); },
            error => { status = statusFailure<T>(error); });
    }
    if (status.type === StatusType.Success) {
        return Promise.resolve(status.result);
    } else {
        return Promise.reject(status.error);
    }
}
