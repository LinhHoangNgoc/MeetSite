/* wdXlsx — xuất Excel GIỮ STYLE giống lưới hiển thị (cần thư viện xlsx-js-style: XLSX có hỗ trợ .s).
 * Dùng:
 *   wdXlsx.exportTable(tableEl, {title, sheetName, fileName})           // từ 1 bảng DOM (giữ merge/đậm/group/số)
 *   wdXlsx.exportTables([{el, title}], {fileName, sheetNames})          // nhiều bảng -> nhiều sheet
 *   wdXlsx.exportAOA(aoa, {title, headerRows, boldRows, numCols, colWidths, sheetName, fileName})
 */
(function () {
    "use strict";
    var THIN = { style: "thin", color: { rgb: "D0D7DE" } };
    var BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
    var HEAD_FILL = "0A8F7E", TITLE_FILL = "E7F3F1";

    function enc(r, c) { return XLSX.utils.encode_cell({ r: r, c: c }); }

    // "20.000.000" / "1.234,5" (vi) -> number | null
    function parseViNumber(t) {
        if (t == null) return null;
        var s = String(t).trim().replace(/ /g, "");
        if (s === "") return null;
        if (!/^-?\(?\d[\d.\s]*(,\d+)?\)?%?$/.test(s)) return null;
        var neg = /^\(.*\)$/.test(s); s = s.replace(/[()%]/g, "").trim();
        s = s.replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
        var n = Number(s);
        if (isNaN(n)) return null;
        return neg ? -n : n;
    }

    function cellText(td) { return (td.innerText || td.textContent || "").replace(/\s+/g, " ").trim(); }

    function isBoldCell(td) {
        if (td.tagName === "TH") return true;
        var st = window.getComputedStyle(td);
        var fw = st.fontWeight;
        if (fw === "bold" || fw === "bolder" || (parseInt(fw, 10) >= 600)) return true;
        var rowCls = (td.parentElement && td.parentElement.className || "").toLowerCase();
        return /nhom|cong|tong|sum|group|total/.test(rowCls);
    }
    function bgOf(td) {
        try {
            var bg = window.getComputedStyle(td).backgroundColor;
            var m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return null;
            var r = +m[1], g = +m[2], b = +m[3];
            if (r > 250 && g > 250 && b > 250) return null; // trắng -> bỏ
            return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        } catch (e) { return null; }
    }

    // DOM table -> {ws, nCols, nRows} giữ merge (colspan/rowspan), style header/group/số
    function tableToWs(table, opt) {
        opt = opt || {};
        var ws = {}, merges = [], occ = [], maxC = 0;
        var trs = table.querySelectorAll("tr");
        var rOff = opt.title ? 1 : 0;
        function occupied(r, c) { return occ[r] && occ[r][c]; }
        function mark(r, c) { (occ[r] = occ[r] || [])[c] = true; }

        for (var ri = 0; ri < trs.length; ri++) {
            var tds = trs[ri].children, rr = ri + rOff, c = 0;
            for (var k = 0; k < tds.length; k++) {
                var td = tds[k];
                if (td.tagName !== "TD" && td.tagName !== "TH") continue;
                while (occupied(rr, c)) c++;
                var cs = parseInt(td.getAttribute("colspan") || "1", 10) || 1;
                var rs = parseInt(td.getAttribute("rowspan") || "1", 10) || 1;
                var txt = cellText(td);
                var inHead = td.tagName === "TH" || (td.closest && td.closest("thead"));
                var num = inHead ? null : parseViNumber(txt);
                var cell = (num != null) ? { t: "n", v: num, z: (num % 1 === 0 ? "#,##0" : "#,##0.##") } : { t: "s", v: txt };
                var bold = isBoldCell(td);
                var bg = inHead ? HEAD_FILL : bgOf(td);
                cell.s = {
                    font: { name: "Calibri", sz: inHead ? 11 : 10.5, bold: !!(bold || inHead), color: { rgb: inHead ? "FFFFFF" : "1A2A33" } },
                    alignment: { horizontal: num != null ? "right" : (inHead ? "center" : "left"), vertical: "center", wrapText: !!inHead },
                    border: BORDER
                };
                if (bg) cell.s.fill = { patternType: "solid", fgColor: { rgb: bg } };
                ws[enc(rr, c)] = cell;
                for (var dr = 0; dr < rs; dr++) for (var dc = 0; dc < cs; dc++) mark(rr + dr, c + dc);
                if (cs > 1 || rs > 1) merges.push({ s: { r: rr, c: c }, e: { r: rr + rs - 1, c: c + cs - 1 } });
                c += cs;
                if (c > maxC) maxC = c;
            }
        }
        var nCols = maxC, nRows = trs.length + rOff;

        if (opt.title) {
            ws[enc(0, 0)] = { t: "s", v: opt.title, s: { font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "0A6C5E" } }, alignment: { horizontal: "center", vertical: "center" }, fill: { patternType: "solid", fgColor: { rgb: TITLE_FILL } } } };
            if (nCols > 1) merges.unshift({ s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } });
        }

        ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, nRows - 1), c: Math.max(0, nCols - 1) } });
        ws["!merges"] = merges;
        // bề rộng cột theo độ dài nội dung
        var widths = [];
        for (var cc = 0; cc < nCols; cc++) {
            var w = 10;
            for (var rr2 = rOff; rr2 < nRows; rr2++) { var cl = ws[enc(rr2, cc)]; if (cl) { var len = String(cl.v).length; if (len + 2 > w) w = Math.min(46, len + 2); } }
            widths.push({ wch: w });
        }
        ws["!cols"] = widths;
        if (opt.title) ws["!rows"] = [{ hpt: 22 }];
        return { ws: ws, nCols: nCols, nRows: nRows };
    }

    function safeName(s) { return (s || "Sheet1").replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31) || "Sheet1"; }

    function exportTables(items, opt) {
        opt = opt || {};
        if (typeof XLSX === "undefined" || !XLSX.utils) { alert("Thiếu thư viện Excel."); return; }
        var wb = XLSX.utils.book_new();
        items.forEach(function (it, i) {
            if (!it.el) return;
            var r = tableToWs(it.el, { title: it.title });
            XLSX.utils.book_append_sheet(wb, r.ws, safeName(it.sheetName || (opt.sheetNames && opt.sheetNames[i]) || ("Sheet" + (i + 1))));
        });
        XLSX.writeFile(wb, opt.fileName || "export.xlsx");
    }
    function exportTable(el, opt) {
        opt = opt || {};
        exportTables([{ el: el, title: opt.title, sheetName: opt.sheetName }], { fileName: opt.fileName });
    }

    // Đọc HEADER (thead) có nhóm/merge -> {aoa: 2D (null = ô bị gộp phủ), merges (theo gốc row 0), ncols}
    // Giữ đúng thứ tự cột-lá để body khớp cột (vd nhóm "Phụ cấp" nằm giữa, không bị đẩy ra cuối).
    function headerToAOA(table) {
        var thead = table.tHead || table.querySelector("thead") || table;
        var trs = thead.querySelectorAll("tr");
        var occ = [], merges = [], aoa = [], maxC = 0;
        function occd(r, c) { return occ[r] && occ[r][c]; }
        function mark(r, c) { (occ[r] = occ[r] || [])[c] = true; }
        for (var ri = 0; ri < trs.length; ri++) {
            var cells = trs[ri].children, c = 0; aoa[ri] = aoa[ri] || [];
            for (var k = 0; k < cells.length; k++) {
                var th = cells[k]; if (th.tagName !== "TH" && th.tagName !== "TD") continue;
                while (occd(ri, c)) c++;
                var cs = parseInt(th.getAttribute("colspan") || "1", 10) || 1, rs = parseInt(th.getAttribute("rowspan") || "1", 10) || 1;
                aoa[ri][c] = (th.innerText || th.textContent || "").replace(/\s+/g, " ").trim();
                for (var dr = 0; dr < rs; dr++) for (var dc = 0; dc < cs; dc++) { mark(ri + dr, c + dc); if (!(dr === 0 && dc === 0)) { aoa[ri + dr] = aoa[ri + dr] || []; aoa[ri + dr][c + dc] = null; } }
                if (cs > 1 || rs > 1) merges.push({ s: { r: ri, c: c }, e: { r: ri + rs - 1, c: c + cs - 1 } });
                c += cs; if (c > maxC) maxC = c;
            }
        }
        for (var i = 0; i < aoa.length; i++) for (var j = 0; j < maxC; j++) if (aoa[i][j] === undefined) aoa[i][j] = null;
        return { aoa: aoa, merges: merges, ncols: maxC };
    }

    // AOA -> worksheet có style (KHÔNG ghi file). Dùng để ghép nhiều sheet.
    function aoaToWs(aoa, opt) {
        opt = opt || {};
        var ws = {}, merges = [], rOff = opt.title ? 1 : 0;
        var hdr = opt.headerRows || 0, boldRows = opt.boldRows || [];
        var nCols = 0;
        aoa.forEach(function (row) { if (row.length > nCols) nCols = row.length; });
        if (opt.title) {
            ws[enc(0, 0)] = { t: "s", v: opt.title, s: { font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "0A6C5E" } }, alignment: { horizontal: "center", vertical: "center" }, fill: { patternType: "solid", fgColor: { rgb: TITLE_FILL } } } };
            if (nCols > 1) merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } });
        }
        (opt.merges || []).forEach(function (m) { merges.push({ s: { r: m.s.r + rOff, c: m.s.c }, e: { r: m.e.r + rOff, c: m.e.c } }); });
        aoa.forEach(function (row, ri) {
            var rr = ri + rOff, isHdr = ri < hdr, isBold = isHdr || boldRows.indexOf(ri) >= 0;
            for (var c = 0; c < nCols; c++) {
                var val = (c < row.length) ? row[c] : null;
                if (val === null || val === undefined) {
                    // Ô bị gộp phủ / trống: trong vùng header vẫn tô nền+viền để mảng gộp liền mạch
                    if (isHdr) ws[enc(rr, c)] = { t: "s", v: "", s: { fill: { patternType: "solid", fgColor: { rgb: HEAD_FILL } }, border: BORDER } };
                    continue;
                }
                var cell = (typeof val === "number") ? { t: "n", v: val, z: (val % 1 === 0 ? "#,##0" : "#,##0.##") } : { t: "s", v: String(val) };
                cell.s = {
                    font: { name: "Calibri", sz: isHdr ? 11 : 10.5, bold: isBold, color: { rgb: isHdr ? "FFFFFF" : "1A2A33" } },
                    alignment: { horizontal: (typeof val === "number") ? "right" : (isHdr ? "center" : "left"), vertical: "center", wrapText: isHdr },
                    border: BORDER
                };
                if (isHdr) cell.s.fill = { patternType: "solid", fgColor: { rgb: HEAD_FILL } };
                ws[enc(rr, c)] = cell;
            }
        });
        ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length + rOff - 1, c: Math.max(0, nCols - 1) } });
        ws["!merges"] = merges;
        ws["!cols"] = opt.colWidths ? opt.colWidths.map(function (w) { return { wch: w }; }) : (function () { var a = []; for (var i = 0; i < nCols; i++) a.push({ wch: 16 }); return a; })();
        return ws;
    }

    function exportAOA(aoa, opt) {
        opt = opt || {};
        if (typeof XLSX === "undefined" || !XLSX.utils) { alert("Thiếu thư viện Excel."); return; }
        var ws = aoaToWs(aoa, opt);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, safeName(opt.sheetName));
        XLSX.writeFile(wb, opt.fileName || "export.xlsx");
    }

    window.wdXlsx = { exportTable: exportTable, exportTables: exportTables, exportAOA: exportAOA, aoaToWs: aoaToWs, headerToAOA: headerToAOA, tableToWs: tableToWs };
})();
