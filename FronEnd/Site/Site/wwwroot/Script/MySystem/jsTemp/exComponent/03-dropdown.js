function syncTomSelectCheckbox(ts) {
    if (!ts || !ts.dropdown_content) return;
    ts.dropdown_content.querySelectorAll('[data-value]').forEach(option => {
        const value = option.getAttribute('data-value');
        const checkbox = option.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = ts.items.includes(value);
    });
}
function enableCheckboxToggle(ts) {
    ts.dropdown_content.addEventListener('mousedown', function (e) {
        const option = e.target.closest('[data-value]');
        if (!option) return;
        e.preventDefault();
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        if (ts.items.includes(value)) ts.removeItem(value, true);
        else ts.addItem(value, true);
        ts.setTextboxValue('');
        ts.refreshOptions(false);
        setTimeout(() => syncTomSelectCheckbox(ts), 0);
    });
}
function normalizeDataSource(dataSource, displayMember, valueMember) {
    if (!Array.isArray(dataSource)) return [];
    return dataSource.map(x => ({ ...x, __text: x[displayMember], __value: String(x[valueMember]) }));
}
function newDropDownSingle(id, dataSource, displayMember, valueMember, defValue, event) {
    const el = document.getElementById(id);
    if (!el) return null;
    const ds = normalizeDataSource(dataSource, displayMember, valueMember);
    if (Gen_DaAddStyleEj(id)) {
        const obj = getObjectInput(id);
        obj.clear(true);
        obj.clearOptions();
        obj.addOptions(ds);
        obj.refreshOptions(false);
        if (defValue !== undefined && defValue !== null && defValue !== '') obj.setValue(String(defValue), true);
        return obj;
    }
    el.removeAttribute('multiple');
    el.multiple = false;
    const obj = new TomSelect(el, {
        options: ds,
        valueField: '__value',
        labelField: '__text',
        searchField: ['__text', '__value'],
        create: false,
        maxItems: 1,
        maxOptions: 20,
        plugins: [],
        allowEmptyOption: true,
        closeAfterSelect: true,
        hideSelected: true,
        placeholder: el.getAttribute('placeholder') || 'Chọn...',
        onChange: event || undefined
    });
    if (defValue !== undefined && defValue !== null && defValue !== '') obj.setValue(String(defValue), true);
    return setObjectInput(id, obj);
}
function newDropDown(id, dataSource, displayMember, valueMember, defValue, event) {
    if (Gen_DaAddStyleEj(id)) {
        const obj = getObjectInput(id);
        obj.clearOptions();
        obj.addOptions(normalizeDataSource(dataSource, displayMember, valueMember));
        obj.refreshOptions(false);
        return obj;
    }
    const el = document.getElementById(id);
    if (!el) return null;
    const ds = normalizeDataSource(dataSource, displayMember, valueMember);
    const obj = new TomSelect(el, {
        plugins: ['remove_button'],
        options: ds,
        valueField: '__value',
        labelField: '__text',
        searchField: ['__text', '__value'],
        create: false,
        maxItems: null,
        maxOptions: 20,
        closeAfterSelect: false,
        hideSelected: false,
        placeholder: el.getAttribute('placeholder') || 'Tìm...',
        render: {
            option: function (data, escape) {
                return `<div class="ts-check-option"><input type="checkbox"><span>${escape(data.__text)}</span></div>`;
            },
            item: function (data, escape) { return '<div>' + escape(data.__text) + '</div>'; }
        },
        onInitialize: function () { enableCheckboxToggle(this); syncTomSelectCheckbox(this); },
        onDropdownOpen: function () { syncTomSelectCheckbox(this); },
        onType: function () { setTimeout(() => syncTomSelectCheckbox(this), 0); },
        onItemAdd: function () { this.setTextboxValue(''); this.refreshOptions(false); setTimeout(() => syncTomSelectCheckbox(this), 0); },
        onItemRemove: function () { this.refreshOptions(false); setTimeout(() => syncTomSelectCheckbox(this), 0); },
        onChange: event || undefined
    });
    if (defValue) obj.setValue(Array.isArray(defValue) ? defValue.map(String) : String(defValue).split(','));
    return setObjectInput(id, obj);
}
function newDropDownMillion(id, totalRecords, event) {
    const el = document.getElementById(id);
    if (!el) return null;
    const defaultItems = [
        { value: 'XNMAU', text: 'XN Máu' },
        { value: 'MRI', text: 'MRI' },
        { value: 'CT', text: 'CT' },
        { value: 'SIEUAM', text: 'Siêu âm' },
        { value: 'XQUANG', text: 'XQuang' }
    ];
    function makeItem(i) {
        if (i < defaultItems.length) return defaultItems[i];
        const idNum = i + 1;
        return { value: 'DV' + idNum, text: 'Dịch vụ ' + String(idNum).padStart(7, '0') };
    }
    const obj = new TomSelect(el, {
        plugins: ['remove_button'],
        valueField: 'value',
        labelField: 'text',
        searchField: 'text',
        create: false,
        maxItems: null,
        maxOptions: 20,
        closeAfterSelect: false,
        hideSelected: false,
        preload: 'focus',
        shouldLoad: () => true,
        load: function (query, callback) {
            const q = (query || '').toLowerCase().trim();
            const result = [];
            for (let i = 0; i < totalRecords; i++) {
                const item = makeItem(i);
                if (!q || item.text.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)) {
                    result.push(item);
                    if (result.length >= 20) break;
                }
            }
            callback(result);
            setTimeout(() => syncTomSelectCheckbox(this), 0);
        },
        render: {
            option: function (data, escape) {
                return `<div class="ts-check-option"><input type="checkbox"><span>${escape(data.text)}</span></div>`;
            },
            item: function (data, escape) { return '<div>' + escape(data.text) + '</div>'; }
        },
        onInitialize: function () { enableCheckboxToggle(this); syncTomSelectCheckbox(this); },
        onDropdownOpen: function () { syncTomSelectCheckbox(this); },
        onItemAdd: function () { this.setTextboxValue(''); this.refreshOptions(false); setTimeout(() => syncTomSelectCheckbox(this), 0); },
        onItemRemove: function () { this.refreshOptions(false); setTimeout(() => syncTomSelectCheckbox(this), 0); },
        onChange: event || undefined
    });
    return setObjectInput(id, obj);
}
async function dropDownStyle(idPr, event) {
    const root = document.getElementById(idPr);
    if (!root) return;
    root.querySelectorAll('input[dropdown], select[dropdown]').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        const type = el.getAttribute('dropdown');
        const displayMember = el.getAttribute('displaymember') || 'text';
        const valueMember = el.getAttribute('valuemember') || 'value';
        const defValue = el.getAttribute('defvalue') || '';
        const million = parseInt(el.getAttribute('millionrecords') || '0', 10);
        let dataSource = [];
        const inlineData = el.getAttribute('datasource');
        try {
            if (inlineData && inlineData.trim().startsWith('[')) dataSource = JSON.parse(inlineData);
            else if (inlineData && eval(inlineData)) dataSource = eval(inlineData);
        } catch { dataSource = []; }
        if (million > 0) { newDropDownMillion(el.id, million, event); return; }
        if (type === 'Combobox') newDropDownSingle(el.id, dataSource, displayMember, valueMember, defValue, event);
        if (type === 'Mutiselect' || type === 'Multiselect' || type === 'MultiSelect') {
            newDropDown(el.id, dataSource, displayMember, valueMember, defValue ? defValue.split(',') : [], event);
        }
    });
}
function CreateDropDownObject(type, id, idControl, objReturn, displayMember, valueMember, defValue, event) {
    if (type === 'Combobox') return newDropDownSingle(idControl, objReturn.data || [], displayMember, valueMember, defValue, event);
    if (type === 'Mutiselect' || type === 'Multiselect' || type === 'MultiSelect') return newDropDown(idControl, objReturn.data || [], displayMember, valueMember, defValue ? defValue.split(',') : [], event);
}
function LoadControlCon(id, idPr, event) { }
