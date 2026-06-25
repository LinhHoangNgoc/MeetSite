// ===== TN1: Quản lý Hội nghị / Phiên / Diễn giả =====
(function () {
    var gHN, gPhien, gDG, selHN = null, selPhien = null, selDG = null, curHNId = 0, curHNName = '';
    var diaDiemOpts = [], phongOpts = [];

    function tt(v) { return meetBadgeHN(Number(v)); }
    function fdt(v) { return meetFmtDate(v, true); }
    function fd(v) { return meetFmtDate(v, false); }

    // ---------- Grid Hội nghị ----------
    function buildGrids() {
        var colHN = [
            textColumn('MaHoiNghi', 'Mã', 80, false),
            textColumn('TenHoiNghi', 'Tên hội nghị', 280, false),
            { title: 'Bắt đầu', field: 'NgayBatDau', width: 150, formatter: function (c) { return fdt(c.getValue()); } },
            { title: 'Kết thúc', field: 'NgayKetThuc', width: 150, formatter: function (c) { return fdt(c.getValue()); } },
            textColumn('DonViToChuc', 'Đơn vị tổ chức', 180, false),
            { title: 'Trạng thái', field: 'TrangThai', width: 120, formatter: function (c) { return tt(c.getValue()); } },
            { title: 'Phiên', field: 'SoPhien', width: 70, hozAlign: 'right' },
            { title: 'Đại biểu', field: 'SoDaiBieu', width: 80, hozAlign: 'right' }
        ];
        gHN = newGrid('gridHoiNghi', [], colHN, null, function (a) { onSelectHN(a.data); }, false);
        gHN.appendTo('#gridHoiNghi');

        var colP = [
            { title: 'TT', field: 'ThuTu', width: 50, hozAlign: 'right' },
            textColumn('TenPhien', 'Tên phiên', 240, false),
            { title: 'Bắt đầu', field: 'ThoiGianBatDau', width: 140, formatter: function (c) { return fdt(c.getValue()); } },
            { title: 'Kết thúc', field: 'ThoiGianKetThuc', width: 140, formatter: function (c) { return fdt(c.getValue()); } },
            textColumn('TenPhong', 'Phòng', 160, false),
            { title: 'Diễn giả', field: 'SoDienGia', width: 80, hozAlign: 'right' }
        ];
        gPhien = newGrid('gridPhien', [], colP, null, function (a) { selPhien = a.data; }, false);
        gPhien.appendTo('#gridPhien');

        var colD = [
            textColumn('HoTen', 'Họ tên', 200, false),
            textColumn('ChucDanh', 'Chức danh', 180, false),
            textColumn('DonVi', 'Đơn vị', 200, false),
            textColumn('DienThoai', 'Điện thoại', 120, false),
            textColumn('Email', 'Email', 180, false)
        ];
        gDG = newGrid('gridDienGia', [], colD, null, function (a) { selDG = a.data; }, false);
        gDG.appendTo('#gridDienGia');
    }

    function loadHN() {
        jAjax('/HoiNghi/ListHoiNghi', {}, function (obj) {
            if (obj.code === 0) gHN.dataSource = obj.data || [];
        });
    }
    function loadCombos(cb) {
        jAjax('/HoiNghi/ComboDiaDiem', {}, function (o) {
            diaDiemOpts = (o.code === 0 ? o.data : []).map(function (r) { return { value: r.ID, text: r.TenDiaDiem }; });
            jAjax('/HoiNghi/ComboPhong', {}, function (o2) {
                phongOpts = (o2.code === 0 ? o2.data : []).map(function (r) { return { value: r.ID, text: r.TenPhong }; });
                cb && cb();
            });
        });
    }

    function onSelectHN(d) {
        selHN = d; curHNId = d.ID; curHNName = d.TenHoiNghi;
        document.getElementById('panelDetail').style.display = 'block';
        document.getElementById('hnName').textContent = d.TenHoiNghi;
        loadPhien(); loadDienGia();
    }
    function loadPhien() {
        if (!curHNId) return;
        jAjax('/HoiNghi/ListPhien', { IDHoiNghi: curHNId }, function (o) { if (o.code === 0) { gPhien.dataSource = o.data || []; selPhien = null; } });
    }
    function loadDienGia() {
        if (!curHNId) return;
        jAjax('/HoiNghi/ListDienGia', { IDHoiNghi: curHNId }, function (o) { if (o.code === 0) { gDG.dataSource = o.data || []; selDG = null; } });
    }

    // ---------- Form Hội nghị ----------
    function formHN(row) {
        var fields = [
            { name: 'TenHoiNghi', label: 'Tên hội nghị', type: 'text', required: true, full: true },
            { name: 'MaHoiNghi', label: 'Mã (tự sinh nếu trống)', type: 'text' },
            { name: 'DonViToChuc', label: 'Đơn vị tổ chức', type: 'text' },
            { name: 'NgayBatDau', label: 'Ngày bắt đầu', type: 'datetime' },
            { name: 'NgayKetThuc', label: 'Ngày kết thúc', type: 'datetime' },
            { name: 'IDDiaDiem', label: 'Địa điểm', type: 'select', options: [{ value: '', text: '— Không chọn —' }].concat(diaDiemOpts) },
            { name: 'TrangThai', label: 'Trạng thái', type: 'select', options: [{ value: 0, text: 'Nháp' }, { value: 1, text: 'Mở đăng ký' }, { value: 2, text: 'Đang diễn ra' }, { value: 3, text: 'Đã chốt' }] },
            { name: 'MoTa', label: 'Mô tả', type: 'richtext', full: true }
        ];
        meetModal({
            title: row ? 'Sửa hội nghị' : 'Thêm hội nghị', icon: 'fa-calendar-star', width: 760,
            body: meetFormHtml(fields),
            onOpen: function (box) { meetFormInit(box, fields, row || { TrangThai: 0 }); },
            onSave: function (box) {
                if (!meetFormValidate(box, fields)) return false;
                var data = meetFormRead(box, fields); if (row) data.ID = row.ID;
                jAjax('/HoiNghi/SaveHoiNghi', data, function (o) {
                    if (o.code === 0) { meetToast('Đã lưu hội nghị'); loadHN(); if (window.MEET && MEET.reloadList) MEET.reloadList(); }
                    else meetToast(o.message, true);
                });
                return true;
            }
        });
    }

    // ---------- Form Phiên ----------
    function formPhien(row) {
        if (!curHNId) { meetToast('Chọn hội nghị trước', true); return; }
        var fields = [
            { name: 'TenPhien', label: 'Tên phiên', type: 'text', required: true, full: true },
            { name: 'ThuTu', label: 'Thứ tự', type: 'number' },
            { name: 'IDPhongHop', label: 'Phòng họp', type: 'select', options: [{ value: '', text: '— Không chọn —' }].concat(phongOpts) },
            { name: 'ThoiGianBatDau', label: 'Bắt đầu', type: 'datetime' },
            { name: 'ThoiGianKetThuc', label: 'Kết thúc', type: 'datetime' },
            { name: 'TrangThai', label: 'Trạng thái', type: 'select', options: [{ value: 0, text: 'Dự kiến' }, { value: 1, text: 'Đang diễn ra' }, { value: 2, text: 'Kết thúc' }] },
            { name: 'MoTa', label: 'Mô tả / nội dung', type: 'textarea', full: true }
        ];
        meetModal({
            title: row ? 'Sửa phiên' : 'Thêm phiên họp', icon: 'fa-list-check', width: 720,
            body: meetFormHtml(fields),
            onOpen: function (box) { meetFormInit(box, fields, row || { TrangThai: 0 }); },
            onSave: function (box) {
                if (!meetFormValidate(box, fields)) return false;
                var data = meetFormRead(box, fields); data.IDHoiNghi = curHNId; if (row) data.ID = row.ID;
                jAjax('/HoiNghi/SavePhien', data, function (o) { if (o.code === 0) { meetToast('Đã lưu phiên'); loadPhien(); loadHN(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    // ---------- Form Diễn giả ----------
    function formDG(row) {
        if (!curHNId) { meetToast('Chọn hội nghị trước', true); return; }
        var fields = [
            { name: 'HoTen', label: 'Họ tên', type: 'text', required: true },
            { name: 'ChucDanh', label: 'Chức danh', type: 'text' },
            { name: 'DonVi', label: 'Đơn vị', type: 'text', full: true },
            { name: 'DienThoai', label: 'Điện thoại', type: 'text' },
            { name: 'Email', label: 'Email', type: 'text' },
            { name: 'TieuSu', label: 'Tiểu sử', type: 'richtext', full: true }
        ];
        meetModal({
            title: row ? 'Sửa diễn giả' : 'Thêm diễn giả', icon: 'fa-microphone-lines', width: 720,
            body: meetFormHtml(fields),
            onOpen: function (box) { meetFormInit(box, fields, row || {}); },
            onSave: function (box) {
                if (!meetFormValidate(box, fields)) return false;
                var data = meetFormRead(box, fields); data.IDHoiNghi = curHNId; if (row) data.ID = row.ID;
                jAjax('/HoiNghi/SaveDienGia', data, function (o) { if (o.code === 0) { meetToast('Đã lưu diễn giả'); loadDienGia(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function del(url, id, after) {
        meetConfirm('Bạn chắc chắn muốn xóa?', function () {
            jAjax(url, { ID: id }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); after(); } else meetToast(o.message, true); });
        });
    }

    // ---------- Wire up ----------
    document.addEventListener('DOMContentLoaded', function () {
        buildGrids();
        loadCombos(function () { });
        loadHN();

        document.getElementById('btnAddHN').onclick = function () { loadCombos(function () { formHN(null); }); };
        document.getElementById('btnEditHN').onclick = function () { if (!selHN) return meetToast('Chọn một hội nghị', true); loadCombos(function () { formHN(selHN); }); };
        document.getElementById('btnDelHN').onclick = function () { if (!selHN) return meetToast('Chọn một hội nghị', true); del('/HoiNghi/DeleteHoiNghi', selHN.ID, function () { loadHN(); document.getElementById('panelDetail').style.display = 'none'; if (window.MEET && MEET.reloadList) MEET.reloadList(); }); };

        document.getElementById('btnAddPhien').onclick = function () { loadCombos(function () { formPhien(null); }); };
        document.getElementById('btnEditPhien').onclick = function () { if (!selPhien) return meetToast('Chọn một phiên', true); loadCombos(function () { formPhien(selPhien); }); };
        document.getElementById('btnDelPhien').onclick = function () { if (!selPhien) return meetToast('Chọn một phiên', true); del('/HoiNghi/DeletePhien', selPhien.ID, loadPhien); };

        document.getElementById('btnAddDG').onclick = function () { formDG(null); };
        document.getElementById('btnEditDG').onclick = function () { if (!selDG) return meetToast('Chọn một diễn giả', true); formDG(selDG); };
        document.getElementById('btnDelDG').onclick = function () { if (!selDG) return meetToast('Chọn một diễn giả', true); del('/HoiNghi/DeleteDienGia', selDG.ID, loadDienGia); };

        // Tabs
        document.querySelectorAll('.meet-tab').forEach(function (t) {
            t.onclick = function () {
                document.querySelectorAll('.meet-tab').forEach(function (x) { x.classList.remove('active'); });
                document.querySelectorAll('.meet-tabpane').forEach(function (x) { x.classList.remove('active'); });
                t.classList.add('active');
                document.getElementById('pane-' + t.dataset.tab).classList.add('active');
            };
        });
    });
})();
