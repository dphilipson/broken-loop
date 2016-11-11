export type LoopBody<T> = (
    onSuccess: (result: T) => void,
    onError: (error: any) => void
) => void;

export function loopSynchronous<T>(body: LoopBody<T>): T {
    let success: { success: T } | null = null as { success: T } | null;
    while (success === null) {
        body(
            (t: T) => {
                success = { success: t };
            },
            (err: any) => {
                throw err;
            });
    }
    return success.success;
}
