// Tổng quan hội nghị — KPI + biểu đồ check-in theo phiên.
(function () {
    function card(icon, color, val, label) {
        return '<div class="meet-kpi"><div class="k-ic" style="background:' + color + '"><i class="fa-solid ' + icon + '"></i></div>'
            + '<div class="k-val">' + val + '</div><div class="k-lb">' + label + '</div></div>';
    }
    function render(d) {
        var body = document.getElementById('meetHomeBody');
        if (!d || !d.hasData) {
            body.innerHTML = '<div class="meet-empty"><i class="fa-solid fa-calendar-plus"></i>'
                + 'Chưa chọn hội nghị. Hãy tạo hoặc chọn một hội nghị để bắt đầu.<br><br>'
                + '<a class="btn-meet" href="/HoiNghi/DanhSach"><i class="fa-solid fa-plus"></i> Tạo / Quản lý hội nghị</a></div>';
            return;
        }
        var html = '<div class="meet-cards">'
            + card('fa-list-check', '#0a6c5e', d.soPhien, 'Phiên họp')
            + card('fa-user-group', '#0f6e9c', d.soDaiBieu, 'Đại biểu')
            + card('fa-qrcode', '#0a8f7e', d.soCheckIn + ' <span style="font-size:15px;color:#64747e">(' + d.tyLeCheckIn + '%)</span>', 'Đã điểm danh')
            + card('fa-star', '#c08a1e', d.soVIP, 'Đại biểu VIP')
            + card('fa-folder-open', '#7d5bb0', d.soTaiLieu, 'Tài liệu')
            + card('fa-square-poll-vertical', '#b0445b', d.soKhaoSat, 'Khảo sát')
            + '</div>';
        html += '<div class="meet-panel" style="margin-top:16px"><h3><i class="fa-solid fa-chart-column"></i> Điểm danh theo phiên</h3>'
            + '<div id="meetHomeChart" style="height:300px"></div></div>';
        html += '<div class="meet-panel"><h3><i class="fa-solid fa-bolt"></i> Lối tắt</h3>'
            + '<div class="meet-toolbar">'
            + '<a class="btn-meet" href="/DaiBieu"><i class="fa-solid fa-user-plus"></i> Quản lý đại biểu</a>'
            + '<a class="btn-meet warn" href="/SoDo"><i class="fa-solid fa-chair"></i> Xếp sơ đồ ghế</a>'
            + '<a class="btn-meet sec" href="/CheckIn"><i class="fa-solid fa-qrcode"></i> Màn hình điểm danh</a>'
            + '<a class="btn-meet ghost" href="/BaoCao"><i class="fa-solid fa-chart-pie"></i> Báo cáo KPI</a>'
            + '</div></div>';
        body.innerHTML = html;
        // Biểu đồ
        var rows = d.checkInTheoPhien || [];
        if (rows.length && typeof PaintBase === 'function') {
            var data = rows.map(function (r) { return { xValue: r.Ten, yValue: Number(r.SoLuong) || 0, sValue: 'Điểm danh' }; });
            PaintBase('meetHomeChart', 'bar', data, '');
        } else {
            document.getElementById('meetHomeChart').innerHTML = '<div class="meet-empty"><i class="fa-solid fa-chart-simple"></i>Chưa có dữ liệu điểm danh.</div>';
        }
    }
    function loadData(id) {
        if (!id) { render({ hasData: false }); return; }
        jAjax('/HoiNghi/DashboardData', { IDHoiNghi: id }, function (obj) {
            render(obj && obj.code === 0 ? obj.data : { hasData: false });
        });
    }
    document.addEventListener('meet:hn', function (e) { loadData(e.detail); });
    if (window.MEET && MEET.ready) loadData(MEET.getHN());
})();
