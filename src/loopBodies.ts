import { LoopBody } from "./index";

export function whileBody<T>(condition: () => boolean, body: () => void, result: () => T): LoopBody<T> {
    return done => {
        if (condition()) {
            body();
        } else {
            done(result());
        }
    };
}

export function forNBody<T>(n: number, body: (i: number) => void, result: () => T): LoopBody<T> {
    let i = 0;
    return whileBody(
        () => i < n,
        () => {
            body(i);
            i++;
        },
        result);
}

export function mapBody<T, U>(items: T[], action: (item: T) => U): LoopBody<U[]> {
    const result: U[] = [];
    return forNBody(
        items.length,
        i => result.push(action(items[i])),
        () => result
    );
}

export function forEachBody<T>(items: T[], action: (item: T) => void): LoopBody<void> {
    return forNBody(
        items.length,
        i => action(items[i]),
        () => undefined
    );
}
