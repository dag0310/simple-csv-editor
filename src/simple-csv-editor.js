class SimpleCsvEditor {
  constructor({
    id = 'simpleCsvEditor',
    data = '',
    onChange = null,
    warnOnDelete = true,
    showControls = true,
    controlLabels = {
      addRowBefore: '+ ↑',
      addRowAfter: '+ ↓',
      addColumnBefore: '+ ←',
      addColumnAfter: '+ →',
      deleteRow: '✖',
      deleteColumn: '✖',
      deleteAll: '✖',
      deleteRowWarning: 'DELETE THIS ROW?',
      deleteColumnWarning: 'DELETE THIS COLUMN?',
      deleteAllWarning: 'DELETE ALL DATA?',
    },
    delimiter = null,
    quoteChar = '"',
  } = {}) {
    if (Papa == null) {
      throw new Error('PapaParse dependency needs to be included beforehand');
    }
    this.editor = document.getElementById(id);
    if (this.editor == null) {
      throw new Error(`No editor element found like <div id="${id}"></div>`);
    }

    this.table = this.editor.appendChild(document.createElement('table'));

    this.onChange = onChange;
    this.warnOnDelete = warnOnDelete;
    this.showControls = showControls;
    this.controlLabels = controlLabels;

    this.papaParseConfig = {
      quoteChar,
      header: false,
      dynamicTyping: false,
      skipEmptyLines: true,
    };
    if (delimiter != null) {
      this.papaParseConfig.delimiter = delimiter;
    }

    this.setCsv(data);
  }

  #triggerOnChange() {
    if (this.onChange == null) {
      return;
    }
    this.onChange(this.getCsv());
  }

  static #buildBasicButton(label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerText = label;
    button.tabIndex = -1;
    return button;
  }

  #buildAddRowButton(offsetIndex, label) {
    const button = SimpleCsvEditor.#buildBasicButton(label);
    button.addEventListener('click', (event) => {
      this.addRow(event.target.parentElement.parentElement.rowIndex + offsetIndex);
    });
    return button;
  }

  #buildAddColumnButton(offsetIndex, label) {
    const button = SimpleCsvEditor.#buildBasicButton(label);
    button.addEventListener('click', (event) => {
      this.addColumn(event.target.parentElement.cellIndex + offsetIndex);
    });
    return button;
  }

  #buildDeleteRowButton(label) {
    const button = SimpleCsvEditor.#buildBasicButton(label);
    button.addEventListener('click', (event) => {
      if (!this.warnOnDelete || window.confirm(this.controlLabels.deleteRowWarning)) {
        this.deleteRow(event.target.parentElement.parentElement.rowIndex);
      }
    });
    return button;
  }

  #buildDeleteColumnButton(label) {
    const button = SimpleCsvEditor.#buildBasicButton(label);
    button.addEventListener('click', (event) => {
      if (!this.warnOnDelete || window.confirm(this.controlLabels.deleteColumnWarning)) {
        this.deleteColumn(event.target.parentElement.cellIndex);
      }
    });
    return button;
  }

  #buildDeleteAllButton(label) {
    const button = SimpleCsvEditor.#buildBasicButton(label);
    button.addEventListener('click', () => {
      if (!this.warnOnDelete || window.confirm(this.controlLabels.deleteAllWarning)) {
        this.deleteAll();
      }
    });
    return button;
  }

  #addColumnControlCell(row, cellIndex) {
    const cell = row.insertCell(cellIndex);
    cell.appendChild(this.#buildAddColumnButton(0, this.controlLabels.addColumnBefore));
    cell.appendChild(this.#buildDeleteColumnButton(this.controlLabels.deleteColumn));
    cell.appendChild(this.#buildAddColumnButton(1, this.controlLabels.addColumnAfter));
  }

  #addRowControlCell(row, cellIndex) {
    const cell = row.insertCell(cellIndex);
    cell.appendChild(this.#buildAddRowButton(0, this.controlLabels.addRowBefore));
    cell.appendChild(this.#buildDeleteRowButton(this.controlLabels.deleteRow));
    cell.appendChild(this.#buildAddRowButton(1, this.controlLabels.addRowAfter));
  }

  static #jumpToEndOfCell(cell) {
    if (cell == null) {
      return;
    }
    if (cell.firstChild == null) {
      cell.appendChild(document.createTextNode(''));
    }
    const textNode = cell.firstChild;
    const range = document.createRange();
    range.setStart(textNode, cell?.firstChild?.textContent.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  #addDataCellToRow(row, cellIndex) {
    const newCell = row.insertCell(cellIndex);
    newCell.contentEditable = true;
    newCell.addEventListener('input', () => {
      this.#triggerOnChange();
    });
    newCell.addEventListener('keydown', (event) => {
      const { rows } = row.parentElement;
      switch (event.key) {
        case 'Enter': {
          event.preventDefault();
          const newRowIndex = event.shiftKey ? row.rowIndex : row.rowIndex + 1;
          this.addRow(newRowIndex);
          rows[newRowIndex].cells[newCell.cellIndex].focus();
          break;
        }
        case 'ArrowUp':
          event.preventDefault();
          SimpleCsvEditor.#jumpToEndOfCell(rows[row.rowIndex - 1]?.cells[newCell.cellIndex]);
          break;
        case 'ArrowDown':
          event.preventDefault();
          SimpleCsvEditor.#jumpToEndOfCell(rows[row.rowIndex + 1]?.cells[newCell.cellIndex]);
          break;
        default: // Do nothing
      }
    });
  }

  getCsv() {
    const stringsInArraysOfArrays = Array.from(this.table.rows).slice(this.showControls ? 1 : 0)
      .map((row) => Array.from(row.cells).slice(0, this.showControls ? -1 : undefined)
        .map((cell) => cell.textContent));

    const config = {
      delimiter: this.delimiterUsed,
      header: false,
      skipEmptyLines: 'greedy',
    };

    return Papa.unparse(stringsInArraysOfArrays, config) + (this.lastLineEmpty ? this.lineBreakUsed : '');
  }

  setCsv(data) {
    const result = Papa.parse(data, this.papaParseConfig);
    for (const error of result.errors) {
      if (error.type === 'Delimiter' && error.code === 'UndetectableDelimiter') {
        continue;
      }
      console.error(error);
    }

    this.lineBreakUsed = result.meta.linebreak;
    this.delimiterUsed = result.meta.delimiter;
    this.lastLineEmpty = data.slice(-1) === this.lineBreakUsed;

    this.table.innerHTML = '';

    for (const [lineIndex, lineTokens] of result.data.entries()) {
      for (const [tokenIndex, token] of lineTokens.entries()) {
        if (this.table.rows[lineIndex] == null) {
          const numCells = (lineIndex <= 0) ? lineTokens.length : this.table.rows[lineIndex - 1].cells.length;
          const newRow = this.table.insertRow(-1);
          for (let cellIndex = 0; cellIndex < numCells; cellIndex += 1) {
            this.#addDataCellToRow(newRow, -1);
          }
        }
        if (this.table.rows[lineIndex].cells[tokenIndex] == null) {
          for (const row of this.table.rows) {
            this.#addDataCellToRow(row, -1);
          }
        }
        this.table.rows[lineIndex].cells[tokenIndex].textContent = token;
      }
    }
    if (this.table.rows.length <= 0) {
      this.#addDataCellToRow(this.table.insertRow(0), 0);
    }
    if (this.showControls) {
      const columnControlsRow = this.table.insertRow(0);
      for (let cellIndex = 0; cellIndex < this.table.rows[1].cells.length; cellIndex += 1) {
        this.#addColumnControlCell(columnControlsRow, -1);
      }
      for (const row of this.table.rows) {
        if (row.rowIndex === 0) {
          row.insertCell(-1).appendChild(this.#buildDeleteAllButton(this.controlLabels.deleteAll));
        } else {
          this.#addRowControlCell(row, -1);
        }
      }
    }
  }

  addRow(rowIndex) {
    const firstDataRowIndex = this.showControls ? 1 : 0;
    const firstDataRow = (this.table.rows.length > firstDataRowIndex) ? this.table.rows[firstDataRowIndex] : null;
    const newRow = this.table.insertRow(rowIndex);
    const numCells = (firstDataRow ?? newRow).cells.length;
    for (let cellIndex = 0; cellIndex < numCells; cellIndex += 1) {
      if (this.showControls && cellIndex === numCells - 1) {
        this.#addRowControlCell(newRow, -1);
      } else {
        this.#addDataCellToRow(newRow, -1);
      }
    }
    this.#triggerOnChange();
  }

  addColumn(cellIndex) {
    for (const row of this.table.rows) {
      if (this.showControls && row.rowIndex === 0) {
        this.#addColumnControlCell(row, cellIndex);
      } else {
        this.#addDataCellToRow(row, cellIndex);
      }
    }
    this.#triggerOnChange();
  }

  deleteRow(rowIndex) {
    if (this.table.rows.length <= (this.showControls ? 2 : 1)) {
      return;
    }
    this.table.deleteRow(rowIndex);
    this.#triggerOnChange();
  }

  deleteColumn(columnIndex) {
    if (this.table.rows[0].cells.length <= (this.showControls ? 2 : 1)) {
      return;
    }
    for (const row of this.table.rows) {
      row.deleteCell(columnIndex);
    }
    this.#triggerOnChange();
  }

  deleteAll() {
    this.setCsv('');
    this.#triggerOnChange();
  }
}

export default SimpleCsvEditor;
