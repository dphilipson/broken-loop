import { expect } from 'chai';
import Startup from '../src/Startup';

describe('The tests run', () => {
    describe('1 + 1', () => {
        it('should equal 2', () => {
            expect(1 + 1).to.equal(2);
        });        
    });

    describe('Startup', () => {
        it('should have a main method', () => {
            expect(Startup.main).to.not.be.undefined;
        });
    });
});