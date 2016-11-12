import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { LoopBody, loopSynchronous, loopYieldingly } from "../src/index";

const { expect } = chai;

chai.use(chaiAsPromised);

describe("loopSynchronous", () => {
    it("should return value on immediate success", () => {
        const result = loopSynchronous<string>(done => {
            done("Success");
        });
        expect(result).to.equal("Success");
    });

    it("should throw on immediate failure", () => {
        const error = new Error("My error");
        expect(() => loopSynchronous(() => { throw error; })).to.throw(error);
    });

    it("should return success after looping", () => {
        let i = 0;
        let sum = 0;
        const result = loopSynchronous<number>(done => {
            if (i >= 10) {
                return done(sum);
            } else {
                sum += i++;
            }
        });
        expect(result).to.equal(45);
    });

    it("should throw failure after looping", () => {
        const error = new Error("My error");
        let i = 0;
        const body: LoopBody<any> = done => {
            if (i >= 10) {
                throw error;
            } else {
                i++;
            }
        };
        expect(() => loopSynchronous<any>(body)).to.throw(error);
    });
});

describe("loopYieldingly", () => {
    it("should resolve on immediate success", () => {
        const promise = loopYieldingly<string>(done => {
            done("Success");
        });
        return expect(promise).to.eventually.equal("Success");
    });

    it("should reject on immediate failure", () => {
        const error = new Error("My error");
        const promise = loopYieldingly<any>(() => {
            throw error;
        });
        return expect(promise).to.be.rejectedWith(error);
    });

    it("should resolve after looping", () => {
        let i = 0;
        let sum = 0;
        const promise = loopYieldingly<number>(done => {
            if (i >= 10) {
                return done(sum);
            } else {
                sum += i++;
            }
        });
        return expect(promise).to.eventually.equal(45);
    });

    it("should reject after looping", () => {
        const error = new Error("My error");
        let i = 0;
        const promise = loopYieldingly<any>(() => {
            if (i >= 10) {
                throw error;
            } else {
                i++;
            }
        });
        return expect(promise).to.eventually.be.rejectedWith(error);
    });
});
