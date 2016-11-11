export type LoopBody<T> = (
    onSuccess: (result: T) => void,
    onError: (error: any) => void
) => void;

export function loopSynchronous<T>(body: LoopBody<T>): T {
    let success: {success: T} | null = null as {success: T} | null;
    body(
        (t: T) => {
            success = {success: t};
        },
        (err: any) => {
            throw err;
        });
    if (success !== null) {
        return success.success;
    } else {
        throw new Error('Loop body ended without calling onSuccess()');
    }
}