/**
 * Represents the body of a loop, written in a way to allow yielding to other code. The body is passed a function which
 * is to be called once a result is available. The loop body is permitted to throw.
 */
export interface LoopBody<T> {
    (done: (result: T) => void): void;
}

export interface YieldOptions {
    /**
     * Time granted to computations before yielding to allow other code to execute, in milliseconds. Defaults to
     * DEFAULT_TIME_BETWEEN_YIELDS.
     */
    readonly timeBetweenYields?: number;

    /**
     * Function used to read the current time in milliseconds. Defaults to Date.now(). Intended for testing, most users
     * will not need to change this.
     */
    getTimeFn?(): number;

    /**
     * Function used to yield to allow other code to execute. Defaults to window.requestAnimationFrame.
     */
    yieldFn?(action: () => void): void;
}

interface AllYieldOptions {
    readonly timeBetweenYields: number;
    getTimeFn(): number;
    yieldFn(action: () => void): void;
}

/**
 * Assumes an update period of 60 per second, which would give 16.7 ms each frame. Use a tad less time than this
 * in case other computations, such as rendering, need the remaining time.
 */
export const DEFAULT_TIME_BETWEEN_YIELDS = 14;

const DEFAULT_OPTIONS: AllYieldOptions = {
    timeBetweenYields: DEFAULT_TIME_BETWEEN_YIELDS,
    getTimeFn: () => Date.now(),
    yieldFn: action => { window.requestAnimationFrame(action); },
};

/**
 * Runs the loop body synchronously and returns the result or throws.
 */
export function loopSynchronous<T>(body: LoopBody<T>): T {
    let status = null as { result: T } | null;
    while (status === null) {
        body(result => status = { result });
    }
    return status.result;
}

interface LoopAction {
    (done: () => void): void;
}

/**
 * Class which manages long-running computations which are made to periodically yield to allow other code to execute.
 * The looper tracks all currently running computations and divides up the time in each yield period between them.
 * 
 * Because JavaScript is single-threaded, time is a global resource. Therefore, most programs should use a single global
 * Looper for all their asynchronous calculations.
 */
export class Looper {
    public static allowMultipleInstances = false;
    private static wasConstructed = false;

    private readonly options: AllYieldOptions;
    private readonly runningLoopActions: Set<LoopAction> = new Set();

    constructor(options: YieldOptions = {}) {
        if (Looper.wasConstructed && !Looper.allowMultipleInstances) {
            throw new Error(
                "Looper constructor called multiple times. This is probably not what you want. If you are sure you"
                + " want multiple Loopers, set Looper.allowMultipleInstances to true first.");
        }
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);
        Looper.wasConstructed = true;
    }

    /**
     * Runs the loop body in the "background", yielding it periodically to allow other code to run. Returns a Promise
     * which resolves when the body completes successfully or rejects when the body throws. 
     */
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
