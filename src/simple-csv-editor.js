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
      deleteRowWarning: 'Delete this row?',
      deleteColumnWarning: 'Delete this column?',
      deleteAllWarning: 'Delete all cells?',
    },
    delimiter = null,
    quoteChar = '"',
  } = {}) {
    if (window.Papa == null) {
      throw new ReferenceError('Papa is not defined');
    }
    this.editor = document.getElementById(id);
    if (this.editor == null) {
      throw new ReferenceError(`No editor element found like <div id="${id}"></div>`);
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

  #setDeleteButtonDisabledStates() {
    for (const button of this.table.getElementsByClassName('deleteRow')) {
      button.disabled = this.table.rows.length === (this.showControls ? 2 : 1);
    }
    for (const button of this.table.getElementsByClassName('deleteColumn')) {
      button.disabled = this.table.rows[0].cells.length === (this.showControls ? 2 : 1);
    }
  }

  #triggerOnChange() {
    this.#setDeleteButtonDisabledStates();
    if (this.onChange == null) {
      return;
    }
    this.onChange(this.getCsv());
  }

  #buildBasicButton(labelKey) {
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    button.className = labelKey;
    button.innerText = this.controlLabels[labelKey];
    return button;
  }

  #buildAddRowButton(offsetIndex, labelKey) {
    const button = this.#buildBasicButton(labelKey);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      this.addRow(event.target.parentElement.parentElement.rowIndex + offsetIndex);
    });
    return button;
  }

  #buildAddColumnButton(offsetIndex, labelKey) {
    const button = this.#buildBasicButton(labelKey);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      this.addColumn(event.target.parentElement.cellIndex + offsetIndex);
    });
    return button;
  }

  #buildDeleteRowButton(labelKey) {
    const button = this.#buildBasicButton(labelKey);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (!this.warnOnDelete || window.confirm(this.controlLabels.deleteRowWarning)) {
        this.deleteRow(event.target.parentElement.parentElement.rowIndex);
      }
    });
    return button;
  }

  #buildDeleteColumnButton(labelKey) {
    const button = this.#buildBasicButton(labelKey);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (!this.warnOnDelete || window.confirm(this.controlLabels.deleteColumnWarning)) {
        this.deleteColumn(event.target.parentElement.cellIndex);
      }
    });
    return button;
  }

  #buildDeleteAllButton(labelKey) {
    const button = this.#buildBasicButton(labelKey);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (!this.warnOnDelete || window.confirm(this.controlLabels.deleteAllWarning)) {
        this.deleteAll();
      }
    });
    return button;
  }

  #addColumnControlCell(row, cellIndex) {
    const cell = document.createElement('th');
    cell.appendChild(this.#buildAddColumnButton(0, 'addColumnBefore'));
    cell.appendChild(this.#buildDeleteColumnButton('deleteColumn'));
    cell.appendChild(this.#buildAddColumnButton(1, 'addColumnAfter'));
    row.insertBefore(cell, row.cells[cellIndex]);
  }

  #addRowControlCell(row, cellIndex) {
    const cell = document.createElement('th');
    cell.appendChild(this.#buildAddRowButton(0, 'addRowBefore'));
    cell.appendChild(this.#buildDeleteRowButton('deleteRow'));
    cell.appendChild(this.#buildAddRowButton(1, 'addRowAfter'));
    row.insertBefore(cell, row.cells[cellIndex]);
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
      newline: this.lineBreakUsed,
      skipEmptyLines: 'greedy',
    };

    return window.Papa.unparse(stringsInArraysOfArrays, config) + (this.lastLineEmpty ? this.lineBreakUsed : '');
  }

  setCsv(data) {
    const result = window.Papa.parse(data, this.papaParseConfig);
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
          const cell = document.createElement('th');
          cell.appendChild(this.#buildDeleteAllButton('deleteAll'));
          row.appendChild(cell);
        } else {
          this.#addRowControlCell(row, -1);
        }
      }
    }
    this.#setDeleteButtonDisabledStates();
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
