import { describe, it } from 'mocha';
import { expect } from 'chai';
import SimpleCsvEditor from '../src/simple-csv-editor.js';

describe('SimpleCsvEditor', () => {
  it('throws an error on initialization when no PapaParse dependency is found globally.', () => {
    // given, when, then
    expect(() => { new SimpleCsvEditor(); }).to.throw(ReferenceError, 'Papa is not defined');
  });
});
