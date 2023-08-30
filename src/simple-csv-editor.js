class SimpleCsvEditor {
  static controlsClassName = 'controls';

  controlDefinitions = new Map([
    ['addRowBtn',       () => { this.addRow(); }],
    ['addColumnBtn',    () => { this.addColumn(); }],
    ['deleteRowBtn',    () => { this.deleteRow(); }],
    ['deleteColumnBtn', () => { this.deleteColumn(); }],
    ['clearBtn',        () => { this.setCsv(''); }],
  ]);

  constructor({
    id,
    data = '',
    onChange = null,
    controls = null,
    enableDefaultControls = false,
    delimiter = ',',
    quoteChar = '"',
  }) {
    if (Papa == null) {
      throw new Error('PapaParse dependency needs to be included beforehand');
    }
    if (id == null) {
      throw new Error('No editorId specified in config');
    }
    this.editor = document.getElementById(id);
    if (this.editor == null) {
      throw new Error(`No editor div element found with id="${id}"`);
    }
    this.editor.innerHTML = '';

    this.#registerControls(controls, enableDefaultControls);
    this.table = this.editor.appendChild(document.createElement('table'));

    this.onChange = onChange;

    this.papaParseConfig = {
      delimiter,
      quoteChar,
      header: false,
      dynamicTyping: false,
      skipEmptyLines: true,
    };

    this.setCsv(data);
  }

  #registerControls(controlsParam, enableDefaultControls) {
    const controlsElement = this.editor.appendChild(document.createElement('div'));
    controlsElement.className = SimpleCsvEditor.controlsClassName;

    const controls = controlsParam ?? (enableDefaultControls
      ? Array.from(this.controlDefinitions.keys()).map((className) => ({
        className,
        label: className,
      }))
      : []);

    for (const control of controls) {
      const newButton = controlsElement.appendChild(document.createElement('button'));
      newButton.className = control.className;
      newButton.textContent = control.label;

      newButton.addEventListener('click', () => {
        this.controlDefinitions.get(newButton.className)();
        if (this.onChange != null) {
          this.onChange(this.getCsv());
        }
      });
    }
  }

  #addCellToRow(row, cellIdx = -1) {
    const newCell = row.insertCell(cellIdx);
    newCell.contentEditable = true;
    if (this.onChange != null) {
      newCell.addEventListener('input', () => {
        this.onChange(this.getCsv());
      });
    }
  }

  setCsv(data) {
    const result = Papa.parse(data, this.papaParseConfig);
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(error);
      }
      return;
    }

    this.detectedLineBreak = result.meta.linebreak;
    this.lastLineEmpty = data.slice(-1) === this.detectedLineBreak;

    this.table.innerHTML = '';

    for (const [lineIdx, lineTokens] of result.data.entries()) {
      for (const [tokenIdx, token] of lineTokens.entries()) {
        if (this.table.rows[lineIdx] == null) {
          this.addRow();
        }
        if (this.table.rows[lineIdx].cells[tokenIdx] == null) {
          this.addColumn();
        }
        this.table.rows[lineIdx].cells[tokenIdx].textContent = token;
      }
    }
  }

  getCsv() {
    return Array.from(this.table.rows)
      .map((row) => Array.from(row.cells)
        .map((cell) => cell.textContent)
        .join(this.papaParseConfig.delimiter))
      .join(this.detectedLineBreak) + (this.lastLineEmpty ? this.detectedLineBreak : '');
  }

  addRow(rowIdx = -1) {
    const newRow = this.table.insertRow(rowIdx);
    for (let cellIdx = 0; cellIdx < this.table.rows[0].cells.length; cellIdx += 1) {
      this.#addCellToRow(newRow);
    }
  }

  addColumn(cellIdx = -1) {
    for (const row of this.table.rows) {
      this.#addCellToRow(row, cellIdx);
    }
  }

  deleteRow(rowIdx = -1) {
    if (this.table.rows.length <= 1) {
      return;
    }
    this.table.deleteRow(rowIdx);
  }

  deleteColumn(cellIdx = -1) {
    if (this.table.rows[0].cells.length <= 1) {
      return;
    }
    for (const row of this.table.rows) {
      row.deleteCell(cellIdx);
    }
  }
}

export default SimpleCsvEditor;
