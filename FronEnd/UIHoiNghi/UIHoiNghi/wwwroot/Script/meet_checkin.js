// ===== TN3: Điểm danh desktop (live) =====
(function () {
    var grid, sel = null, timer = null;

    function build() {
        var cols = [
            textColumn('MaDaiBieu', 'Mã', 80, false),
            textColumn('HoTen', 'Họ tên', 200, false),
            textColumn('DonVi', 'Đơn vị', 220, false),
            { title: 'VIP', field: 'LaVIP', width: 60, hozAlign: 'center', headerFilter: false, formatter: function (c) { return c.getValue() == 1 ? '<span class="badge-vip">VIP</span>' : ''; } },
            textColumn('MaGhe', 'Ghế', 80, false),
            { title: 'Thời gian', field: 'ThoiGianCheckIn', width: 150, formatter: function (c) { return meetFmtDate(c.getValue(), true); } },
            { title: 'Phương thức', field: 'PhuongThuc', width: 120, headerFilter: false, formatter: function (c) { var m = { 1: 'QR', 2: 'NFC', 3: 'Khuôn mặt', 4: 'Thủ công', 5: 'CCCD' }; return m[c.getValue()] || 'QR'; } }
        ];
        grid = newGrid('gridCheckIn', [], cols, null, function (a) { sel = a.data; }, false);
        grid.appendTo('#gridCheckIn');
    }

    function refresh() {
        var hn = MEET.getHN(); if (!hn) return;
        jAjax('/CheckIn/Stats', { IDHoiNghi: hn }, function (o) {
            if (o.code === 0) {
                document.getElementById('kPresent').textContent = o.data.present;
                document.getElementById('kTotal').textContent = o.data.total;
                document.getElementById('kPercent').textContent = o.data.percent + '%';
                document.getElementById('kVip').textContent = o.data.presentVIP + '/' + o.data.totalVIP;
            }
        });
        jAjax('/CheckIn/ListCheckIn', { IDHoiNghi: hn }, function (o) { if (o.code === 0) grid.dataSource = o.data || []; });
    }

    function manual() {
        var hn = MEET.getHN(); if (!hn) return meetToast('Chọn hội nghị trước', true);
        jAjax('/CheckIn/ChuaCheckIn', { IDHoiNghi: hn }, function (o) {
            var rows = o.code === 0 ? o.data : [];
            if (!rows.length) return meetToast('Tất cả đại biểu đã điểm danh');
            var opts = rows.map(function (r) { return { value: r.ID, text: r.HoTen + ' — ' + (r.DonVi || r.MaDaiBieu) }; });
            var fields = [{ name: 'IDDaiBieu', label: 'Chọn đại biểu', type: 'select', options: opts, full: true, required: true }];
            meetModal({
                title: 'Điểm danh thủ công', icon: 'fa-user-check', width: 520, body: meetFormHtml(fields),
                onOpen: function (b) { meetFormInit(b, fields, {}); },
                onSave: function (b) {
                    var id = mmVal(b, 'IDDaiBieu'); if (!id) { meetToast('Chọn đại biểu', true); return false; }
                    jAjax('/CheckIn/ManualCheckIn', { IDDaiBieu: id, IDHoiNghi: hn }, function (o2) { if (o2.code === 0) { meetToast('Đã điểm danh'); refresh(); } else meetToast(o2.message, true); });
                    return true;
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();
        document.getElementById('btnKiosk').onclick = function () { var hn = MEET.getHN(); window.open('/meetpublic/Kiosk' + (hn ? '?hn=' + hn : ''), '_blank'); };
        document.getElementById('btnManual').onclick = manual;
        document.getElementById('btnUndo').onclick = function () {
            if (!sel) return meetToast('Chọn một dòng điểm danh', true);
            meetConfirm('Hủy điểm danh của ' + sel.HoTen + '?', function () { jAjax('/CheckIn/UndoCheckIn', { ID: sel.ID }, function (o) { if (o.code === 0) { meetToast('Đã hủy'); refresh(); } else meetToast(o.message, true); }); });
        };
        refresh();
        timer = setInterval(refresh, 5000);
    });
    document.addEventListener('meet:hn', refresh);
})();
