import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { spy, stub } from "sinon";
import * as sinonChai from "sinon-chai";
import { LoopBody, loopSynchronous, loopYieldingly, YieldOptions } from "../src/index";

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
    // Calls not testing yield behavior have constant getTimeFn to ensure no yields occur.
    it("should resolve on immediate success", () => {
        const promise = loopYieldingly(
            done => done("Success"),
            { getTimeFn: () => 0 }
        );
        return expect(promise).to.eventually.equal("Success");
    });

    it("should reject on immediate failure", () => {
        const error = new Error("My error");
        const promise = loopYieldingly(
            () => { throw error; },
            { getTimeFn: () => 0 }
        );
        return expect(promise).to.be.rejectedWith(error);
    });

    it("should resolve after looping", () => {
        const promise = loopYieldingly(
            summingBody(10),
            { getTimeFn: () => 0 }
        );
        return expect(promise).to.eventually.equal(45);
    });

    it("should reject after looping", () => {
        const error = new Error("My error");
        const promise = loopYieldingly(
            afterNIterations(10, () => { throw error; }),
            { getTimeFn: () => 0 }
        );
        return expect(promise).to.eventually.be.rejectedWith(error);
    });

    it("should not yield if loop ends before time limit", done => {
        const getTimeFn = stub()
            .onCall(0).returns(0)
            .onCall(1).returns(90);
        const yieldFn = spy((action: () => void) => action());
        const options: YieldOptions = {
            timeBetweenYields: 100,
            getTimeFn,
            yieldFn,
        };
        loopYieldingly(
            afterNIterations(1, onSuccess => onSuccess("Success")),
            options
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.not.have.been.called;
            done();
        }).catch(done);
    });

    it("should yield after first loop if time greater than limit", done => {
        const getTimeFn = stub()
            .onCall(0).returns(0)
            .onCall(1).returns(110);
        const yieldFn = spy((action: () => void) => action());
        const options: YieldOptions = {
            timeBetweenYields: 100,
            getTimeFn,
            yieldFn,
        };
        loopYieldingly(
            afterNIterations(1, onSuccess => onSuccess("Success")),
            options,
        ).then(success => {
            expect(success).to.equal("Success");
            expect(yieldFn).to.have.been.calledOnce;
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
