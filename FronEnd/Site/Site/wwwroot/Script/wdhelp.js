/* ============================================================================
   wdhelp.js — Widget trợ giúp dùng CHUNG cho mọi view của mọi phân hệ.
   Cách dùng trong 1 view:
       <script src="/Script/wdhelp.js?v=1"></script>
       <script>
         window.WD_HELP_TITLE = 'Tên chức năng';            // (tuỳ chọn) tiêu đề modal
         window.WD_HELP = '<h4>...</h4><ol><li>...</li></ol>'; // nội dung HTML hướng dẫn
       </script>
   Tự gắn 1 nút "?" nổi góc dưới-phải + modal. Phím F1 mở, Esc đóng.
   Tự nhận theme tối (html[data-theme='dark']). An toàn khi nhúng trong iframe desktop.
   Nếu view dùng layout Kế toán (đã có nút ? riêng qua KT_HELP) thì KHÔNG cần widget này.
   ========================================================================== */
(function () {
    if (window.__wdHelpInit) return;
    window.__wdHelpInit = true;

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    function injectStyle() {
        if (document.getElementById('wdHelpStyle')) return;
        var st = document.createElement('style'); st.id = 'wdHelpStyle';
        st.textContent =
            '.wdh-fab{position:fixed;right:18px;bottom:18px;width:44px;height:44px;border-radius:50%;'
            + 'background:#2563eb;color:#fff;border:none;cursor:pointer;font-size:20px;font-weight:700;'
            + 'box-shadow:0 6px 18px rgba(37,99,235,.4);z-index:99000;display:flex;align-items:center;'
            + 'justify-content:center;opacity:.55;transition:opacity .15s,transform .15s;font-family:Arial,sans-serif;}'
            + '.wdh-fab:hover{opacity:1;transform:scale(1.06);}'
            + '.wdh-fab .wdh-tip{position:absolute;right:52px;bottom:8px;white-space:nowrap;background:#1e2736;'
            + 'color:#fff;font-size:12px;font-weight:600;padding:4px 9px;border-radius:6px;opacity:0;pointer-events:none;transition:opacity .15s;}'
            + '.wdh-fab:hover .wdh-tip{opacity:1;}'
            + '.wdh-ovl{display:none;position:fixed;inset:0;z-index:99001;background:rgba(8,18,30,.5);'
            + 'align-items:center;justify-content:center;}'
            + '.wdh-ovl.open{display:flex;}'
            + '.wdh-box{width:680px;max-width:94vw;max-height:86vh;background:#fff;border-radius:12px;'
            + 'box-shadow:0 22px 60px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;}'
            + '.wdh-h{padding:13px 18px;background:#2563eb;color:#fff;display:flex;align-items:center;gap:9px;'
            + 'font-weight:600;font-size:15px;}'
            + '.wdh-h .wdh-x{margin-left:auto;cursor:pointer;padding:2px 9px;border-radius:6px;font-size:18px;line-height:1;}'
            + '.wdh-h .wdh-x:hover{background:rgba(255,255,255,.2);}'
            + '.wdh-b{padding:18px 22px;overflow:auto;font-size:13.5px;color:#2a3942;line-height:1.65;}'
            + '.wdh-b h4{color:#1d4ed8;margin:15px 0 6px;font-size:14px;}'
            + '.wdh-b h4:first-child{margin-top:0;}'
            + '.wdh-b ol,.wdh-b ul{margin:4px 0 10px;padding-left:22px;}'
            + '.wdh-b li{margin-bottom:5px;}'
            + '.wdh-b b{color:#0a6c5e;}'
            + '.wdh-b kbd{background:#eef2f7;border:1px solid #cbd5e1;border-bottom-width:2px;border-radius:5px;'
            + 'padding:1px 6px;font-size:12px;font-family:Consolas,monospace;color:#1e293b;}'
            + '.wdh-b .tip{background:#eff6ff;border-left:3px solid #2563eb;padding:9px 13px;border-radius:0 6px 6px 0;margin:10px 0;}'
            + '.wdh-b .warn{background:#fff7ed;border-left:3px solid #f59e0b;padding:9px 13px;border-radius:0 6px 6px 0;margin:10px 0;}'
            + '.wdh-b img{max-width:100%;border:1px solid #e2e8f0;border-radius:8px;margin:8px 0;display:block;}'
            + '.wdh-b figcaption{font-size:12px;color:#64748b;text-align:center;margin:-2px 0 12px;}'
            // theme tối
            + "html[data-theme='dark'] .wdh-box{background:#23232a;color:#e6e6ea;}"
            + "html[data-theme='dark'] .wdh-b{color:#d7dbe2;}"
            + "html[data-theme='dark'] .wdh-b h4{color:#7aa7ff;}"
            + "html[data-theme='dark'] .wdh-b b{color:#5fe0cf;}"
            + "html[data-theme='dark'] .wdh-b kbd{background:#2d2d35;border-color:#45454d;color:#e6e6ea;}"
            + "html[data-theme='dark'] .wdh-b .tip{background:#16263e;}"
            + "html[data-theme='dark'] .wdh-b img{border-color:#3a3a42;}";
        document.head.appendChild(st);
    }

    function build() {
        injectStyle();
        if (document.getElementById('wdHelpFab')) return;

        var fab = document.createElement('button');
        fab.id = 'wdHelpFab'; fab.className = 'wdh-fab'; fab.type = 'button';
        fab.setAttribute('title', 'Hướng dẫn sử dụng (F1)');
        fab.innerHTML = '<span class="wdh-tip">Hướng dẫn (F1)</span>?';
        fab.addEventListener('click', open);
        document.body.appendChild(fab);

        var ovl = document.createElement('div');
        ovl.id = 'wdHelpOvl'; ovl.className = 'wdh-ovl';
        ovl.innerHTML = '<div class="wdh-box">'
            + '<div class="wdh-h"><span style="font-size:17px">?</span> <span id="wdHelpTitle">Hướng dẫn sử dụng</span>'
            + '<span class="wdh-x" id="wdHelpX">&times;</span></div>'
            + '<div class="wdh-b" id="wdHelpBody"></div></div>';
        ovl.addEventListener('click', function (e) { if (e.target === ovl) close(); });
        document.body.appendChild(ovl);
        document.getElementById('wdHelpX').addEventListener('click', close);
    }

    function defaultHelp() {
        return '<h4>Hướng dẫn chung</h4>'
            + '<p>Trang này chưa có hướng dẫn riêng. Một số thao tác phổ biến:</p>'
            + '<ul><li>Dùng các nút trên <b>thanh công cụ</b> phía trên để Thêm / Sửa / Xóa / Lưu.</li>'
            + '<li>Bấm tiêu đề cột để <b>sắp xếp</b>; ô tìm kiếm để <b>lọc</b> nhanh.</li>'
            + '<li>Bấm <kbd>F1</kbd> ở bất kỳ trang nào để mở hướng dẫn.</li></ul>'
            + '<div class="tip">Mỗi chức năng đều có nút <b>?</b> ở góc dưới-phải để xem hướng dẫn riêng.</div>';
    }

    function open() {
        build();
        var title = (typeof window.WD_HELP_TITLE === 'string' && window.WD_HELP_TITLE) ? window.WD_HELP_TITLE : 'Hướng dẫn sử dụng';
        var html = (typeof window.WD_HELP === 'string' && window.WD_HELP) ? window.WD_HELP : defaultHelp();
        // Ảnh minh họa: ưu tiên window.WD_HELP_IMG; mặc định suy từ đường dẫn -> /img/help/<route>.png.
        // Tự ẩn nếu ảnh không tồn tại (onerror).
        var imgSrc = (typeof window.WD_HELP_IMG === 'string' && window.WD_HELP_IMG) ? window.WD_HELP_IMG
            : ('/img/help/' + String(location.pathname || '').replace(/^\/+/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png');
        var imgHtml = imgSrc ? '<img class="wdh-shot" src="' + imgSrc + '" alt="" onerror="this.style.display=\'none\'"/>' : '';
        document.getElementById('wdHelpTitle').textContent = title;
        document.getElementById('wdHelpBody').innerHTML = imgHtml + html;
        document.getElementById('wdHelpOvl').classList.add('open');
    }
    function close() {
        var o = document.getElementById('wdHelpOvl'); if (o) o.classList.remove('open');
    }

    // API công khai (cho phép mở từ nút khác nếu muốn)
    window.wdHelpOpen = open;
    window.wdHelpClose = close;

    document.addEventListener('keydown', function (e) {
        if (e.key === 'F1') { e.preventDefault(); open(); }
        else if (e.key === 'Escape') close();
    });

    ready(build);
})();
