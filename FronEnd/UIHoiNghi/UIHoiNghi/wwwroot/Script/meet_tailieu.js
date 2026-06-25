// ===== TN5: Tài liệu (desktop) =====
(function () {
    var grid, sel = null, nhomList = [], phienList = [];

    function fsize(b) { b = Number(b) || 0; return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB'; }
    function build() {
        var cols = [
            { title: 'Tên tài liệu', field: 'TenTaiLieu', width: 280, formatter: function (c) { var d = c.getRow().getData(); return '<i class="fa-solid fa-file-' + ficon(d.LoaiFile) + '" style="color:#0a6c5e;margin-right:7px"></i>' + (c.getValue() || ''); } },
            textColumn('LoaiFile', 'Loại', 80, false),
            { title: 'Dung lượng', field: 'KichThuoc', width: 110, hozAlign: 'right', headerFilter: false, formatter: function (c) { return fsize(c.getValue()); } },
            textColumn('TenPhien', 'Phiên', 160, false),
            { title: 'Phạm vi', field: 'PhamViTruyCap', width: 130, headerFilter: false, formatter: function (c) { var d = c.getRow().getData(); return c.getValue() == 2 ? '<span class="badge-st st-2">Nhóm (' + (d.SoNhom || 0) + ')</span>' : '<span class="badge-st st-1">Công khai</span>'; } },
            { title: 'Lượt xem', field: 'LuotXem', width: 90, hozAlign: 'right' },
            { title: 'Ngày tải', field: 'NgayTaiLen', width: 140, formatter: function (c) { return meetFmtDate(c.getValue(), true); } }
        ];
        grid = newGrid('gridTaiLieu', [], cols, null, function (a) { sel = a.data; }, false);
        grid.appendTo('#gridTaiLieu');
    }
    function ficon(t) { t = (t || '').toLowerCase(); if (t.indexOf('pdf') >= 0) return 'pdf'; if (t.indexOf('doc') >= 0) return 'word'; if (t.indexOf('xls') >= 0) return 'excel'; if (t.indexOf('ppt') >= 0) return 'powerpoint'; if (['png', 'jpg', 'jpeg'].indexOf(t) >= 0) return 'image'; return 'lines'; }

    function load() {
        var hn = MEET.getHN(); if (!hn) { grid.dataSource = []; return; }
        jAjax('/TaiLieu/ListTaiLieu', { IDHoiNghi: hn }, function (o) { if (o.code === 0) grid.dataSource = o.data || []; });
    }
    function loadRefs(cb) {
        var hn = MEET.getHN();
        jAjax('/DaiBieu/ComboNhom', { IDHoiNghi: hn }, function (o) {
            nhomList = o.code === 0 ? o.data : [];
            jAjax('/HoiNghi/ListPhien', { IDHoiNghi: hn }, function (o2) { phienList = o2.code === 0 ? o2.data : []; cb && cb(); });
        });
    }

    function nhomChecks(selectedIds) {
        selectedIds = selectedIds || [];
        return '<div id="nhBox" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">' + (nhomList.length ? nhomList.map(function (n) {
            return '<label class="meet-chip" style="cursor:pointer"><input type="checkbox" value="' + n.ID + '"' + (selectedIds.indexOf(n.ID) >= 0 ? ' checked' : '') + '> ' + n.TenNhom + '</label>';
        }).join('') : '<span class="meet-hint">Chưa có nhóm đại biểu.</span>') + '</div>';
    }

    function uploadForm() {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var phOpts = [{ value: '', text: '— Không gắn phiên —' }].concat(phienList.map(function (p) { return { value: p.ID, text: p.TenPhien }; }));
        var body = '<div class="meet-form">'
            + '<div class="fld full"><label>Chọn tệp <span class="req">*</span></label><input type="file" id="upFile" class="form-control"></div>'
            + '<div class="fld full"><label>Tên hiển thị (để trống = tên tệp)</label><input type="text" id="upTen" class="form-control"></div>'
            + '<div class="fld"><label>Gắn phiên</label><select id="upPhien">' + phOpts.map(function (o) { return '<option value="' + o.value + '">' + o.text + '</option>'; }).join('') + '</select></div>'
            + '<div class="fld"><label>Phạm vi truy cập</label><select id="upPV"><option value="1">Công khai</option><option value="2">Theo nhóm</option></select></div>'
            + '<div class="fld full" id="upNhomWrap" style="display:none"><label>Nhóm được xem</label>' + nhomChecks([]) + '</div>'
            + '</div>';
        meetModal({
            title: 'Tải tài liệu lên', icon: 'fa-cloud-arrow-up', width: 640, body: body,
            onOpen: function (box) {
                box.querySelector('#upPV').onchange = function () { box.querySelector('#upNhomWrap').style.display = this.value == '2' ? 'block' : 'none'; };
            },
            onSave: function (box) {
                var f = box.querySelector('#upFile').files[0];
                if (!f) { meetToast('Chọn tệp', true); return false; }
                var fd = new FormData();
                fd.append('file', f); fd.append('IDHoiNghi', hn); fd.append('TenTaiLieu', box.querySelector('#upTen').value);
                fd.append('IDPhien', box.querySelector('#upPhien').value || 0); fd.append('PhamViTruyCap', box.querySelector('#upPV').value);
                var nh = []; box.querySelectorAll('#nhBox input:checked').forEach(function (c) { nh.push(c.value); });
                fd.append('IDNhom', nh.join(','));
                fetch('/TaiLieu/UploadTaiLieu', { method: 'POST', body: fd }).then(function (r) { return r.json(); }).then(function (o) {
                    if (o.code === 0) { meetToast('Đã tải lên'); load(); } else meetToast(o.message, true);
                }).catch(function () { meetToast('Lỗi tải lên', true); });
                return true;
            }
        });
    }

    function quyenForm() {
        if (!sel) return meetToast('Chọn tài liệu', true);
        loadRefs(function () {
            jAjax('/TaiLieu/GetQuyen', { ID: sel.ID }, function (o) {
                var selectedIds = (o.code === 0 ? o.data : []).map(function (r) { return r.IDNhom; });
                var body = '<div class="meet-form"><div class="fld full"><label>Phạm vi truy cập</label><select id="qPV"><option value="1"' + (sel.PhamViTruyCap == 1 ? ' selected' : '') + '>Công khai</option><option value="2"' + (sel.PhamViTruyCap == 2 ? ' selected' : '') + '>Theo nhóm</option></select></div>'
                    + '<div class="fld full" id="qNhomWrap" style="display:' + (sel.PhamViTruyCap == 2 ? 'block' : 'none') + '"><label>Nhóm được xem</label>' + nhomChecks(selectedIds) + '</div></div>';
                meetModal({
                    title: 'Phân quyền tài liệu', icon: 'fa-user-lock', width: 560, body: body,
                    onOpen: function (box) { box.querySelector('#qPV').onchange = function () { box.querySelector('#qNhomWrap').style.display = this.value == '2' ? 'block' : 'none'; }; },
                    onSave: function (box) {
                        var nh = []; box.querySelectorAll('#nhBox input:checked').forEach(function (c) { nh.push(c.value); });
                        jAjax('/TaiLieu/SaveQuyen', { ID: sel.ID, PhamViTruyCap: box.querySelector('#qPV').value, IDNhom: nh.join(',') }, function (o2) { if (o2.code === 0) { meetToast('Đã lưu quyền'); load(); } else meetToast(o2.message, true); });
                        return true;
                    }
                });
            });
        });
    }

    function showQR() {
        if (!sel) return meetToast('Chọn tài liệu', true);
        var url = location.origin + '/meetpublic/OpenTaiLieu?share=' + sel.ShareToken;
        meetModal({
            title: 'QR chia sẻ tài liệu', icon: 'fa-qrcode', width: 360,
            body: '<div style="text-align:center"><div id="qrD" style="display:inline-block;padding:12px;background:#fff;border-radius:10px"></div>'
                + '<div style="margin-top:10px;font-weight:700">' + sel.TenTaiLieu + '</div>'
                + '<div class="meet-hint" style="word-break:break-all">' + url + '</div></div>',
            onOpen: function (box) { if (typeof QRCode !== 'undefined') new QRCode(box.querySelector('#qrD'), { text: url, width: 220, height: 220 }); }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();
        document.getElementById('btnUpload').onclick = function () { loadRefs(uploadForm); };
        document.getElementById('btnQuyen').onclick = quyenForm;
        document.getElementById('btnQR').onclick = showQR;
        document.getElementById('btnDown').onclick = function () { if (!sel) return meetToast('Chọn tài liệu', true); window.open('/TaiLieu/Download/' + sel.ID, '_blank'); };
        document.getElementById('btnDel').onclick = function () { if (!sel) return meetToast('Chọn tài liệu', true); meetConfirm('Xóa tài liệu này?', function () { jAjax('/TaiLieu/DeleteTaiLieu', { ID: sel.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); load(); } else meetToast(o.message, true); }); }); };
    });
    document.addEventListener('meet:hn', load);
})();
