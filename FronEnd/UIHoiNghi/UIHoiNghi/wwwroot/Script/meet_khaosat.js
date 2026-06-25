// ===== TN6: Thiết kế khảo sát =====
(function () {
    var gKS, selKS = null, curKS = 0, luaChonByCH = {};
    var LOAI = { 1: 'Thang điểm 1–5', 2: 'Một lựa chọn', 3: 'Nhiều lựa chọn', 4: 'Văn bản' };

    function build() {
        var cols = [
            textColumn('TieuDe', 'Tiêu đề', 280, false),
            { title: 'Trạng thái', field: 'TrangThai', width: 120, headerFilter: false, formatter: function (c) { var m = { 0: ['Nháp', 'st-0'], 1: ['Đang mở', 'st-1'], 2: ['Đã đóng', 'st-3'] }; var x = m[c.getValue()] || m[1]; return '<span class="badge-st ' + x[1] + '">' + x[0] + '</span>'; } },
            { title: 'Câu hỏi', field: 'SoCauHoi', width: 90, hozAlign: 'right' },
            { title: 'Phản hồi', field: 'SoPhanHoi', width: 90, hozAlign: 'right' },
            { title: 'Ngày tạo', field: 'NgayTao', width: 130, formatter: function (c) { return meetFmtDate(c.getValue(), false); } }
        ];
        gKS = newGrid('gridKS', [], cols, null, function (a) { selKS = a.data; openCH(a.data); }, false);
        gKS.appendTo('#gridKS');
    }
    function load() {
        var hn = MEET.getHN(); if (!hn) { gKS.dataSource = []; return; }
        jAjax('/KhaoSat/ListKhaoSat', { IDHoiNghi: hn }, function (o) { if (o.code === 0) gKS.dataSource = o.data || []; });
    }

    function formKS(row) {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        var fields = [
            { name: 'TieuDe', label: 'Tiêu đề khảo sát', type: 'text', required: true, full: true },
            { name: 'TrangThai', label: 'Trạng thái', type: 'select', options: [{ value: 1, text: 'Đang mở' }, { value: 0, text: 'Nháp' }, { value: 2, text: 'Đã đóng' }] },
            { name: 'MoTa', label: 'Mô tả', type: 'textarea', full: true }
        ];
        meetModal({
            title: row ? 'Sửa khảo sát' : 'Thêm khảo sát', icon: 'fa-square-poll-vertical', width: 620, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, row || { TrangThai: 1 }); },
            onSave: function (b) {
                if (!meetFormValidate(b, fields)) return false;
                var d = meetFormRead(b, fields); d.IDHoiNghi = hn; if (row) d.ID = row.ID;
                jAjax('/KhaoSat/SaveKhaoSat', d, function (o) { if (o.code === 0) { meetToast('Đã lưu'); load(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function openCH(ks) {
        curKS = ks.ID;
        document.getElementById('panelCH').style.display = 'block';
        document.getElementById('ksTitle').textContent = ks.TieuDe;
        loadCH();
    }
    function loadCH() {
        jAjax('/KhaoSat/ListCauHoi', { IDKhaoSat: curKS }, function (o) {
            if (o.code !== 0) return;
            luaChonByCH = {};
            (o.data.luaChon || []).forEach(function (l) { (luaChonByCH[l.IDCauHoi] = luaChonByCH[l.IDCauHoi] || []).push(l); });
            var ch = o.data.cauHoi || [];
            document.getElementById('chList').innerHTML = ch.length ? ch.map(function (q, i) {
                var opts = (luaChonByCH[q.ID] || []).map(function (l) { return l.NoiDung; }).join(' · ');
                return '<div class="meet-panel" style="padding:12px;margin-bottom:8px"><div style="display:flex;gap:10px;align-items:flex-start">'
                    + '<span class="meet-chip">' + (i + 1) + '</span>'
                    + '<div style="flex:1"><b>' + q.NoiDung + '</b>' + (q.BatBuoc == 1 ? ' <span style="color:#c0392b">*</span>' : '')
                    + '<div class="meet-hint"><i class="fa-solid fa-tag"></i> ' + (LOAI[q.LoaiCauHoi] || '') + (opts ? ' — ' + opts : '') + '</div></div>'
                    + '<button class="btn-meet sm warn" data-ed="' + q.ID + '"><i class="fa-solid fa-pen"></i></button>'
                    + '<button class="btn-meet sm danger" data-del="' + q.ID + '"><i class="fa-solid fa-trash"></i></button>'
                    + '</div></div>';
            }).join('') : '<div class="meet-empty"><i class="fa-solid fa-circle-question"></i>Chưa có câu hỏi. Bấm "Thêm câu hỏi".</div>';
            document.querySelectorAll('#chList [data-del]').forEach(function (b) { b.onclick = function () { meetConfirm('Xóa câu hỏi?', function () { jAjax('/KhaoSat/DeleteCauHoi', { ID: b.dataset.del }, loadCH); }); }; });
            document.querySelectorAll('#chList [data-ed]').forEach(function (b) { b.onclick = function () { var q = ch.find(function (x) { return '' + x.ID === b.dataset.ed; }); formCH(q); }; });
        });
    }

    function formCH(row) {
        var fields = [
            { name: 'NoiDung', label: 'Nội dung câu hỏi', type: 'text', required: true, full: true },
            { name: 'LoaiCauHoi', label: 'Loại câu hỏi', type: 'select', options: [{ value: 1, text: 'Thang điểm 1–5' }, { value: 2, text: 'Một lựa chọn' }, { value: 3, text: 'Nhiều lựa chọn' }, { value: 4, text: 'Văn bản tự do' }] },
            { name: 'ThuTu', label: 'Thứ tự', type: 'number' },
            { name: 'BatBuoc', label: 'Bắt buộc trả lời', type: 'checkbox' }
        ];
        var optsArr = row ? (luaChonByCH[row.ID] || []).map(function (l) { return l.NoiDung; }) : [];
        var body = meetFormHtml(fields)
            + '<div id="optWrap" style="display:none;margin-top:10px"><label class="mp-label" style="color:var(--meet-muted)">Các lựa chọn</label>'
            + '<div id="optList"></div><button type="button" class="btn-meet sm ghost" id="optAdd" style="margin-top:6px"><i class="fa-solid fa-plus"></i> Thêm lựa chọn</button></div>';
        meetModal({
            title: row ? 'Sửa câu hỏi' : 'Thêm câu hỏi', icon: 'fa-circle-question', width: 600, body: body,
            onOpen: function (box) {
                meetFormInit(box, fields, row || { LoaiCauHoi: 1, ThuTu: 0 });
                function renderOpts(arr) {
                    box.querySelector('#optList').innerHTML = arr.map(function (v, i) {
                        return '<div style="display:flex;gap:6px;margin-bottom:6px"><input class="form-control opt-in" value="' + (v || '').replace(/"/g, '&quot;') + '" placeholder="Lựa chọn ' + (i + 1) + '"><button type="button" class="btn-meet sm danger opt-del"><i class="fa-solid fa-xmark"></i></button></div>';
                    }).join('');
                    box.querySelectorAll('.opt-del').forEach(function (b, i) { b.onclick = function () { arr.splice(i, 1); renderOpts(arr); box._opts = arr; }; });
                    box._opts = arr;
                }
                var arr = optsArr.slice(); box._opts = arr;
                function toggleOpts() { var l = box.querySelector('#mf_LoaiCauHoi').value; box.querySelector('#optWrap').style.display = (l == '2' || l == '3') ? 'block' : 'none'; }
                box.querySelector('#optAdd').onclick = function () { box._opts.push(''); renderOpts(box._opts); };
                box.querySelector('#mf_LoaiCauHoi').addEventListener('change', toggleOpts);
                renderOpts(arr); toggleOpts();
            },
            onSave: function (box) {
                if (!meetFormValidate(box, fields)) return false;
                var d = meetFormRead(box, fields); d.IDKhaoSat = curKS; if (row) d.ID = row.ID;
                var opts = []; box.querySelectorAll('.opt-in').forEach(function (i) { if (i.value.trim()) opts.push(i.value.trim()); });
                d.OptionsJson = JSON.stringify(opts);
                if ((d.LoaiCauHoi == 2 || d.LoaiCauHoi == 3) && opts.length < 2) { meetToast('Cần ít nhất 2 lựa chọn', true); return false; }
                jAjax('/KhaoSat/SaveCauHoi', d, function (o) { if (o.code === 0) loadCH(); else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function qrKS() {
        if (!selKS) return meetToast('Chọn khảo sát', true);
        var url = location.origin + '/meetpublic/KhaoSat?id=' + selKS.ID;
        meetModal({
            title: 'QR khảo sát', icon: 'fa-qrcode', width: 360,
            body: '<div style="text-align:center"><div id="qrK" style="display:inline-block;padding:12px;background:#fff;border-radius:10px"></div><div style="margin-top:10px;font-weight:700">' + selKS.TieuDe + '</div><div class="meet-hint" style="word-break:break-all">' + url + '</div></div>',
            onOpen: function (box) { if (typeof QRCode !== 'undefined') new QRCode(box.querySelector('#qrK'), { text: url, width: 220, height: 220 }); }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();
        document.getElementById('btnAddKS').onclick = function () { formKS(null); };
        document.getElementById('btnEditKS').onclick = function () { if (!selKS) return meetToast('Chọn khảo sát', true); formKS(selKS); };
        document.getElementById('btnDelKS').onclick = function () { if (!selKS) return meetToast('Chọn khảo sát', true); meetConfirm('Xóa khảo sát này?', function () { jAjax('/KhaoSat/DeleteKhaoSat', { ID: selKS.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); load(); document.getElementById('panelCH').style.display = 'none'; } else meetToast(o.message, true); }); }); };
        document.getElementById('btnQRKS').onclick = qrKS;
        document.getElementById('btnAddCH').onclick = function () { if (!curKS) return; formCH(null); };
    });
    document.addEventListener('meet:hn', load);
})();
