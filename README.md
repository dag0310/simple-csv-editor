# Simple CSV Editor

A CSV editor for HTML/JavaScript using ES modules.

## Usage

```html
<div id="simpleCsvEditor"></div>

<script src="papaparse.min.js"></script>
<script type="module">
import SimpleCsvEditor from './simple-csv-editor.js';

const simpleCsvEditor = new SimpleCsvEditor({
  id: 'simpleCsvEditor',
  onChange: (csvData) => { console.log(csvData); },
});
</script>
```

## Dependencies

- [PapaParse](https://www.papaparse.com)
