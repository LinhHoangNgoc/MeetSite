// ===== Trang danh sách hội nghị (landing) =====
(function () {
    var all = [], diaDiemOpts = [];
    var STAT = { 0: ['Nháp', 'st-0'], 1: ['Mở đăng ký', 'st-1'], 2: ['Đang diễn ra', 'st-2'], 3: ['Đã chốt', 'st-3'] };

    function badge(t) { var x = STAT[t] || STAT[0]; return '<span class="badge-st ' + x[1] + '">' + x[0] + '</span>'; }
    function load() {
        jAjax('/HoiNghi/ListHoiNghi', {}, function (o) { if (o.code === 0) { all = o.data || []; render(); } });
        jAjax('/HoiNghi/ComboDiaDiem', {}, function (o) { diaDiemOpts = (o.code === 0 ? o.data : []).map(function (r) { return { value: r.ID, text: r.TenDiaDiem }; }); });
    }
    function filtered() {
        var q = (document.getElementById('fSearch').value || '').toLowerCase().trim();
        var st = document.getElementById('fStatus').value;
        var fr = document.getElementById('fFrom').value, to = document.getElementById('fTo').value;
        return all.filter(function (h) {
            if (st !== '' && '' + h.TrangThai !== st) return false;
            if (q && !((h.TenHoiNghi || '') + ' ' + (h.MaHoiNghi || '') + ' ' + (h.DonViToChuc || '')).toLowerCase().includes(q)) return false;
            if (fr && h.NgayBatDau && new Date(h.NgayBatDau) < new Date(fr)) return false;
            if (to && h.NgayBatDau && new Date(h.NgayBatDau) > new Date(to + 'T23:59')) return false;
            return true;
        });
    }
    function render() {
        var box = document.getElementById('hnCards'), rows = filtered();
        if (!rows.length) { box.innerHTML = '<div class="meet-empty" style="grid-column:1/-1"><i class="fa-solid fa-calendar-xmark"></i>Không có hội nghị phù hợp.</div>'; return; }
        box.innerHTML = rows.map(function (h) {
            return '<div class="hn-card"><div class="hc-band"></div><div class="hc-body">'
                + '<div class="hc-title">' + (h.TenHoiNghi || '') + '</div>'
                + '<div class="hc-code">' + (h.MaHoiNghi || '') + ' &nbsp;·&nbsp; ' + badge(h.TrangThai) + '</div>'
                + '<div class="hc-row"><i class="fa-solid fa-calendar-day"></i> ' + (meetFmtDate(h.NgayBatDau, true) || 'Chưa đặt lịch') + (h.NgayKetThuc ? ' → ' + meetFmtDate(h.NgayKetThuc, true) : '') + '</div>'
                + (h.TenDiaDiem ? '<div class="hc-row"><i class="fa-solid fa-location-dot"></i> ' + h.TenDiaDiem + '</div>' : '')
                + (h.DonViToChuc ? '<div class="hc-row"><i class="fa-solid fa-building"></i> ' + h.DonViToChuc + '</div>' : '')
                + '<div class="hc-stats"><div class="s"><b>' + (h.SoPhien || 0) + '</b> phiên</div><div class="s"><b>' + (h.SoDaiBieu || 0) + '</b> đại biểu</div></div>'
                + '</div><div class="hc-foot">'
                + '<button class="btn-meet" data-open="' + h.ID + '"><i class="fa-solid fa-arrow-right-to-bracket"></i> Mở</button>'
                + '<button class="btn-meet warn sm" data-edit="' + h.ID + '"><i class="fa-solid fa-pen"></i></button>'
                + '<button class="btn-meet danger sm" data-del="' + h.ID + '"><i class="fa-solid fa-trash"></i></button>'
                + '</div></div>';
        }).join('');
        box.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { localStorage.setItem('meet.curHN', b.dataset.open); location.href = '/HoiNghi/TongQuan'; }; });
        box.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { form(all.find(function (x) { return '' + x.ID === b.dataset.edit; })); }; });
        box.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var h = all.find(function (x) { return '' + x.ID === b.dataset.del; }); meetConfirm('Xóa hội nghị "' + h.TenHoiNghi + '"?', function () { jAjax('/HoiNghi/DeleteHoiNghi', { ID: h.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); load(); } else meetToast(o.message, true); }); }); }; });
    }

    function form(row) {
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
            title: row ? 'Sửa hội nghị' : 'Thêm hội nghị', icon: 'fa-calendar-star', width: 760, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, row || { TrangThai: 0 }); },
            onSave: function (b) {
                if (!meetFormValidate(b, fields)) return false;
                var d = meetFormRead(b, fields); if (row) d.ID = row.ID;
                jAjax('/HoiNghi/SaveHoiNghi', d, function (o) { if (o.code === 0) { meetToast('Đã lưu'); load(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        ['fSearch', 'fStatus', 'fFrom', 'fTo'].forEach(function (id) { document.getElementById(id).addEventListener('input', render); document.getElementById(id).addEventListener('change', render); });
        document.getElementById('btnReset').onclick = function () { ['fSearch', 'fStatus', 'fFrom', 'fTo'].forEach(function (id) { document.getElementById(id).value = ''; }); render(); };
        document.getElementById('btnAdd').onclick = function () { form(null); };
        // theme + dropdown + menu người dùng trên trang danh sách
        if (window.meetInitThemePanel) meetInitThemePanel('mlThemeBtn', 'mlThemePanel');
        if (window.meetInitDropdowns) meetInitDropdowns();
        if (window.meetInitUserMenu) meetInitUserMenu();
        load();
    });
})();
