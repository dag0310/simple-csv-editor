import { describe, it } from 'mocha';
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import Papa from 'papaparse';
import SimpleCsvEditor from '../src/simple-csv-editor.js';

describe('SimpleCsvEditor', () => {
  const setupDom = (html) => {
    const dom = new JSDOM(html);
    global.window = dom.window;
    global.document = dom.window.document;
  };

  it('throws an error on initialization when no PapaParse dependency is found globally.', () => {
    // given
    setupDom('');

    // when, then
    expect(() => { new SimpleCsvEditor(); }).to.throw(ReferenceError, 'Papa is not defined');
  });

  it('cannot find the editor element if no element exists.', () => {
    // given
    setupDom('');
    global.window.Papa = Papa;

    // when, then
    expect(() => { new SimpleCsvEditor(); }).to.throw(ReferenceError, 'No editor element found like <div id="simpleCsvEditor"></div>');
  });

  it('cannot find the editor element if a custom id is used but not passed.', () => {
    // given
    setupDom('<div id="customId"></div>');
    global.window.Papa = Papa;

    // when, then
    expect(() => { new SimpleCsvEditor(); }).to.throw(ReferenceError, 'No editor element found like <div id="simpleCsvEditor"></div>');
  });

  it('can find the editor element if the default id is used.', () => {
    // given
    setupDom('<div id="simpleCsvEditor"></div>');
    global.window.Papa = Papa;

    // when, then
    expect(() => { new SimpleCsvEditor(); }).to.not.throw(ReferenceError);
  });

  it('can find the editor element if a custom id is used and passed.', () => {
    // given
    setupDom('<div id="customId"></div>');
    global.window.Papa = Papa;

    // when, then
    expect(() => { new SimpleCsvEditor({ id: 'customId' }); }).to.not.throw(ReferenceError);
  });

  it('initializes the editor correctly in an empty state.', () => {
    // given
    setupDom('<div id="myEditor"></div>');
    global.window.Papa = Papa;

    // when
    const simpleCsvEditor = new SimpleCsvEditor({ id: 'myEditor' });

    // then
    expect(simpleCsvEditor.getCsv()).to.equal('');
  });

  it('gets the same well-formed CSV data that it sets.', () => {
    // given
    setupDom('<div id="myEditor"></div>');
    global.window.Papa = Papa;
    const data = 'one,two,three\n1,2,3';

    // when
    const simpleCsvEditor = new SimpleCsvEditor({ id: 'myEditor', data });

    // then
    expect(simpleCsvEditor.getCsv()).to.equal('one,two,three\n1,2,3');
  });

  it('does not get the same CSV data that it sets if the set data is malformed like missing a column.', () => {
    // given
    setupDom('<div id="myEditor"></div>');
    global.window.Papa = Papa;
    const data = 'one,two,three\n1,2';

    // when
    const simpleCsvEditor = new SimpleCsvEditor({ id: 'myEditor', data });

    // then
    expect(simpleCsvEditor.getCsv()).to.equal('one,two,three\n1,2,');
  });
});
