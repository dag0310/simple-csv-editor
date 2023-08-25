import { describe, it } from 'mocha';
import { expect } from 'chai';
import SimpleCsvEditor from '../src/simple-csv-editor.js';

describe('SimpleCsvEditor', () => {
  it('throws an error if no id is given.', () => {
    // given, when, then
    expect(SimpleCsvEditor).to.throw(Error);
    expect(() => { new SimpleCsvEditor({}); }).to.throw(Error);
    expect(() => { new SimpleCsvEditor({ id: null }); }).to.throw(Error);
  });
});
