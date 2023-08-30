# Simple CSV Editor

A table editor for easily editing and retrieving CSV data.

## Demo

[Demo page](https://dag0310.github.io/simple-csv-editor/demo/) - can be found under `demo/index.html`

## Usage

Here is a basic HTML setup which should cover most needs:

```html
<!-- The element in which the table editor will be displayed -->
<div id="simpleCsvEditor"></div>

<!-- PapaParse dependency, very important for the editor to work! -->
<script src="papaparse.min.js"></script>

<!-- ES module declaration -->
<script type="module">
import SimpleCsvEditor from './simple-csv-editor.js';

// Initializes the editor with config parameters:
// id:       Set according to the editor HTML element's id attribute
// onChange: This function will be executed everytime a change happens inside the editor.
//           The paramater will contain the current CSV representation of the editor.
const simpleCsvEditor = new SimpleCsvEditor({
  id: 'simpleCsvEditor',
  onChange: (csvData) => { console.log(csvData); },
});

// Set the CSV data. maybe check out the demo, you might want to set this using a text area or some other way.
simpleCsvEditor.setCsv(`1,2,3,4
one,two,three,four`);
</script>
```

For all public methods, properties and further constructor config parameters check out `src/simple-csv-editor.js` - it should be very readable 😜

## Dependencies

- [PapaParse](https://www.papaparse.com)
