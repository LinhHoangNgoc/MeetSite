// ===== TN2: Đại biểu + nhóm + QR =====
(function () {
    var grid, sel = null, nhomOpts = [], allRows = [], filterNhom = '';

    function vip(c) { return c.getValue() == 1 || c.getValue() === true ? '<span class="badge-vip">VIP</span>' : ''; }
    function ci(c) { return c.getValue() == 1 ? '<span class="badge-st st-1">Đã đến</span>' : '<span class="badge-st st-0">Chưa</span>'; }

    function build() {
        var cols = [
            textColumn('MaDaiBieu', 'Mã', 80, false),
            textColumn('HoTen', 'Họ tên', 190, false),
            { title: 'Năm sinh', field: 'NamSinh', width: 90, hozAlign: 'center', headerFilter: false },
            textColumn('ChucDanh', 'Chức danh', 150, false),
            textColumn('DonVi', 'Đơn vị', 200, false),
            textColumn('TenNhom', 'Nhóm', 130, false),
            { title: 'VIP', field: 'LaVIP', width: 70, hozAlign: 'center', formatter: vip, headerFilter: false },
            textColumn('DienThoai', 'Điện thoại', 120, false),
            textColumn('MaGhe', 'Ghế', 80, false),
            { title: 'Điểm danh', field: 'DaCheckIn', width: 110, hozAlign: 'center', formatter: ci, headerFilter: false }
        ];
        grid = newGrid('gridDaiBieu', [], cols, null, function (a) { sel = a.data; }, false);
        grid.appendTo('#gridDaiBieu');
    }

    function applyFilter() {
        grid.dataSource = filterNhom ? allRows.filter(function (r) { return '' + r.IDNhom === '' + filterNhom; }) : allRows;
    }
    function load() {
        var hn = MEET.getHN(); if (!hn) { allRows = []; grid.dataSource = []; return; }
        jAjax('/DaiBieu/ListDaiBieu', { IDHoiNghi: hn }, function (o) { if (o.code === 0) { allRows = o.data || []; applyFilter(); } });
    }
    function loadNhom(cb) {
        var hn = MEET.getHN();
        jAjax('/DaiBieu/ComboNhom', { IDHoiNghi: hn }, function (o) {
            nhomOpts = (o.code === 0 ? o.data : []).map(function (r) { return { value: r.ID, text: r.TenNhom }; });
            var f = document.getElementById('filterNhom');
            f.innerHTML = '<option value="">— Tất cả nhóm —</option>' + nhomOpts.map(function (n) { return '<option value="' + n.value + '">' + n.text + '</option>'; }).join('');
            cb && cb();
        });
    }

    function formDB(row) {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var fields = [
            { name: 'HoTen', label: 'Họ tên', type: 'text', required: true },
            { name: 'NamSinh', label: 'Năm sinh', type: 'text' },
            { name: 'MaDaiBieu', label: 'Mã (tự sinh nếu trống)', type: 'text' },
            { name: 'ChucDanh', label: 'Chức danh', type: 'text' },
            { name: 'DonVi', label: 'Đơn vị', type: 'text' },
            { name: 'DienThoai', label: 'Điện thoại', type: 'text' },
            { name: 'Email', label: 'Email', type: 'text' },
            { name: 'SoCCCD', label: 'Số CCCD (điểm danh CCCD)', type: 'text' },
            { name: 'MaNFC', label: 'Mã thẻ NFC (điểm danh NFC)', type: 'text' },
            { name: 'IDNhom', label: 'Nhóm', type: 'select', options: [{ value: '', text: '— Không nhóm —' }].concat(nhomOpts) },
            { name: 'TrangThaiDangKy', label: 'Trạng thái', type: 'select', options: [{ value: 1, text: 'Đã xác nhận' }, { value: 0, text: 'Mời' }, { value: 2, text: 'Hủy' }] },
            { name: 'LaVIP', label: 'Đại biểu VIP', type: 'checkbox', full: true }
        ];
        meetModal({
            title: row ? 'Sửa đại biểu' : 'Thêm đại biểu', icon: 'fa-user-pen', width: 720,
            body: meetFormHtml(fields),
            onOpen: function (box) { meetFormInit(box, fields, row || { TrangThaiDangKy: 1 }); },
            onSave: function (box) {
                if (!meetFormValidate(box, fields)) return false;
                var d = meetFormRead(box, fields); d.IDHoiNghi = hn; if (row) { d.ID = row.ID; d.QRToken = row.QRToken; }
                jAjax('/DaiBieu/SaveDaiBieu', d, function (o) { if (o.code === 0) { meetToast('Đã lưu'); load(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function showQR(row) {
        var url = location.origin + '/meetpublic/DaiBieu?token=' + row.QRToken;
        var body = '<div style="text-align:center">'
            + '<div id="qrBox" style="display:inline-block;padding:12px;background:#fff;border-radius:10px"></div>'
            + '<div style="margin-top:12px;font-size:18px;font-weight:700">' + (row.HoTen || '') + '</div>'
            + '<div class="meet-hint">' + (row.MaDaiBieu || '') + (row.MaGhe ? ' · Ghế ' + row.MaGhe : '') + '</div>'
            + '<div class="meet-hint" style="word-break:break-all;margin-top:6px">' + url + '</div>'
            + '<div style="margin-top:12px"><button class="btn-meet" onclick="window.print()"><i class="fa-solid fa-print"></i> In thẻ</button></div>'
            + '</div>';
        meetModal({
            title: 'Mã QR đại biểu', icon: 'fa-qrcode', width: 380, body: body,
            onOpen: function (box) {
                var el = box.querySelector('#qrBox');
                if (typeof QRCode !== 'undefined') new QRCode(el, { text: url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
                else el.textContent = 'Không tải được thư viện QR';
            }
        });
    }

    function manageNhom() {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var body = '<div class="meet-toolbar"><input id="nhTen" class="form-control" placeholder="Tên nhóm mới" style="max-width:200px">'
            + '<input id="nhMau" type="color" value="#0a6c5e" style="width:46px;height:38px;border:1px solid #ccc;border-radius:8px">'
            + '<button class="btn-meet sm" id="nhAdd"><i class="fa-solid fa-plus"></i> Thêm</button></div>'
            + '<div id="nhList"></div>';
        var m = meetModal({ title: 'Quản lý nhóm đại biểu', icon: 'fa-layer-group', width: 560, body: body });
        var box = m.querySelector('.mm-box');
        function reload() {
            jAjax('/DaiBieu/ListNhom', { IDHoiNghi: hn }, function (o) {
                var rows = o.code === 0 ? o.data : [];
                box.querySelector('#nhList').innerHTML = rows.length ? rows.map(function (r) {
                    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--meet-line)">'
                        + '<span style="width:16px;height:16px;border-radius:4px;background:' + (r.MauSac || '#999') + '"></span>'
                        + '<b style="flex:1">' + r.TenNhom + '</b><span class="meet-chip">' + r.SoDaiBieu + ' đại biểu</span>'
                        + '<button class="btn-meet sm danger" data-del="' + r.ID + '"><i class="fa-solid fa-trash"></i></button></div>';
                }).join('') : '<div class="meet-hint" style="padding:10px">Chưa có nhóm.</div>';
                box.querySelectorAll('[data-del]').forEach(function (b) {
                    b.onclick = function () { meetConfirm('Xóa nhóm này?', function () { jAjax('/DaiBieu/DeleteNhom', { ID: b.dataset.del }, function () { reload(); loadNhom(); }); }); };
                });
            });
        }
        box.querySelector('#nhAdd').onclick = function () {
            var ten = box.querySelector('#nhTen').value.trim(); if (!ten) return meetToast('Nhập tên nhóm', true);
            jAjax('/DaiBieu/SaveNhom', { IDHoiNghi: hn, TenNhom: ten, MauSac: box.querySelector('#nhMau').value }, function (o) {
                if (o.code === 0) { box.querySelector('#nhTen').value = ''; reload(); loadNhom(); } else meetToast(o.message, true);
            });
        };
        reload();
    }

    function importDB() {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var fields = [{ name: 'IDNhom', label: 'Gán vào nhóm', type: 'select', options: [{ value: '', text: '— Không nhóm —' }].concat(nhomOpts), full: true }];
        var body = '<div class="meet-hint" style="margin-bottom:8px">Mỗi dòng một đại biểu, các cột cách nhau bằng dấu <b>|</b> hoặc Tab:<br>'
            + '<code>Họ tên | Chức danh | Đơn vị | Điện thoại | Email</code></div>'
            + meetFormHtml(fields)
            + '<textarea id="impData" class="form-control" rows="9" style="margin-top:8px;font-family:monospace" placeholder="Nguyễn Văn A | Giám đốc | Công ty X | 0901234567 | a@x.com"></textarea>';
        meetModal({
            title: 'Nhập nhanh đại biểu', icon: 'fa-file-import', width: 640, body: body,
            onOpen: function (box) { meetFormInit(box, fields, {}); },
            onSave: function (box) {
                var data = box.querySelector('#impData').value;
                if (!data.trim()) { meetToast('Chưa có dữ liệu', true); return false; }
                jAjax('/DaiBieu/ImportDaiBieu', { IDHoiNghi: hn, IDNhom: mmVal(box, 'IDNhom') || 0, Data: data }, function (o) {
                    if (o.code === 0) { meetToast('Đã nhập ' + o.data.count + ' đại biểu'); load(); } else meetToast(o.message, true);
                });
                return true;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();
        document.getElementById('btnAddDB').onclick = function () { loadNhom(function () { formDB(null); }); };
        document.getElementById('btnEditDB').onclick = function () { if (!sel) return meetToast('Chọn một đại biểu', true); loadNhom(function () { formDB(sel); }); };
        document.getElementById('btnDelDB').onclick = function () { if (!sel) return meetToast('Chọn một đại biểu', true); meetConfirm('Xóa đại biểu này?', function () { jAjax('/DaiBieu/DeleteDaiBieu', { ID: sel.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); load(); } else meetToast(o.message, true); }); }); };
        document.getElementById('btnQR').onclick = function () { if (!sel) return meetToast('Chọn một đại biểu', true); showQR(sel); };
        document.getElementById('btnImport').onclick = function () { loadNhom(importDB); };
        document.getElementById('btnNhom').onclick = manageNhom;
        document.getElementById('filterNhom').onchange = function () { filterNhom = this.value; applyFilter(); };
    });
    document.addEventListener('meet:hn', function () { loadNhom(); load(); });
})();
