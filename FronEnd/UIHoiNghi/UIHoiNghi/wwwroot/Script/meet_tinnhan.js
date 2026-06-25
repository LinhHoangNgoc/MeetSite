// ===== TN4: Tin nhắn SMS/Zalo (mock) =====
(function () {
    var gCD, gLog, selCD = null, nhomOpts = [], mauOpts = [];
    var KENH = { 1: 'SMS', 2: 'Zalo' }, PV = { 1: 'Tất cả', 2: 'Theo nhóm', 3: 'Chỉ VIP' };

    function build() {
        var cols = [
            textColumn('TieuDe', 'Tiêu đề', 220, false),
            { title: 'Kênh', field: 'Kenh', width: 90, formatter: function (c) { return KENH[c.getValue()] || 'SMS'; }, headerFilter: false },
            { title: 'Phạm vi', field: 'PhamVi', width: 110, formatter: function (c) { return PV[c.getValue()] || ''; }, headerFilter: false },
            { title: 'Trạng thái', field: 'TrangThai', width: 120, headerFilter: false, formatter: function (c) { return c.getValue() == 1 ? '<span class="badge-st st-1">Đã gửi</span>' : '<span class="badge-st st-0">Nháp</span>'; } },
            { title: 'Tổng', field: 'TongSo', width: 70, hozAlign: 'right' },
            { title: 'Thành công', field: 'SoThanhCong', width: 95, hozAlign: 'right', formatter: function (c) { return '<span style="color:#0a7a55;font-weight:700">' + (c.getValue() || 0) + '</span>'; } },
            { title: 'Thất bại', field: 'SoThatBai', width: 80, hozAlign: 'right', formatter: function (c) { return c.getValue() ? '<span style="color:#c0392b;font-weight:700">' + c.getValue() + '</span>' : '0'; } },
            { title: 'Ngày gửi', field: 'NgayGui', width: 140, formatter: function (c) { return meetFmtDate(c.getValue(), true); } }
        ];
        gCD = newGrid('gridCD', [], cols, null, function (a) { selCD = a.data; showLog(a.data); }, false);
        gCD.appendTo('#gridCD');

        var colL = [
            textColumn('HoTen', 'Đại biểu', 180, false),
            textColumn('SoDienThoai', 'Số ĐT', 120, false),
            textColumn('NoiDung', 'Nội dung', 320, false),
            { title: 'Kết quả', field: 'TrangThai', width: 110, headerFilter: false, formatter: function (c) { return c.getValue() == 1 ? '<span class="badge-st st-1">Thành công</span>' : '<span class="badge-st" style="background:#fde0dd;color:#c0392b">Thất bại</span>'; } },
            textColumn('MaPhanHoiMock', 'Mã phản hồi', 130, false),
            textColumn('LoiMock', 'Ghi chú', 200, false)
        ];
        gLog = newGrid('gridLog', [], colL, null, null, false);
        gLog.appendTo('#gridLog');
    }

    function load() {
        var hn = MEET.getHN(); if (!hn) { gCD.dataSource = []; return; }
        jAjax('/TinNhan/ListChienDich', { IDHoiNghi: hn }, function (o) { if (o.code === 0) gCD.dataSource = o.data || []; });
    }
    function showLog(cd) {
        document.getElementById('panelLog').style.display = 'block';
        document.getElementById('cdTitle').textContent = cd.TieuDe;
        jAjax('/TinNhan/ListTinNhan', { IDChienDich: cd.ID }, function (o) { if (o.code === 0) gLog.dataSource = o.data || []; });
    }
    function loadRefs(cb) {
        var hn = MEET.getHN();
        jAjax('/DaiBieu/ComboNhom', { IDHoiNghi: hn }, function (o) {
            nhomOpts = (o.code === 0 ? o.data : []).map(function (r) { return { value: r.ID, text: r.TenNhom }; });
            jAjax('/TinNhan/ListMauTin', { IDHoiNghi: hn }, function (o2) {
                mauOpts = (o2.code === 0 ? o2.data : []);
                cb && cb();
            });
        });
    }

    function formCD(row) {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var mauSel = [{ value: '', text: '— Không dùng mẫu —' }].concat(mauOpts.map(function (m) { return { value: m.ID, text: m.TenMau }; }));
        var fields = [
            { name: 'TieuDe', label: 'Tiêu đề chiến dịch', type: 'text', required: true, full: true },
            { name: 'Kenh', label: 'Kênh gửi', type: 'select', options: [{ value: 1, text: 'SMS' }, { value: 2, text: 'Zalo OA' }] },
            { name: 'PhamVi', label: 'Gửi tới', type: 'select', options: [{ value: 1, text: 'Tất cả đại biểu' }, { value: 2, text: 'Theo nhóm' }, { value: 3, text: 'Chỉ VIP' }] },
            { name: 'IDNhom', label: 'Nhóm (nếu chọn theo nhóm)', type: 'select', options: [{ value: '', text: '— Không —' }].concat(nhomOpts) },
            { name: 'IDMauTin', label: 'Tải từ mẫu', type: 'select', options: mauSel },
            { name: 'NoiDung', label: 'Nội dung', type: 'textarea', rows: 5, full: true, required: true }
        ];
        meetModal({
            title: row ? 'Sửa chiến dịch' : 'Soạn chiến dịch', icon: 'fa-pen-to-square', width: 680,
            body: meetFormHtml(fields)
                + '<div class="meet-hint">Biến cá nhân hóa: '
                + ['{HoTen}', '{MaDaiBieu}', '{MaGhe}', '{TenHoiNghi}'].map(function (v) { return '<span class="meet-chip" style="cursor:pointer" data-var="' + v + '">' + v + '</span>'; }).join(' ')
                + '</div>',
            onOpen: function (box) {
                meetFormInit(box, fields, row || { Kenh: 1, PhamVi: 1 });
                box.querySelectorAll('[data-var]').forEach(function (ch) {
                    ch.onclick = function () { var ta = box.querySelector('#mf_NoiDung'); ta.value += ch.dataset.var; ta.focus(); };
                });
                box.querySelector('#mf_IDMauTin').addEventListener('change', function () {
                    var m = mauOpts.find(function (x) { return '' + x.ID === this.value; }.bind(this));
                    if (m) { box.querySelector('#mf_NoiDung').value = m.NoiDung || ''; box.querySelector('#mf_Kenh').value = m.Kenh; }
                });
            },
            onSave: function (box) {
                if (!meetFormValidate(box, fields)) return false;
                var d = meetFormRead(box, fields); d.IDHoiNghi = hn; if (row) d.ID = row.ID;
                jAjax('/TinNhan/SaveChienDich', d, function (o) { if (o.code === 0) { meetToast('Đã lưu chiến dịch'); load(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function manageMau() {
        var hn = MEET.getHN();
        loadRefs(function () {
            var body = '<button class="btn-meet sm" id="mauAdd"><i class="fa-solid fa-plus"></i> Thêm mẫu</button><div id="mauList" style="margin-top:10px"></div>';
            var m = meetModal({ title: 'Mẫu tin nhắn', icon: 'fa-file-lines', width: 600, body: body });
            var box = m.querySelector('.mm-box');
            function reload() {
                jAjax('/TinNhan/ListMauTin', { IDHoiNghi: hn }, function (o) {
                    var rows = o.code === 0 ? o.data : [];
                    box.querySelector('#mauList').innerHTML = rows.length ? rows.map(function (r) {
                        return '<div style="padding:9px 4px;border-bottom:1px solid var(--meet-line)"><div style="display:flex;gap:8px;align-items:center"><b style="flex:1">' + r.TenMau + '</b><span class="meet-chip">' + (KENH[r.Kenh] || '') + '</span><button class="btn-meet sm warn" data-ed="' + r.ID + '"><i class="fa-solid fa-pen"></i></button><button class="btn-meet sm danger" data-del="' + r.ID + '"><i class="fa-solid fa-trash"></i></button></div><div class="meet-hint">' + (r.NoiDung || '').substring(0, 90) + '</div></div>';
                    }).join('') : '<div class="meet-hint" style="padding:10px">Chưa có mẫu.</div>';
                    box.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { meetConfirm('Xóa mẫu?', function () { jAjax('/TinNhan/DeleteMauTin', { ID: b.dataset.del }, reload); }); }; });
                    box.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = function () { var r = rows.find(function (x) { return '' + x.ID === b.dataset.ed; }); editMau(r, reload); }; });
                });
            }
            box.querySelector('#mauAdd').onclick = function () { editMau(null, reload); };
            reload();
        });
    }
    function editMau(row, after) {
        var hn = MEET.getHN();
        var fields = [
            { name: 'TenMau', label: 'Tên mẫu', type: 'text', required: true, full: true },
            { name: 'Kenh', label: 'Kênh', type: 'select', options: [{ value: 1, text: 'SMS' }, { value: 2, text: 'Zalo' }] },
            { name: 'NoiDung', label: 'Nội dung', type: 'textarea', rows: 4, full: true, required: true }
        ];
        meetModal({
            title: row ? 'Sửa mẫu' : 'Thêm mẫu', icon: 'fa-file-lines', width: 560, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, row || { Kenh: 1 }); },
            onSave: function (b) {
                if (!meetFormValidate(b, fields)) return false;
                var d = meetFormRead(b, fields); d.IDHoiNghi = hn; if (row) d.ID = row.ID;
                jAjax('/TinNhan/SaveMauTin', d, function (o) { if (o.code === 0) { after(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();
        document.getElementById('btnAddCD').onclick = function () { loadRefs(function () { formCD(null); }); };
        document.getElementById('btnEditCD').onclick = function () { if (!selCD) return meetToast('Chọn chiến dịch', true); if (selCD.TrangThai == 1) return meetToast('Chiến dịch đã gửi, không sửa được', true); loadRefs(function () { formCD(selCD); }); };
        document.getElementById('btnDelCD').onclick = function () { if (!selCD) return meetToast('Chọn chiến dịch', true); meetConfirm('Xóa chiến dịch này?', function () { jAjax('/TinNhan/DeleteChienDich', { ID: selCD.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); load(); document.getElementById('panelLog').style.display = 'none'; } else meetToast(o.message, true); }); }); };
        document.getElementById('btnSend').onclick = function () {
            if (!selCD) return meetToast('Chọn chiến dịch', true);
            if (selCD.TrangThai == 1) return meetToast('Chiến dịch đã gửi', true);
            meetConfirm('Gửi chiến dịch "' + selCD.TieuDe + '" (mô phỏng)?', function () {
                jAjax('/TinNhan/SendChienDich', { ID: selCD.ID }, function (o) {
                    if (o.code === 0) { meetToast('Đã gửi: ' + o.data.ok + ' thành công, ' + o.data.fail + ' thất bại'); load(); showLog(selCD); }
                    else meetToast(o.message, true);
                });
            });
        };
        document.getElementById('btnMau').onclick = manageMau;
    });
    document.addEventListener('meet:hn', load);
})();
