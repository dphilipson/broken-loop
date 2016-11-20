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
        looper.loopYieldingly(
            doNTimes(1, () => addTime(90), () => "Success")
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.not.have.been.called;
            done();
        }).catch(done);
    });

    it("should yield after first loop if time greater than limit", done => {
        looper.loopYieldingly(
            doNTimes(1, () => addTime(110), () => "Success")
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.been.calledOnce;
            done();
        }).catch(done);
    });

    it("should yield multiple times if time is several times the limit", done => {
        looper.loopYieldingly(
            doNTimes(10, () => addTime(60), () => "Success")
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.callCount(5);
            done();
        }).catch(done);
    });

    it("should not go overtime if multiple loops are started in same frame", done => {
        looper.loopYieldingly(onSuccess => {
            addTime(51);
            onSuccess("Success");
        });
        looper.loopYieldingly(onSuccess => {
            if (yieldFn.callCount > 0) {
                onSuccess("Success");
            }
            addTime(10);
        }).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.callCount(1);
            expect(getTimeFn()).to.be.lessThan(110);
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

function doNTimes<T>(n: number, action: () => void, getResult: () => T): LoopBody<T> {
    let i = 0;
    return done => {
        if (i >= n) {
            done(getResult());
        } else {
            action();
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
