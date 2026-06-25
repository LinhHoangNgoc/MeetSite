// ===== Kiosk check-in (mobile) — quét QR (BarcodeDetector) + nhập tay =====
(function () {
    var hn = mqs('hn'), busy = false, stream = null, scanning = false;

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

    function doCheckIn(token) {
        if (busy || !token) return; busy = true;
        mAjax('/meetpublic/CheckIn', { Token: token, Kiosk: 'KIOSK-WEB' }, function (o) {
            busy = false;
            var box = document.getElementById('kResult'); box.style.display = 'block';
            if (o.code !== 0) {
                box.innerHTML = '<div class="mp-ok"><div class="ic err"><i class="fa-solid fa-xmark"></i></div>'
                    + '<div class="nm" style="color:#c0392b">Không hợp lệ</div><div class="meta">' + o.message + '</div></div>';
            } else {
                var d = o.data;
                box.innerHTML = '<div class="mp-ok"><div class="ic"><i class="fa-solid ' + (d.already ? 'fa-clock-rotate-left' : 'fa-check') + '"></i></div>'
                    + '<div class="nm">' + d.hoTen + (d.laVIP ? ' <span class="badge-vip">VIP</span>' : '') + '</div>'
                    + '<div class="meta">' + (d.maDaiBieu || '') + (d.already ? ' · đã điểm danh ' + d.thoiGian : ' · ' + d.thoiGian) + '</div>'
                    + (d.maGhe ? '<div class="mp-seat"><i class="fa-solid fa-chair"></i> Ghế ' + d.maGhe + '</div>' : '<div class="meta">Chưa xếp ghế</div>')
                    + '</div>';
                if (!hn && d) { /* lần đầu chưa biết hn -> không có counter */ }
                mToast(d.already ? 'Đại biểu đã điểm danh trước đó' : 'Điểm danh thành công!');
            }
            refreshStat();
            box.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function () { box.style.display = 'none'; }, 6000);
        });
    }

    // Camera scan qua BarcodeDetector API (Chrome/Edge Android)
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
                    if (codes && codes.length) { doCheckIn(codes[0].rawValue); }
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

    document.getElementById('kStartCam').onclick = function () { if (scanning) stopCam(); else startCam(); };
    document.getElementById('kManual').onclick = function () { doCheckIn(document.getElementById('kToken').value.trim()); document.getElementById('kToken').value = ''; };
    document.getElementById('kToken').addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('kManual').click(); });

    refreshStat(); setInterval(refreshStat, 8000);
})();
