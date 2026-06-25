var System_LoaddingControl = System_LoaddingControl || {};
var __uiObjects = __uiObjects || {};
var __gridObjects = __gridObjects || {};
function buildLegacyToolbar(table, containerId) {
    let toolbar = table.toolbar;
    if (!toolbar || !Array.isArray(toolbar)) return;
    let gridEl = document.getElementById(containerId);
    if (!gridEl) return;
    let old = document.getElementById(containerId + '_legacy_toolbar');
    if (old) old.remove();
    let div = document.createElement('div');
    div.id = containerId + '_legacy_toolbar';
    div.className = 'grid-toolbar';
    let left = document.createElement('div');
    let right = document.createElement('div');
    right.className = 'ml-auto';
    toolbar.forEach(item => {
        if (item.template) {
            let span = document.createElement('span');
            span.innerHTML = item.template;
            left.appendChild(span);
            return;
        }
        let btn = document.createElement('button');
        btn.type = 'button';
        btn.id = item.id;
        btn.title = item.tooltipText || item.text || '';
        btn.className = 'btn btn-sm btn-outline-secondary ml-1';
        let icon = '';
        if (item.prefixIcon) {
            if (item.prefixIcon === 'e-add') icon = '<i class="' + iconFa.Them + '"></i>';
            else if (item.prefixIcon === 'e-delete') icon = '<i class="' + iconFa.Xoa + '"></i>';
            else if (item.prefixIcon === 'e-edit') icon = '<i class="' + iconFa.Sua + '"></i>';
            else icon = '<i class="' + item.prefixIcon.replace('fa ', 'fa-solid ') + '"></i>';
        }
        btn.innerHTML = (icon || '') + (item.text || item.id);
        btn.onclick = function (ev) {
            if (typeof table.toolbarClick === 'function') table.toolbarClick({ originalEvent: ev, item: item });
        };
        if (item.align === 'Right') right.appendChild(btn);
        else left.appendChild(btn);
    });
    div.appendChild(left);
    div.appendChild(right);
    gridEl.parentNode.insertBefore(div, gridEl);
}
function Gen_DaAddStyleEj(id) { return !!window.__uiObjects[id] || !!window.__gridObjects[id]; }
function getObjectInput(id) { return __uiObjects[id] || __gridObjects[id] || null; }
function setObjectInput(id, obj) { __uiObjects[id] = obj; return obj; }
function pad2(n) { return String(n).padStart(2, '0'); }
function isDateObject(v) { return v instanceof Date && !isNaN(v.getTime()); }
function parseDateText(value) {
    if (!value) return null;
    let p = value.split('/');
    if (p.length !== 3) return null;
    let d = parseInt(p[0]), m = parseInt(p[1]), y = parseInt(p[2]);
    let dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
}
function parseDateTimeText(value) {
    if (!value) return null;
    let arr = value.split(' ');
    let d = parseDateText(arr[0]);
    if (!d) return null;
    let t = (arr[1] || '00:00').split(':');
    d.setHours(parseInt(t[0] || 0), parseInt(t[1] || 0), 0, 0);
    return d;
}
function parseTimeText(value) {
    if (!value) return null;
    let p = value.split(':');
    let h = parseInt(p[0] || 0), m = parseInt(p[1] || 0);
    if (h > 23 || m > 59) return null;
    let d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}
function formatDateText(val) {
    if (val == null || val === '') return '';
    let d = isDateObject(val) ? val : new Date(val);
    if (!isDateObject(d)) return '';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
}
function formatDateTimeText(val) {
    if (val == null || val === '') return '';
    let d = isDateObject(val) ? val : new Date(val);
    if (!isDateObject(d)) return '';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function formatTimeText(val) {
    if (val == null || val === '') return '';
    let d = isDateObject(val) ? val : new Date(val);
    if (!isDateObject(d)) return '';
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function getDateValueByType(type, value) {
    switch (type) {
        case 'date': return parseDateText(value);
        case 'datetime': return parseDateTimeText(value);
        case 'time': return parseTimeText(value);
    }
    return value;
}
function setDateValueByType(el, type, val) {
    if (el._flatpickr) {
        if (val == null || val === '') { el._flatpickr.clear(); return; }
        const d = isDateObject(val) ? val : new Date(val);
        if (isDateObject(d)) { el._flatpickr.setDate(d, false); return; }
    }
    switch (type) {
        case 'date': el.value = formatDateText(val); return;
        case 'datetime': el.value = formatDateTimeText(val); return;
        case 'time': el.value = formatTimeText(val); return;
    }
    el.value = val ?? '';
}
function getValueInput(id) {
    if (!id) return null;
    let obj = getObjectInput(id);
    if (obj && obj.type === 'richtext' && typeof obj.getValue === 'function')
        return obj.getValue();
    let el = document.getElementById(id);
    if (obj) {
        if (typeof TomSelect !== 'undefined' && obj instanceof TomSelect) return obj.getValue();
        if (typeof obj.getData === 'function') return obj.getData();
        if (obj.type === 'date' || obj.type === 'datetime' || obj.type === 'time') return getDateValueByType(obj.type, el?.value);
        if (el) return el.type === 'checkbox' ? el.checked : el.value;
    }
    if (!el) return null;
    switch (el.tagName.toLowerCase()) {
        case 'input': return el.type === 'checkbox' ? el.checked : el.value;
        case 'textarea': return el.value;
        case 'select': return $(el).val();
    }
    return null;
}
function setValueInput(id, val, prWait) {
    if (System_LoaddingControl[id] === true) {
        setTimeout(function () { setValueInput(id, val, prWait); }, 200);
        return;
    }
    let obj = getObjectInput(id);
    if (obj && obj.type === 'richtext' && typeof obj.setValue === 'function') {
        obj.setValue(val);
        return;
    }
    let el = document.getElementById(id);
    if (obj) {
        if (typeof TomSelect !== 'undefined' && obj instanceof TomSelect) {
            if (Array.isArray(val)) obj.setValue(val.map(String));
            else if (val == null || val === '') obj.clear();
            else obj.setValue(val.toString().split(','));
            return;
        }
        if (obj.type === 'date' || obj.type === 'datetime' || obj.type === 'time') {
            if (el) setDateValueByType(el, obj.type, val);
            return;
        }
        if (el) {
            if (el.type === 'checkbox') el.checked = !!val;
            else el.value = val ?? '';
            return;
        }
    }
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val ?? '';
}
function onlyNumber(s) { return (s || '').replace(/\D/g, ''); }
function maskDateValue(value) {
    const n = onlyNumber(value).slice(0, 8);
    if (n.length <= 2) return n;
    if (n.length <= 4) return n.slice(0, 2) + '/' + n.slice(2);
    return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);
}
function maskDateTimeValue(value) {
    const n = onlyNumber(value).slice(0, 12);
    if (n.length <= 2) return n;
    if (n.length <= 4) return n.slice(0, 2) + '/' + n.slice(2);
    if (n.length <= 8) return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);
    if (n.length <= 10) return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4, 8) + ' ' + n.slice(8);
    return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4, 8) + ' ' + n.slice(8, 10) + ':' + n.slice(10);
}
function isValidDateText(value) {
    if (!value) return true;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
    let p = value.split('/');
    let d = parseInt(p[0], 10), m = parseInt(p[1], 10), y = parseInt(p[2], 10);
    let dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
function isValidDateTimeText(value) {
    if (!value) return true;
    if (!/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/.test(value)) return false;
    let arr = value.split(' ');
    let t = arr[1].split(':');
    let hh = parseInt(t[0], 10), mm = parseInt(t[1], 10);
    return isValidDateText(arr[0]) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}
function ensureSupportStyle() {
    if (document.getElementById('opensource-ui-support-style')) return;
    const css = document.createElement('style');
    css.id = 'opensource-ui-support-style';
    css.textContent = `.input-invalid{border-color:#dc3545!important}.input-valid{border-color:#198754!important}`;
    document.head.appendChild(css);
}
ensureSupportStyle();
