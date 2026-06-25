// ===== TN2: Sơ đồ chỗ ngồi kéo-thả =====
(function () {
    var soDo = null, seats = [], chuaXep = [], canvas, stage, locked = false, dragDbId = 0;

    function load() {
        var hn = MEET.getHN();
        if (!hn) { if (canvas) clearCanvas(); return; }
        jAjax('/SoDo/GetSoDo', { IDHoiNghi: hn }, function (o) {
            if (o.code !== 0) { meetToast(o.message, true); return; }
            soDo = o.data.soDo; seats = o.data.ghe || []; chuaXep = o.data.chuaXep || [];
            locked = (soDo.DaChot == 1 || soDo.DaChot === true);
            render();
        });
    }
    function clearCanvas() { canvas.querySelectorAll('.seat').forEach(function (e) { e.remove(); }); }

    function render() {
        canvas.style.width = (soDo.RongCanvas || 1000) + 'px';
        canvas.style.height = (soDo.CaoCanvas || 640) + 'px';
        clearCanvas();
        seats.forEach(addSeatEl);
        renderSide();
        document.getElementById('lblLock').style.display = locked ? '' : 'none';
        var lb = document.getElementById('btnLock');
        lb.innerHTML = locked ? '<i class="fa-solid fa-lock-open"></i> Mở sơ đồ' : '<i class="fa-solid fa-lock"></i> Chốt sơ đồ';
        var assigned = seats.filter(function (s) { return s.IDDaiBieu; }).length;
        document.getElementById('seatStat').textContent = assigned + '/' + seats.length + ' ghế đã xếp';
    }

    function addSeatEl(s) {
        var el = document.createElement('div');
        el.className = 'seat' + (s.IDDaiBieu ? ' assigned' : '') + (s.LoaiGhe == 1 || s.LaVIP == 1 ? ' vip' : '');
        el.style.left = (s.ToaDoX || 0) + 'px'; el.style.top = (s.ToaDoY || 0) + 'px';
        el.dataset.id = s.ID;
        el.innerHTML = s.IDDaiBieu
            ? '<div class="seat-nm">' + shortName(s.HoTen) + '</div>'
            : (s.MaGhe || '');
        el.title = (s.MaGhe || '') + (s.HoTen ? ' — ' + s.HoTen : '');
        // drop target (HTML5) cho đại biểu
        el.addEventListener('dragover', function (e) { if (dragDbId && !locked) { e.preventDefault(); el.classList.add('dragover'); } });
        el.addEventListener('dragleave', function () { el.classList.remove('dragover'); });
        el.addEventListener('drop', function (e) {
            e.preventDefault(); el.classList.remove('dragover');
            if (dragDbId && !locked) assign(s.ID, dragDbId);
        });
        // mousedown -> di chuyển ghế hoặc mở menu
        el.addEventListener('mousedown', function (e) { if (e.button !== 0) return; startSeatDrag(e, s, el); });
        canvas.appendChild(el);
    }

    function shortName(n) { if (!n) return ''; var p = n.trim().split(' '); return p.length > 1 ? p[p.length - 2].charAt(0) + '.' + p[p.length - 1] : n; }

    function renderSide() {
        var list = document.getElementById('chuaXepList');
        document.getElementById('cntChuaXep').textContent = chuaXep.length;
        list.innerHTML = chuaXep.length ? chuaXep.map(function (d) {
            return '<div class="db-chip' + (d.LaVIP == 1 ? ' vip' : '') + '" draggable="true" data-id="' + d.ID + '">'
                + '<span class="dot" style="background:' + (d.MauSac || '#9aa3ab') + '"></span>'
                + '<span style="flex:1">' + d.HoTen + (d.LaVIP == 1 ? ' <span class="badge-vip">VIP</span>' : '') + '</span></div>';
        }).join('') : '<div class="meet-hint" style="padding:10px">Tất cả đại biểu đã được xếp ghế. 🎉</div>';
        list.querySelectorAll('.db-chip').forEach(function (c) {
            c.addEventListener('dragstart', function () { dragDbId = Number(c.dataset.id); c.style.opacity = .4; });
            c.addEventListener('dragend', function () { dragDbId = 0; c.style.opacity = 1; });
        });
    }

    function assign(idGhe, idDB) {
        jAjax('/SoDo/AssignGhe', { IDGhe: idGhe, IDDaiBieu: idDB }, function (o) { if (o.code === 0) load(); else meetToast(o.message, true); });
    }

    // ---- di chuyển ghế bằng chuột (phân biệt click vs drag) ----
    function startSeatDrag(e, s, el) {
        if (locked) { seatMenu(s, el, e); return; }
        var rect = canvas.getBoundingClientRect();
        var ox = e.clientX - rect.left - (s.ToaDoX || 0), oy = e.clientY - rect.top - (s.ToaDoY || 0);
        var moved = false, nx = s.ToaDoX, ny = s.ToaDoY;
        function mm(ev) {
            var x = ev.clientX - rect.left - ox, y = ev.clientY - rect.top - oy;
            if (Math.abs(x - s.ToaDoX) > 3 || Math.abs(y - s.ToaDoY) > 3) moved = true;
            nx = Math.max(0, Math.round(x)); ny = Math.max(0, Math.round(y));
            el.style.left = nx + 'px'; el.style.top = ny + 'px';
        }
        function mu() {
            document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu);
            if (moved) { s.ToaDoX = nx; s.ToaDoY = ny; jAjax('/SoDo/MoveGhe', { ID: s.ID, ToaDoX: nx, ToaDoY: ny }, function () { }); }
            else seatMenu(s, el, e);
        }
        document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
    }

    // ---- menu khi click ghế ----
    function seatMenu(s, el, e) {
        closeMenu();
        var m = document.createElement('div'); m.className = 'wd-ctxmenu'; m.id = 'seatMenu';
        m.style.cssText = 'position:fixed;z-index:120000;background:#fff;border:1px solid #d8e0e5;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.22);padding:6px;min-width:180px';
        var items = [];
        items.push(['fa-pen', 'Đổi mã ghế', function () { var nv = prompt('Mã ghế:', s.MaGhe || ''); if (nv != null) saveGhe(s, { MaGhe: nv }); }]);
        items.push([s.LoaiGhe == 1 ? 'fa-chair' : 'fa-star', s.LoaiGhe == 1 ? 'Đổi thành ghế thường' : 'Đánh dấu ghế VIP', function () { saveGhe(s, { LoaiGhe: s.LoaiGhe == 1 ? 0 : 1 }); }]);
        if (s.IDDaiBieu) items.push(['fa-user-minus', 'Bỏ đại biểu khỏi ghế', function () { assign(s.ID, 0); }]);
        if (!locked) items.push(['fa-trash', 'Xóa ghế', function () { meetConfirm('Xóa ghế ' + (s.MaGhe || '') + '?', function () { jAjax('/SoDo/DeleteGhe', { ID: s.ID, IDSoDo: soDo.ID }, function (o) { if (o.code === 0) load(); else meetToast(o.message, true); }); }); }]);
        m.innerHTML = items.map(function (it, i) { return '<div data-i="' + i + '" style="display:flex;gap:10px;align-items:center;padding:8px 12px;cursor:pointer;border-radius:7px;font-size:13.5px"><i class="fa-solid ' + it[0] + '" style="width:16px;color:#5b6b73"></i>' + it[1] + '</div>'; }).join('');
        document.body.appendChild(m);
        var x = Math.min(e.clientX, window.innerWidth - 200), y = Math.min(e.clientY, window.innerHeight - (items.length * 40 + 20));
        m.style.left = x + 'px'; m.style.top = y + 'px';
        m.querySelectorAll('[data-i]').forEach(function (d) {
            d.onmouseenter = function () { d.style.background = '#eef3f6'; }; d.onmouseleave = function () { d.style.background = ''; };
            d.onclick = function () { closeMenu(); items[Number(d.dataset.i)][2](); };
        });
        setTimeout(function () { document.addEventListener('mousedown', closeMenuOnce, true); }, 0);
    }
    function closeMenu() { var m = document.getElementById('seatMenu'); if (m) m.remove(); document.removeEventListener('mousedown', closeMenuOnce, true); }
    function closeMenuOnce(e) { if (!e.target.closest('#seatMenu')) closeMenu(); }
    function saveGhe(s, ch) {
        var d = { ID: s.ID, MaGhe: ch.MaGhe != null ? ch.MaGhe : s.MaGhe, LoaiGhe: ch.LoaiGhe != null ? ch.LoaiGhe : (s.LoaiGhe || 0) };
        jAjax('/SoDo/SaveGhe', d, function (o) { if (o.code === 0) load(); else meetToast(o.message, true); });
    }

    function genSeats() {
        if (!soDo) return meetToast('Chọn hội nghị trước', true);
        if (locked) return meetToast('Sơ đồ đã chốt', true);
        var fields = [{ name: 'Rows', label: 'Số hàng', type: 'number' }, { name: 'Cols', label: 'Số ghế / hàng', type: 'number' }];
        meetModal({
            title: 'Sinh lưới ghế', icon: 'fa-table-cells', width: 420, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, { Rows: 6, Cols: 10 }); },
            onSave: function (b) {
                var d = meetFormRead(b, fields);
                jAjax('/SoDo/GenSeats', { IDSoDo: soDo.ID, Rows: Number(d.Rows) || 0, Cols: Number(d.Cols) || 0 }, function (o) { if (o.code === 0) load(); else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function addSeatAt(x, y) {
        if (!soDo) return meetToast('Chọn hội nghị trước', true);
        if (locked) return meetToast('Sơ đồ đã chốt', true);
        jAjax('/SoDo/AddGhe', { IDSoDo: soDo.ID, MaGhe: 'G' + (seats.length + 1), ToaDoX: Math.max(0, Math.round(x - 19)), ToaDoY: Math.max(0, Math.round(y - 19)), LoaiGhe: 0 }, function (o) { if (o.code === 0) load(); else meetToast(o.message, true); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        canvas = document.getElementById('sodoCanvas'); stage = document.getElementById('sodoStage');
        // Chèn ghế tự do: double-click lên vùng trống của canvas để đặt 1 ghế tại đúng vị trí đó
        canvas.addEventListener('dblclick', function (e) {
            if (e.target.closest('.seat') || e.target.closest('.sodo-stagebar')) return;
            var rect = canvas.getBoundingClientRect();
            addSeatAt(e.clientX - rect.left, e.clientY - rect.top);
        });
        document.getElementById('btnGen').onclick = genSeats;
        document.getElementById('btnAddSeat').onclick = function () {
            if (!soDo) return meetToast('Chọn hội nghị trước', true);
            if (locked) return meetToast('Sơ đồ đã chốt', true);
            jAjax('/SoDo/AddGhe', { IDSoDo: soDo.ID, MaGhe: 'G' + (seats.length + 1), ToaDoX: 80 + (seats.length % 8) * 46, ToaDoY: 90, LoaiGhe: 0 }, function (o) { if (o.code === 0) load(); else meetToast(o.message, true); });
        };
        document.getElementById('btnLock').onclick = function () {
            if (!soDo) return;
            meetConfirm(locked ? 'Mở khóa sơ đồ để chỉnh sửa?' : 'Chốt sơ đồ? Sau khi chốt sẽ khóa chỉnh sửa.', function () {
                jAjax('/SoDo/ChotSoDo', { ID: soDo.ID, Chot: !locked }, function (o) { if (o.code === 0) load(); else meetToast(o.message, true); });
            });
        };
        // thả đại biểu ra panel để bỏ ghế (kéo từ ghế thì dùng menu); panel cũng nhận drop để no-op
        load();
    });
    document.addEventListener('meet:hn', load);
})();
