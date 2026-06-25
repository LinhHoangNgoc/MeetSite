// ===== TN6: Báo cáo & KPI =====
(function () {
    function card(icon, color, val, label, sub) {
        return '<div class="meet-kpi"><div class="k-ic" style="background:' + color + '"><i class="fa-solid ' + icon + '"></i></div>'
            + '<div class="k-val">' + val + '</div><div class="k-lb">' + label + (sub ? ' <span style="color:#9aa3ab">· ' + sub + '</span>' : '') + '</div></div>';
    }
    function chartPanel(id, title, icon) {
        return '<div class="meet-panel"><h3><i class="fa-solid ' + icon + '"></i> ' + title + '</h3><div id="' + id + '" style="height:300px"></div></div>';
    }
    function paint(id, type, rows, valField, nameField) {
        var el = document.getElementById(id); if (!el) return;
        if (!rows || !rows.length) { el.innerHTML = '<div class="meet-empty"><i class="fa-solid fa-chart-simple"></i>Chưa có dữ liệu.</div>'; return; }
        if (typeof PaintBase !== 'function') { el.textContent = 'Không tải được thư viện biểu đồ'; return; }
        var data = rows.map(function (r) { return { xValue: r[nameField], yValue: Math.round((Number(r[valField]) || 0) * 100) / 100, sValue: '' }; });
        PaintBase(id, type, data, '');
    }

    function render(d) {
        var b = document.getElementById('bcBody');
        if (!d || !d.hasData) { b.innerHTML = '<div class="meet-empty"><i class="fa-solid fa-chart-pie"></i>Chưa chọn hội nghị hoặc chưa có dữ liệu.</div>'; return; }
        var sao = d.avgHaiLong ? d.avgHaiLong.toFixed(2) + '/5' : '—';
        var html = '<div class="meet-cards" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr));margin-bottom:14px">'
            + card('fa-user-check', '#0a8f7e', d.coMat + '/' + d.dangKy, 'Tham dự thực tế', d.tyLeThamDu + '%')
            + card('fa-list-check', '#0f6e9c', d.soPhien, 'Phiên họp')
            + card('fa-folder-open', '#7d5bb0', d.luotXemTL, 'Lượt xem tài liệu', d.soTaiLieu + ' tài liệu')
            + card('fa-paper-plane', '#0a6c5e', d.tinDaGui, 'Tin đã gửi')
            + card('fa-face-smile', '#c08a1e', sao, 'Mức hài lòng TB')
            + '</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px">'
            + chartPanel('chCi', 'Điểm danh theo phiên', 'fa-chart-column')
            + chartPanel('chNhom', 'Cơ cấu đại biểu theo nhóm', 'fa-chart-pie')
            + chartPanel('chTL', 'Lượt xem tài liệu', 'fa-chart-bar')
            + chartPanel('chKS', 'Điểm hài lòng theo tiêu chí', 'fa-star-half-stroke')
            + '</div>';
        b.innerHTML = html;
        paint('chCi', 'bar', d.ciTheoPhien, 'N', 'Ten');
        paint('chNhom', 'pie', d.theoNhom, 'N', 'Ten');
        paint('chTL', 'bar', d.xemTaiLieu, 'N', 'Ten');
        paint('chKS', 'bar', d.diemKhaoSat, 'Diem', 'Ten');
    }

    function load(id) {
        if (!id) { render({ hasData: false }); return; }
        jAjax('/BaoCao/Kpi', { IDHoiNghi: id }, function (o) { render(o && o.code === 0 ? o.data : { hasData: false }); });
    }
    document.addEventListener('meet:hn', function (e) { load(e.detail); });
    if (window.MEET && MEET.ready) load(MEET.getHN());
})();
