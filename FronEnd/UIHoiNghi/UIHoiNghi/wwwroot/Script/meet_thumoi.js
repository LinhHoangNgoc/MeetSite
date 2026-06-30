// ===== TN7: Thư mời hội nghị — soạn/gửi/sao chép + trạng thái gửi từng đại biểu =====
(function () {
    var grid, sel = null, allRows = [], macDinh = null;
    var KENH = { 1: 'SMS', 2: 'Zalo OA', 3: 'Email' };

    function stBadge(c) {
        var v = c.getValue();
        if (v == 1) return '<span class="badge-st st-1">Đã gửi</span>';
        if (v == 2) return '<span class="badge-st" style="background:#fde0dd;color:#c0392b">Gửi lỗi</span>';
        if (v == 0) return '<span class="badge-st" style="background:#fdf0d5;color:#9a6a00">Chưa gửi</span>';
        return '<span class="badge-st st-0">Chưa soạn</span>';
    }

    function build() {
        var cols = [
            textColumn('MaDaiBieu', 'Mã', 75, false),
            textColumn('HoTen', 'Họ và tên', 180, false),
            { title: 'Năm sinh', field: 'NamSinh', width: 85, hozAlign: 'center', headerFilter: false },
            textColumn('DonVi', 'Đơn vị công tác', 210, false),
            { title: 'Kênh', field: 'Kenh', width: 90, headerFilter: false, formatter: function (c) { return c.getRow().getData().IDThuMoi ? (KENH[c.getValue()] || '') : ''; } },
            { title: 'Trạng thái gửi', field: 'TrangThaiGui', width: 130, headerFilter: false, formatter: stBadge },
            { title: 'Số lần gửi', field: 'SoLanGui', width: 95, hozAlign: 'center', headerFilter: false, formatter: function (c) { return c.getValue() || ''; } },
            { title: 'Thời gian gửi', field: 'ThoiGianGui', width: 150, headerFilter: false, formatter: function (c) { return c.getValue() ? meetFmtDate(c.getValue(), true) : ''; } },
            textColumn('LoiMock', 'Ghi chú', 170, false)
        ];
        grid = newGrid('gridThuMoi', [], cols, null, function (a) { sel = a.data; }, false);
        grid.appendTo('#gridThuMoi');
    }

    function loadStat() {
        var hn = MEET.getHN(); if (!hn) return;
        jAjax('/ThuMoi/ThongKe', { IDHoiNghi: hn }, function (o) {
            if (o.code !== 0) return; var d = o.data;
            document.getElementById('tmTong').textContent = d.tongDaiBieu;
            document.getElementById('tmSoan').textContent = d.daSoan;
            document.getElementById('tmGui').textContent = d.daGui;
            document.getElementById('tmLoi').textContent = d.guiLoi;
            document.getElementById('tmTyLe').textContent = d.tyLe + '%';
            var ring = document.getElementById('tmRing'); ring.style.setProperty('--p', d.tyLe);
        });
    }
    function load() {
        var hn = MEET.getHN();
        if (!hn) { allRows = []; if (grid) grid.dataSource = []; return; }
        jAjax('/ThuMoi/ListThuMoi', { IDHoiNghi: hn }, function (o) { if (o.code === 0) { allRows = o.data || []; grid.dataSource = allRows; } });
        jAjax('/ThuMoi/MacDinhHoiNghi', { IDHoiNghi: hn }, function (o) { macDinh = (o.code === 0 && o.data && o.data[0]) ? o.data[0] : null; });
        loadStat();
    }

    function defThoiGian() {
        if (!macDinh || !macDinh.NgayBatDau) return '';
        var s = meetFmtDate(macDinh.NgayBatDau, true);
        return macDinh.NgayKetThuc ? (s + ' → ' + meetFmtDate(macDinh.NgayKetThuc, true)) : s;
    }

    function formThu(row) {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var isNew = !row.IDThuMoi;
        var data = isNew
            ? { Kenh: row.Email ? 3 : 2, DiaDiem: (macDinh && macDinh.DiaDiem) || '', ThoiGian: defThoiGian(), NoiDung: '' }
            : { Kenh: row.Kenh, DiaDiem: row.DiaDiem, ThoiGian: row.ThoiGian, LuuY: row.LuuY, NoiDung: row.NoiDung };
        var fields = [
            { name: 'Kenh', label: 'Kênh gửi', type: 'select', options: [{ value: 1, text: 'SMS' }, { value: 2, text: 'Zalo OA' }, { value: 3, text: 'Email' }] },
            { name: 'DiaDiem', label: 'Địa điểm hội nghị', type: 'text', full: true },
            { name: 'ThoiGian', label: 'Thời gian diễn ra', type: 'text', full: true },
            { name: 'LuuY', label: 'Lưu ý khi tham gia hội nghị', type: 'textarea', rows: 2, full: true },
            { name: 'NoiDung', label: 'Nội dung thư', type: 'textarea', rows: 5, full: true }
        ];
        meetModal({
            title: (isNew ? 'Soạn thư mời — ' : 'Sửa thư mời — ') + row.HoTen, icon: 'fa-envelope-open-text', width: 720,
            body: '<div class="meet-hint" style="margin-bottom:8px">Đại biểu: <b>' + row.HoTen + '</b>'
                + (row.NamSinh ? ' · ' + row.NamSinh : '') + (row.DonVi ? ' · ' + row.DonVi : '') + '</div>'
                + meetFormHtml(fields)
                + '<div class="meet-hint">Biến cá nhân hóa: '
                + ['{HoTen}', '{MaGhe}', '{TenHoiNghi}', '{DiaDiem}', '{ThoiGian}', '{LuuY}'].map(function (v) { return '<span class="meet-chip" style="cursor:pointer" data-var="' + v + '">' + v + '</span>'; }).join(' ')
                + '</div>',
            onOpen: function (box) {
                meetFormInit(box, fields, data);
                box.querySelectorAll('[data-var]').forEach(function (ch) { ch.onclick = function () { var ta = box.querySelector('#mf_NoiDung'); ta.value += ch.dataset.var; ta.focus(); }; });
            },
            onSave: function (box) {
                var d = meetFormRead(box, fields); d.IDHoiNghi = hn; d.IDDaiBieu = row.IDDaiBieu;
                jAjax('/ThuMoi/SaveThuMoi', d, function (o) { if (o.code === 0) { meetToast('Đã lưu thư mời'); load(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function copyTo(src) {
        var hn = MEET.getHN();
        var others = allRows.filter(function (r) { return r.IDDaiBieu != src.IDDaiBieu; });
        if (!others.length) return meetToast('Không có đại biểu nào khác để sao chép', true);
        var body = '<div class="meet-hint" style="margin-bottom:8px">Sao chép nội dung thư của <b>' + src.HoTen
            + '</b> sang các đại biểu được chọn (giữ địa điểm/thời gian/lưu ý/nội dung/kênh). Thư đã gửi sẽ được giữ nguyên.</div>'
            + '<div style="margin-bottom:8px"><label><input type="checkbox" id="cpAll"> Chọn tất cả</label> '
            + '<span style="color:#6a7882">·</span> <a id="cpSameDV" style="cursor:pointer;color:var(--meet-primary)">Cùng đơn vị "' + (src.DonVi || '') + '"</a></div>'
            + '<div id="cpList" style="max-height:320px;overflow:auto"></div>';
        var m = meetModal({
            title: 'Sao chép thư mời', icon: 'fa-copy', width: 560, body: body,
            onSave: function (box) {
                var ids = Array.prototype.slice.call(box.querySelectorAll('.cpItem:checked')).map(function (c) { return c.value; });
                if (!ids.length) { meetToast('Chọn ít nhất 1 đại biểu', true); return false; }
                jAjax('/ThuMoi/SaoChep', { IDHoiNghi: hn, IDThuMoiNguon: src.IDThuMoi, IDDaiBieus: ids.join(',') }, function (o) {
                    if (o.code === 0) { meetToast('Đã sao chép sang ' + o.data.count + ' đại biểu'); load(); } else meetToast(o.message, true);
                });
                return true;
            }
        });
        var box = m.querySelector('.mm-box');
        box.querySelector('#cpList').innerHTML = others.map(function (r) {
            return '<label style="display:flex;align-items:center;gap:9px;padding:7px 4px;border-bottom:1px solid var(--meet-line)">'
                + '<input type="checkbox" class="cpItem" value="' + r.IDDaiBieu + '" data-dv="' + (r.DonVi || '') + '">'
                + '<b style="flex:1">' + r.HoTen + '</b><span class="meet-hint">' + (r.DonVi || '') + '</span></label>';
        }).join('');
        box.querySelector('#cpAll').onchange = function () { var ck = this.checked; box.querySelectorAll('.cpItem').forEach(function (c) { c.checked = ck; }); };
        box.querySelector('#cpSameDV').onclick = function () { box.querySelectorAll('.cpItem').forEach(function (c) { c.checked = (c.dataset.dv === (src.DonVi || '')); }); };
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();
        document.getElementById('btnSoan').onclick = function () { if (!sel) return meetToast('Chọn một đại biểu', true); formThu(sel); };
        document.getElementById('btnGuiRieng').onclick = function () {
            if (!sel) return meetToast('Chọn một đại biểu', true);
            if (!sel.IDThuMoi) return meetToast('Hãy soạn thư cho đại biểu này trước', true);
            meetConfirm('Gửi thư mời cho ' + sel.HoTen + ' (mô phỏng)?', function () {
                jAjax('/ThuMoi/GuiRieng', { ID: sel.IDThuMoi }, function (o) {
                    if (o.code === 0) { meetToast(o.data.ok ? 'Đã gửi thành công' : 'Gửi thất bại (mô phỏng)', !o.data.ok); load(); } else meetToast(o.message, true);
                });
            });
        };
        document.getElementById('btnGuiAll').onclick = function () {
            var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
            meetConfirm('Gửi TẤT CẢ thư chưa gửi của hội nghị (mô phỏng)?', function () {
                jAjax('/ThuMoi/GuiTatCa', { IDHoiNghi: hn, GuiLai: false }, function (o) {
                    if (o.code === 0) { meetToast('Đã gửi: ' + o.data.ok + ' thành công, ' + o.data.fail + ' lỗi'); load(); } else meetToast(o.message, true);
                });
            });
        };
        document.getElementById('btnGuiLai').onclick = function () {
            var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
            meetConfirm('Gửi lại các thư đang lỗi (mô phỏng)?', function () {
                jAjax('/ThuMoi/GuiTatCa', { IDHoiNghi: hn, GuiLai: true }, function (o) {
                    if (o.code === 0) { meetToast('Đã gửi lại: ' + o.data.ok + ' thành công, ' + o.data.fail + ' lỗi'); load(); } else meetToast(o.message, true);
                });
            });
        };
        document.getElementById('btnCopy').onclick = function () {
            if (!sel) return meetToast('Chọn đại biểu nguồn', true);
            if (!sel.IDThuMoi) return meetToast('Đại biểu nguồn chưa có thư để sao chép', true);
            copyTo(sel);
        };
        document.getElementById('btnXoa').onclick = function () {
            if (!sel) return meetToast('Chọn một đại biểu', true);
            if (!sel.IDThuMoi) return meetToast('Đại biểu này chưa có thư', true);
            meetConfirm('Hủy & xóa thư mời của ' + sel.HoTen + '?', function () {
                jAjax('/ThuMoi/DeleteThuMoi', { ID: sel.IDThuMoi }, function (o) { if (o.code === 0) { meetToast('Đã xóa thư'); load(); } else meetToast(o.message, true); });
            });
        };
    });
    document.addEventListener('meet:hn', load);
    if (window.MEET && MEET.ready) load();
})();
