
/**
 * Type representing the status of a loop, either in progress or finished with a possibly unsuccessful result.
 */
export type Status<T> = Status.InProgress | Status.Success<T> | Status.Failure;

export namespace Status {
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
