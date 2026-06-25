function textBoxStyle(idPr, event) {
    const root = document.getElementById(idPr);
    if (!root) return;
    root.querySelectorAll('input[type=text], input[type=password]').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        el.classList.add('form-control');
        if (event) el.addEventListener('change', event);
        setObjectInput(el.id, { element: el, type: 'textbox' });
    });
}
function numberStyle(idPr, event) {
    const root = document.getElementById(idPr);
    if (!root) return;
    root.querySelectorAll('input[type=number]').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        el.classList.add('form-control');
        if (event) el.addEventListener('change', event);
        setObjectInput(el.id, { element: el, type: 'number' });
    });
}
function bindDateMask(el, type) {
    el.addEventListener('input', function () {
        this.value = type === 'date' ? maskDateValue(this.value) : maskDateTimeValue(this.value);
        validateDateInput(this, type, false);
    });
    el.addEventListener('blur', function () { validateDateInput(this, type, true); });
}
function validateDateInput(el, type, showAlert) {
    if (!el.value) { el.classList.remove('input-invalid', 'input-valid'); return true; }
    const ok = type === 'date' ? isValidDateText(el.value) : isValidDateTimeText(el.value);
    el.classList.toggle('input-invalid', !ok);
    el.classList.toggle('input-valid', ok);
    if (!ok && showAlert) {
        alert(type === 'date' ? 'Ngày phải đúng định dạng dd/mm/yyyy' : 'Ngày giờ phải đúng định dạng dd/mm/yyyy HH:mm');
        setTimeout(() => el.focus(), 0);
    }
    return ok;
}
function dateTimeStyle(idPr, event) {
    const root = document.getElementById(idPr);
    if (!root) return;
    root.querySelectorAll('input[type=date]').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        el.type = 'text';
        el.classList.add('form-control');
        el.placeholder = '__/__/____';
        flatpickr(el, {
            dateFormat: 'd/m/Y',
            allowInput: true,
            clickOpens: true,
            onChange: event || undefined
        });
        datePickerButton(el, 'date');
        bindDateMask(el, 'date');
        setObjectInput(el.id, { element: el, type: 'date' });
        setValueInput(el.id, new Date());
    });
    root.querySelectorAll('input[type=datetime], input[type=datetime-local]').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        el.type = 'text';
        el.classList.add('form-control');
        el.placeholder = '__/__/____ __:__';
        flatpickr(el, {
            enableTime: true,
            time_24hr: true,
            dateFormat: 'd/m/Y H:i',
            allowInput: true,
            clickOpens: true,
            onChange: event || undefined
        });
        datePickerButton(el, 'datetime');
        bindDateMask(el, 'datetime');
        setObjectInput(el.id, { element: el, type: 'datetime' });
        setValueInput(el.id, new Date());
    });
    root.querySelectorAll('input[type=time]').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        el.type = 'text';
        el.classList.add('form-control');
        flatpickr(el, {
            enableTime: true,
            noCalendar: true,
            time_24hr: true,
            dateFormat: 'H:i',
            allowInput: true,
            clickOpens: true,
            onChange: event || undefined
        });
        datePickerButton(el, 'time');
        setObjectInput(el.id, { element: el, type: 'time' });
        setValueInput(el.id, new Date());
    });
}
function textAreaStyle(idPr, event) {
    const root = document.getElementById(idPr);
    if (!root) return;
    root.querySelectorAll('textarea').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        const vt = (el.getAttribute('viewtype') || '').toLowerCase();
        if (vt === 'richtext') {
            el.style.display = 'none';
            if (vt === 'richtext') {
                if (!window.Jodit) {
                    console.error('Chưa load Jodit Editor');
                    return;
                }
                let height = el.style.height;
                if (height == null) {
                    height = 350
                }
                const editor = Jodit.make(el, {
                    height: height,
                    language: 'en',
                    toolbarAdaptive: false,
                    readonly: false,
                    buttons: [
                        'source', '|',
                        'bold', 'italic', 'underline', 'strikethrough', '|',
                        'ul', 'ol', 'outdent', 'indent', '|',
                        'font', 'fontsize', 'brush', 'paragraph', '|',
                        'left', 'center', 'right', 'justify', '|',
                        'table', 'link', 'image', 'hr', 'eraser', '|',
                        'undo', 'redo', '|',
                        'fullsize'
                    ]
                });
                editor.events.on('change', function () {
                    el.value = editor.value;
                    if (event) {
                        event({
                            target: el,
                            value: editor.value,
                            editor: editor
                        });
                    }
                });
                setObjectInput(el.id, {
                    element: el,
                    type: 'richtext',
                    editor: editor,
                    getValue: function () {
                        return editor.value;
                    },
                    setValue: function (v) {
                        editor.value = v || '';
                        el.value = v || '';
                    }
                });
                return;
            }
            return;
        }
        el.classList.add('form-control');
        if (event) el.addEventListener('change', event);
        setObjectInput(el.id, {
            element: el,
            type: 'textarea'
        });
    });
}
function richTextStyle(idPr, event) {
    const root = document.getElementById(idPr);
    if (!root) return;
    root.querySelectorAll('richtext').forEach(el => {
        if (!el.id || Gen_DaAddStyleEj(el.id)) return;
        const vt = (el.getAttribute('viewtype') || '').toLowerCase();
        el.style.display = 'none';
        if (vt === 'richtext') {
            if (!window.Jodit) {
                console.error('Chưa load Jodit Editor');
                return;
            }
            if (el._jodit) {
                el._jodit.destruct();
                el._jodit = null;
            }
            let height = $(el).attr('height');
            if (height == null) {
                height = 350;
            }
            const editor = Jodit.make(el, {
                height: height,
                toolbarAdaptive: false,
                readonly: false,
                buttons: [
                    'source', '|',
                    'bold', 'italic', 'underline', 'strikethrough', '|',
                    'ul', 'ol', 'outdent', 'indent', '|',
                    'font', 'fontsize', 'brush', 'paragraph', '|',
                    'left', 'center', 'right', 'justify', '|',
                    'table', 'link', 'image', 'hr', 'eraser', '|',
                    'undo', 'redo', '|',
                    'fullsize'
                ]
            });
            el.style.display = 'none';
            editor.events.on('change', function () {
                el.value = editor.value;
                if (event) {
                    event({
                        target: el,
                        value: editor.value,
                        editor: editor
                    });
                }
            });
            setObjectInput(el.id, {
                element: el,
                type: 'richtext',
                editor: editor,
                getValue: function () {
                    return editor.value;
                },
                setValue: function (v) {
                    editor.value = v || '';
                    el.value = v || '';
                }
            });
            return;
        }
        el.classList.add('form-control');
        if (event) el.addEventListener('change', event);
        setObjectInput(el.id, {
            element: el,
            type: 'textarea'
        });
    });
}
async function inputStyle(idPr, event) {
    textBoxStyle(idPr, event);
    dateTimeStyle(idPr, event);
    numberStyle(idPr, event);
    textAreaStyle(idPr, event);
    richTextStyle(idPr, event);
    await dropDownStyle(idPr, event);
}
function datePickerButton(el, tpy) {
    if (el.parentElement?.classList.contains('date-picker-wrap'))
        return;
    const wrap = document.createElement('div');
    wrap.className = 'date-picker-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    const icon = document.createElement('span');
    icon.className = 'date-picker-icon';
    if (tpy == 'time') {
        icon.innerHTML = `<i class="fa-solid fa-clock"></i>`;
    }
    else {
        icon.innerHTML = `<i class="fa-solid fa-calendar-days"></i>`;
    }
    icon.onclick = function (e) {
        e.stopPropagation();
        if (el._flatpickr) el._flatpickr.open();
        else el.focus();
    };
    wrap.appendChild(icon);
    el.style.paddingRight = '32px';
}
