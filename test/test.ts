import { expect } from 'chai';
import { loopSynchronous } from '../src/index';

describe('loopSynchronous', () => {
    it ('should return value on immediate success', () => {
        const result = loopSynchronous<string>(onSuccess => {
            onSuccess('Success');
        });
        expect(result).to.equal('Success');
    });
    it ('should throw on immediate failure', () => {
        const error = new Error('My error');
        expect(() => loopSynchronous((onSuccess, onFailure) => onFailure(error))).to.throw(error);
    })
});