// ===== TN8: Phân công nhiệm vụ — danh mục nhân viên + giao nhiệm vụ =====
(function () {
    var gNV, gTask, selNV = null, selTask = null, nvOpts = [], phienOpts = [], taskRows = [];
    var UT = { 1: 'Thường', 2: 'Cao', 3: 'Khẩn' };
    var TT = { 0: 'Chưa làm', 1: 'Đang làm', 2: 'Hoàn thành' };

    function ttBadge(c) {
        var v = c.getValue();
        if (v == 2) return '<span class="badge-st st-1">Hoàn thành</span>';
        if (v == 1) return '<span class="badge-st" style="background:#dCEcfb;color:#0f6e9c">Đang làm</span>';
        return '<span class="badge-st st-0">Chưa làm</span>';
    }
    function utBadge(c) {
        var v = c.getValue();
        if (v == 3) return '<span class="badge-st" style="background:#fde0dd;color:#c0392b">Khẩn</span>';
        if (v == 2) return '<span class="badge-st" style="background:#fdf0d5;color:#9a6a00">Cao</span>';
        return '<span class="meet-hint">Thường</span>';
    }

    function build() {
        gNV = newGrid('gridNhanVien', [], [
            textColumn('HoTen', 'Họ tên', 190, false),
            textColumn('VaiTroTC', 'Vai trò tổ chức', 150, false),
            textColumn('ChucDanh', 'Chức danh', 150, false),
            textColumn('DonVi', 'Đơn vị', 180, false),
            textColumn('DienThoai', 'Điện thoại', 120, false),
            { title: 'Số NV', field: 'SoNhiemVu', width: 80, hozAlign: 'center', headerFilter: false },
            { title: 'Hoạt động', field: 'Active', width: 100, hozAlign: 'center', headerFilter: false, formatter: function (c) { return c.getValue() == 1 ? '<span class="badge-st st-1">Đang dùng</span>' : '<span class="badge-st st-0">Ngừng</span>'; } }
        ], null, function (a) { selNV = a.data; }, false);
        gNV.appendTo('#gridNhanVien');

        gTask = newGrid('gridNhiemVu', [], [
            textColumn('TenNhiemVu', 'Nhiệm vụ', 240, false),
            textColumn('HoTen', 'Người thực hiện', 170, false),
            textColumn('TenPhien', 'Phiên', 160, false),
            { title: 'Ưu tiên', field: 'DoUuTien', width: 100, hozAlign: 'center', headerFilter: false, formatter: utBadge },
            { title: 'Thời hạn', field: 'ThoiHan', width: 150, headerFilter: false, formatter: function (c) {
                if (!c.getValue()) return '';
                var s = meetFmtDate(c.getValue(), true);
                return c.getRow().getData().QuaHan == 1 ? '<span style="color:#c0392b;font-weight:700"><i class="fa-solid fa-triangle-exclamation"></i> ' + s + '</span>' : s; } },
            { title: 'Trạng thái', field: 'TrangThai', width: 130, headerFilter: false, formatter: ttBadge }
        ], null, function (a) { selTask = a.data; }, false);
        gTask.appendTo('#gridNhiemVu');
    }

    function loadNV(cb) {
        var hn = MEET.getHN(); if (!hn) { gNV.dataSource = []; return; }
        jAjax('/PhanCong/ListNhanVien', { IDHoiNghi: hn }, function (o) {
            var rows = o.code === 0 ? o.data : [];
            gNV.dataSource = rows;
            nvOpts = rows.filter(function (r) { return r.Active == 1; }).map(function (r) { return { value: r.ID, text: r.HoTen + (r.VaiTroTC ? ' (' + r.VaiTroTC + ')' : '') }; });
            cb && cb();
        });
    }
    function loadTask() {
        var hn = MEET.getHN(); if (!hn) { gTask.dataSource = []; taskRows = []; renderKanban(); renderOverdue(); return; }
        jAjax('/PhanCong/ListNhiemVu', { IDHoiNghi: hn }, function (o) {
            taskRows = o.code === 0 ? (o.data || []) : [];
            gTask.dataSource = taskRows;
            renderKanban(); renderOverdue();
        });
        loadChart();
    }

    // ===== Banner nhắc thời hạn =====
    function renderOverdue() {
        var el = document.getElementById('pcOverdue'); if (!el) return;
        var od = taskRows.filter(function (r) { return r.QuaHan == 1; });
        if (!od.length) { el.style.display = 'none'; return; }
        el.style.display = 'block';
        el.innerHTML = '<i class="fa-solid fa-bell"></i> <b>' + od.length + ' nhiệm vụ quá hạn</b> chưa hoàn thành: '
            + od.slice(0, 4).map(function (r) { return '<span class="pc-od-chip">' + r.TenNhiemVu + ' — ' + r.HoTen + '</span>'; }).join(' ')
            + (od.length > 4 ? ' <span class="meet-hint">…và ' + (od.length - 4) + ' việc khác</span>' : '');
    }

    // ===== Kanban kéo-thả =====
    var COLS = [{ st: 0, t: 'Chưa làm', ic: 'fa-hourglass-start' }, { st: 1, t: 'Đang làm', ic: 'fa-person-running' }, { st: 2, t: 'Hoàn thành', ic: 'fa-circle-check' }];
    function card(r) {
        var ut = r.DoUuTien == 3 ? '<span class="pc-pri p3">Khẩn</span>' : r.DoUuTien == 2 ? '<span class="pc-pri p2">Cao</span>' : '';
        var han = r.ThoiHan ? '<div class="pc-card-han' + (r.QuaHan == 1 ? ' od' : '') + '"><i class="fa-solid fa-clock"></i> ' + meetFmtDate(r.ThoiHan, true) + (r.QuaHan == 1 ? ' · quá hạn' : '') + '</div>' : '';
        return '<div class="pc-card' + (r.QuaHan == 1 ? ' od' : '') + '" draggable="true" data-id="' + r.ID + '">'
            + '<div class="pc-card-t">' + r.TenNhiemVu + ut + '</div>'
            + '<div class="pc-card-nv"><i class="fa-solid fa-user"></i> ' + r.HoTen + (r.VaiTroTC ? ' · ' + r.VaiTroTC : '') + '</div>'
            + (r.TenPhien ? '<div class="pc-card-ph"><i class="fa-solid fa-calendar-day"></i> ' + r.TenPhien + '</div>' : '')
            + han + '</div>';
    }
    function renderKanban() {
        var box = document.getElementById('pcKanban'); if (!box) return;
        box.innerHTML = COLS.map(function (c) {
            var items = taskRows.filter(function (r) { return Number(r.TrangThai) === c.st; });
            return '<div class="pc-col" data-st="' + c.st + '">'
                + '<div class="pc-col-h"><span><i class="fa-solid ' + c.ic + '"></i> ' + c.t + '</span><span class="pc-col-n">' + items.length + '</span></div>'
                + '<div class="pc-col-b">' + (items.length ? items.map(card).join('') : '<div class="pc-col-empty">— trống —</div>') + '</div></div>';
        }).join('');
        // drag-drop
        box.querySelectorAll('.pc-card').forEach(function (c) {
            c.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); });
            c.addEventListener('dragend', function () { c.classList.remove('dragging'); });
            c.addEventListener('click', function () { var r = taskRows.find(function (x) { return '' + x.ID === c.dataset.id; }); selTask = r; box.querySelectorAll('.pc-card.sel').forEach(function (x) { x.classList.remove('sel'); }); c.classList.add('sel'); });
        });
        box.querySelectorAll('.pc-col').forEach(function (col) {
            col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('over'); });
            col.addEventListener('dragleave', function () { col.classList.remove('over'); });
            col.addEventListener('drop', function (e) {
                e.preventDefault(); col.classList.remove('over');
                var id = e.dataTransfer.getData('text/plain'); var st = Number(col.dataset.st);
                var r = taskRows.find(function (x) { return '' + x.ID === id; });
                if (!r || Number(r.TrangThai) === st) return;
                jAjax('/PhanCong/SetTrangThai', { ID: id, TrangThai: st }, function (o) { if (o.code === 0) { meetToast('→ ' + TT[st]); loadTask(); } else meetToast(o.message, true); });
            });
        });
    }

    // ===== Biểu đồ tiến độ theo nhân viên =====
    function loadChart() {
        var hn = MEET.getHN(); if (!hn) return;
        jAjax('/PhanCong/TienDoNhanVien', { IDHoiNghi: hn }, function (o) {
            var rows = o.code === 0 ? (o.data || []) : [];
            var el = document.getElementById('chTienDo'); if (!el) return;
            if (!rows.length) { el.innerHTML = '<div class="meet-empty"><i class="fa-solid fa-chart-column"></i>Chưa có nhiệm vụ.</div>'; return; }
            if (typeof PaintBase !== 'function') { el.textContent = 'Không tải được thư viện biểu đồ'; return; }
            var data = [];
            rows.forEach(function (r) {
                data.push({ xValue: r.HoTen, sValue: 'Hoàn thành', yValue: Number(r.HoanThanh) || 0 });
                data.push({ xValue: r.HoTen, sValue: 'Đang làm', yValue: Number(r.DangLam) || 0 });
                data.push({ xValue: r.HoTen, sValue: 'Chưa làm', yValue: Number(r.ChuaLam) || 0 });
            });
            PaintBase('chTienDo', 'bar', data, '', ['#0a8f7e', '#0f6e9c', '#c9ccd1']);
        });
    }

    // ===== Toggle Lưới / Kanban =====
    function switchView(v) {
        document.querySelectorAll('.pc-tg').forEach(function (b) { b.classList.toggle('active', b.dataset.view === v); });
        document.getElementById('pcKanban').style.display = v === 'kanban' ? 'flex' : 'none';
        document.getElementById('gridNhiemVu').style.display = v === 'grid' ? 'block' : 'none';
    }
    function loadPhien(cb) {
        var hn = MEET.getHN();
        jAjax('/HoiNghi/ListPhien', { IDHoiNghi: hn }, function (o) {
            phienOpts = (o.code === 0 ? o.data : []).map(function (r) { return { value: r.ID, text: r.TenPhien }; });
            cb && cb();
        });
    }
    function load() { loadNV(); loadTask(); }

    function nextStatus(row) {
        var nx = (Number(row.TrangThai) + 1) % 3;
        jAjax('/PhanCong/SetTrangThai', { ID: row.ID, TrangThai: nx }, function (o) { if (o.code === 0) { meetToast('→ ' + TT[nx]); loadTask(); } else meetToast(o.message, true); });
    }
    window.__pcNextStatus = nextStatus;

    function formNV(row) {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var fields = [
            { name: 'HoTen', label: 'Họ tên', type: 'text', required: true },
            { name: 'VaiTroTC', label: 'Vai trò tổ chức', type: 'select', options: [
                { value: 'Ban tổ chức', text: 'Ban tổ chức' }, { value: 'Kỹ thuật', text: 'Kỹ thuật' },
                { value: 'Lễ tân', text: 'Lễ tân' }, { value: 'Hậu cần', text: 'Hậu cần' },
                { value: 'An ninh', text: 'An ninh' }, { value: 'Truyền thông', text: 'Truyền thông' } ] },
            { name: 'ChucDanh', label: 'Chức danh', type: 'text' },
            { name: 'DonVi', label: 'Đơn vị', type: 'text' },
            { name: 'DienThoai', label: 'Điện thoại', type: 'text' },
            { name: 'Email', label: 'Email', type: 'text' },
            { name: 'GhiChu', label: 'Ghi chú', type: 'text', full: true },
            { name: 'Active', label: 'Đang hoạt động', type: 'checkbox' },
            { name: 'DungChung', label: 'Dùng chung mọi hội nghị', type: 'checkbox' }
        ];
        meetModal({
            title: row ? 'Sửa nhân viên' : 'Thêm nhân viên', icon: 'fa-id-badge', width: 720, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, row || { Active: true, VaiTroTC: 'Ban tổ chức' }); },
            onSave: function (b) {
                if (!meetFormValidate(b, fields)) return false;
                var d = meetFormRead(b, fields); d.IDHoiNghi = hn; if (row) d.ID = row.ID;
                jAjax('/PhanCong/SaveNhanVien', d, function (o) { if (o.code === 0) { meetToast('Đã lưu'); loadNV(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function formTask(row) {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        if (!nvOpts.length) return meetToast('Hãy thêm nhân viên trước', true);
        var fields = [
            { name: 'TenNhiemVu', label: 'Tên nhiệm vụ', type: 'text', required: true, full: true },
            { name: 'IDNhanVien', label: 'Giao cho', type: 'select', options: nvOpts, required: true },
            { name: 'IDPhien', label: 'Thuộc phiên (tùy chọn)', type: 'select', options: [{ value: '', text: '— Không —' }].concat(phienOpts) },
            { name: 'DoUuTien', label: 'Độ ưu tiên', type: 'select', options: [{ value: 1, text: 'Thường' }, { value: 2, text: 'Cao' }, { value: 3, text: 'Khẩn' }] },
            { name: 'ThoiHan', label: 'Thời hạn', type: 'datetime' },
            { name: 'TrangThai', label: 'Trạng thái', type: 'select', options: [{ value: 0, text: 'Chưa làm' }, { value: 1, text: 'Đang làm' }, { value: 2, text: 'Hoàn thành' }] },
            { name: 'MoTa', label: 'Mô tả chi tiết', type: 'textarea', rows: 3, full: true }
        ];
        meetModal({
            title: row ? 'Sửa nhiệm vụ' : 'Giao nhiệm vụ', icon: 'fa-clipboard-list', width: 720, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, row || { DoUuTien: 1, TrangThai: 0 }); },
            onSave: function (b) {
                if (!meetFormValidate(b, fields)) return false;
                var d = meetFormRead(b, fields); d.IDHoiNghi = hn; if (row) d.ID = row.ID;
                jAjax('/PhanCong/SaveNhiemVu', d, function (o) { if (o.code === 0) { meetToast('Đã lưu nhiệm vụ'); loadTask(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();
        document.getElementById('btnAddNV').onclick = function () { formNV(null); };
        document.getElementById('btnEditNV').onclick = function () { if (!selNV) return meetToast('Chọn một nhân viên', true); formNV(selNV); };
        document.getElementById('btnDelNV').onclick = function () { if (!selNV) return meetToast('Chọn một nhân viên', true); meetConfirm('Xóa nhân viên này?', function () { jAjax('/PhanCong/DeleteNhanVien', { ID: selNV.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); loadNV(); } else meetToast(o.message, true); }); }); };
        document.getElementById('btnAddNV2').onclick = function () { loadNV(function () { loadPhien(function () { formTask(null); }); }); };
        document.getElementById('btnEditTask').onclick = function () { if (!selTask) return meetToast('Chọn một nhiệm vụ', true); loadNV(function () { loadPhien(function () { formTask(selTask); }); }); };
        document.getElementById('btnCycleTask').onclick = function () { if (!selTask) return meetToast('Chọn một nhiệm vụ', true); nextStatus(selTask); };
        document.getElementById('btnDelTask').onclick = function () { if (!selTask) return meetToast('Chọn một nhiệm vụ', true); meetConfirm('Xóa nhiệm vụ này?', function () { jAjax('/PhanCong/DeleteNhiemVu', { ID: selTask.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); loadTask(); } else meetToast(o.message, true); }); }); };
        document.querySelectorAll('.pc-tg').forEach(function (b) { b.onclick = function () { switchView(b.dataset.view); }; });
        loadNV(); loadTask();
    });
    document.addEventListener('meet:hn', load);
})();
