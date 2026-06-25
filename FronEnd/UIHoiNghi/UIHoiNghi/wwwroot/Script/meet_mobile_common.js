// Helper gọn cho các trang mobile/kiosk (không phụ thuộc framework desktop).
window.mAjax = function (url, data, cb) {
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(data || {})
    }).then(function (r) { return r.json(); }).then(cb).catch(function () { cb({ code: 1, message: 'Lỗi kết nối máy chủ' }); });
};
window.mToast = function (msg, isErr) {
    var t = document.getElementById('mToast'); if (!t) { alert(msg); return; }
    t.textContent = msg; t.className = 'm-toast show' + (isErr ? ' err' : '');
    clearTimeout(t._t); t._t = setTimeout(function () { t.className = 'm-toast'; }, 2600);
};
window.mqs = function (k) { return new URLSearchParams(location.search).get(k) || ''; };
