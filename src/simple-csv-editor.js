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
    delimiter = null,
    quoteChar = '"',
    controls = null,
    enableDefaultControls = false,
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

    this.#registerControls(controls, enableDefaultControls);
    this.table = this.editor.appendChild(document.createElement('table'));

    this.onChange = onChange;

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
        this.#triggerOnChange();
      });
    }
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

  #addCellToRow(row, cellIdx = -1) {
    const newCell = row.insertCell(cellIdx);
    newCell.contentEditable = true;
    newCell.addEventListener('input', () => {
      this.#triggerOnChange();
    });
    newCell.addEventListener('keydown', (event) => {
      const rowIdx = event.target.parentElement.rowIndex;
      const { rows } = row.parentElement;
      switch (event.key) {
        case 'Enter': {
          event.preventDefault();
          const newRowIdx = (event.shiftKey) ? rowIdx : rowIdx + 1;
          this.addRow(newRowIdx);
          rows[newRowIdx].cells[newCell.cellIndex].focus();
          this.#triggerOnChange();
          break;
        }
        case 'ArrowUp':
          event.preventDefault();
          SimpleCsvEditor.#jumpToEndOfCell(rows[rowIdx - 1]?.cells[newCell.cellIndex]);
          break;
        case 'ArrowDown':
          event.preventDefault();
          SimpleCsvEditor.#jumpToEndOfCell(rows[rowIdx + 1]?.cells[newCell.cellIndex]);
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
    const firstRow = (this.table.rows.length > 0) ? this.table.rows[0] : null;
    const newRow = this.table.insertRow(rowIdx);
    for (let cellIdx = 0; cellIdx < (firstRow ?? newRow).cells.length; cellIdx += 1) {
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
