// ===== Tiện ích UI dùng chung cho app Hội nghị (modal/toast/confirm/format) =====
(function () {
    // Toast (mượn alertToas của framework nếu có)
    window.meetToast = function (msg, isErr) {
        if (typeof alertToas === 'function') alertToas(null, msg, isErr ? 'Lỗi' : undefined);
        else alert(msg);
    };
    window.meetConfirm = function (msg, onYes) {
        if (typeof questionToas === 'function') questionToas(null, msg, 'Xác nhận', onYes, function () { });
        else if (confirm(msg)) onYes();
    };

    // Modal form tái dùng. opts: {title, icon, body(html), width, onOpen(box), onSave(box)->bool|Promise}
    window.meetModal = function (opts) {
        var ovl = document.createElement('div'); ovl.className = 'mm-ovl';
        var w = opts.width || 720;
        ovl.innerHTML =
            '<div class="mm-box" style="max-width:' + w + 'px">'
            + '  <div class="mm-head"><span><i class="fa-solid ' + (opts.icon || 'fa-pen-to-square') + '"></i> ' + (opts.title || '') + '</span>'
            + '    <button class="mm-x" type="button"><i class="fa-solid fa-xmark"></i></button></div>'
            + '  <div class="mm-body">' + (opts.body || '') + '</div>'
            + '  <div class="mm-foot">'
            + (opts.onSave ? '<button class="btn-meet mm-save"><i class="fa-solid fa-floppy-disk"></i> Lưu</button>' : '')
            + '    <button class="btn-meet sec mm-cancel"><i class="fa-solid fa-xmark"></i> ' + (opts.onSave ? 'Hủy' : 'Đóng') + '</button>'
            + '  </div></div>';
        document.body.appendChild(ovl);
        var box = ovl.querySelector('.mm-box');
        function close() { ovl.remove(); }
        ovl.querySelector('.mm-x').onclick = close;
        ovl.querySelector('.mm-cancel').onclick = close;
        ovl.addEventListener('mousedown', function (e) { if (e.target === ovl) close(); });
        var saveBtn = ovl.querySelector('.mm-save');
        if (saveBtn) saveBtn.onclick = function () {
            var r = opts.onSave(box);
            if (r && typeof r.then === 'function') { r.then(function (ok) { if (ok !== false) close(); }); }
            else if (r !== false) close();
        };
        if (opts.onOpen) opts.onOpen(box);
        ovl.close = close;
        return ovl;
    };

    // Helpers đọc/ghi field theo data-f trong 1 box
    window.mmVal = function (box, name) {
        var el = box.querySelector('[data-f="' + name + '"]'); if (!el) return '';
        if (el.type === 'checkbox') return el.checked;
        return el.value;
    };
    window.mmSet = function (box, name, v) {
        var el = box.querySelector('[data-f="' + name + '"]'); if (!el) return;
        if (el.type === 'checkbox') el.checked = !!v; else el.value = (v == null ? '' : v);
    };

    // Format ngày dd/MM/yyyy [HH:mm]
    window.meetFmtDate = function (v, withTime) {
        if (!v) return '';
        var d = new Date(v); if (isNaN(d)) { var s = ('' + v).replace('T', ' '); return s.length > 16 ? s.substring(0, 16) : s; }
        function p(n) { return (n < 10 ? '0' : '') + n; }
        var s = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
        if (withTime) s += ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
        return s;
    };
    var STAT_HN = { 0: ['Nháp', 'st-0'], 1: ['Mở đăng ký', 'st-1'], 2: ['Đang diễn ra', 'st-2'], 3: ['Đã chốt', 'st-3'] };
    window.meetBadgeHN = function (t) { var x = STAT_HN[t] || STAT_HN[0]; return '<span class="badge-st ' + x[1] + '">' + x[0] + '</span>'; };

    // ===== Form builder dùng exControl (flatpickr / tom-select / jodit) =====
    // fields: [{name,label,type,options,required,full,placeholder,rows}]
    var esc = function (s) { return ('' + (s == null ? '' : s)).replace(/"/g, '&quot;'); };
    window.meetFormHtml = function (fields) {
        var h = '<div class="meet-form" data-meetform>';
        fields.forEach(function (f, i) {
            var id = 'mf_' + f.name;
            var req = f.required ? ' <span class="req">*</span>' : '';
            h += '<div class="fld' + (f.full ? ' full' : '') + '">';
            if (f.type !== 'checkbox') h += '<label for="' + id + '">' + f.label + req + '</label>';
            if (f.type === 'select') {
                h += '<select id="' + id + '" data-name="' + f.name + '" data-ctype="select"></select>';
            } else if (f.type === 'textarea') {
                h += '<textarea id="' + id + '" data-name="' + f.name + '" data-ctype="text" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.placeholder) + '"></textarea>';
            } else if (f.type === 'richtext') {
                h += '<textarea id="' + id + '" data-name="' + f.name + '" data-ctype="rich"></textarea>';
            } else if (f.type === 'checkbox') {
                h += '<label style="flex-direction:row;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="' + id + '" data-name="' + f.name + '" data-ctype="check" style="width:18px;height:18px"> ' + f.label + '</label>';
            } else {
                var t = (f.type === 'number') ? 'number' : 'text';
                h += '<input type="' + t + '" id="' + id + '" data-name="' + f.name + '" data-ctype="' + (f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime' : 'text') + '" placeholder="' + esc(f.placeholder) + '">';
            }
            h += '</div>';
        });
        return h + '</div>';
    };
    // Khởi tạo control + đổ giá trị. values: object theo name.
    window.meetFormInit = function (box, fields, values) {
        values = values || {};
        fields.forEach(function (f) {
            var el = box.querySelector('#mf_' + f.name); if (!el) return;
            var v = values[f.name];
            if (f.type === 'select') {
                var opts = (f.options || []);
                el.innerHTML = opts.map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(o.text) + '</option>'; }).join('');
                if (v != null) el.value = '' + v;
                if (typeof TomSelect !== 'undefined') { try { el._ts = new TomSelect(el, { allowEmptyOption: true }); } catch (e) { } }
            } else if (f.type === 'date' || f.type === 'datetime') {
                var fmt = f.type === 'datetime' ? 'Y-m-d H:i' : 'Y-m-d';
                var cfg = { dateFormat: fmt, allowInput: true, time_24hr: true, locale: { firstDayOfWeek: 1 } };
                if (f.type === 'datetime') cfg.enableTime = true;
                if (v) cfg.defaultDate = v;
                if (typeof flatpickr !== 'undefined') el._fp = flatpickr(el, cfg);
                else if (v) el.value = ('' + v).replace('T', ' ').substring(0, f.type === 'datetime' ? 16 : 10);
            } else if (f.type === 'richtext') {
                if (v != null) el.value = v;
                if (typeof Jodit !== 'undefined') { try { el._jodit = Jodit.make(el, { height: 220, toolbarAdaptive: false, buttons: ['bold', 'italic', 'underline', '|', 'ul', 'ol', '|', 'link', 'image', '|', 'undo', 'redo'] }); } catch (e) { } }
            } else if (f.type === 'checkbox') {
                el.checked = (v === true || v === 1 || v === '1' || v === 'true');
            } else {
                if (v != null) el.value = v;
            }
        });
    };
    window.meetFormRead = function (box, fields) {
        var o = {};
        fields.forEach(function (f) {
            var el = box.querySelector('#mf_' + f.name); if (!el) { o[f.name] = ''; return; }
            if (f.type === 'checkbox') o[f.name] = el.checked ? 1 : 0;
            else if (f.type === 'richtext') o[f.name] = el._jodit ? el._jodit.value : el.value;
            else o[f.name] = el.value;
        });
        return o;
    };
    // ===== Cấu hình giao diện (màu chủ đạo + dark/light) — dùng chung mọi trang =====
    var ACCENTS = [['#0a6c5e', '#0d8a76', 'Xanh ngọc'], ['#0f6e9c', '#1f8fc4', 'Xanh dương'], ['#7d5bb0', '#9a76d4', 'Tím'],
                   ['#c0392b', '#e05546', 'Đỏ'], ['#b9772a', '#d99440', 'Cam'], ['#2a7d4f', '#3a9d63', 'Xanh lá']];
    window.meetCurTheme = function () { return (localStorage.getItem('wd.theme') || 'light').replace(/"/g, ''); };
    window.meetApplyTheme = function (t) {
        document.documentElement.setAttribute('data-theme', t); localStorage.setItem('wd.theme', t);
        try { window.parent && window.parent.postMessage({ __wdTheme: t }, '*'); } catch (e) { }
    };
    window.meetApplyAccent = function (a) {
        document.documentElement.style.setProperty('--meet-primary', a[0]);
        document.documentElement.style.setProperty('--meet-primary-2', a[1]);
        localStorage.setItem('meet.accent', JSON.stringify(a));
    };
    window.meetInitTheme = function () {
        try { var a = JSON.parse(localStorage.getItem('meet.accent')); if (a) meetApplyAccent(a); } catch (e) { }
        meetApplyTheme(meetCurTheme());
    };
    window.meetInitThemePanel = function (btnId, panelId) {
        var p = document.getElementById(panelId); if (!p) return;
        p.innerHTML = '<div style="font-weight:700;margin-bottom:10px"><i class="fa-solid fa-palette"></i> Giao diện</div>'
            + '<div style="display:flex;gap:8px;margin-bottom:12px"><button class="mw-themebtn" data-t="light"><i class="fa-solid fa-sun"></i> Sáng</button><button class="mw-themebtn" data-t="dark"><i class="fa-solid fa-moon"></i> Tối</button></div>'
            + '<div class="meet-hint" style="margin-bottom:6px">Màu chủ đạo</div><div class="mw-swatches">'
            + ACCENTS.map(function (a, i) { return '<button class="mw-sw" data-i="' + i + '" title="' + a[2] + '" style="background:linear-gradient(135deg,' + a[0] + ',' + a[1] + ')"></button>'; }).join('') + '</div>';
        function mark() { p.querySelectorAll('.mw-themebtn').forEach(function (b) { b.classList.toggle('on', b.dataset.t === meetCurTheme()); }); }
        p.querySelectorAll('.mw-themebtn').forEach(function (b) { b.onclick = function () { meetApplyTheme(b.dataset.t); mark(); }; });
        p.querySelectorAll('.mw-sw').forEach(function (b) { b.onclick = function () { meetApplyAccent(ACCENTS[Number(b.dataset.i)]); }; });
        mark();
    };
    // Wire mọi dropdown .mw-toggle + đóng khi click ngoài + hamburger
    window.meetInitDropdowns = function () {
        function closeAll(ex) { document.querySelectorAll('.mw-grp.open').forEach(function (g) { if (g !== ex) g.classList.remove('open'); }); }
        document.querySelectorAll('.mw-toggle').forEach(function (b) {
            b.addEventListener('click', function (e) { e.stopPropagation(); var g = b.closest('.mw-grp'); var was = g.classList.contains('open'); closeAll(); if (!was) g.classList.add('open'); });
        });
        document.querySelectorAll('.mw-drop').forEach(function (d) { d.addEventListener('click', function (e) { e.stopPropagation(); }); });
        document.addEventListener('click', function () { closeAll(); });
        var burger = document.getElementById('mwBurger'), menu = document.getElementById('mwMenu'), mask = document.getElementById('mwMask');
        if (burger && menu) {
            burger.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('open'); if (mask) mask.classList.toggle('show'); });
            if (mask) mask.addEventListener('click', function () { menu.classList.remove('open'); mask.classList.remove('show'); closeAll(); });
        }
    };
    // ===== Menu người dùng: Đổi mật khẩu / Đăng xuất =====
    window.meetLogout = function () {
        // Đăng xuất chủ động: xóa ghi nhớ để KHÔNG tự đăng nhập lại.
        try { localStorage.removeItem('remember'); localStorage.removeItem('password'); sessionStorage.removeItem('meet.autoLoginTried'); } catch (e) { }
        fetch('/Login/Logout', { credentials: 'same-origin' }).then(function () { location.href = '/Login'; }).catch(function () { location.href = '/Login'; });
    };
    window.meetChangePwd = function () {
        var body = '<div class="meet-form">'
            + '<div class="fld full"><label>Mật khẩu hiện tại</label><input type="password" id="cpOld" class="form-control" autocomplete="current-password"></div>'
            + '<div class="fld full"><label>Mật khẩu mới</label><input type="password" id="cpNew" class="form-control" autocomplete="new-password"></div>'
            + '<div class="fld full"><label>Nhập lại mật khẩu mới</label><input type="password" id="cpNew2" class="form-control" autocomplete="new-password"></div></div>';
        meetModal({
            title: 'Đổi mật khẩu', icon: 'fa-key', width: 460, body: body,
            onSave: function (box) {
                var o = box.querySelector('#cpOld').value, n = box.querySelector('#cpNew').value, n2 = box.querySelector('#cpNew2').value;
                if (!o || !n) { meetToast('Nhập đủ thông tin', true); return false; }
                if (n !== n2) { meetToast('Mật khẩu mới không khớp', true); return false; }
                jAjax('/Login/DoiMatKhau', { OldPass: o, NewPass: n }, function (r) { if (r.code === 0) meetToast('Đổi mật khẩu thành công'); else meetToast(r.message || 'Lỗi', true); });
                return true;
            }
        });
    };
    window.meetInitUserMenu = function () {
        var lo = document.getElementById('mwLogout'); if (lo) lo.onclick = function () { meetLogout(); };
        var cp = document.getElementById('mwChgPwd'); if (cp) cp.onclick = function () { meetChangePwd(); };
    };

    // Áp theme ngay khi script nạp (trước khi DOM xong vẫn ổn vì set trên <html>)
    try { meetInitTheme(); } catch (e) { }

    // ===== KHÓA sửa inline cho MỌI grid: bọc newGrid, ép mọi cột editable=false =====
    if (typeof window.newGrid === 'function' && !window.__meetGridRO) {
        window.__meetGridRO = true;
        var _newGrid = window.newGrid;
        window.newGrid = function (id, data, cols) {
            if (Array.isArray(cols)) cols.forEach(function (c) { if (c && typeof c === 'object') { c.editable = false; c.editor = false; } });
            return _newGrid.apply(this, arguments);
        };
    }

    window.meetFormValidate = function (box, fields) {
        for (var i = 0; i < fields.length; i++) {
            var f = fields[i]; if (!f.required) continue;
            var el = box.querySelector('#mf_' + f.name); if (!el) continue;
            var val = (f.type === 'checkbox') ? el.checked : (el.value || '').trim();
            if (!val) { meetToast('Vui lòng nhập: ' + f.label, true); el.focus && el.focus(); return false; }
        }
        return true;
    };
})();
