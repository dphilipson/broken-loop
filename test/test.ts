import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { spy } from "sinon";
import * as sinonChai from "sinon-chai";
import {
    forEachBody,
    forNBody,
    LoopBody,
    loopSynchronous,
    Looper,
    mapBody,
    whileBody,
    YieldOptions,
} from "../src/index";

const { expect } = chai;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe("loopSynchronous", () => {
    it("should return value on immediate success", () => {
        const result = loopSynchronous(done => done("Success"));
        expect(result).to.equal("Success");
    });

    it("should throw on immediate failure", () => {
        const error = new Error("My error");
        expect(() => loopSynchronous(() => { throw error; })).to.throw(error);
    });

    it("should return success after looping", () => {
        const result = loopSynchronous(summingBody(10));
        expect(result).to.equal(45);
    });

    it("should throw failure after looping", () => {
        const error = new Error("My error");
        expect(() => loopSynchronous(
            afterNIterations(10, () => { throw error; }))
        ).to.throw(error);
    });
});

describe("loop body", () => {
    describe("whileBody", () => {
        it("should run action while condition is true", () => {
            let i = 0;
            const result = loopSynchronous(whileBody(
                () => i < 10,
                () => i++,
                () => i
            ));
            expect(result).to.equal(10);
        });
    });

    describe("forNBody", () => {
        it("should run action n times with incrementing argument", () => {
            const calls: number[] = [];
            loopSynchronous(forNBody(
                5,
                i => calls.push(i),
                () => calls
            ));
            expect(calls).to.deep.equal([0, 1, 2, 3, 4]);
        });
    });

    describe("mapBody", () => {
        it("should transform the array with its action", () => {
            const result = loopSynchronous(mapBody(
                [0, 1, 2, 3],
                n => n * 2
            ));
            expect(result).to.deep.equal([0, 2, 4, 6]);
        });
    });

    describe("forEachBody", () => {
        it("should call the action on each element", () => {
            const result: number[] = [];
            loopSynchronous(forEachBody(
                [0, 1, 2],
                n => result.push(n)
            ));
            expect(result).to.deep.equal([0, 1, 2]);
        });
    });
});

describe("loopYieldingly", () => {
    const timeBetweenYields = 100;
    let time: number;
    const addTime = (ms: number) => time += ms;
    const getTimeFn = () => time;
    let yieldFn: Sinon.SinonSpy;
    let yieldTimes: number[];
    let options: YieldOptions;
    let looper: Looper;

    beforeEach(() => {
        time = 0;
        yieldFn = spy((action: () => void) => {
            yieldTimes.push(time);
            setTimeout(action, 0);
        });
        yieldTimes = [];
        options = {
            timeBetweenYields,
            getTimeFn,
            yieldFn,
        };
        looper = new Looper(options);
    });

    it("should resolve on immediate success", () => {
        const promise = looper.loopYieldingly(done => done("Success"));
        return expect(promise).to.eventually.equal("Success");
    });

    it("should reject on immediate failure", () => {
        const error = new Error("My error");
        const promise = looper.loopYieldingly(() => { throw error; });
        return expect(promise).to.be.rejectedWith(error);
    });

    it("should resolve after looping", () => {
        const promise = looper.loopYieldingly(summingBody(10));
        return expect(promise).to.eventually.equal(45);
    });

    it("should reject after looping", () => {
        const error = new Error("My error");
        const promise = looper.loopYieldingly(afterNIterations(10, () => { throw error; }));
        return expect(promise).to.eventually.be.rejectedWith(error);
    });

    it("should not yield if loop ends before time limit", done => {
        looper.loopYieldingly(
            forNBody(1, () => addTime(90), () => "Success")
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.not.have.been.called;
            done();
        }).catch(done);
    });

    it("should yield after first loop if time greater than limit", done => {
        looper.loopYieldingly(
            forNBody(1, () => addTime(110), () => "Success")
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.been.calledOnce;
            done();
        }).catch(done);
    });

    it("should yield multiple times if time is several times the limit", done => {
        looper.loopYieldingly(
            forNBody(10, () => addTime(60), () => "Success")
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.callCount(5);
            done();
        }).catch(done);
    });

    it("should yield at the right time if multiple loops are running", done => {
        const body = forNBody(50, () => addTime(10), () => "Success");
        const promise1 = looper.loopYieldingly(body);
        const promise2 = looper.loopYieldingly(body);
        Promise.all([promise1, promise2]).then(([success1, success2]) => {
            expect(success1).to.equal("Success");
            expect(success2).to.equal("Success");
            for (let i = 0; i < yieldTimes.length - 1; i++) {
                const length = yieldTimes[i + 1] - yieldTimes[i];
                expect(length).to.be.at.least(timeBetweenYields - 10,
                    `Took too little time (${length} ms) before yielding`);
                expect(length).to.be.at.most(timeBetweenYields + 10,
                    `Took too much time (${length} ms) between yields`);
            }
            done();
        }).catch(done);
    });

    it("should give time to each running loop every period", done => {
        const loop1Periods: number[] = [];
        const loop2Periods: number[] = [];
        const promise1 = looper.loopYieldingly(forNBody(
            50,
            () => {
                loop1Periods.push(yieldTimes.length);
                addTime(10);
            },
            () => "Success"));
        const promise2 = looper.loopYieldingly(forNBody(
            50,
            () => {
                loop2Periods.push(yieldTimes.length);
                addTime(10);
            },
            () => "Success"));
        Promise.all([promise1, promise2]).then(([success1, success2]) => {
            expect(success1).to.equal("Success");
            expect(success2).to.equal("Success");
            function expectNoMissingPeriods(periods: number[]) {
                for (let i = 0; i < periods.length - 1; i++) {
                    const start = periods[i];
                    const end = periods[i + 1];
                    expect(end - start).to.be.at.most(1, `Skipped from period ${start} to period ${end}`);
                }
            }
            expectNoMissingPeriods(loop1Periods);
            expectNoMissingPeriods(loop2Periods);
            done();
        }).catch(done);
    });
});

function afterNIterations<T>(n: number, action: LoopBody<T>): LoopBody<T> {
    let i = 0;
    return done => {
        if (i >= n) {
            action(done);
        } else {
            i++;
        }
    };
}

/**
 * Loop body that sums the numbers 0, 1, ..., n-1.
 */
function summingBody(n: number): LoopBody<number> {
    let sum = 0;
    return forNBody(n, i => sum += i, () => sum);
}
