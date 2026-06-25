(function () {
    if (!window.__gridObjects) window.__gridObjects = {};
    if (!document.getElementById('tabulator-grid-fixed-style')) {
        const css = document.createElement('style');
        css.id = 'tabulator-grid-fixed-style';
        css.textContent = `
.tabulator{width:100%;height:100%;border-color:#d9dee5;font-size:14px;background:#fff;}
.tabulator .tabulator-header{border-bottom:1px solid #d9dee5;background:#fff;}
.tabulator .tabulator-header .tabulator-col{background:#fff;border-right:0;}
.tabulator .tabulator-col-content{padding:0!important;}
.tabulator .grid-head-title{height:36px;display:flex;align-items:center;gap:5px;padding:0 10px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;}
.tabulator .grid-head-title .grid-title-text{overflow:hidden;text-overflow:ellipsis;}
.tabulator .grid-filter-line{height:45px;padding:5px 10px 8px 10px;border-top:0;display:flex;align-items:center;}
.tabulator .grid-filter-line input,.tabulator .grid-filter-line select{width:100%;height:34px;border:1px solid #cbd5e1;border-radius:4px;padding:4px 7px;font-size:13px;background:#fff;outline:none;}
.tabulator .grid-filter-line input:focus,.tabulator .grid-filter-line select:focus{border-color:#66afe9;box-shadow:0 0 0 2px rgba(102,175,233,.15);}
.tabulator .grid-filter-line.hidden{display:none!important;height:0!important;padding:0!important;overflow:hidden;}
.tabulator .filter-btn{border:0;background:transparent;color:#9ca3af;margin-left:auto;cursor:pointer;font-size:12px;padding:2px 4px;line-height:1;}
.tabulator .filter-btn.active{color:var(--main-color);font-weight:700;}
.tabulator .tabulator-row{border-bottom:1px solid #d9dee5;}
.tabulator .tabulator-row.tabulator-row-even{background:#e9ecef;}
.tabulator .tabulator-cell{border-right:0;padding:10px 10px;}
.excel-filter-panel{position:absolute;z-index:99999;display:none;width:310px;background:#fff;border:1px solid #d0d7de;border-radius:8px;box-shadow:0 12px 30px rgba(15,23,42,.2);padding:12px;}
.excel-filter-item{display:flex;align-items:center;gap:8px;padding:4px 2px;font-size:13px;cursor:pointer;}
.excel-filter-item input{margin:0;}
.row-dirty .tabulator-cell{font-style:italic;}
.row-new .tabulator-cell{font-weight:600;}
`;
        document.head.appendChild(css);
    }
})();

function titleWithFilter(title, field) {
    return `<div class="grid-head-title"><span class="grid-title-text">${title || ''}</span><button type="button" class="filter-btn" data-field="${field}" title="Filter giống Excel"><i class="fa-solid fa-filter" style="font-size:10px"></i></button></div>`;
}

function escapeHtml(v) {
    return String(v == null ? '' : v)
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function normalizeCellValue(v) {
    if (Array.isArray(v)) return v.join(', ');
    return v == null ? '' : String(v);
}

function getColumnLookup(table, field) {
    try {
        const col = table.getColumn(field);
        return col && col.getDefinition ? col.getDefinition()._lookupMap : null;
    } catch (e) { return null; }
}

function displayValueForField(table, field, raw) {
    const lookup = getColumnLookup(table, field);
    if (lookup) return lookup[String(raw)] || '';
    return normalizeCellValue(raw);
}

function makeHeaderInputFilter(show) {
    return function (cell, onRendered, success) {
        const holder = document.createElement('div');
        holder.className = 'grid-filter-line' + (show === false ? ' hidden' : '');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Tìm...';
        holder.appendChild(input);
        input.addEventListener('keyup', function () { success(input.value); });
        input.addEventListener('change', function () { success(input.value); });
        return holder;
    };
}

function makeHeaderDropdownFilter(values, show) {
    return function (cell, onRendered, success) {
        const holder = document.createElement('div');
        holder.className = 'grid-filter-line' + (show === false ? ' hidden' : '');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Tìm...';
        holder.appendChild(input);
        input.addEventListener('keyup', function () { success(input.value); });
        input.addEventListener('change', function () { success(input.value); });
        return holder;
    };
}

function dropdownColumn(dataField, headerText, width, dataSource, displayMember, valueMember) {
    const values = {};
    const options = [];
    (dataSource || []).forEach(x => {
        const value = String(x[valueMember]);
        const text = x[displayMember];
        values[value] = text;
        options.push({ value, text });
    });
    function tomSelectEditor(cell, onRendered, success, cancel) {
        const currentValue = String(cell.getValue() ?? "");
        const input = document.createElement("select");
        input.className = "grid-tomselect-editor";
        options.forEach(x => {
            const opt = document.createElement("option");
            opt.value = x.value;
            opt.textContent = x.text;
            input.appendChild(opt);
        });
        let ts = null;
        let closedBySelect = false;
        onRendered(function () {
            ts = new TomSelect(input, {
                options,
                valueField: "value",
                labelField: "text",
                searchField: ["text", "value"],
                create: false,
                maxItems: 1,
                maxOptions: 200,
                allowEmptyOption: false,
                dropdownParent: "body",
                openOnFocus: true,
                preload: true,
                onInitialize: function () {
                    this.setValue(currentValue, true);
                    this.open();
                    setTimeout(() => {
                        this.focus();
                        const opt = this.dropdown_content.querySelector(`[data-value="${CSS.escape(currentValue)}"]`);
                        if (opt) { opt.classList.add("active"); opt.scrollIntoView({ block: "nearest" }); }
                    }, 30);
                },
                onChange: function (value) { closedBySelect = true; success(value); },
                onBlur: function () { if (!closedBySelect) success(this.getValue()); }
            });
            setTimeout(() => { ts.open(); ts.focus(); }, 10);
        });
        return input;
    }
    return {
        title: headerText,
        field: dataField,
        width,
        _lookupMap: values,
        _dropdownValues: values,
        editor: tomSelectEditor,
        formatter: function (cell) { const v = cell.getValue(); return values[String(v)] || ""; },
        headerFilter: "input",
        headerFilterPlaceholder: "Tìm...",
        headerFilterFunc: function (filterValue, rowValue) {
            const text = values[String(rowValue)] || "";
            return text.toLowerCase().includes(String(filterValue || "").toLowerCase());
        },
        headerSort: true
    };
}

function textColumn(dataField, headerText, width, editable) {
    return {
        title: titleWithFilter(headerText, dataField),
        field: dataField,
        width,
        editor: editable === false ? false : function (cell, onRendered, success, cancel) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'grid-inline-editor';
            input.value = cell.getValue() ?? '';
            onRendered(() => { input.focus(); input.select(); });
            input.addEventListener('blur', () => success(input.value));
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') success(input.value);
                if (e.key === 'Escape') cancel();
            });
            return input;
        },
        headerSort: true
    };
}

function numberColumn(dataField, headerText, width, editable) {
    return {
        title: titleWithFilter(headerText, dataField),
        field: dataField,
        width,
        editor: editable === false ? false : function (cell, onRendered, success, cancel) {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'grid-inline-editor';
            input.value = cell.getValue() ?? '';
            onRendered(() => { input.focus(); input.select(); });
            input.addEventListener('blur', () => success(input.value));
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') success(input.value);
                if (e.key === 'Escape') cancel();
            });
            return input;
        },
        hozAlign: 'right',
        headerSort: true
    };
}

function dateColumn(dataField, headerText, width) {
    return {
        title: titleWithFilter(headerText, dataField),
        field: dataField, width,
        editor: dateEditor, headerSort: true,
        formatter: function (cell) { return gridFormatDate(cell.getValue()); }
    };
}

function dateTimeColumn(dataField, headerText, width) {
    return {
        title: titleWithFilter(headerText, dataField),
        field: dataField,
        width: width,
        editor: dateTimeEditor,
        headerSort: true,
        formatter: function (cell) {
            return gridFormatDateTime(cell.getValue());
        }
    };
}

function parseGridDate(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val))
        return val;
    let s = String(val).trim();
    let m;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
        return new Date(
            +m[3],
            +m[2] - 1,
            +m[1],
            +(m[4] || 0),
            +(m[5] || 0)
        );
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?/);
    if (m) {
        return new Date(
            +m[1],
            +m[2] - 1,
            +m[3],
            +(m[4] || 0),
            +(m[5] || 0)
        );
    }
    let d = new Date(val);
    return isNaN(d) ? null : d;
}

function gridFormatDate(v) {
    let d = parseGridDate(v);
    if (!d)
        return '';
    const pad = n => String(n).padStart(2, '0');
    return pad(d.getDate()) + '/' +
        pad(d.getMonth() + 1) + '/' +
        d.getFullYear();
}

function gridFormatDateTime(v) {
    let d = parseGridDate(v);
    if (!d)
        return '';
    const pad = n => String(n).padStart(2, '0');
    return pad(d.getDate()) + '/' +
        pad(d.getMonth() + 1) + '/' +
        d.getFullYear() + ' ' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes());
}

function makeDateButton() {
    let btn = document.createElement("div");
    btn.innerHTML = '<i class="fa-solid fa-calendar-days" style="background:none;color:#d2d3d5;margin-left:3px;margin-right:3px"></i>';
    return btn;
}

function dateEditor(cell, onRendered, success, cancel) {
    let wrap = document.createElement("div");
    wrap.style.cssText = `
display:flex;
align-items:center;
gap:4px;
width:100%;
`;
    let input = document.createElement("input");
    input.className = 'form-control form-control-sm';
    input.placeholder = '__/__/____';
    input.value = gridFormatDate(cell.getValue());
    let btn = makeDateButton();
    wrap.appendChild(input);
    wrap.appendChild(btn);
    let fp;
    let done = false;
    function commit() {
        if (done) return;
        done = true;
        success(input.value);
    }
    onRendered(function () {
        input.focus();
        input.select();
        if (window.flatpickr) {
            fp = flatpickr(input, {
                dateFormat: "d/m/Y",
                allowInput: true,
                defaultDate: parseGridDate(cell.getValue()),
                clickOpens: true,
                onChange: function (sd, str) {
                    input.value = str;
                    commit();
                }
            });
        }
    });
    btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (fp)
            fp.open();
    });
    input.addEventListener("input", function () {
        if (window.maskDateValue)
            input.value = maskDateValue(input.value);
    });
    input.addEventListener("blur", function () {
        setTimeout(commit, 150);
    });
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter")
            commit();
        if (e.key === "Escape")
            cancel();
    });
    return wrap;
}

function dateTimeEditor(cell, onRendered, success, cancel) {
    let wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center;gap:4px;width:100%;";
    let input = document.createElement("input");
    input.className = "form-control form-control-sm";
    input.placeholder = "__/__/____ __:__";
    input.value = gridFormatDateTime(cell.getValue());
    let btn = document.createElement("div");
    btn.innerHTML = '<i class="fa-solid fa-calendar-days" style="background:none;color:#d2d3d5;margin-left:3px;margin-right:3px"></i>';
    btn.title = "Chọn ngày giờ";
    wrap.appendChild(input);
    wrap.appendChild(btn);
    let fp = null;
    let done = false;
    let opening = false;
    function commit() {
        if (done) return;
        done = true;
        success(input.value);
    }
    onRendered(function () {
        input.focus();
        input.select();
        if (window.flatpickr) {
            fp = flatpickr(input, {
                enableTime: true,
                time_24hr: true,
                dateFormat: "d/m/Y H:i",
                allowInput: true,
                defaultDate: parseGridDate(cell.getValue()),
                clickOpens: true,
                minuteIncrement: 1,
                onChange: function (selectedDates, dateStr) {
                    input.value = dateStr;
                },
                onClose: function (selectedDates, dateStr) {
                    input.value = dateStr || input.value;
                    commit();
                }
            });
        }
    });
    btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        opening = true;
        if (fp) {
            fp.open();
        }
        setTimeout(function () {
            opening = false;
            input.focus();
        }, 200);
    });
    input.addEventListener("input", function () {
        if (window.maskDateTimeValue)
            input.value = maskDateTimeValue(input.value);
    });
    input.addEventListener("blur", function () {
        setTimeout(function () {
            if (opening) return;
            if (fp && fp.isOpen) return;
            commit();
        }, 200);
    });
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
    });
    return wrap;
}

function convertColumns(columns) {
    return (columns || []).map(function (c) {
        const field = c.field || c.dataField || c.ColumnName;
        const headerText = c.headerText || c.title || c.HeaderText || field;
        const width = Number(c.width || c.Width || c.minWidth || 100);
        const textAlign = String(c.textAlign || c.hozAlign || '').toLowerCase();
        const isCenter = textAlign === 'center';
        const isRight = textAlign === 'right';
        const isBoolean = c.type === 'boolean' || c.editType === 'booleanedit' || c.displayAsCheckBox === true;
        const isNumber = c.type === 'number' || c.editType === 'numericedit';
        const isDate = c.type === 'date' || c.editType === 'datepickeredit';
        const isDateTime = c.type === 'datetime' || c.editType === 'datetimepickeredit';
        let col = {
            title: c.title && String(c.title).indexOf('grid-head-title') >= 0 ? c.title : titleWithFilter(headerText, field),
            field,
            width,
            minWidth: c.minWidth || 80,
            visible: c.visible !== false,
            headerSort: c.headerSort !== false,
            widthGrow: c.widthGrow,
            widthShrink: c.widthShrink,
            vertAlign: c.vertAlign
        };
        if (isCenter) col.hozAlign = 'center';
        else if (isRight) col.hozAlign = 'right';
        else if (c.hozAlign) col.hozAlign = c.hozAlign;
        if (c.allowEditing === false || c.editable === false) {
            col.editor = false;
        } else if (isBoolean) {
            col.hozAlign = 'center';
            col.headerHozAlign = 'center';
            col.headerFilter = false;
            col.formatter = function (cell) {
                const v = cell.getValue();
                const checked = v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
                return `<input type="checkbox" ${checked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">`;
            };
            col.cellClick = function (e, cell) {
                e.stopPropagation();
                const oldValue = cell.getValue();
                const checked = oldValue === true || oldValue === 1 || oldValue === '1' || String(oldValue).toLowerCase() === 'true';
                cell.setValue(!checked);
                const row = cell.getRow();
                const d = row.getData();
                d._dirty = true;
                row.getElement().classList.add('row-dirty');
            };
        } else if (isNumber) {
            col.hozAlign = 'right';
            col.editor = 'number';
            const format = c.format || (c.edit && c.edit.params && c.edit.params.format) || '';
            let decimals = 0;
            if (format === 'N2') decimals = 2;
            else if (format === 'N0') decimals = 0;
            else if (c.edit && c.edit.params && c.edit.params.decimals != null) decimals = Number(c.edit.params.decimals);
            col.editorParams = { step: decimals > 0 ? 0.01 : 1 };
            col.formatter = function (cell) {
                const v = cell.getValue();
                if (v === null || v === undefined || v === '') return '';
                const n = Number(v);
                if (isNaN(n)) return v;
                return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
            };
        } else if (isDate) {
            col.editor = dateEditor;
            col.formatter = c.formatter;
        } else if (isDateTime) {
            col.editor = dateTimeEditor;
            col.formatter = c.formatter;
        } else {
            col.editor = c.editor !== undefined ? c.editor : 'input';
            col.formatter = c.formatter;
            col.editorParams = c.editorParams;
        }
        if (c.allowFiltering === false || c.headerFilter === false || isBoolean) {
            col.headerFilter = false;
        } else {
            col.headerFilter = c.headerFilter !== undefined ? c.headerFilter : 'input';
            col.headerFilterFunc = c.headerFilterFunc;
            col.headerFilterPlaceholder = c.headerFilterPlaceholder || 'Tìm...';
            col.headerFilterParams = c.headerFilterParams;
        }
        if (c.formatter && !isBoolean && !isNumber) col.formatter = c.formatter;
        if (c.editorParams) col.editorParams = c.editorParams;
        if (c._isPrimaryKey === true) col._isPrimaryKey = true;
        if (c._lookupMap) col._lookupMap = c._lookupMap;
        if (c._dropdownValues) col._dropdownValues = c._dropdownValues;
        return col;
    });
}

function toFlatpickrDateTimeValue(val) {
    if (!val) return "";
    let s = String(val).trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/);
    if (m) {
        return m[1].padStart(2, "0") + "/" +
            m[2].padStart(2, "0") + "/" +
            m[3] + " " +
            m[4].padStart(2, "0") + ":" +
            m[5].padStart(2, "0");
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})/);
    if (m) {
        return m[3].padStart(2, "0") + "/" +
            m[2].padStart(2, "0") + "/" +
            m[1] + " " +
            m[4].padStart(2, "0") + ":" +
            m[5].padStart(2, "0");
    }
    let d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return "";
    const pad = n => String(n).padStart(2, "0");
    return pad(d.getDate()) + "/" +
        pad(d.getMonth() + 1) + "/" +
        d.getFullYear() + " " +
        pad(d.getHours()) + ":" +
        pad(d.getMinutes());
}

function makeExcelFilterPanel(gridId, table) {
    let activeField = null;
    let columnFilters = {};
    const panel = document.createElement('div');
    panel.className = 'excel-filter-panel';
    panel.innerHTML = `
<div class="d-flex justify-content-between align-items-center mb-2">
<b class="filter-title">Filter</b>
<button type="button" class="close btn-close-filter" aria-label="Close"><span aria-hidden="true">&times;</span></button>
</div>
<input class="form-control form-control-sm mb-2 filter-search" placeholder="Tìm giá trị...">
<div class="filter-values" style="max-height:230px;overflow:auto;border:1px solid #dee2e6;border-radius:8px;padding:8px"></div>
<div class="d-flex mt-3" style="gap:8px">
<button class="btn btn-sm btn-primary btn-apply-filter">Áp dụng</button>
<button class="btn btn-sm btn-outline-secondary btn-clear-filter">Xóa lọc</button>
</div>`;
    document.body.appendChild(panel);
    function buildValues() {
        const box = panel.querySelector('.filter-values');
        const keyword = panel.querySelector('.filter-search').value.toLowerCase();
        const map = new Map();
        table.getRows().forEach(function (row) {
            const data = row.getData();
            const raw = data[activeField];
            const add = function (v) {
                const value = normalizeCellValue(v);
                if (map.has(value)) return;
                let text = '';
                try {
                    const cell = row.getCell(activeField);
                    const el = cell ? cell.getElement() : null;
                    if (el) text = el.innerText.trim();
                } catch (e) { }
                if (!text) text = typeof getDisplayText === 'function'
                    ? getDisplayText(activeField, v)
                    : (v == null || v === '' ? '(Trống)' : String(v));
                map.set(value, text);
            };
            if (Array.isArray(raw)) raw.forEach(add);
            else add(raw);
        });
        const selected = columnFilters[activeField] || null;
        const arr = Array.from(map.entries())
            .filter(function (p) {
                return String(p[1]).toLowerCase().includes(keyword);
            })
            .sort(function (a, b) {
                return String(a[1]).localeCompare(String(b[1]), 'vi');
            });
        const allChecked = !selected;
        box.innerHTML = `
<label class="excel-filter-item">
<input type="checkbox" class="chk-all" ${allChecked ? 'checked' : ''}>
<b>Chọn tất cả</b>
</label>
<hr class="my-2">
${arr.map(function (p) {
            const raw = p[0], label = p[1];
            const checked = !selected || selected.includes(raw);
            return `<label class="excel-filter-item">
<input type="checkbox" class="filter-value-check" value="${escapeHtml(raw)}" ${checked ? 'checked' : ''}>
<span>${escapeHtml(label || '(Trống)')}</span>
</label>`;
        }).join('')}`;
        const chkAll = box.querySelector('.chk-all');
        if (chkAll) {
            chkAll.addEventListener('change', function () {
                box.querySelectorAll('.filter-value-check').forEach(function (c) {
                    c.checked = chkAll.checked;
                });
            });
            box.querySelectorAll('.filter-value-check').forEach(function (c) {
                c.addEventListener('change', function () {
                    const all = box.querySelectorAll('.filter-value-check');
                    const done = box.querySelectorAll('.filter-value-check:checked');
                    chkAll.indeterminate = done.length > 0 && done.length < all.length;
                    chkAll.checked = done.length === all.length;
                });
            });
        }
    }
    function applyAllFilters() {
        table.setFilter(function (data) {
            for (const field in columnFilters) {
                const allowed = columnFilters[field];
                const raw = data[field];
                if (Array.isArray(raw)) { if (!raw.some(function (x) { return allowed.includes(normalizeCellValue(x)); })) return false; }
                else { if (!allowed.includes(normalizeCellValue(raw))) return false; }
            }
            return true;
        });
        document.querySelectorAll(`#${gridId} .filter-btn`).forEach(function (btn) { btn.classList.toggle('active', !!columnFilters[btn.dataset.field]); });
    }
    document.addEventListener('click', function (e) {
        const btn = e.target.closest(`#${gridId} .filter-btn`);
        if (btn) {
            e.preventDefault(); e.stopPropagation();
            activeField = btn.dataset.field;
            let headerText = activeField;
            try {
                const col = table.getColumn(activeField);
                if (col) {
                    const def = col.getDefinition();
                    const div = document.createElement('div');
                    div.innerHTML = def.title || activeField;
                    headerText = div.innerText.trim() || activeField;
                }
            } catch (e) { }
            panel.querySelector('.filter-title').textContent = 'Filter: ' + headerText;
            panel.querySelector('.filter-search').value = '';
            buildValues();
            const rect = btn.getBoundingClientRect();
            panel.style.left = Math.max(8, rect.left + window.scrollX - 250) + 'px';
            panel.style.top = (rect.bottom + window.scrollY + 6) + 'px';
            panel.style.display = 'block';
            panel.querySelector('.filter-search').focus();
            return;
        }
        if (panel.style.display !== 'none' && !panel.contains(e.target)) panel.style.display = 'none';
    }, true);
    panel.querySelector('.btn-close-filter').onclick = function () { panel.style.display = 'none'; };
    // Debounce ô tìm kiếm: buildValues quét toàn bộ dòng + đọc DOM, không nên chạy mỗi phím gõ.
    let _filterSearchTimer = null;
    panel.querySelector('.filter-search').addEventListener('keyup', function () {
        if (_filterSearchTimer) clearTimeout(_filterSearchTimer);
        _filterSearchTimer = setTimeout(buildValues, 180);
    });
    panel.querySelector('.btn-apply-filter').onclick = function () {
        const checks = Array.from(panel.querySelectorAll('.filter-value-check'));
        const selected = checks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
        if (selected.length === checks.length) delete columnFilters[activeField]; else columnFilters[activeField] = selected;
        applyAllFilters(); panel.style.display = 'none';
    };
    panel.querySelector('.btn-clear-filter').onclick = function () { delete columnFilters[activeField]; applyAllFilters(); panel.style.display = 'none'; };
    return {
        applyAllFilters,
        clearAll: function () {
            columnFilters = {};
            table.clearFilter(true);
            document.querySelectorAll(`#${gridId} .filter-btn`).forEach(function (btn) { btn.classList.remove('active'); });
        }
    };
}

function callGridActionBegin(table, args) {
    if (typeof table.actionBegin === 'function') table.actionBegin(args);
    // Tương thích module CŨ (EJ2-style) chỉ định nghĩa actionComplete cho save/delete:
    // wrapper trước chỉ gọi actionBegin -> handler không chạy => không tự lưu khi rời dòng & bấm Xóa không xóa.
    if (typeof table.actionComplete === 'function') table.actionComplete(args);
    return args;
}

function initGridGrouping(id, table, opts) {
    const modeKey = 'grid_' + id + '_drag_mode';
    let headerDragMode = localStorage.getItem(modeKey) || 'reorder';
    table.allowGrouping = opts.allowGrouping === true;
    table.groupSettings = opts.groupSettings || { showDropArea: false, columns: [], showGroupColumn: true };
    if (table.groupSettings.showGroupColumn === undefined) {
        table.groupSettings.showGroupColumn = true;
    }
    let groupFields = table.groupSettings.columns && table.groupSettings.columns.length ? table.groupSettings.columns.slice() : [];

    function getColumnTitle(field) {
        try {
            const col = table.getColumn(field);
            if (!col) return field;
            const def = col.getDefinition();
            let title = def.title || field;
            const div = document.createElement('div');
            div.innerHTML = title;
            return div.innerText || field;
        } catch (e) { return field; }
    }

    table.setGroupColumns = function (cols) {
        groupFields = (cols || []).filter(function (x) { return x !== null && x !== undefined && x !== ''; });
        table.groupSettings.columns = groupFields.slice();
        if (table.groupSettings.showGroupColumn === false) {
            table.getColumns().forEach(function (col) {
                const field = col.getField();
                if (field && groupFields.includes(field)) {
                    col.hide();
                } else if (field) {
                    const originalCol = opts._originalColumns ? opts._originalColumns.find(c => {
                        return (c.field || c.dataField || c.ColumnName) === field;
                    }) : null;
                    if (!originalCol || originalCol.visible !== false) {
                        col.show();
                    }
                }
            });
        }
        table.setGroupBy(false);
        setTimeout(function () {
            table.setGroupBy(groupFields.length ? groupFields : false);
            renderGroupDropArea();
            setTimeout(function () { try { table.redraw(true); } catch (e) { } }, 50);
        }, 20);
        return table;
    };

    table.clearGrouping = function () { return table.setGroupColumns([]); };

    function eachGroupDeep(groups, callback, level) {
        level = level || 0;
        if (level > 20) return;
        (groups || []).forEach(function (g) {
            try {
                callback(g);
                const sub = g.getSubGroups ? g.getSubGroups() : [];
                if (sub && sub.length) {
                    eachGroupDeep(sub, callback, level + 1);
                }
            } catch (e) {
                console.warn('Error processing group:', e);
            }
        });
    }

    table.expandAllGroups = function () {
        let attempts = 0;
        const maxAttempts = 15;
        function expandRecursive() {
            if (attempts >= maxAttempts) {
                table._groupsCollapsed = false;
                return;
            }
            attempts++;
            const groups = table.getGroups();
            eachGroupDeep(groups, function (g) {
                try {
                    if (!g.isVisible()) {
                        g.show();
                    }
                } catch (e) { }
            });
            setTimeout(expandRecursive, 50);
        }
        expandRecursive();
        return table;
    };

    table.collapseAllGroups = function () {
        let attempts = 0;
        const maxAttempts = 15;
        function collapseRecursive() {
            if (attempts >= maxAttempts) {
                table._groupsCollapsed = true;
                return;
            }
            attempts++;
            const groups = table.getGroups();
            const allGroups = [];
            eachGroupDeep(groups, function (g) {
                allGroups.push(g);
            });
            allGroups.reverse().forEach(function (g) {
                try {
                    if (g.isVisible()) {
                        g.hide();
                    }
                } catch (e) { }
            });
            setTimeout(collapseRecursive, 50);
        }
        collapseRecursive();
        return table;
    };

    table.toggleAllGroups = function () {
        if (table._groupsCollapsed === true) table.expandAllGroups();
        else table.collapseAllGroups();
        return table;
    };

    function renderGroupDropArea() {
        const wrap = document.getElementById(id + '_group_area');
        if (!wrap) return;
        let html = `<div class="grid-group-left">`;
        if (!groupFields.length) {
            html += `<span>Kéo cột vào đây để nhóm dữ liệu</span>`;
        } else {
            html += groupFields.map(function (field) {
                return `<span class="grid-group-chip" draggable="true" data-field="${field}">${escapeHtml(getColumnTitle(field))}<button type="button" data-remove-group="${field}">×</button></span>`;
            }).join('');
        }
        html += `</div><div class="grid-group-actions"><button type="button" data-group-expand-all>Expand all</button><button type="button" data-group-collapse-all>Collapse all</button></div>`;
        wrap.innerHTML = html;
    }

    function createDropArea() {
        const gridEl = document.getElementById(id);
        if (!gridEl) return;
        if (document.getElementById(id + '_group_area')) {
            renderGroupDropArea();
            return;
        }
        const area = document.createElement('div');
        area.id = id + '_group_area';
        area.className = 'grid-group-droparea';
        gridEl.parentNode.insertBefore(area, gridEl);

        area.addEventListener('click', function (e) {
            const removeBtn = e.target.closest('[data-remove-group]');
            if (removeBtn) {
                const field = removeBtn.getAttribute('data-remove-group');
                groupFields = groupFields.filter(x => x !== field);
                table.setGroupColumns(groupFields);
                return;
            }
            if (e.target.closest('[data-group-expand-all]')) {
                table.expandAllGroups();
                return;
            }
            if (e.target.closest('[data-group-collapse-all]')) {
                table.collapseAllGroups();
                return;
            }
        });
        renderGroupDropArea();
    }

    // ─── enableHeaderDrag: phát hiện hướng kéo bằng mousemove, dùng document-level listeners ───
    function enableHeaderDrag() {
        table.getColumns().forEach(function (col) {
            const field = col.getField();
            if (!field) return;
            const el = col.getElement();
            if (!el) return;

            // Cleanup listener cũ
            if (col._dragHandlers) {
                el.removeEventListener('mousedown', col._dragHandlers.mousedown);
            }
            // Không dùng HTML5 draggable — conflict với Tabulator reorder
            el.removeAttribute('draggable');

            let startX = 0, startY = 0;
            let isDraggingToGroup = false;
            let ghostEl = null;
            let moved = false;
            let cancellingTabulator = false;
            // ID để định danh bộ listener, tránh trùng
            const listenerId = id + '_' + field + '_' + Date.now();

            function createGhost() {
                if (ghostEl) ghostEl.remove();
                ghostEl = document.createElement('div');
                ghostEl.textContent = getColumnTitle(field);
                ghostEl.style.cssText = [
                    'position:fixed',
                    'left:-9999px',
                    'top:-9999px',
                    'pointer-events:none',
                    'z-index:2147483647',
                    'background:#fff',
                    'border:2px solid #66afe9',
                    'border-radius:6px',
                    'padding:4px 12px',
                    'font-size:13px',
                    'font-weight:600',
                    'color:#1e40af',
                    'box-shadow:0 4px 16px rgba(0,0,0,.18)',
                    'opacity:0.92',
                    'white-space:nowrap',
                    'transform:translateX(-50%)'
                ].join(';');
                // Luôn append thẳng vào body để tránh bị ảnh hưởng bởi parent transform/overflow
                document.body.appendChild(ghostEl);
            }

            function moveGhost(x, y) {
                if (!ghostEl) return;
                ghostEl.style.left = x + 'px';
                ghostEl.style.top = (y + 16) + 'px';
            }

            function removeGhost() {
                if (ghostEl) { ghostEl.remove(); ghostEl = null; }
            }

            function isOverGroupArea(x, y) {
                const area = document.getElementById(id + '_group_area');
                if (!area) return false;
                const r = area.getBoundingClientRect();
                return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            }

            function cleanupAll() {
                document.removeEventListener('mousemove', onDocMouseMove, true);
                document.removeEventListener('mouseup', onDocMouseUp, true);
                removeGhost();
                const area = document.getElementById(id + '_group_area');
                if (area) area.classList.remove('drag');
                isDraggingToGroup = false;
                moved = false;
                cancellingTabulator = false;
            }

            function cancelTabulatorMove(x, y) {
                cancellingTabulator = true;
                // Dispatch mouseup giả để Tabulator thoát khỏi trạng thái reorder
                const fakeUp = new MouseEvent('mouseup', {
                    bubbles: true, cancelable: true, view: window,
                    clientX: x, clientY: y
                });
                document.dispatchEvent(fakeUp);
                // Dọn artifact của Tabulator
                document.querySelectorAll('.tabulator-col-moving, .tabulator-col-placeholder')
                    .forEach(function (node) { node.remove(); });
                document.body.classList.remove('tabulator-moving');
                document.body.style.cursor = '';
                // Reset flag sau một tick — lúc này fake mouseup đã xử lý xong
                setTimeout(function () { cancellingTabulator = false; }, 0);
            }

            function onDocMouseMove(e) {
                if (!moved) {
                    const dx = Math.abs(e.clientX - startX);
                    const dy = Math.abs(e.clientY - startY);
                    // Chưa vượt ngưỡng, chưa xác định hướng
                    if (dx < 5 && dy < 5) return;
                    moved = true;

                    if (dy > dx) {
                        // ── Kéo DỌC: về phía group area ──
                        isDraggingToGroup = true;
                        cancelTabulatorMove(e.clientX, e.clientY);
                        createGhost();
                        moveGhost(e.clientX, e.clientY);
                    } else {
                        // ── Kéo NGANG: nhường hoàn toàn cho Tabulator reorder ──
                        cleanupAll();
                        return;
                    }
                }

                if (isDraggingToGroup) {
                    e.preventDefault();
                    e.stopPropagation();
                    moveGhost(e.clientX, e.clientY);
                    const area = document.getElementById(id + '_group_area');
                    if (area) area.classList.toggle('drag', isOverGroupArea(e.clientX, e.clientY));
                }
            }

            function onDocMouseUp(e) {
                // Bỏ qua mouseup giả do cancelTabulatorMove phát ra
                if (cancellingTabulator) return;

                // Lưu trạng thái trước khi cleanup
                const wasGroupDrag = isDraggingToGroup;
                const overGroup = isOverGroupArea(e.clientX, e.clientY);

                // Luôn cleanup trước
                cleanupAll();

                if (wasGroupDrag && overGroup) {
                    if (field && !groupFields.includes(field)) {
                        groupFields.push(field);
                        table.setGroupColumns(groupFields);
                    }
                }
            }

            function headerMouseDown(e) {
                if (e.button !== 0) return;
                // Bỏ qua click vào button/input bên trong header (filter btn, v.v.)
                if (e.target.closest('button, input, select')) return;

                startX = e.clientX;
                startY = e.clientY;
                isDraggingToGroup = false;
                moved = false;
                cancellingTabulator = false;

                document.addEventListener('mousemove', onDocMouseMove, true);
                document.addEventListener('mouseup', onDocMouseUp, true);
            }

            el.addEventListener('mousedown', headerMouseDown);
            col._dragHandlers = { mousedown: headerMouseDown };
        });
    }

    table.on('tableBuilt', function () {
        if (!table.allowGrouping) return;
        if (table.groupSettings.showDropArea === true) createDropArea();
        setTimeout(function () {
            enableHeaderDrag();
            if (groupFields.length) table.setGroupColumns(groupFields);
        }, 100);
    });

    setTimeout(function () {
        if (!table.allowGrouping) return;
        if (table.groupSettings.showDropArea === true) createDropArea();
        enableHeaderDrag();
        if (groupFields.length) table.setGroupColumns(groupFields);
    }, 300);
}
function bindGridToolbarActions(id, table) {
    const toolbar = document.getElementById(id + '_toolbar') || document.getElementById(id + '_legacy_toolbar');
    if (!toolbar || toolbar._gridActionBound) return;
    toolbar._gridActionBound = true;

    function getCurrentRow() {
        const rows = table.getSelectedRows();
        if (rows && rows.length) return rows[0];
        const activeRows = table.getRows('active');
        return activeRows && activeRows.length ? activeRows[0] : null;
    }

    function setEditMode(isEdit) {
        table._editMode = isEdit === true;
        if (table._editMode) table.unlock();
        else table.lock();
    }

    toolbar.addEventListener('click', async function (e) {
        const btn = e.target.closest('button, a, div');
        if (!btn || !btn.id) return;

        const prefix = id + '_';
        if (!btn.id.startsWith(prefix)) return;

        const action = btn.id.substring(prefix.length).toLowerCase();

        if (action === 'add') {
            setEditMode(true);
            const newData = typeof table.newRowData === 'function' ? table.newRowData() : {};
            newData._isNew = true;
            newData._dirty = true;

            const row = await table.addRow(newData, true);
            table.deselectRow();
            row.select();
            row.getElement().classList.add('row-new', 'row-dirty');
            table._currentEditRow = row;

            const args = { requestType: 'add', data: newData, rowData: newData, row, grid: table, cancel: false };
            callGridActionBegin(table, args);
            return;
        }

        if (action === 'edit') {
            const row = getCurrentRow();
            if (!row) return alert('Chưa chọn dòng cần sửa');

            setEditMode(true);
            table._currentEditRow = row;

            const d = row.getData();
            const args = { requestType: 'edit', data: d, rowData: d, row, grid: table, cancel: false };
            callGridActionBegin(table, args);
            return;
        }

        if (action === 'delete') {
            const row = getCurrentRow();
            if (!row) return alert('Chưa chọn dòng cần xóa');
            if (!confirm('Bạn có chắc muốn xóa dòng này không?')) return;

            const d = row.getData();
            const args = { requestType: 'delete', data: d, rowData: d, row, grid: table, cancel: false };
            callGridActionBegin(table, args);
            if (args.cancel === true) return;

            if (typeof table.deleteRow === 'function') {
                await table.deleteRow(d, row);
            }

            row.delete();
            return;
        }

        if (action === 'update') {
            const row = table._currentEditRow || getCurrentRow();
            if (!row) return alert('Không có dòng cần lưu');

            const d = row.getData();
            const args = { requestType: 'save', data: d, rowData: d, row, grid: table, cancel: false };
            callGridActionBegin(table, args);
            if (args.cancel === true) return;

            if (typeof table.saveRow === 'function') {
                await table.saveRow(d, row);
            }

            d._dirty = false;
            d._isNew = false;
            row.getElement().classList.remove('row-dirty', 'row-new');
            table._currentEditRow = null;
            setEditMode(false);
            return;
        }

        if (action === 'cancel') {
            const row = table._currentEditRow || getCurrentRow();

            if (row) {
                const d = row.getData();
                if (d._isNew) {
                    row.delete();
                } else if (row._oldData) {
                    row.update(JSON.parse(JSON.stringify(row._oldData)));
                    row.getElement().classList.remove('row-dirty', 'row-new');
                }
            }

            table._currentEditRow = null;
            setEditMode(false);
            return;
        }
    });
}
function newGrid(id, dataSource, columns, rowDataBound, rowSelected, bind, readOnlyFields, options) {
    const opts = options || {};
    let currentEditingRow = null;
    opts._originalColumns = columns ? columns.slice() : [];
    if (typeof window[id] === 'object') {
        opts.allowGrouping = window[id].allowGrouping === true;
        opts.groupSettings = window[id].groupSettings || opts.groupSettings;
    }
    const USE_VIRTUAL_SCROLL = opts.pagination !== true && opts.dataTree !== true; // tree cần đủ data để dựng cây
    const VIRTUAL_PAGE_SIZE = opts.virtualPageSize || 500;
    let _virtualOffset = 0;
    let _allData = [];
    const tabColumns = [];
    if (opts.allowGrouping === true) {
        tabColumns.unshift({
            title: `<button type="button" class="grid-group-all-toggle" title="Expand / Collapse all">▼</button>`,
            field: "__group_toggle__",
            width: 30, minWidth: 30, widthGrow: 0, widthShrink: 0,
            headerSort: false, resizable: false, frozen: false,
            formatter: function () { return ""; }
        });
    }
    if (opts.showCheckbox === true) {
        tabColumns.push({
            formatter: "rowSelection",
            titleFormatter: "rowSelection",
            titleFormatterParams: { rowRange: "active" },
            width: 45, minWidth: 45, widthGrow: 0, widthShrink: 0,
            hozAlign: "center", headerHozAlign: "center", vertAlign: "middle",
            cssClass: "grid-checkbox-col",
            headerSort: false, resizable: false, frozen: false, headerFilter: false,
            cellClick: function (e, cell) {
                e.stopPropagation();
                var row = cell.getRow();
                currentEditingRow = row;
                fireRowSelected(row, e);
            }
        });
    }
    tabColumns.push(...convertColumns(columns));
    const gridTarget = bind === false ? document.createElement('div') : ('#' + id);
    const gridEl = document.getElementById(id);
    const gridWidth = gridEl ? gridEl.clientWidth : 0;
    let totalColWidth = 0;
    const visibleCols = [];
    tabColumns.forEach(function (c) {
        if (c.visible === false) return;
        const w = Number(c.width || c.minWidth || 100);
        totalColWidth += w;
        visibleCols.push(c);
    });
    if (gridWidth > 0 && totalColWidth < gridWidth) {
        const extra = gridWidth - totalColWidth;
        const addPerCol = extra / visibleCols.length;
        visibleCols.forEach(function (c) {
            const oldWidth = Number(c.width || c.minWidth || 100);
            c.width = Math.floor(oldWidth + addPerCol);
            c.widthShrink = 0;
        });
    }
    const autoLayout = totalColWidth < gridWidth ? 'fitColumns' : 'fitData';
    const defaultGroupColumns = opts.allowGrouping === true && opts.groupSettings && opts.groupSettings.columns && opts.groupSettings.columns.length ? opts.groupSettings.columns.slice() : false;
    const initialData = USE_VIRTUAL_SCROLL
        ? (dataSource || []).slice(0, VIRTUAL_PAGE_SIZE)
        : (dataSource || []);
    if (USE_VIRTUAL_SCROLL) {
        _allData = dataSource ? dataSource.slice() : [];
        _virtualOffset = Math.min(VIRTUAL_PAGE_SIZE, _allData.length);
    }
    const table = new Tabulator(gridTarget, {
        data: initialData,
        height: opts.height || '100%',
        layout: opts.layout || autoLayout,
        pagination: opts.pagination === true,
        paginationSize: opts.paginationSize || 20,
        groupBy: false,
        groupHeader: function (value, count, data, group) {
            let field = '';
            try { field = group && group.getField ? group.getField() : ''; } catch (e) { }
            let title = field, text = value;
            try {
                const col = table.getColumn(field);
                if (col) {
                    const def = col.getDefinition();
                    const div = document.createElement('div');
                    div.innerHTML = def.title || field;
                    title = div.innerText || field;
                    if (def._lookupMap) text = def._lookupMap[String(value)] || value;
                }
            } catch (e) { }
            return escapeHtml(title) + ': ' + escapeHtml(text || '(Trống)') + ' (' + count + ')';
        },
        movableColumns: opts.movableColumns !== false,
        reactiveData: true,
        // ==== Danh mục CHA-CON (opt-in): chỉ bật khi truyền opts.dataTree=true, mặc định tắt nên không ảnh hưởng lưới khác ====
        dataTree: opts.dataTree === true,
        dataTreeChildField: opts.dataTreeChildField || '_children',
        dataTreeStartExpanded: opts.dataTreeStartExpanded !== false,
        dataTreeChildIndent: 18,
        dataTreeBranchElement: true,
        selectableRows: opts.selectableRows || 1,
        placeholder: opts.placeholder || 'Không có dữ liệu',
        columns: tabColumns
    });
    initGridGrouping(id, table, opts);
    setTimeout(function () {
        if (opts.allowGrouping === true && opts.groupSettings && opts.groupSettings.columns && opts.groupSettings.columns.length) {
            table.setGroupColumns(opts.groupSettings.columns);
        }
    }, 500);
    table.load = true;
    Object.defineProperty(table, 'currentViewData', {
        get: function () { return table.getRows('active').map(function (row) { return JSON.parse(JSON.stringify(row.getData())); }); }
    });
    Object.defineProperty(table, 'currentViewRows', {
        get: function () { return table.getRows('active'); }
    });
    if (USE_VIRTUAL_SCROLL) {
        const _origReplace = table.replaceData.bind(table);
        table.replaceData = function (data) {
            _allData = data ? data.slice() : [];
            _virtualOffset = Math.min(VIRTUAL_PAGE_SIZE, _allData.length);
            return _origReplace(_allData.slice(0, _virtualOffset));
        };
        const _origSetData = table.setData.bind(table);
        table.setData = function (data) {
            _allData = data ? data.slice() : [];
            _virtualOffset = Math.min(VIRTUAL_PAGE_SIZE, _allData.length);
            return _origSetData(_allData.slice(0, _virtualOffset));
        };
    }
    // Tương thích code cũ (EJ2): cho phép `grid.dataSource = [...]` -> định tuyến sang Tabulator setData.
    // Trước đây newGrid (Tabulator) KHÔNG có setter dataSource nên mọi gán là no-op => grid trống dù có dữ liệu.
    var _pendingDS = null, _dsBuilt = false;
    table.on('tableBuilt', function () {
        _dsBuilt = true;
        if (_pendingDS != null) { var d = _pendingDS; _pendingDS = null; try { table.setData(d); } catch (e) { } }
    });
    Object.defineProperty(table, 'dataSource', {
        get: function () {
            if (_allData && _allData.length) return _allData;
            try { return table.getData(); } catch (e) { return _allData || []; }
        },
        set: function (v) {
            var arr = v || [];
            _allData = arr.slice();
            if (_dsBuilt) { try { table.setData(arr); } catch (e) { _pendingDS = arr; } }
            else { _pendingDS = arr; }
        },
        configurable: true
    });
    table.lock = function () {
        table.load = null;
        const el = document.getElementById(id);
        if (el) el.classList.add('grid-readonly');
        return table;
    };
    table.unlock = function () {
        table.load = true;
        const el = document.getElementById(id);
        if (el) el.classList.remove('grid-readonly');
        return table;
    };
    async function saveRowToServer(row) {
        if (table.load == null || table.load === false) return false;
        const d = row.getData();
        if (opts.validateRow && opts.validateRow(row) === false) return false;
        const args = { requestType: 'save', data: d, rowData: d, row, cancel: false };
        callGridActionBegin(table, args);
        if (args.cancel === true) return false;
        if (opts.saveRow) await opts.saveRow(d, row);
        else if (typeof table.actionBegin !== 'function') console.log('SAVE ROW:', d);
        d._dirty = false;
        d._isNew = false;
        row.getElement().classList.remove('row-dirty', 'row-new');
        return true;
    }
    async function saveCurrentRowIfLeave(newRow) {
        if (table.load == null || table.load === false) return true;
        if (!currentEditingRow) return true;
        if (newRow && currentEditingRow === newRow) return true;
        const d = currentEditingRow.getData();
        if (d._dirty || d._isNew) return await saveRowToServer(currentEditingRow);
        return true;
    }
    function cloneRowData(row) { return JSON.parse(JSON.stringify(row.getData())); }
    function fireRowSelected(row, e) {
        const rowData = cloneRowData(row);
        const payload = { data: rowData, rowData, row, grid: table, event: e || null };
        if (typeof rowSelected === 'function') rowSelected(payload);
        if (typeof opts.rowSelected === 'function') opts.rowSelected(payload);
        if (typeof table.rowSelected === 'function') table.rowSelected(payload);
    }
    table.on('rowFormatter', function (row) {
        const d = row.getData();
        row.getElement().classList.toggle('row-dirty', !!d._dirty);
        row.getElement().classList.toggle('row-new', !!d._isNew);
        if (typeof rowDataBound === 'function') rowDataBound(row);
    });
    table.on('cellEditing', async function (cell) {
        if (table.load == null || table.load === false) { cell.cancelEdit(); return false; }
        if (readOnlyFields && readOnlyFields.includes(cell.getField())) { cell.cancelEdit(); return false; }
        const row = cell.getRow();
        await saveCurrentRowIfLeave(row);
        currentEditingRow = row;
    });
    table.on('cellEdited', function (cell) {
        if (table.load == null || table.load === false) return;
        const row = cell.getRow();
        const d = row.getData();
        d._dirty = true;
        row.getElement().classList.add('row-dirty');
    });
    function bindGridRowClickSelect() {
        const gridEl = document.getElementById(id);
        if (!gridEl || gridEl._rowClickBound) return;
        gridEl._rowClickBound = true;
        gridEl.addEventListener('click', async function (e) {
            if (e.target.closest('.tabulator-header') || e.target.closest('.grid-filter-line') ||
                e.target.closest('.filter-btn') || e.target.closest('.ts-dropdown') || e.target.closest('.ts-control') ||
                e.target.closest('.dm-inrow') || e.target.closest('.dm-rowdetail')) return; // click trong panel sửa -> không re-select dòng (giữ focus ô nhập)
            const rowEl = e.target.closest('.tabulator-row');
            if (!rowEl) return;
            const rows = table.getRows();
            let row = null;
            for (let i = 0; i < rows.length; i++) { if (rows[i].getElement() === rowEl) { row = rows[i]; break; } }
            if (!row) return;
            await saveCurrentRowIfLeave(row);
            currentEditingRow = row;
            if (opts.selectOnRowClick !== false) { table.deselectRow(); row.select(); }
            fireRowSelected(row, e);
        }, true);
    }
    function attachInfiniteScroll() {
        if (!USE_VIRTUAL_SCROLL) return;
        const scrollHolder = document.querySelector('#' + id + ' .tabulator-tableholder');
        if (!scrollHolder) return;
        let _loading = false;
        // Hàm nạp thêm 1 trang khi cuộn gần đáy của vùng cuộn `sc` (tableholder HOẶC container ngoài có overflow:auto).
        function loadMoreIfNearBottom(sc) {
            if (_loading) return;
            if (_virtualOffset >= _allData.length) return;
            if ((sc.scrollTop + sc.clientHeight) < (sc.scrollHeight - 120)) return;
            _loading = true;
            const currentPos = sc.scrollTop;
            const nextChunk = _allData.slice(_virtualOffset, _virtualOffset + VIRTUAL_PAGE_SIZE);
            _virtualOffset += nextChunk.length;
            table.addData(nextChunk).then(function () {
                requestAnimationFrame(function () { sc.scrollTop = currentPos; _loading = false; });
            }).catch(function () { _loading = false; });
        }
        scrollHolder.addEventListener('scroll', function () { loadMoreIfNearBottom(scrollHolder); });
        // Nghe thêm vùng cuộn NGOÀI (vd #divPrGrid overflow:auto) — nhiều trang cuộn ở container cha chứ không phải tableholder.
        let outer = scrollHolder.parentElement;
        while (outer && outer !== document.body) {
            const oy = getComputedStyle(outer).overflowY;
            if (oy === 'auto' || oy === 'scroll') {
                outer.addEventListener('scroll', function () { loadMoreIfNearBottom(outer); });
                break;
            }
            outer = outer.parentElement;
        }
    }
    table.on('tableBuilt', function () {
        bindGridRowClickSelect();
        attachInfiniteScroll();
        if (typeof makeExcelFilterPanel === 'function') table.filterApi = makeExcelFilterPanel(id, table);
        const visible = opts.showFilterRow === true;
        setTimeout(function () {
            if (visible) table.showFilterRow();
            else table.hideFilterRow();
        }, 50);
    });
    let _gridHeight = opts.height || '100%';
    Object.defineProperty(table, 'height', {
        get: function () { return _gridHeight; },
        set: function (v) {
            _gridHeight = v || '100%';
            const el = document.getElementById(id);
            if (el) el.style.height = typeof _gridHeight === 'number' ? _gridHeight + 'px' : _gridHeight;
            table.setHeight(_gridHeight);
            setTimeout(function () { try { table.redraw(true); } catch (e) { } }, 100);
        }
    });
    table.hideFilterRow = function () {
        document.querySelectorAll('#' + id + ' .grid-filter-line').forEach(function (x) { x.classList.add('hidden'); });
        const h = document.querySelector('#' + id + ' .tabulator-header');
        if (h) h.style.height = '38px';
        table.redraw(true);
        return table;
    };
    table.setFilterRowVisible = function (visible) { return visible ? table.showFilterRow() : table.hideFilterRow(); };
    window.__gridObjects = window.__gridObjects || {};
    window.__gridObjects[id] = table;
    window.addEventListener('click', async function (e) {
        const gridEl = document.getElementById(id);
        const toolbar = document.getElementById(id + '_toolbar');
        if (!gridEl) return;
        if (!gridEl.contains(e.target) && !(toolbar && toolbar.contains(e.target))) {
            await saveCurrentRowIfLeave(null);
            currentEditingRow = null;
        }
    }, true);
    table.appendTo = function (selector) {
        const targetId = selector.replace('#', '');
        const el = document.getElementById(targetId);
        if (!el) return table;
        el.style.width = '100%';
        if (!el.style.height) el.style.height = _gridHeight || '100%';
        if (bind === false) { el.innerHTML = ''; el.appendChild(table.element); }
        if (typeof buildLegacyToolbar === 'function') buildLegacyToolbar(table, targetId);
        bindGridToolbarActions(targetId, table);
        // FIX gridToolbarFlexLayout: buildLegacyToolbar chèn <div id=..._legacy_toolbar> làm anh em
        // ĐỨNG TRƯỚC #targetId trong cùng container cha. Một số module (vd .qdt-gridwrap > div{height:100%})
        // ép MỌI con cao 100% => toolbar chiếm trọn chiều cao, đẩy lưới ra ngoài (overflow:hidden) nên
        // body lưới trống dù có data. Thay cách tính calc()/offsetHeight mong manh bằng FLEX COLUMN:
        // container cha = flex column, toolbar flex:none (cao tự nhiên ở trên), lưới flex:1 (chiếm phần còn lại).
        // Cách này miễn nhiễm với rule > div{height:100%} và xử lý đúng cả khi KHÔNG có toolbar.
        const layoutGrid = function () {
            const gridInner = document.getElementById(targetId);
            if (!gridInner) return;
            const toolbar = document.getElementById(targetId + '_toolbar') || document.getElementById(targetId + '_legacy_toolbar');
            const parent = gridInner.parentNode;
            if (toolbar && parent && toolbar.parentNode === parent) {
                // Lưới + toolbar là anh em trong cùng cha: biến cha thành flex column.
                parent.style.display = 'flex';
                parent.style.flexDirection = 'column';
                toolbar.style.flex = '0 0 auto';
                // FIX2: bắt buộc override height:auto cho toolbar — rule .qdt-gridwrap > div{height:100%}
                // ép chiều cao tường minh 100% (thắng flex-basis) khiến toolbar vẫn cao tràn hết. height:auto
                // trả toolbar về cao tự nhiên theo nội dung; flex:0 0 auto giữ nguyên cao đó, lưới chiếm phần còn lại.
                toolbar.style.height = 'auto';
                toolbar.style.maxHeight = 'none';
                gridInner.style.flex = '1 1 auto';
                gridInner.style.minHeight = '0';
                gridInner.style.height = 'auto';
                table.setHeight('100%');
            } else {
                // Không có toolbar (hoặc toolbar không cùng cha): lưới chiếm trọn container như cũ.
                gridInner.style.height = _gridHeight || '100%';
                table.setHeight(_gridHeight || '100%');
            }
            try { table.redraw(true); } catch (e) { }
        };
        setTimeout(layoutGrid, 50);
        setTimeout(function () {
            try { layoutGrid(); } catch (e) { console.warn('Grid chưa sẵn sàng redraw:', e); }
        }, 300);
        return table;
    };
    return table;
}
