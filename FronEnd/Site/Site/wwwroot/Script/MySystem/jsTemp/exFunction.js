let dlgDialogDashboard;
let questionToasDashboard;
function XemHoSo(obj) {
    $('#ifrDialogLink').attr('src', '/HoSoCaNhan/makcb/' + obj.makcb);
    dlgDialogDashboard = dialogDiv('divDialogDashboard', 'prDialogDashboard', 'Hồ sơ cá nhân', '100%', '100vh', dlgDialogDashboard, function () {
        $('#ifrDialogLink').height($('#prDialogDashboard').height() - 70);
    });
}
function GoiBenhNhan(obj) {
    questionToasDashboard = questionToas(null, 'Có gọi được bệnh nhân không?', 'Gọi bệnh nhân', function () {
        CallKhamBenh(obj); questionToasDashboard.hide();
    }, function () { questionToasDashboard.hide() });
}
function CallKhamBenh(obj) {
    $('#ifrDialogLink').attr('src', '/ManHinhKham/makcb/' + obj.makcb);
    dlgDialogDashboard = dialogDiv('divDialogDashboard', 'prDialogDashboard', 'Khám bệnh', '100%', '100vh', dlgDialogDashboard, function () {
        $('#ifrDialogLink').height($('#prDialogDashboard').height() - 70);
    });
}
function CallKeDon(obj) {
    $('#ifrDialogLink').attr('src', '/ManHinhKeDon/makcb/' + obj.makcb);
    dlgDialogDashboard = dialogDiv('divDialogDashboard', 'prDialogDashboard', 'Khám bệnh', '100%', '100vh', dlgDialogDashboard, function () {
        $('#ifrDialogLink').height($('#prDialogDashboard').height() - 70);
    });
}
function SuaDangKy(obj) {
    alert(obj["makcb"]);
}

/* ===================================================================
 * WDModal — phóng to / đổi kích thước / kéo di chuyển cho MỌI modal popup,
 * nhớ lại vị trí & kích thước THEO MÁY (localStorage). Tự phát hiện modal
 * (overlay fixed phủ toàn màn + thẻ card bên trong) qua đổi style/class,
 * không cần sửa từng module.
 * =================================================================== */
(function () {
    "use strict";
    if (window.__wdModalInit) return; window.__wdModalInit = true;
    var STORE = "wd_modal_geom_v1";
    function allGeom() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
    function saveGeom(k, g) { try { var a = allGeom(); if (g) a[k] = g; else delete a[k]; localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) { } }
    function getGeom(k) { try { return allGeom()[k]; } catch (e) { return null; } }
    function keyFor(box) {
        var id = box.id || box.getAttribute("data-wd") || (box.className || "").toString().split(/\s+/)[0] || "modal";
        return (location.pathname + "|" + id).toLowerCase();
    }
    function bgAlpha(c) { var m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return 1; var p = m[1].split(",").map(function (s) { return s.trim(); }); return p.length >= 4 ? parseFloat(p[3]) : 1; }
    function overlayShown(el) {
        if (!el || el.nodeType !== 1 || el === document.body) return false;
        var cs = getComputedStyle(el);
        if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
        // Chỉ nhận "backdrop" của modal: canh giữa kiểu flex HOẶC nền mờ phủ — loại trừ cửa sổ web-desktop.
        var centered = cs.display.indexOf("flex") >= 0 && (cs.justifyContent || "").indexOf("center") >= 0 && (cs.alignItems || "").indexOf("center") >= 0;
        var a = bgAlpha(cs.backgroundColor); var translucent = a > 0.03 && a < 0.98;
        if (!centered && !translucent) return false;
        var r = el.getBoundingClientRect();
        return r.width >= window.innerWidth * 0.85 && r.height >= window.innerHeight * 0.85 && el.children.length >= 1;
    }
    function pickBox(overlay) {
        // Lấy đúng "card" của modal: nếu con là wrapper phủ gần full màn -> chui vào trong tìm card thật.
        var best = null, ba = 0;
        function scan(el, depth) {
            if (depth > 3 || !el.children) return;
            for (var i = 0; i < el.children.length; i++) {
                var c = el.children[i]; if (c.nodeType !== 1) continue;
                var cs = getComputedStyle(c); if (cs.display === "none") continue;
                var r = c.getBoundingClientRect(); var a = r.width * r.height;
                if (r.width >= 240 && r.height >= 120 && r.width < window.innerWidth * 0.985 && r.height < window.innerHeight * 0.985) { if (a > ba) { ba = a; best = c; } }
                else if (r.width >= window.innerWidth * 0.985 || r.height >= window.innerHeight * 0.985) { scan(c, depth + 1); }
            }
        }
        scan(overlay, 0);
        return best;
    }
    function pickHeader(box) {
        return box.querySelector('[class*="modal-h"],[class*="modal-head"],.modal-header,header') || box.firstElementChild || box;
    }
    function curGeom(box) {
        var st = box.__wd || {};
        return { dx: st.dx || 0, dy: st.dy || 0, w: parseInt(box.style.width) || Math.round(box.getBoundingClientRect().width), h: parseInt(box.style.height) || Math.round(box.getBoundingClientRect().height), max: !!st.max };
    }
    function applyGeom(box, g) {
        if (!g) return;
        box.style.maxWidth = "none"; box.style.maxHeight = "none";
        if (g.max) {
            var ov = box.parentElement; var ow = (ov ? ov.clientWidth : window.innerWidth), oh = (ov ? ov.clientHeight : window.innerHeight);
            box.style.width = Math.max(320, ow - 16) + "px"; box.style.height = Math.max(200, oh - 16) + "px"; box.style.transform = "translate(0px,0px)";
            box.__wd.max = true; box.__wd.dx = 0; box.__wd.dy = 0;
        } else {
            if (g.w) box.style.width = g.w + "px"; if (g.h) box.style.height = g.h + "px";
            box.style.transform = "translate(" + (g.dx || 0) + "px," + (g.dy || 0) + "px)";
            box.__wd.max = false; box.__wd.dx = g.dx || 0; box.__wd.dy = g.dy || 0;
        }
    }
    function enhance(box) {
        if (box.__wdEnhanced) { applyGeom(box, getGeom(keyFor(box))); return; }
        box.__wdEnhanced = true; box.__wd = { dx: 0, dy: 0, max: false };
        var key = keyFor(box);
        if (getComputedStyle(box).position === "static") box.style.position = "relative";
        box.style.willChange = "transform";
        var header = pickHeader(box);
        if (header && header !== box) { header.style.cursor = "move"; header.style.userSelect = "none"; }

        // Nút phóng to: đặt TUYỆT ĐỐI ở góc trên-phải của CARD, tự lùi sang trái nút × (nếu có). Chuẩn cho MỌI modal.
        var closeEl = box.querySelector(".x, [class*='close'], [onclick*='lose'], [onclick*='Close']");
        var btn = document.createElement("div");
        btn.setAttribute("data-wd-btn", "max");
        btn.title = "Phóng to / khôi phục"; btn.innerHTML = "&#9974;";
        // Cùng style + THẲNG HÀNG với nút ×: lấy đúng MÀU, CỠ CHỮ, TOP, CHIỀU CAO từ chính nút ×.
        btn.style.cssText = "position:absolute;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.9;z-index:100000;background:transparent;line-height:1;padding:0";
        box.appendChild(btn);
        (function () {
            try {
                var br = box.getBoundingClientRect();
                if (closeEl) {
                    var cr = closeEl.getBoundingClientRect(), ccs = getComputedStyle(closeEl);
                    if (cr.width > 0 && cr.top - br.top < 110 && br.right - cr.right < 120) {
                        var h = Math.max(16, Math.round(cr.height || 20));
                        btn.style.top = Math.round(cr.top - br.top) + "px";
                        btn.style.height = h + "px"; btn.style.width = h + "px";
                        btn.style.color = ccs.color;            // ĐÚNG màu nút ×
                        btn.style.fontSize = ccs.fontSize;      // ĐÚNG cỡ nút ×
                        btn.style.right = (Math.round(br.right - cr.left) + 8) + "px"; // ngay sát trái nút ×
                        return;
                    }
                }
            } catch (e) { }
            btn.style.top = "10px"; btn.style.right = "12px"; btn.style.width = "20px"; btn.style.height = "20px"; btn.style.fontSize = "18px"; btn.style.color = "#fff";
        })();
        btn.addEventListener("mouseenter", function () { btn.style.opacity = "1"; });
        btn.addEventListener("mouseleave", function () { btn.style.opacity = ".85"; });
        btn.addEventListener("click", function (e) {
            e.stopPropagation(); var st = box.__wd;
            if (st.max) {
                st.max = false;
                if (st.prev) { box.style.width = st.prev.w ? st.prev.w + "px" : ""; box.style.height = st.prev.h ? st.prev.h + "px" : ""; box.style.transform = "translate(" + (st.prev.dx || 0) + "px," + (st.prev.dy || 0) + "px)"; st.dx = st.prev.dx || 0; st.dy = st.prev.dy || 0; }
                else { box.style.width = ""; box.style.height = ""; box.style.transform = "translate(0px,0px)"; st.dx = 0; st.dy = 0; }
            } else { st.prev = curGeom(box); applyGeom(box, { max: true }); }
            saveGeom(key, curGeom(box));
        });

        var grip = document.createElement("div");
        grip.setAttribute("data-wd-btn", "grip");
        grip.title = "Kéo để đổi kích thước";
        grip.style.cssText = "position:absolute;right:2px;bottom:2px;width:16px;height:16px;cursor:nwse-resize;z-index:6;background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,.28) 50%);border-radius:0 0 8px 0";
        box.appendChild(grip);

        var drag = null;
        function dStart(e) {
            if (e.button != null && e.button !== 0) return;
            if (e.target.closest("input,textarea,select,button,a,.x,[class*='close'],.ts-control,.flatpickr-calendar")) return;
            var st = box.__wd; drag = { x: e.clientX, y: e.clientY, dx: st.dx || 0, dy: st.dy || 0 };
            document.body.style.userSelect = "none"; e.preventDefault();
        }
        function dMove(e) { if (!drag) return; var st = box.__wd; st.dx = drag.dx + (e.clientX - drag.x); st.dy = drag.dy + (e.clientY - drag.y); box.style.transform = "translate(" + st.dx + "px," + st.dy + "px)"; }
        function dEnd() { if (!drag) return; drag = null; document.body.style.userSelect = ""; box.__wd.max = false; saveGeom(key, curGeom(box)); }
        (header && header !== box ? header : box).addEventListener("mousedown", dStart);

        var rz = null;
        function rStart(e) { var r = box.getBoundingClientRect(); rz = { x: e.clientX, y: e.clientY, w: r.width, h: r.height }; box.style.maxWidth = "none"; box.style.maxHeight = "none"; document.body.style.userSelect = "none"; e.preventDefault(); e.stopPropagation(); }
        function rMove(e) { if (!rz) return; box.style.width = Math.max(280, rz.w + (e.clientX - rz.x)) + "px"; box.style.height = Math.max(160, rz.h + (e.clientY - rz.y)) + "px"; }
        function rEnd() { if (!rz) return; rz = null; document.body.style.userSelect = ""; box.__wd.max = false; saveGeom(key, curGeom(box)); }
        grip.addEventListener("mousedown", rStart);

        document.addEventListener("mousemove", function (e) { dMove(e); rMove(e); });
        document.addEventListener("mouseup", function () { dEnd(); rEnd(); });

        applyGeom(box, getGeom(key));
    }
    function check(el) { if (!overlayShown(el)) return; var box = pickBox(el); if (box) enhance(box); }
    var mo = new MutationObserver(function (muts) { for (var i = 0; i < muts.length; i++) { if (muts[i].type === "attributes") check(muts[i].target); } });
    function startup() {
        try {
            mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["style", "class"] });
            var all = document.body.getElementsByTagName("*");
            for (var i = 0; i < all.length; i++) { var s = all[i].style; if ((s && s.position === "fixed") || getComputedStyle(all[i]).position === "fixed") check(all[i]); }
        } catch (e) { }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startup); else startup();
    window.WDModal = { enhance: enhance, reset: function () { try { localStorage.removeItem(STORE); } catch (e) { } } };
})();

/* wdAttachGroup(table) — Nhóm theo cột ĐA CẤP (nhiều cột lồng nhau) + header thu gọn, NHỚ theo máy (localStorage),
 * tự áp lại khi tbody render lại. Gọi 1 lần sau khi bảng có thead (lặp lại vô hại). */
(function () {
    "use strict";
    function txt(td) { return (td ? (td.innerText || td.textContent || "") : "").replace(/\s+/g, " ").trim(); }
    function keyFor(table) {
        // KHÔNG dùng tiền tố 'wd.' để tránh bị đồng bộ cấu hình desktop ghi đè -> nhớ THUẦN theo máy (localStorage).
        // Khóa theo path + tiêu đề bảng (ổn định dù bảng đổi vị trí, không cần id).
        var id = table.id || "";
        if (!id) { var th = table.tHead || table.querySelector("thead"); id = "h" + ((th ? (th.innerText || th.textContent || "") : "").replace(/\s+/g, "").slice(0, 60)); }
        return "grpby." + (location.pathname + "|" + id).toLowerCase();
    }
    window.wdAttachGroup = function (table) {
        if (!table || table.__wdGroup) return;
        var st = table.__wdGroup = { cols: [], busy: false, collapsed: {} };
        var thead = table.tHead || table.querySelector("thead");
        var headThs = thead ? thead.querySelectorAll("tr:last-child th, tr:last-child td") : [];
        var ncols = headThs.length || (table.querySelector("tbody tr") ? table.querySelector("tbody tr").children.length : 0);
        if (!ncols) return;
        var labels = []; for (var i = 0; i < headThs.length; i++) labels.push(txt(headThs[i]) || ("Cột " + (i + 1)));
        var KEY = keyFor(table);
        try { var sv = JSON.parse(localStorage.getItem(KEY) || "[]"); if (sv && sv.length) st.cols = sv.filter(function (c) { return c >= 0 && c < ncols; }); } catch (e) { }
        function save() { try { localStorage.setItem(KEY, JSON.stringify(st.cols)); } catch (e) { } }

        var bar = document.createElement("div");
        bar.style.cssText = "display:flex;align-items:center;gap:7px;margin:0 0 9px;font-size:12.5px;color:#4a6b76;flex-wrap:wrap";
        table.parentNode.insertBefore(bar, table);
        function renderBar() {
            var h = '<span style="font-weight:600"><i class="fa-solid fa-layer-group" style="margin-right:4px"></i>Nhóm theo:</span>';
            st.cols.forEach(function (c, idx) {
                h += (idx > 0 ? '<span style="opacity:.45;font-size:14px">›</span>' : '')
                    + '<span style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0a8f7e,#0f6e9c);color:#fff;border-radius:20px;padding:3px 5px 3px 12px;font-weight:600">' + labels[c]
                    + '<i class="fa-solid fa-xmark wd-grp-rm" data-i="' + idx + '" title="Bỏ cấp" style="cursor:pointer;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.25)"></i></span>';
            });
            var avail = labels.map(function (l, i) { return i; }).filter(function (i) { return labels[i] !== "#" && st.cols.indexOf(i) < 0; });
            if (avail.length) h += '<select class="wd-grp-add" style="border:1px solid #cbd5e1;border-radius:7px;padding:5px 9px;font-size:12.5px;background:#fff;cursor:pointer"><option value="">' + (st.cols.length ? "＋ Thêm cấp…" : "Chọn cột…") + '</option>' + avail.map(function (i) { return '<option value="' + i + '">' + labels[i] + '</option>'; }).join("") + '</select>';
            if (st.cols.length) h += '<a class="wd-grp-ca" style="cursor:pointer;color:#0a6c5e;margin-left:6px;text-decoration:underline">Thu gọn tất cả</a><a class="wd-grp-ea" style="cursor:pointer;color:#0a6c5e;margin-left:9px;text-decoration:underline">Mở tất cả</a><a class="wd-grp-clear" style="cursor:pointer;color:#e11d48;margin-left:9px;text-decoration:underline">Bỏ nhóm</a>';
            bar.innerHTML = h;
            Array.prototype.forEach.call(bar.querySelectorAll(".wd-grp-rm"), function (x) { x.addEventListener("click", function (e) { e.stopPropagation(); st.cols.splice(parseInt(x.getAttribute("data-i"), 10), 1); save(); renderBar(); apply(); }); });
            var add = bar.querySelector(".wd-grp-add"); if (add) add.addEventListener("change", function () { var v = parseInt(add.value, 10); if (v >= 0) { st.cols.push(v); save(); renderBar(); apply(); } });
            var clr = bar.querySelector(".wd-grp-clear"); if (clr) clr.addEventListener("click", function () { st.cols = []; st.collapsed = {}; save(); renderBar(); apply(); });
            var ca = bar.querySelector(".wd-grp-ca"); if (ca) ca.addEventListener("click", function () { var bd = table.tBodies[0]; if (bd) Array.prototype.forEach.call(bd.querySelectorAll('tr.wd-grp-h[data-lv="0"]'), function (hh) { st.collapsed[hh.getAttribute("data-pk")] = true; }); apply(); });
            var ea = bar.querySelector(".wd-grp-ea"); if (ea) ea.addEventListener("click", function () { st.collapsed = {}; apply(); });
        }
        function apply() {
            var body = table.tBodies[0]; if (!body) return; st.busy = true;
            Array.prototype.slice.call(body.querySelectorAll("tr.wd-grp-h")).forEach(function (r) { r.parentNode && r.parentNode.removeChild(r); });
            var rows = Array.prototype.slice.call(body.children).filter(function (r) { return r.tagName === "TR"; });
            rows.forEach(function (r) { r.style.display = ""; });
            if (st.cols.length) {
                rows.sort(function (a, b) { for (var i = 0; i < st.cols.length; i++) { var c = st.cols[i], ka = a.children[c] ? txt(a.children[c]) : "", kb = b.children[c] ? txt(b.children[c]) : ""; if (ka < kb) return -1; if (ka > kb) return 1; } return 0; });
                rows.forEach(function (r) { body.appendChild(r); r.__p = st.cols.map(function (c) { return r.children[c] ? txt(r.children[c]) : ""; }); });
                var COLORS = ["#dff0ec", "#e9f0f6", "#f1ecf7", "#f6f0e6"], cnt = {};
                rows.forEach(function (r) { for (var lv = 0; lv < st.cols.length; lv++) { var pk = r.__p.slice(0, lv + 1).join("¦"); cnt[pk] = (cnt[pk] || 0) + 1; } });
                var prev = null;
                rows.forEach(function (r) {
                    for (var lv = 0; lv < st.cols.length; lv++) {
                        var cur = r.__p.slice(0, lv + 1).join("¦");
                        if (!prev || cur !== prev.slice(0, lv + 1).join("¦")) {
                            var collapsed = !!st.collapsed[cur];
                            var hr = document.createElement("tr"); hr.className = "wd-grp-h"; hr.setAttribute("data-pk", cur); hr.setAttribute("data-lv", lv);
                            hr.innerHTML = '<td colspan="' + ncols + '" style="background:' + COLORS[Math.min(lv, COLORS.length - 1)] + ';font-weight:700;color:#0a4a40;cursor:pointer;padding:6px 9px;padding-left:' + (10 + lv * 22) + 'px;border-top:1px solid #cfe0db"><i class="fa-solid fa-caret-' + (collapsed ? "right" : "down") + '" style="margin-right:8px;width:9px;color:#0a8f7e"></i>' + (r.__p[lv] || "(trống)") + ' <span style="color:#7a8a92;font-weight:400;font-size:11.5px">(' + (cnt[cur] || 0) + ')</span></td>';
                            body.insertBefore(hr, r);
                            (function (pk) { hr.addEventListener("click", function () { st.collapsed[pk] = !st.collapsed[pk]; apply(); }); })(cur);
                        }
                    }
                    prev = r.__p;
                });
                rows.forEach(function (r) { var hide = false; for (var lv = 0; lv < st.cols.length; lv++) if (st.collapsed[r.__p.slice(0, lv + 1).join("¦")]) { hide = true; break; } r.style.display = hide ? "none" : ""; });
                Array.prototype.forEach.call(body.querySelectorAll("tr.wd-grp-h"), function (hr) { var lv = +hr.getAttribute("data-lv"), parts = hr.getAttribute("data-pk").split("¦"), hide = false; for (var p = 0; p < lv; p++) if (st.collapsed[parts.slice(0, p + 1).join("¦")]) { hide = true; break; } hr.style.display = hide ? "none" : ""; });
            }
            setTimeout(function () { st.busy = false; }, 0);
        }
        renderBar();
        var body0 = table.tBodies[0];
        if (body0 && window.MutationObserver) new MutationObserver(function () { if (st.busy || !st.cols.length) return; st.busy = true; setTimeout(apply, 0); }).observe(body0, { childList: true });
        if (st.cols.length) apply();
    };
})();