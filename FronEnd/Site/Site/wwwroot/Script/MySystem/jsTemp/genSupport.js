//#region Var
const Secret_Login_Key = "ScrKeyCCCTNACCKCT";
const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp', 'heic'];
const officeExt = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const pdfExt = ['pdf'];
var alertToast;
var questionToast;
var lstEvent = [];
var keyData = {
    Enter: 13,
    Ctrl: 17,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F8: 120,
    F10: 121,
    F11: 122,
    F12: 123
};
var UrlApi = ""
var iconFa = {
    //Thêm
    Them: 'fa-solid fa-plus',
    ThemBtn: 'fa fa-plus',
    //Sửa
    Sua: 'fa-solid fa-pen',
    SuaBtn: 'fa fa-pen',
    //Xóa
    Xoa: 'fa-solid fa-trash',
    XoaBtn: 'fa fa-trash',
    //Duyệt
    Duyet: 'fa-solid fa-check',
    DuyetBtn: 'fa fa-check',
    //Hủy duyệt
    HuyDuyet: 'fa-solid fa-circle-xmark',
    HuyDuyetBtn: 'fa fa-circle-xmark',
    //Xem
    Xem: 'fa-solid fa-eye',
    XemBtn: 'fa fa-eye',
    //Gui
    Gui: 'fa-solid fa-paper-plane',
    GuiBtn: 'fa fa-paper-plane',
    //Huy Gui
    HuyGui: 'fa-solid fa-ban',
    HuyGuiBtn: 'fa fa-ban',
    //Tra Lai
    TraLai: 'fa-solid fa-xmark',
    TraLaiBtn: 'fa fa-xmark',
    //Share
    Share: 'fa-solid fa-share-nodes',
    ShareBtn: 'fa fa-share-nodes',
    //Donwload
    Download: 'fa-solid fa-download',
    DownloadBtn: 'fa fa-download'
};
//#endregion
//#region JsonToHtml
function DyamicFrm_JsonToHtml(sJson, titleFrm, genCode) {
    if (genCode == undefined || genCode == null) {
        genCode = true;
    }
    if (sJson == "") {
        return "";
    }
    let ObjSetting = JSON.parse(sJson);
    lst = ObjSetting.ListControl;
    let lstHtml = [];
    if (genCode) {
        lstHtml.push(`
<%@ Control Language="VB" AutoEventWireup="false" CodeFile="{FileName}.ascx.vb" Inherits="{ClassName}" %>
<script type="text/javascript">
    $(function () {
        inputStyle('divView{FileName}');
    })
</script>
<style type="text/css">
    [class^="col-"] {
        padding: 1px !important;
    }

    .TitleControl {
        width: 100px;
        float: left;
        padding: 5px !important;
        padding-top: 10px !important;
        cursor: pointer
    }

    .BodyControl {
        width: calc(100% - 100px);
        float: left;
        padding: 5px !important;
    }

        .BodyControl input {
            width: 100%;
            border: 1px solid #d2d3d5
        }
</style>
<% If (HttpContext.Current.Session("admin") IsNot Nothing AndAlso CBool(HttpContext.Current.Session("admin"))) Then %>
<div style="position: absolute; top: 43px; right: 5px; cursor: pointer" onclick="window.location.href='/settingcontrol/cname/<%=Request("c") %>';">
    <i class="fa-solid fa-gear"></i>
</div>
<% End if %>
<div style="width: 100%; float: left; height: 40px" id="divTieuDe{FileName}" class="divTitle">
${titleFrm}
</div>
<div class="container-fluid" id="divView{FileName}">
    <div class="row" TabName="${ObjSetting.TableSave}" id="Tabdata_${ObjSetting.TableSave}" TabKey="${ObjSetting.KeyField}">`);
    }
    else {
        lstHtml.push(`
<div class="container-fluid" id="divView{FileName}">
    <div class="row" TabName="${ObjSetting.TableSave}" id="Tabdata_${ObjSetting.TableSave}" TabKey="${ObjSetting.KeyField}">`);
    }
    try {
        lst.sort((a, b) => a.idx - b.idx).forEach(item => {
            lstHtml.push(DyamicFrm_PaintAItem(item));
        });
    } catch (e) {
        alert(e)
    }
    lstHtml.push("</div>");
    lstHtml.push("</div>");
    lstHtml.push("<div style='width:100%;float:left;padding:5px;border-top:1px solid var(--main-color)'>");
    lstHtml.push(DyamicFrm_PaintButton(ObjSetting.Button))
    lstHtml.push("</div>");
    return lstHtml.join("\n");
}
function DyamicFrm_PaintAItem(item) {
    let sHtml = [];
    //Get Value
    let id = item.IDCtr;
    //Add property

    sHtml.push(`<div class="col-lg-${item.vwidth}" id="PrControl_${item.IDCtr}">`);
    if (item.type == 'Grid') {
        sHtml.push(`<div style="height:calc(${item.vheight});overflow:auto"><div id="${id}"></div></div>`);
    }
    else {
        if (item.type == 'Checkbox') {
            sHtml.push(`<div style="width:100%;float:left;padding:10px">`);
            sHtml.push(`<label for="${item.IDCtr}" style="float:left">${item.titleview}</label>`); 
            sHtml.push(DyamicFrm_PaintAIInput(item));
            sHtml.push(`</div>`);
        }
        else {
            sHtml.push(`<div class='TitleControl'>${item.titleview}</div>`);
            sHtml.push(`<div class='BodyControl'>`);
            sHtml.push(DyamicFrm_PaintAIInput(item));
            sHtml.push(`</div>`);
        }
    }
    sHtml.push(`</div>`);
    return sHtml.join("\n");
}
function DyamicFrm_PaintAIInput(item) {
    let sHtml = "";
    let sPrp = ""
    // Escape giá trị thuộc tính để tránh phá vỡ HTML / XSS qua cấu hình control.
    const _escAttr = function (v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    for (let prp in item) {
        if (prp != 'type') {
            sPrp += ` ${prp}="${_escAttr(item[prp])}"`;
        }
    }
    //Text Area
    if (item.type == 'Textarea' || item.type == 'Wordedit') {
        sHtml += "<textarea " + sPrp + " style='" + (item.vheight != null && item.vheight != undefined ? "height:calc(" + item.vheight + ")" : "") + "' " + (item.type == "Textarea" ? "" : " viewtype = 'richtext'") + " id='" + item.IDCtr + "'></textarea>";
    }
    //Input control
    else {
        sHtml += `<input id="${item.IDCtr}" ${sPrp}`;
        switch (item.type) {
            case 'TextBox':
                sHtml += "type='text'";
                break;
            case 'Password':
                sHtml += "type='password'";
                break;
            case 'Combobox':
                sHtml += "dropdown='Combobox'";
                break;
            case 'Multiselect':
                sHtml += "dropdown='Mutiselect'";
                break;
            case 'Datepicker':
                sHtml += "type='date'";
                break;
            case 'Timepicker':
                sHtml += "type='time'";
                break;
            case 'Datetime':
                sHtml += "type='datetime'";
                break;
            case 'Interger':
                sHtml += "type='number' basetype='int'";
                break;
            case 'Decimal':
                sHtml += "type='number' basetype='dec'";
                break;
            case 'Checkbox':
                sHtml += " style='width:20px;float:left;margin:3px' type='checkbox'";
                break;
            default:
                sHtml += "type='text'";
                break;
        }
        sHtml += " />"
    }
    return sHtml;
}
function DyamicFrm_PaintButton(sButton) {
    let ds = sButton.split(",");
    let lstHtml = [];
    if (ds.includes('3')) {
        //Nút thoát
        lstHtml.push(`<div onclick="DyamicCtr_CloseFrm()" class="button" style="width:65px;float:right;text-align:right;margin-left:5px"><i style="float:left;margin-top:3px" class="fa-solid fa-close"></i>Thoát</div>`);
    }
    if (ds.includes('2')) {
        //Nút in
        lstHtml.push(`<div onclick="DyamicCtr_PrintData()" class="button" style="width:65px;float:right;text-align:right;margin-left:5px"><i style="float:left;margin-top:3px" class="fa-solid fa-print"></i>In</div>`);
    }
    if (ds.includes('1')) {
        //Nút lưu
        lstHtml.push(`<div onclick="DyamicCtr_SaveData()" class="button" style="width:65px;float:right;text-align:right;margin-left:5px"><i style="float:left;margin-top:3px" class="fa-solid fa-save"></i>Lưu</div>`);
    }
    if (ds.includes('0')) {
        //Nút lưu
        lstHtml.push(`<div onclick="DyamicCtr_AddData()" class="button" style="width:65px;float:right;text-align:right;margin-left:5px"><i style="float:left;margin-top:3px" class="fa-solid fa-add"></i>Thêm</div>`);
    }
    return lstHtml.join("\n");
}
//#endregion
function encrypt(text) {
    return CryptoJS.AES.encrypt(text, Secret_Login_Key).toString();
}

// Hàm giải mã
function decrypt(ciphertext) {
    if (!ciphertext) return "";
    var bytes = CryptoJS.AES.decrypt(ciphertext, Secret_Login_Key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

//#region RBAC client (granular) — FAIL-OPEN TUYỆT ĐỐI
// Mục tiêu: ẩn nút Thêm/Sửa/Xóa theo quyền. Lỗi/không rõ -> HIỆN nút (không bao giờ khóa nhầm).
// Dữ liệu lấy từ /api/Auth/MyPermissions -> { code, isAdmin, allowed:[GroupKey], perms:["GroupKey|Action"] }.
(function () {
    if (window.__wdPermInit) return;
    window.__wdPermInit = true;

    // Cache quyền: { ready, isAdmin, allowed:Set, perms:Set("group|action" lowercase), groupsWithPerms:Set }
    var WD = window.__wdPerm = window.__wdPerm || {
        ready: false, isAdmin: true, // mặc định fail-open (coi như full) cho tới khi tải xong
        allowed: null, perms: new Set(), groupsWithPerms: new Set()
    };

    // Suy ra GroupKey hiện tại từ segment đầu của đường dẫn (route == GroupKey == controller).
    window.wdCurrentGroup = function () {
        try {
            var p = (window.location.pathname || '').replace(/^\/+/, '');
            var seg = p.split('/')[0] || '';
            return seg.toLowerCase();
        } catch (e) { return ''; }
    };

    // Chuẩn hoá tên hành động về 'xem'|'them'|'sua'|'xoa'.
    function normAction(a) {
        a = (a == null ? '' : String(a)).toLowerCase().trim();
        if (a === 'add' || a === 'new' || a === 'create' || a === 'insert' || a === 'themmoi') return 'them';
        if (a === 'edit' || a === 'update') return 'sua';
        if (a === 'delete' || a === 'remove' || a === 'del') return 'xoa';
        if (a === 'view' || a === 'read' || a === 'list') return 'xem';
        return a; // 'xem'|'them'|'sua'|'xoa' hoặc nguyên bản
    }

    // window.wdCan(group, action): true nếu được phép HIỆN/THAO TÁC.
    // FAIL-OPEN: chưa tải xong / admin / group không bị cấu hình quyền chi tiết / lỗi -> true.
    window.wdCan = function (group, action) {
        try {
            if (!WD.ready) return true;          // chưa biết -> cho hiện
            if (WD.isAdmin) return true;         // admin -> full
            group = (group == null ? wdCurrentGroup() : String(group)).toLowerCase().trim();
            if (!group) return true;
            // Group KHÔNG có dòng quyền chi tiết -> fail-open (chỉ gác ở mức nhóm, không gác hành động).
            if (!WD.groupsWithPerms.has(group)) return true;
            var act = normAction(action);
            if (!act || act === 'xem') {
                // Xem: cho qua nếu có Xem, hoặc có bất kỳ quyền nào trên group (an toàn -> hiện).
                if (WD.perms.has(group + '|xem')) return true;
                // Nếu có quyền thao tác khác mà không có 'xem' rõ ràng -> vẫn hiện (an toàn).
                return true;
            }
            return WD.perms.has(group + '|' + act);
        } catch (e) { return true; }
    };

    // Áp quyền: ẩn các nút Thêm/Sửa/Xóa trong DOM hiện tại theo group hiện tại.
    // Nhận diện theo nhiều mẫu (Syncfusion toolbar id, class, text, onclick) để phủ rộng mà không sửa module.
    window.wdApplyButtonPermissions = function (root) {
        try {
            if (!WD.ready || WD.isAdmin) return;
            var group = wdCurrentGroup();
            if (!group || !WD.groupsWithPerms.has(group)) return; // fail-open
            var scope = root && root.querySelectorAll ? root : document;

            var canThem = window.wdCan(group, 'them');
            var canSua = window.wdCan(group, 'sua');
            var canXoa = window.wdCan(group, 'xoa');
            if (canThem && canSua && canXoa) return;

            function hide(el) {
                if (!el) return;
                // Ẩn nút (và item bao ngoài của Syncfusion nếu có) — KHÔNG xoá khỏi DOM để tránh vỡ logic module.
                var li = el.closest ? el.closest('.e-toolbar-item') : null;
                (li || el).style.setProperty('display', 'none', 'important');
                el.setAttribute('data-wd-hidden', '1');
            }

            // 1) Syncfusion danh mục chung: id cố định.
            if (!canThem) hide(scope.querySelector('#Grid_addnew'));
            if (!canXoa) hide(scope.querySelector('#Grid_delrow'));

            // 2) Nút động của dynamic-form (genSupport): onclick=DyamicCtr_AddData() là "Thêm".
            if (!canThem) {
                scope.querySelectorAll('[onclick*="DyamicCtr_AddData"]').forEach(hide);
            }

            // 3) Heuristic tổng quát theo text/id/class/tooltip cho các module khác.
            //    Chỉ ẩn khi khớp rõ ràng 1 hành động bị cấm; mơ hồ -> để nguyên (fail-open).
            var cands = scope.querySelectorAll(
                'button,.button,.btn,.e-toolbar-item,[role="button"],input[type="button"],input[type="submit"]');
            cands.forEach(function (el) {
                if (el.getAttribute('data-wd-hidden') === '1') return;
                var txt = ((el.innerText || el.textContent || '') + ' '
                    + (el.id || '') + ' ' + (el.className || '') + ' '
                    + (el.getAttribute('title') || '') + ' '
                    + (el.getAttribute('data-tooltip') || '')).toLowerCase();
                // Bỏ qua nút không liên quan để tránh ẩn nhầm (vd "Lưu" = Thêm/Sửa, không ẩn ở đây).
                var isXoa = /\bxóa\b|\bxoa\b|\bdelete\b|delrow|btnxoa|e-delete/.test(txt);
                var isThem = /\bthêm\b|\bthem\b|addnew|btnthem|\badd\b/.test(txt) && !/import|export/.test(txt);
                var isSua = /\bsửa\b|\bsua\b|btnsua|\bedit\b/.test(txt) && !/import|export/.test(txt);
                if (isXoa && !canXoa) hide(el);
                else if (isThem && !canThem) hide(el);
                else if (isSua && !canSua) hide(el);
            });
        } catch (e) { /* fail-open */ }
    };

    function applySoon() {
        try { window.wdApplyButtonPermissions(document); } catch (e) { }
        // Quét lại sau khi lưới/toolbar render trễ.
        setTimeout(function () { try { window.wdApplyButtonPermissions(document); } catch (e) { } }, 400);
        setTimeout(function () { try { window.wdApplyButtonPermissions(document); } catch (e) { } }, 1200);
    }

    function installObserver() {
        try {
            if (window.__wdObs || !window.MutationObserver) return;
            var obs = new MutationObserver(function (muts) {
                if (!WD.ready || WD.isAdmin) return;
                for (var i = 0; i < muts.length; i++) {
                    if (muts[i].addedNodes && muts[i].addedNodes.length) {
                        // Debounce nhẹ.
                        clearTimeout(window.__wdObsT);
                        window.__wdObsT = setTimeout(function () {
                            try { window.wdApplyButtonPermissions(document); } catch (e) { }
                        }, 120);
                        break;
                    }
                }
            });
            obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
            window.__wdObs = obs;
        } catch (e) { }
    }

    window.wdLoadPermissions = function () {
        try {
            var f = (typeof fetch === 'function') ? fetch('/api/Auth/MyPermissions',
                { credentials: 'same-origin', headers: { 'Accept': 'application/json' } }) : null;
            if (!f) { WD.ready = true; WD.isAdmin = true; return; } // fail-open
            f.then(function (r) { return r && r.ok ? r.json() : null; })
                .then(function (res) {
                    try {
                        if (!res || res.code !== 0) { WD.ready = true; WD.isAdmin = true; return; } // fail-open
                        WD.isAdmin = !!res.isAdmin;
                        WD.allowed = new Set((res.allowed || []).map(function (g) { return String(g).toLowerCase(); }));
                        WD.perms = new Set();
                        WD.groupsWithPerms = new Set();
                        (res.perms || []).forEach(function (s) {
                            var parts = String(s).toLowerCase().split('|');
                            if (parts.length === 2 && parts[0] && parts[1]) {
                                WD.perms.add(parts[0] + '|' + parts[1]);
                                WD.groupsWithPerms.add(parts[0]);
                            }
                        });
                        WD.ready = true;
                        installObserver();
                        applySoon();
                    } catch (e) { WD.ready = true; WD.isAdmin = true; }
                })
                .catch(function () { WD.ready = true; WD.isAdmin = true; }); // fail-open
        } catch (e) { WD.ready = true; WD.isAdmin = true; }
    };

    // Tự khởi động sớm (mỗi iframe/phân hệ tự gọi). Không chặn login (chỉ chạy khi có session;
    // endpoint trả code!=0 -> fail-open, không ảnh hưởng).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.wdLoadPermissions);
    } else {
        window.wdLoadPermissions();
    }
})();
//#endregion