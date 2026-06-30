// ===== Kiosk check-in (mobile) — đa phương thức: QR / NFC / CCCD / Khuôn mặt (mô phỏng) =====
(function () {
    var hn = mqs('hn'), busy = false, stream = null, scanning = false, faceRows = [];

    function refreshStat() {
        if (!hn) return;
        mAjax('/meetpublic/Stats', { IDHoiNghi: hn }, function (o) {
            if (o.code === 0) {
                document.getElementById('kStat').style.display = 'flex';
                document.getElementById('kPresent').textContent = o.data.present;
                document.getElementById('kTotal').textContent = o.data.total;
                document.getElementById('kPercent').textContent = o.data.percent + '%';
            }
        });
    }

    var PT = { 1: 'QR', 2: 'NFC', 3: 'Khuôn mặt', 5: 'CCCD' };

    // Gửi điểm danh đa phương thức. payload: { PhuongThuc, GiaTri?, IDDaiBieu? }
    function submit(payload) {
        if (busy) return; busy = true;
        payload.Kiosk = 'KIOSK-WEB'; if (hn) payload.IDHoiNghi = hn;
        mAjax('/meetpublic/CheckInDinhDanh', payload, function (o) {
            busy = false;
            var box = document.getElementById('kResult'); box.style.display = 'block';
            if (o.code !== 0) {
                box.innerHTML = '<div class="mp-ok"><div class="ic err"><i class="fa-solid fa-xmark"></i></div>'
                    + '<div class="nm" style="color:#c0392b">Không hợp lệ</div><div class="meta">' + o.message + '</div></div>';
            } else {
                var d = o.data;
                box.innerHTML = '<div class="mp-ok"><div class="ic"><i class="fa-solid ' + (d.already ? 'fa-clock-rotate-left' : 'fa-check') + '"></i></div>'
                    + '<div class="nm">' + d.hoTen + (d.laVIP ? ' <span class="badge-vip">VIP</span>' : '') + '</div>'
                    + '<div class="meta">' + (d.maDaiBieu || '') + ' · ' + (PT[d.phuongThuc] || '') + (d.already ? ' · đã điểm danh ' + d.thoiGian : ' · ' + d.thoiGian) + '</div>'
                    + (d.maGhe ? '<div class="mp-seat"><i class="fa-solid fa-chair"></i> Ghế ' + d.maGhe + '</div>' : '<div class="meta">Chưa xếp ghế</div>')
                    + '</div>';
                mToast(d.already ? 'Đại biểu đã điểm danh trước đó' : 'Điểm danh thành công!');
                if (faceRows.length) loadFaces(); // cập nhật trạng thái gallery
            }
            refreshStat();
            box.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function () { box.style.display = 'none'; }, 6000);
        });
    }

    // ===== QR camera (BarcodeDetector) =====
    function startCam() {
        var hint = document.getElementById('kCamHint');
        if (!('BarcodeDetector' in window)) { hint.textContent = 'Thiết bị không hỗ trợ quét tự động — vui lòng nhập thủ công.'; return; }
        var reader = document.getElementById('mpReader');
        var video = document.createElement('video'); video.setAttribute('playsinline', ''); video.style.width = '100%';
        reader.innerHTML = ''; reader.appendChild(video);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
            stream = s; video.srcObject = s; video.play(); scanning = true;
            document.getElementById('kStartCam').innerHTML = '<i class="fa-solid fa-stop"></i> Dừng camera';
            var det = new BarcodeDetector({ formats: ['qr_code'] });
            (function loop() {
                if (!scanning) return;
                det.detect(video).then(function (codes) {
                    if (codes && codes.length) submit({ PhuongThuc: 1, GiaTri: codes[0].rawValue });
                }).catch(function () { });
                setTimeout(loop, 600);
            })();
        }).catch(function () { hint.textContent = 'Không truy cập được camera. Hãy cấp quyền hoặc nhập thủ công.'; });
    }
    function stopCam() {
        scanning = false; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
        document.getElementById('mpReader').innerHTML = '';
        document.getElementById('kStartCam').innerHTML = '<i class="fa-solid fa-camera"></i> Bật camera quét';
    }

    // ===== Khuôn mặt (mô phỏng): gallery đại biểu =====
    function loadFaces() {
        if (!hn) { document.getElementById('kFaceList').innerHTML = '<div class="mp-hint" style="padding:8px">Mở kiosk kèm ?hn=… để dùng nhận diện.</div>'; return; }
        mAjax('/meetpublic/DanhSachKhuonMat', { IDHoiNghi: hn }, function (o) {
            faceRows = (o.code === 0 ? o.data : []);
            renderFaces(document.getElementById('kFaceSearch').value.trim().toLowerCase());
        });
    }
    function initials(name) { var p = (name || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[p.length - 1] || '')[0] || ''); }
    function renderFaces(kw) {
        var rows = kw ? faceRows.filter(function (r) { return (r.HoTen || '').toLowerCase().indexOf(kw) >= 0; }) : faceRows;
        var el = document.getElementById('kFaceList');
        el.innerHTML = rows.length ? rows.map(function (r) {
            return '<button class="k-face' + (r.DaCheckIn ? ' done' : '') + '" data-id="' + r.ID + '">'
                + '<span class="av">' + initials(r.HoTen) + '</span>'
                + '<span class="nm">' + r.HoTen + '</span>'
                + '<span class="dv">' + (r.DonVi || '') + '</span>'
                + (r.DaCheckIn ? '<span class="ck"><i class="fa-solid fa-check"></i></span>' : '')
                + '</button>';
        }).join('') : '<div class="mp-hint" style="padding:8px">Không có đại biểu phù hợp.</div>';
        el.querySelectorAll('[data-id]').forEach(function (b) {
            b.onclick = function () { submit({ PhuongThuc: 3, IDDaiBieu: b.dataset.id }); };
        });
    }

    // ===== Tabs =====
    function switchTab(m) {
        document.querySelectorAll('.k-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.m === m); });
        document.querySelectorAll('.k-pane').forEach(function (p) { p.style.display = p.dataset.pane === m ? 'block' : 'none'; });
        if (m !== 'qr' && scanning) stopCam();
        if (m === 'face' && !faceRows.length) loadFaces();
    }
    document.querySelectorAll('.k-tab').forEach(function (t) { t.onclick = function () { switchTab(t.dataset.m); }; });

    // ===== Wire up =====
    document.getElementById('kStartCam').onclick = function () { if (scanning) stopCam(); else startCam(); };
    document.getElementById('kManual').onclick = function () { var v = document.getElementById('kToken').value.trim(); if (v) submit({ PhuongThuc: 1, GiaTri: v }); document.getElementById('kToken').value = ''; };
    document.getElementById('kToken').addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('kManual').click(); });
    document.getElementById('kNfcBtn').onclick = function () { var v = document.getElementById('kNfc').value.trim(); if (v) submit({ PhuongThuc: 2, GiaTri: v }); document.getElementById('kNfc').value = ''; };
    document.getElementById('kNfc').addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('kNfcBtn').click(); });
    document.getElementById('kCccdBtn').onclick = function () { var v = document.getElementById('kCccd').value.trim(); if (v) submit({ PhuongThuc: 5, GiaTri: v }); document.getElementById('kCccd').value = ''; };
    document.getElementById('kCccd').addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('kCccdBtn').click(); });
    document.getElementById('kFaceSearch').addEventListener('input', function () { renderFaces(this.value.trim().toLowerCase()); });
    document.getElementById('kFaceScan').onclick = function () {
        var pending = faceRows.filter(function (r) { return !r.DaCheckIn; });
        if (!pending.length) return mToast('Không còn đại biểu để nhận diện', true);
        var pick = pending[Math.floor(pending.length * (Date.now() % 1000) / 1000)] || pending[0];
        mToast('Đã nhận diện: ' + pick.HoTen);
        submit({ PhuongThuc: 3, IDDaiBieu: pick.ID });
    };

    refreshStat(); setInterval(refreshStat, 8000);
})();
