// ===== Phân quyền chi tiết (RBAC) =====
(function () {
    var roles = [], chucNang = [], curVT = null, gUser, selU = null;
    var ACTIONS = ['Xem', 'Them', 'Sua', 'Xoa'], ALABEL = { Xem: 'Xem', Them: 'Thêm', Sua: 'Sửa', Xoa: 'Xóa' };

    // ---- Vai trò ----
    function loadRoles() {
        jAjax('/PhanQuyen/ListVaiTro', {}, function (o) {
            roles = o.code === 0 ? o.data : [];
            document.getElementById('vtList').innerHTML = roles.map(function (r) {
                return '<div class="meet-panel vt-item" data-id="' + r.ID + '" style="padding:11px;margin-bottom:7px;cursor:pointer;' + (curVT && curVT.ID == r.ID ? 'border-color:var(--meet-primary);border-width:2px' : '') + '">'
                    + '<div style="display:flex;align-items:center;gap:8px"><b style="flex:1">' + r.TenVaiTro + '</b>'
                    + (r.Active == 0 ? '<span class="badge-st st-0">Khóa</span>' : '')
                    + '<span class="meet-chip">' + (r.SoNguoiDung || 0) + ' user</span></div>'
                    + '<div class="meet-hint">' + (r.GhiChu || r.MaVaiTro || '') + '</div>'
                    + '<div style="margin-top:6px;display:flex;gap:6px"><button class="btn-meet sm warn" data-ed="' + r.ID + '"><i class="fa-solid fa-pen"></i></button><button class="btn-meet sm danger" data-del="' + r.ID + '"><i class="fa-solid fa-trash"></i></button></div></div>';
            }).join('') || '<div class="meet-hint">Chưa có vai trò.</div>';
            document.querySelectorAll('.vt-item').forEach(function (el) {
                el.onclick = function (e) { if (e.target.closest('[data-ed],[data-del]')) return; selectRole(roles.find(function (r) { return r.ID == el.dataset.id; })); };
            });
            document.querySelectorAll('#vtList [data-ed]').forEach(function (b) { b.onclick = function () { formVT(roles.find(function (r) { return r.ID == b.dataset.ed; })); }; });
            document.querySelectorAll('#vtList [data-del]').forEach(function (b) { b.onclick = function () { meetConfirm('Xóa vai trò này?', function () { jAjax('/PhanQuyen/DeleteVaiTro', { ID: b.dataset.del }, function () { curVT = null; document.getElementById('matrixWrap').innerHTML = '<div class="meet-hint">Chọn một vai trò.</div>'; document.getElementById('vtName').textContent = '— Chọn vai trò —'; document.getElementById('btnSaveQuyen').style.display = 'none'; loadRoles(); }); }); }; });
        });
    }
    function formVT(row) {
        var fields = [
            { name: 'TenVaiTro', label: 'Tên vai trò', type: 'text', required: true, full: true },
            { name: 'MaVaiTro', label: 'Mã (tự sinh nếu trống)', type: 'text' },
            { name: 'Active', label: 'Kích hoạt', type: 'checkbox' },
            { name: 'GhiChu', label: 'Ghi chú', type: 'textarea', full: true }
        ];
        meetModal({
            title: row ? 'Sửa vai trò' : 'Thêm vai trò', icon: 'fa-users-gear', width: 560, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, row || { Active: 1 }); },
            onSave: function (b) {
                if (!meetFormValidate(b, fields)) return false;
                var d = meetFormRead(b, fields); if (row) d.ID = row.ID;
                jAjax('/PhanQuyen/SaveVaiTro', d, function (o) { if (o.code === 0) loadRoles(); else meetToast(o.message, true); });
                return true;
            }
        });
    }

    function selectRole(r) {
        curVT = r;
        document.getElementById('vtName').textContent = r.TenVaiTro;
        document.getElementById('btnSaveQuyen').style.display = '';
        loadRoles();
        jAjax('/PhanQuyen/GetQuyen', { ID: r.ID }, function (o) {
            var have = {}; (o.code === 0 ? o.data : []).forEach(function (q) { have[q.ControlKey + '|' + q.Action] = true; });
            renderMatrix(have);
        });
    }
    function renderMatrix(have) {
        var html = '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px">'
            + '<thead><tr><th style="text-align:left;padding:8px;border-bottom:2px solid var(--meet-line)">Chức năng</th>'
            + ACTIONS.map(function (a) { return '<th style="padding:8px;border-bottom:2px solid var(--meet-line);width:70px">' + ALABEL[a] + '</th>'; }).join('')
            + '<th style="width:60px;padding:8px;border-bottom:2px solid var(--meet-line)">Tất cả</th></tr></thead><tbody>';
        chucNang.forEach(function (f) {
            html += '<tr><td style="padding:8px;border-bottom:1px solid var(--meet-line)"><b>' + f.TenChucNang + '</b><div class="meet-hint">' + f.GroupKey + '</div></td>';
            ACTIONS.forEach(function (a) {
                var ck = have[f.ControlKey + '|' + a] ? 'checked' : '';
                html += '<td style="text-align:center;padding:8px;border-bottom:1px solid var(--meet-line)"><input type="checkbox" class="pq-ck" data-g="' + f.GroupKey + '" data-c="' + f.ControlKey + '" data-a="' + a + '" ' + ck + ' style="width:18px;height:18px;cursor:pointer"></td>';
            });
            html += '<td style="text-align:center;padding:8px;border-bottom:1px solid var(--meet-line)"><input type="checkbox" class="pq-all" data-c="' + f.ControlKey + '" style="width:18px;height:18px;cursor:pointer"></td></tr>';
        });
        html += '</tbody></table></div>';
        document.getElementById('matrixWrap').innerHTML = html;
        document.querySelectorAll('.pq-all').forEach(function (a) {
            a.onclick = function () { document.querySelectorAll('.pq-ck[data-c="' + a.dataset.c + '"]').forEach(function (c) { c.checked = a.checked; }); };
        });
    }
    function saveQuyen() {
        if (!curVT) return;
        var perms = [];
        document.querySelectorAll('.pq-ck:checked').forEach(function (c) { perms.push({ GroupKey: c.dataset.g, ControlKey: c.dataset.c, Action: c.dataset.a }); });
        jAjax('/PhanQuyen/SaveQuyen', { ID: curVT.ID, Perms: JSON.stringify(perms) }, function (o) { if (o.code === 0) meetToast('Đã lưu quyền cho ' + curVT.TenVaiTro); else meetToast(o.message, true); });
    }

    // ---- Người dùng ----
    function buildUser() {
        var cols = [
            textColumn('HoTen', 'Họ tên', 180, false),
            textColumn('TenDangNhap', 'Tên đăng nhập', 150, false),
            { title: 'Quản trị', field: 'Admin', width: 90, hozAlign: 'center', headerFilter: false, formatter: function (c) { return c.getValue() == 1 ? '<span class="badge-st st-2">Admin</span>' : ''; } },
            { title: 'Khóa', field: 'Khoa', width: 70, hozAlign: 'center', headerFilter: false, formatter: function (c) { return c.getValue() == 1 ? '<i class="fa-solid fa-lock" style="color:#c0392b"></i>' : ''; } },
            textColumn('VaiTro', 'Vai trò', 260, false)
        ];
        gUser = newGrid('gridUser', [], cols, null, function (a) { selU = a.data; }, false);
        gUser.appendTo('#gridUser');
    }
    function loadUser() { jAjax('/PhanQuyen/ListUser', {}, function (o) { if (o.code === 0) gUser.dataSource = o.data || []; }); }
    function formU(row) {
        var fields = [
            { name: 'HoTen', label: 'Họ tên', type: 'text', required: true },
            { name: 'TenDangNhap', label: 'Tên đăng nhập', type: 'text', required: true },
            { name: 'MatKhau', label: row ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu', type: 'text' },
            { name: 'Admin', label: 'Quản trị viên (toàn quyền)', type: 'checkbox' },
            { name: 'Khoa', label: 'Khóa tài khoản', type: 'checkbox' }
        ];
        meetModal({
            title: row ? 'Sửa người dùng' : 'Thêm người dùng', icon: 'fa-user-pen', width: 600, body: meetFormHtml(fields),
            onOpen: function (b) { meetFormInit(b, fields, row || {}); if (row) b.querySelector('#mf_TenDangNhap').setAttribute('readonly', 'readonly'); },
            onSave: function (b) {
                if (!meetFormValidate(b, fields)) return false;
                var d = meetFormRead(b, fields); if (row) d.ID = row.ID;
                jAjax('/PhanQuyen/SaveUser', d, function (o) { if (o.code === 0) { meetToast('Đã lưu'); loadUser(); } else meetToast(o.message, true); });
                return true;
            }
        });
    }
    function assignRole() {
        if (!selU) return meetToast('Chọn người dùng', true);
        jAjax('/PhanQuyen/GetUserRoles', { Username: selU.TenDangNhap }, function (o) {
            var has = (o.code === 0 ? o.data : []).map(function (r) { return r.IDVaiTro; });
            var body = '<div class="meet-hint" style="margin-bottom:8px">Chọn vai trò cho <b>' + selU.HoTen + '</b>:</div>'
                + roles.map(function (r) { return '<label class="mp-radio" style="display:flex;align-items:center;gap:10px"><input type="checkbox" value="' + r.ID + '"' + (has.indexOf(r.ID) >= 0 ? ' checked' : '') + ' style="width:18px;height:18px"> <span><b>' + r.TenVaiTro + '</b><br><small style="color:#6a7882">' + (r.GhiChu || '') + '</small></span></label>'; }).join('');
            meetModal({
                title: 'Gán vai trò', icon: 'fa-user-tag', width: 520, body: body,
                onSave: function (box) {
                    var ids = []; box.querySelectorAll('input:checked').forEach(function (c) { ids.push(Number(c.value)); });
                    jAjax('/PhanQuyen/SaveUserRoles', { Username: selU.TenDangNhap, RoleIds: JSON.stringify(ids) }, function (o2) { if (o2.code === 0) { meetToast('Đã gán vai trò'); loadUser(); } else meetToast(o2.message, true); });
                    return true;
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        jAjax('/PhanQuyen/ListChucNang', {}, function (o) { chucNang = o.code === 0 ? o.data : []; loadRoles(); });
        buildUser(); loadUser();
        document.getElementById('btnAddVT').onclick = function () { formVT(null); };
        document.getElementById('btnSaveQuyen').onclick = saveQuyen;
        document.getElementById('btnAddU').onclick = function () { formU(null); };
        document.getElementById('btnEditU').onclick = function () { if (!selU) return meetToast('Chọn người dùng', true); formU(selU); };
        document.getElementById('btnRoleU').onclick = assignRole;
        document.getElementById('btnDelU').onclick = function () { if (!selU) return meetToast('Chọn người dùng', true); meetConfirm('Xóa người dùng ' + selU.HoTen + '?', function () { jAjax('/PhanQuyen/DeleteUser', { ID: selU.ID }, function (o) { if (o.code === 0) { meetToast('Đã xóa'); loadUser(); } else meetToast(o.message, true); }); }); };
        document.querySelectorAll('.meet-tab').forEach(function (t) {
            t.onclick = function () {
                document.querySelectorAll('.meet-tab').forEach(function (x) { x.classList.remove('active'); });
                document.querySelectorAll('.meet-tabpane').forEach(function (x) { x.classList.remove('active'); });
                t.classList.add('active'); document.getElementById('pane-' + t.dataset.tab).classList.add('active');
            };
        });
    });
})();
