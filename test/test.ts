import { expect } from "chai";
import { LoopBody, loopSynchronous } from "../src/index";

describe("loopSynchronous", () => {
    it("should return value on immediate success", () => {
        const result = loopSynchronous<string>(onSuccess => {
            onSuccess("Success");
        });
        expect(result).to.equal("Success");
    });

    it("should throw on immediate failure", () => {
        const error = new Error("My error");
        expect(() => loopSynchronous((_, onFailure) => onFailure(error))).to.throw(error);
    });

    it("should return success after looping", () => {
        let i = 0;
        let sum = 0;
        const result = loopSynchronous<number>(onSuccess => {
            if (i >= 10) {
                return onSuccess(sum);
            } else {
                sum += i++;
            }
        });
        expect(result).to.equal(45);
    });

    it("should throw failure after looping", () => {
        const error = new Error("My error");
        let i = 0;
        const body: LoopBody<any> = (_, onFailure) => {
            if (i >= 10) {
                return onFailure(error);
            } else {
                i++;
            }
        };
        expect(() => loopSynchronous<any>(body)).to.throw(error);
    });
});
