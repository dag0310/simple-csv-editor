class SimpleCsvEditor {
  constructor({
    id,
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
  }) {
    if (Papa == null) {
      throw new Error('PapaParse dependency needs to be included beforehand');
    }
    if (id == null) {
      throw new Error('No editorId specified in config');
    }
    this.editor = document.getElementById(id);
    if (this.editor == null) {
      throw new Error(`No editor element found with id="${id}"`);
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

  #buildAddRowButton(offsetIdx, label) {
    const button = SimpleCsvEditor.#buildBasicButton(label);
    button.addEventListener('click', (event) => {
      this.addRow(event.target.parentElement.parentElement.rowIndex + offsetIdx);
    });
    return button;
  }

  #buildAddColumnButton(offsetIdx, label) {
    const button = SimpleCsvEditor.#buildBasicButton(label);
    button.addEventListener('click', (event) => {
      this.addColumn(event.target.parentElement.cellIndex + offsetIdx);
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

  #addColumnControlCell(row, cellIdx) {
    const cell = row.insertCell(cellIdx);
    cell.appendChild(this.#buildAddColumnButton(0, this.controlLabels.addColumnBefore));
    cell.appendChild(this.#buildDeleteColumnButton(this.controlLabels.deleteColumn));
    cell.appendChild(this.#buildAddColumnButton(1, this.controlLabels.addColumnAfter));
  }

  #addRowControlCell(row, cellIdx) {
    const cell = row.insertCell(cellIdx);
    cell.appendChild(this.#buildAddRowButton(0, this.controlLabels.addRowBefore));
    cell.appendChild(this.#buildDeleteRowButton(this.controlLabels.deleteRow));
    cell.appendChild(this.#buildAddRowButton(1, this.controlLabels.addRowAfter));
  }

  static #checkCursorPosition(cell) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const { startOffset } = range;
    const endNode = range.endContainer;
    const { endOffset } = range;

    if (startNode === cell.firstChild && startOffset === 0) {
      return 'start';
    }
    if (endNode === cell.lastChild && endOffset === cell.lastChild.textContent.length) {
      return 'end';
    }
    return 'middle';
  }

  static #jumpToPositionInCellGeneric(cell, idx) {
    if (cell == null) {
      return;
    }
    if (cell.firstChild == null) {
      cell.appendChild(document.createTextNode(''));
    }
    const textNode = cell.firstChild;
    const range = document.createRange();
    range.setStart(textNode, idx);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  static #jumpToStartOfCell(cell) {
    this.#jumpToPositionInCellGeneric(cell, 0);
  }

  static #jumpToEndOfCell(cell) {
    this.#jumpToPositionInCellGeneric(cell, cell?.firstChild?.textContent.length);
  }

  #addDataCellToRow(row, cellIdx) {
    const newCell = row.insertCell(cellIdx);
    newCell.contentEditable = true;
    newCell.addEventListener('input', () => {
      this.#triggerOnChange();
    });
    newCell.addEventListener('keydown', (event) => {
      const { rows } = row.parentElement;
      switch (event.key) {
        case 'Enter': {
          event.preventDefault();
          const newRowIdx = event.shiftKey ? row.rowIndex : row.rowIndex + 1;
          this.addRow(newRowIdx);
          rows[newRowIdx].cells[newCell.cellIndex].focus();
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
        case 'ArrowLeft':
          if (SimpleCsvEditor.#checkCursorPosition(newCell) === 'start') {
            event.preventDefault();
            SimpleCsvEditor.#jumpToEndOfCell(row.cells[newCell.cellIndex - 1]);
          }
          break;
        case 'ArrowRight':
          if (SimpleCsvEditor.#checkCursorPosition(newCell) === 'end') {
            event.preventDefault();
            SimpleCsvEditor.#jumpToStartOfCell(row.cells[newCell.cellIndex + 1]);
          }
          break;
        default: // Do nothing
      }
    });
  }

  getCsv() {
    return Array.from(this.table.rows).slice(this.showControls ? 1 : 0)
      .map((row) => Array.from(row.cells).slice(0, this.showControls ? -1 : undefined)
        .map((cell) => cell.textContent)
        .join(this.papaParseConfig.delimiter))
      .join(this.detectedLineBreak) + (this.lastLineEmpty ? this.detectedLineBreak : '');
  }

  setCsv(data) {
    const result = Papa.parse(data, this.papaParseConfig);
    for (const error of result.errors) {
      if (error.type === 'Delimiter' && error.code === 'UndetectableDelimiter') {
        continue;
      }
      console.error(error);
    }

    this.detectedLineBreak = result.meta.linebreak;
    this.lastLineEmpty = data.slice(-1) === this.detectedLineBreak;

    this.table.innerHTML = '';

    for (const [lineIdx, lineTokens] of result.data.entries()) {
      for (const [tokenIdx, token] of lineTokens.entries()) {
        if (this.table.rows[lineIdx] == null) {
          const numCells = (lineIdx <= 0) ? lineTokens.length : this.table.rows[lineIdx - 1].cells.length;
          const newRow = this.table.insertRow(-1);
          for (let cellIdx = 0; cellIdx < numCells; cellIdx += 1) {
            this.#addDataCellToRow(newRow, -1);
          }
        }
        if (this.table.rows[lineIdx].cells[tokenIdx] == null) {
          for (const row of this.table.rows) {
            this.#addDataCellToRow(row, -1);
          }
        }
        this.table.rows[lineIdx].cells[tokenIdx].textContent = token;
      }
    }
    if (this.table.rows.length <= 0) {
      this.#addDataCellToRow(this.table.insertRow(0), 0);
    }
    if (this.showControls) {
      const columnControlsRow = this.table.insertRow(0);
      for (let cellIdx = 0; cellIdx < this.table.rows[1].cells.length; cellIdx += 1) {
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

  addRow(rowIdx) {
    const firstDataRowIdx = this.showControls ? 1 : 0;
    const firstDataRow = (this.table.rows.length > firstDataRowIdx) ? this.table.rows[firstDataRowIdx] : null;
    const newRow = this.table.insertRow(rowIdx);
    const numCells = (firstDataRow ?? newRow).cells.length;
    for (let cellIdx = 0; cellIdx < numCells; cellIdx += 1) {
      if (this.showControls && cellIdx === numCells - 1) {
        this.#addRowControlCell(newRow, -1);
      } else {
        this.#addDataCellToRow(newRow, -1);
      }
    }
    this.#triggerOnChange();
  }

  addColumn(cellIdx) {
    for (const row of this.table.rows) {
      if (this.showControls && row.rowIndex === 0) {
        this.#addColumnControlCell(row, cellIdx);
      } else {
        this.#addDataCellToRow(row, cellIdx);
      }
    }
    this.#triggerOnChange();
  }

  deleteRow(rowIdx) {
    if (this.table.rows.length <= (this.showControls ? 2 : 1)) {
      return;
    }
    this.table.deleteRow(rowIdx);
    this.#triggerOnChange();
  }

  deleteColumn(columnIdx) {
    if (this.table.rows[0].cells.length <= (this.showControls ? 2 : 1)) {
      return;
    }
    for (const row of this.table.rows) {
      row.deleteCell(columnIdx);
    }
    this.#triggerOnChange();
  }

  deleteAll() {
    this.setCsv('');
    this.#triggerOnChange();
  }
}

export default SimpleCsvEditor;
