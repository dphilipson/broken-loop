import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { spy } from "sinon";
import * as sinonChai from "sinon-chai";
import { LoopBody, loopSynchronous, Looper, YieldOptions } from "../src/index";

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
        const result = loopSynchronous<number>(summingBody(10));
        expect(result).to.equal(45);
    });

    it("should throw failure after looping", () => {
        const error = new Error("My error");
        expect(() => loopSynchronous(
            afterNIterations(10, () => { throw error; }))
        ).to.throw(error);
    });
});

describe("loopYieldingly", () => {
    let time: number;
    const addTime = (ms: number) => time += ms;
    const getTimeFn = () => time;
    let yieldFn: Sinon.SinonSpy;
    let options: YieldOptions;
    let looper: Looper;

    beforeEach(() => {
        time = 0;
        yieldFn = spy((action: () => void) => setTimeout(action, 0));
        options = {
            timeBetweenYields: 100,
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
        let i = 0;
        looper.loopYieldingly(
            onSuccess => {
                if (i === 0) {
                    addTime(90);
                } else {
                    onSuccess("Success");
                }
                i++;
            }
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.not.have.been.called;
            done();
        }).catch(done);
    });

    it("should yield after first loop if time greater than limit", done => {
        let i = 0;
        looper.loopYieldingly(
            onSuccess => {
                if (i === 0) {
                    addTime(110);
                } else {
                    onSuccess("Success");
                }
                i++;
            }
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.been.calledOnce;
            done();
        }).catch(done);
    });

    it("should yield multiple times if time is several times the limit", done => {
        let i = 0;
        looper.loopYieldingly(
            onSuccess => {
                if (i < 10) {
                    // Should yield every two iterations.
                    addTime(60);
                } else {
                    onSuccess("Success");
                }
                i++;
            }
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.callCount(5);
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
    let i = 0;
    let sum = 0;
    return done => {
        if (i >= n) {
            done(sum);
        } else {
            sum += i++;
        }
    };
}
