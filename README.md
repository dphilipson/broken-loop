# Broken Loop

Helpers for breaking up long running computations in JavaScript.

## Overview

Long-running computations pose a challenge for JavaScript authors. JavaScript is single-threaded, so if a computation takes a long time then it will prevent the program from doing anything else while it runs, including responding to user input or updating the UI.

A typical solution to this problem is to break up the long-running computation into smaller pieces so that the computation can yield to other code after completing one of the pieces. This is usually done ad hoc, and is easily implemented incorrectly. For example, calling `window.setTimeout(action, 0)` after every iteration is non-performant, so instead the loop should be allowed to run uninterrupted for a length of time before yielding. Further, if several such long-running computations are operating at once, the time must be split up between them in a reasonable way that avoids starvation.

Broken Loop provides a generalized solution for this problem that allows long-running code to yield in a uniform way. In particular, it has the following advantages:

* Simple promise-based API.
* Runs a given computation in a tight loop for a configurable length of time before yielding.
* Divides up the allocated time when multiple long-running computations are executing at once.
* Helpers for writing code that looks equivalent to an ordinary `for`, `while` or `forEach` loop.
* Ability to easily switch between synchronous (non-yielding) computations and asychronous (yielding) ones.

This can be used similarly to how one might use a background thread to run a computation in another language to avoid freezing the UI or blocking a server from serving requests. For an alternative, see [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

## Installation

```
npm install --save broken-loop
```

## API

### `new Looper(opts?)`

`Looper` is a class which manages and runs the currenly executing long-running computations. It may be provided the following optional options:

* `timeBetweenYields`. Time granted to computations before yielding to allow other code to run, in milliseconds. Defaults to 14 ms, which assumes a frame rate of 60 fps and allows a bit of time for other code to run as well, such as rendering code.

* `yieldFn`. Function which is passed blocks of code to execute at a later time. Defaults to `window.requestAnimationFrame()`.

* `getTimeFn`. Function used to request the current time in milliseconds. Defaults to `Date.now()`. Most users will not need to change this.

Since computation time on the main thread is a global resource, most users will want to share a single looper throughout their entire program. Therefore, calling the `Looper` constructor multiple times is an error unless the flag `Looper.allowMultipleInstances` is set to `true` first.

A possible pattern for sharing a `Looper` across a program is as follows:
``` javascript
/* myLooper.js */
import { Looper } from 'broken-loop';

export const myLooper = new Looper();
```
``` javascript
/* elsewhere.js */
import { myLooper } from './myLooper';

myLooper.loopYieldingly(/* ... */);
```

### `Looper#loopYieldingly(loopBody)`

Takes a `LoopBody`, which is a block of code which is to be run repeatedly. The block is provided a `done` function, which should be called to signal a successful result. Returns a promise which is fulfilled when the body is completed by calling `done`.

Example:
``` javascript
import { Looper } from 'broken-loop';

const looper = new Looper();

let sum = 0;
let i = 0;
looper.loopYieldingly(done => {
    if (i < 10) {
        sum += i;
        i++;
    } else {
        done(sum);
    }
}).then(console.log);

// Prints "45", the sum of the numbers 1 through 9.
```

### Loop body helpers

Helpers are provided for common types of loop bodies one might write. These allow the user to write loops which emulate common types of loop, such as `for`, `while`, or `forEach`.

#### `whileBody(predicate, body, getResult)`

Loops as long as the predicate is true. When the predicate becomes false, return the result of calling `getResult` (the third argument).

Example:
``` javascript
import { Looper, whileBody } from 'broken-loop';

const looper = new Looper();
let sum = 0;
let i = 0;
looper.loopYieldingly(whileBody(
    () => i < 10,
    () => {
        sum += i;
        i++;
    },
    () => sum
)).then(console.log); // Prints 45.
```

Compare to synchronous version:
``` javascript
let sum = 0;
let i = 0;
while (i < 10) {
    sum += i;
    i++;
}
console.log(sum);
```

#### `forNBody(n, body, getResult)`

Executes the body `n` times. Each time, the body is provided the index of the current iteration, from `0` to `n-1`.

Example:
``` javascript
import { Looper, forNBody } from 'broken-loop';

const looper = new Looper();
let sum = 0;
looper.loopYieldingly(forNBody(
    10,
    i => sum += i,
    () => sum
)).then(console.log); // Prints 45.
```

Compare to synchronous version:
``` javascript
let sum = 0;
for (let i = 0; i < 10; i++) {
    sum += i;
}
console.log(sum);
```

#### `forEachBody(items, body)`

Calls the body on each item in the provided array and returns nothing.

Example:
``` javascript
import { Looper, forEachBody } from 'broken-loop';

const looper = new Looper();
looper.loopYieldingly(forEachBody([1, 2, 3], console.log));
// Prints 1
//        2
//        3
```

Compare to synchronous version:
``` javascript
[1, 2, 3].forEach(console.log);
```

#### `mapBody(items, body)`

Transforms each item in the provided array and returns a new array.

Example:
Calls the body on each item in the provided array and returns nothing.

Example:
``` javascript
import { Looper, mapBody } from 'broken-loop';

const looper = new Looper();
looper.loopYieldingly(mapBody(
    [1, 2, 3],
    n => n * n
)).then(console.log); // Prints [1, 4, 9].

```

Compare to synchronous version:
``` javascript
const result = [1, 2, 3].map(n => n * n);
console.log(result);
```

### `loopSynchronous(loopBody)`

Like `loopYieldingly()`, but runs the entire computation in place and returns the result directly rather than returning a promise. This is most useful if you are not yet sure whether a computation takes long enough to be worth running asynchronously. You can then write the loop body once and switch between the synchronous and asynchronous as needed.

Example:
``` javascript
import { loopSynchronous, forNBody } from 'broken-loop';

let sum = 0;
const result = loopSynchronous(forNBody(
    10,
    i => sum += i,
    () => sum
));
console.log(result); // Prints 45.
```

## Why not use Web Workers?

Web Workers are a great solution to this problem, and if you're happy with them you should keep using them. However, they can be pretty annoying to work with for the following reasons:

* They require a separate `.js` file to contain their code.
* They must use `postMessage()` to communicate, which adds boilerplate.
* They don't work in React Native as of version 0.38.

All this boilerplate means a larger surface area for bugs and is otherwise a hassle to work with. Broken Loop makes for more readable code, and if you're using React Native then you don't have a choice.

Copyright © 2016 David Philipson