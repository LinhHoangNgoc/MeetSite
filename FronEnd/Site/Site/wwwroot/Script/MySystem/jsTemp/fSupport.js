//#region Filtter
function FilterTableHtml(id, filter, cols) {
    let rows = document.querySelectorAll("#" + id + " tbody tr");

    rows.forEach(row => {
        let match = false;

        cols.forEach(col => {
            let td = row.cells[col];
            if (!td) return;
            let text = (td.textContent || "").toLowerCase();
            if (filter !== "" && text.includes(filter.toLowerCase())) {
                match = true;
            }
        });

        row.style.display = (match || filter === "") ? "" : "none";
    });
}
//#endregion
//#region Support
function getDropDownRow(id) {
    let obj = getObjectInput(id);

    if (typeof TomSelect !== 'undefined' && obj instanceof TomSelect) {
        let value = obj.getValue();

        if (Array.isArray(value)) {
            return value.map(v => obj.options[v]).filter(x => x != null);
        }

        return obj.options[value] || null;
    }

    return null;
}
function fileUpload(idFile, url, formData, eventSS) {
    if (formData == null || formData == undefined) {
        formData = new FormData();
    }
    if (formData.get("files") == null) {
        var input = document.getElementById(idFile);
        var files = input.files;

        for (var i = 0; i != files.length; i++) {
            formData.append("files", files[i]);
        }
    }
    $.ajax({
        url: url,
        data: formData,
        processData: false,
        contentType: false,
        type: "POST",
        success: eventSS
    }
    );
}
function WaitDialog(id) {
    if (id == null || id === '') id = 'spinner';
    const el = document.getElementById(id);
    if (!el) return;

    const overlayId = id + '_loading';
    if (!document.getElementById(overlayId)) {
        const div = document.createElement('div');
        div.id = overlayId;
        div.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(255,255,255,0.75);
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(1px);
        `;
        div.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
            ">
                <div style="
                    width: 48px;
                    height: 48px;
                    border: 5px solid #dee2e6;
                    border-top-color: var(--main-color);
                    border-radius: 50%;
                    animation: _wd_spin 0.75s linear infinite;
                "></div>
                <span style="color:#495057;font-size:14px;font-family:inherit">Đang xử lý...</span>
            </div>
        `;

        // Inject keyframes một lần duy nhất
        if (!document.getElementById('_wd_style')) {
            const s = document.createElement('style');
            s.id = '_wd_style';
            s.textContent = '@keyframes _wd_spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(s);
        }

        document.body.appendChild(div);   // ← gắn vào body, tránh bị overflow:hidden cắt
    }

    document.getElementById(overlayId).style.display = 'flex';
}

function CompleteDialog(id) {
    if (id == null || id === '') id = 'spinner';
    const el = document.getElementById(id + '_loading');
    if (el) el.style.display = 'none';
}


function showSpinner(elementID) {
    WaitDialog(elementID);
}

// Overlay loading toàn màn hình, không phụ thuộc vào element nào trên trang.
// Trước đây BeginLoad()/CompLoad() được gọi nhưng không định nghĩa -> gây ReferenceError
// làm hỏng việc nạp báo cáo và import Excel. Định nghĩa ở đây để dùng chung toàn hệ thống.
let _globalLoadCount = 0;
function _ensureGlobalLoadingOverlay() {
    let div = document.getElementById('_global_loading');
    if (!div) {
        div = document.createElement('div');
        div.id = '_global_loading';
        div.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.75);z-index:2147483647;display:none;align-items:center;justify-content:center;';
        div.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">'
            + '<div style="width:48px;height:48px;border:5px solid #dee2e6;border-top-color:var(--main-color);border-radius:50%;animation:_wd_spin 0.75s linear infinite;"></div>'
            + '<span style="color:#495057;font-size:14px;font-family:inherit">Đang xử lý...</span></div>';
        if (!document.getElementById('_wd_style')) {
            const s = document.createElement('style');
            s.id = '_wd_style';
            s.textContent = '@keyframes _wd_spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(s);
        }
        document.body.appendChild(div);
    }
    return div;
}
let _globalLoadWatchdog = null;
function _hideGlobalLoading() {
    _globalLoadCount = 0;
    const div = document.getElementById('_global_loading');
    if (div) div.style.display = 'none';
    if (_globalLoadWatchdog) { clearTimeout(_globalLoadWatchdog); _globalLoadWatchdog = null; }
}
function BeginLoad() {
    _globalLoadCount++;
    _ensureGlobalLoadingOverlay().style.display = 'flex';
    // Watchdog: nếu vì lỗi mạng mà CompLoad không được gọi, tự ẩn overlay sau 5 phút
    // để màn hình không bị treo vĩnh viễn.
    if (_globalLoadWatchdog) clearTimeout(_globalLoadWatchdog);
    _globalLoadWatchdog = setTimeout(_hideGlobalLoading, 305000);
}
function CompLoad() {
    _globalLoadCount = Math.max(0, _globalLoadCount - 1);
    if (_globalLoadCount === 0) {
        _hideGlobalLoading();
    }
}

function jAjax(url, data, okfunction, loaddingdiv) {
    if (loaddingdiv == null) {
        loaddingdiv = 'spinner';
    }
    WaitDialog(loaddingdiv);
    $.ajax({
        url: url,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        dataType: "json",
        timeout: 300000, // 5 phút: tránh spinner treo vô hạn khi server không phản hồi
        success: okfunction,
        error: function (xhr, status, error) {
            console.error("AJAX Error:", status, error);
            console.log("Response Text:", xhr.responseText);
            alertToas(null, status === 'timeout' ? "Máy chủ phản hồi quá lâu, vui lòng thử lại" : "Lỗi kết nối máy chủ");
        },
        complete: function () {
            CompleteDialog(loaddingdiv);
        }
    });
}
function jAjaxDownload(url, data, fileName, loaddingdiv) {
    if (loaddingdiv == null) {
        loaddingdiv = 'spinner';
    }

    WaitDialog(loaddingdiv);

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) throw new Error('Download failed');
            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName || "Files.zip";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
            console.error("Download Error:", error);
            alert("Có lỗi xảy ra khi tải file: " + error);
        })
        .finally(() => {
            CompleteDialog(loaddingdiv);
        });
}
function sendFileAjax(url, file, data, idDiv, fSucess) {
    let formData = new FormData();
    formData.append("file", file);
    Object.entries(data).forEach(([field, value]) => {
        formData.append(field, value);
    });
    $.ajax({
        url: url,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        beforeSend: function () {
            WaitDialog(idDiv);
        },
        success: fSucess,
        error: function () {
            alertToas(null, 'Lỗi không thể kết nối đến máy chủ');
        },
        complete: function () {
            CompleteDialog(idDiv);
        }
    });
}
function formatNumber(v, d) {
    return new Intl.NumberFormat('vi-VN').format(v);
}
function stringYMDToDMY(s) {
    let nam = s.substring(0, 4);
    let thang = s.substring(5, 7);
    let ngay = s.substring(8, 10);
    return ngay + "/" + thang + "/" + nam + s.substring(10, 100);
}
function stringDMYToYMD(s) {
    let nam = s.substring(6, 10);
    let thang = s.substring(3, 5);
    let ngay = s.substring(0, 2);
    return nam + "/" + thang + "/" + ngay + s.substring(10, 100);
}
function loadFileToDiv(urlFile, idDiv, idVal) {
    if (document.getElementById(idVal) == undefined) {
        $("#" + idDiv).html("");
        $("#" + idDiv).load(urlFile);
    }
}
function stringToDate(s) {
    var dateParts = s.split("/");
    return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
}
function jNow() {
    var date = new Date();
    var aaaa = date.getFullYear();
    var gg = date.getDate();
    var mm = (date.getMonth() + 1);

    if (gg < 10)
        gg = "0" + gg;

    if (mm < 10)
        mm = "0" + mm;

    var cur_day = aaaa + "-" + mm + "-" + gg;

    var hours = date.getHours()
    var minutes = date.getMinutes()
    var seconds = date.getSeconds();

    if (hours < 10)
        hours = "0" + hours;

    if (minutes < 10)
        minutes = "0" + minutes;

    if (seconds < 10)
        seconds = "0" + seconds;

    return cur_day + " " + hours + ":" + minutes;

}
function getDate(i, vi) {
    var result = new Date();
    result.setDate(result.getDate() + i);
    var aaaa = result.getFullYear();
    var gg = result.getDate();
    var mm = (result.getMonth() + 1);

    if (gg < 10)
        gg = "0" + gg;

    if (mm < 10)
        mm = "0" + mm;

    var cur_day = aaaa + "-" + mm + "-" + gg;
    if (vi == true) {
        cur_day = gg + '/' + mm + '/' + aaaa;
    }
    return cur_day;
}
function getDateTime(dateFrom) {
    const now = dateFrom;
    const pad = n => n.toString().padStart(2, '0');
    const formatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return (formatted);;
}
function getFirstDateMonth(d, todate) {
    if (todate == undefined || todate == null || todate == false) {
        return '01/' + fGhepSo0(d.getMonth() + 1) + '/' + d.getFullYear();
    }
    else {
        return new Date(d.getFullYear(), d.getMonth());
    }
}
function getEndDateMonth(d, todate) {
    var dOfDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    if (todate == undefined || todate == null || todate == false) {
        return fGhepSo0(dOfDay.getDate()) + '/' + fGhepSo0(d.getMonth() + 1) + '/' + d.getFullYear();
    }
    else {
        return new Date(d.getFullYear(), d.getMonth(), dOfDay.getDate(), 23, 59, 59, 999);
    }
}
function fGhepSo0(i) {
    return (i < 10 ? '0' : '') + i;
}
function viewTab(obj) {
    var buttonContainer = obj.parentElement;
    var wrapper = buttonContainer.parentElement;
    var id = obj.id.replace('TabButton', '');
    $(wrapper).find("> div > [name='TabPage']").each(function () {
        if (this.parentElement.parentElement === wrapper) {
            $(this).css('display', (this.id.replace('TabPage', '') == id ? 'block' : 'none'));
        }
    });
    $(buttonContainer).find("> [name='TabButton']").each(function () {
        if (this.id.replace('TabButton', '') == id) {
            $(this).removeClass("buttondeactive").addClass("buttonactive");
        } else {
            $(this).removeClass("buttonactive").addClass("buttondeactive");
        }
    });
}
function Print(vid, obj) {
    let sUrl = '';

    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            sUrl += "&" + key + "=" + encodeURIComponent(obj[key]);
        }
    }

    WaitDialog('spinner');

    $("#ifrView").attr("src", "/frm/frmpreviewreport.aspx?id=" + vid + sUrl);
    ifrViewShow();
    $("#ifrView").height('calc(100vh - 100px)');
}
function ifrViewShow() {
    if (dlgPrint == undefined) {
        try {
            dlgPrint = dialogDiv(
                'divViewPrint',
                'divDiaLogPrint',
                'Xem in',
                '100%',
                '100vh',
                dlgPrint,
                null,
                function () { dlgPrint.hide(); }
            );
        } catch (e) {
        }
    }
    else {
        dlgPrint.show();
    }

    CompleteDialog('spinner');
}
function OnFiltering(e) {
    return true;
}
function SetTitle(s) {
    $('#divTitle').html(s);
}
function ShowMenu() {
    if ($('#divMenu').css('display') == 'none') {
        $('#divMenu').slideDown(500);
    }
    else {
        $('#divMenu').slideUp(500);
    }
}
function getParamUrl(param) {
    try {
        return window.location.href.toLowerCase().split("/" + param + "/")[1].split("/")[0];
    } catch (e) {
        return null;
    }
}
function htmlToPlainText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}
//#endregion
//#region DataFill
async function Gen_GetDataToDiv(obj, id, prWait) {
    let objName = $('#' + id).attr('TabName');
    let objFill = obj;
    if (objName != undefined) {
        objFill = obj[objName];
    }
    $('#' + id + ' input,textarea').each(async function () {
        let idObject = $(this).attr('id');
        if (idObject != undefined) {
            let fieldMap = idObject.substring(3);
            setValueInput(idObject, objFill[fieldMap], prWait);
        }
    });
}
function Gen_SetDataToObject(id) {
    let objSave = {};
    $('#' + id + ' input,textarea').each(function () {
        let idObject = $(this).attr('id');
        if (idObject != undefined) {
            let fieldMap = idObject.substring(3);
            let objValue = getValueInput(idObject);
            let minVal = $(this).attr('minValue');
            if (minVal == 'null') {
                minVal = null;
            }
            let maxVal = $(this).attr('maxVal');
            if (maxVal == 'null') {
                maxVal = null;
            }
            let titleView = $(this).attr('titleView');
            if (minVal != undefined && minVal != null && minVal != '') {
                if (objValue < minVal) {
                    alertToas(null, titleView + ' không thể nhỏ hơn ' + minVal);
                    this.focus();
                    return null;
                }
            }
            if (maxVal != undefined && maxVal != null && maxVal != '') {
                if (objValue > maxVal) {
                    alertToas(null, titleView + ' không thể lớn hơn ' + maxVal);
                    $(this).focus();
                    return null;
                }
            }
            objSave[fieldMap] = getValueInput(idObject);
        }
    });
    return objSave;
}
async function Gen_ServiceToDiv(ServiceName, id, data, prWait) {
    if (data == undefined || data == null) {
        data = {};
    }
    WaitDialog(prWait);
    jAjax(ServiceName, data, async function (obj) {
        CompleteDialog(prWait);
        if (obj.code == 0) {
            await Gen_GetDataToDiv(obj.data, id, prWait);
        }
        else {
            alertToas(null, 'Có lỗi khi lấy dữ liệu: ' + obj.msg);
        }
    }, id);
}
async function Gen_DyamicToDiv(id, data, prWait) {
    $('#' + id + ' div[TabName]').each(async function () {
        let Table = $(this).attr('TabName');
        if (Table != undefined && Table != '') {
            await Gen_ServiceToDiv("Dyamic_GetDataToDiv", this.id, { Table: Table, data: data }, prWait);
        }
    });
}
function Gen_DivToService(ServiceName, id, fCall, exParam) {
    let objData = [];
    for (var i = 0; i < id.length; i++) {
        let objSve = Gen_SetDataToObject(id[i]);
        if (objSve == null) {
            return;
        }
        let TableSave = $('#' + id[i]).attr('TabName');
        if (TableSave == undefined || TableSave == null) {
            TableSave = id[i];
        }
        if (exParam != undefined && exParam != null) {
            for (let item in exParam) {
                objSve[item] = exParam[item];
            }
        }
        objData.push({ TableName: TableSave, data: objSve });
    }
    jAjax(ServiceName, { data: objData }, function (obj) {
        if (obj.code == 0) {
            fCall(obj);
        }
        else {
            alertToas(null, 'Có lỗi khi lưu dữ liệu: ' + obj.msg);
        }
    }, id);
}
function Gen_DivToTable(id, fCall, exParam) {
    let idCall = [];;
    $('#' + id + ' div').each(function () {
        let Table = $(this).attr('TabName');
        if (Table != undefined && Table != '') {
            idCall.push(this.id);
        }
    });
    Gen_DivToService('Dyamic_SetDataFromDiv', idCall, fCall, exParam);
}
//#endregion
//#region FileSelect
(function () {
    let boderstyle = '1px dashed #aaa';
    function createDragDropUploader(container, onChange, multipe, filtertype) {
        if (!container) return;
        //Tạo file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = multipe;
        fileInput.accept = filtertype;
        fileInput.style.display = 'none';
        container.appendChild(fileInput);
        //style mặc định
        container.style.border = boderstyle;
        container.style.borderRadius = '5px';
        container.style.textAlign = 'center';
        container.style.cursor = 'pointer';
        container.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="float:left;margin:3px"></i><i style="color:gray" id="' + container.id + '_fileselect_text">Kéo thả file vào đây hoặc click để chọn file</i>';
        // Highlight khi kéo file vào
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.style.borderColor = 'darkred';
            container.style.backgroundColor = 'var(--main-color)';
            container.style.color = '#fff';
        });
        //Bỏ Hightlight khi đi ra
        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            container.style.borderColor = '#aaa';
            container.style.backgroundColor = '';
        });
        // Thả file
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.style.borderColor = '#aaa';
            container.style.backgroundColor = '';
            triggerChange(e.dataTransfer.files);
        });
        // Click mở file dialog
        container.addEventListener('click', () => {
            fileInput.click();
        });
        //Event Change
        fileInput.addEventListener('change', (e) => {
            triggerChange(e.target.files);
            fileInput.value = '';
        });

        function triggerChange(files) {
            if (typeof onChange === 'function') {
                onChange(files);
            }
        }
    }

    // Export ra global
    window.createDragDropUploader = createDragDropUploader;
})();
//#endregion
//#region Dialog Img Slide Show Modal
let currentImgIndexDialogSlideShow = 0;
let listImageDialogSlideShows = [];

function ShowImgDialogSlideShow(obj) {
    let modal = document.getElementById("dynamicImgModalDialogSlideShow");

    // Tìm tất cả img trong cùng cha để lập danh sách slide
    const parent = obj.parentElement;
    listImageDialogSlideShows = Array.from(parent.querySelectorAll('img'));
    currentImgIndexDialogSlideShow = listImageDialogSlideShows.indexOf(obj);

    if (!modal) {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes imgSlide { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .nav-btn-ds {
                position: absolute; top: 50%; transform: translateY(-50%);
                color: white; font-size: 50px; cursor: pointer; padding: 20px;
                user-select: none; transition: 0.3s; z-index: 10001;
            }
            .nav-btn-ds:hover { background: rgba(255,255,255,0.1); border-radius: 10px; }
            .nav-left-ds { left: 10px; }
            .nav-right-ds { right: 10px; }
        `;
        document.head.appendChild(style);

        modal = document.createElement('div');
        modal.id = "dynamicImgModalDialogSlideShow";
        Object.assign(modal.style, {
            display: 'none', position: 'fixed', zIndex: '10000',
            left: '0', top: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.9)', cursor: 'default',
            alignItems: 'center', justifyContent: 'center'
        });

        modal.innerHTML = `
            <span style="position:absolute; top:20px; right:35px; color:white; font-size:40px; cursor:pointer; z-index:10002" 
                  onclick="document.getElementById('dynamicImgModalDialogSlideShow').style.display='none'">&times;</span>
            
            <div class="nav-btn-ds nav-left-ds" onclick="changeImgDialogSlideShow(-1)">&#10094;</div>
            
            <img id="dynamicImgFullDialogSlideShow" style="max-width:90%; max-height:90%; border:3px solid white; border-radius:5px; transition: 0.3s ease;">
            
            <div class="nav-btn-ds nav-right-ds" onclick="changeImgDialogSlideShow(1)">&#10095;</div>
            
            <div id="imgIndexTagDialogSlideShow" style="position:absolute; bottom:20px; color:white; font-size:16px; background:rgba(0,0,0,0.5); padding:5px 15px; border-radius:20px;"></div>
        `;

        modal.onclick = function (e) {
            if (e.target === modal) modal.style.display = 'none';
        };

        document.body.appendChild(modal);
    }

    updateModalImageDialogSlideShow();
    modal.style.display = 'flex';
    modal.style.animation = 'modalFadeIn 0.3s';
}

function updateModalImageDialogSlideShow() {
    const modalImg = document.getElementById("dynamicImgFullDialogSlideShow");
    const indexTag = document.getElementById("imgIndexTagDialogSlideShow");
    const targetImg = listImageDialogSlideShows[currentImgIndexDialogSlideShow];

    if (targetImg) {
        modalImg.src = targetImg.src;
        modalImg.style.animation = 'none';
        modalImg.offsetHeight; // Trigger reflow
        modalImg.style.animation = 'imgSlide 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';

        indexTag.innerText = `${currentImgIndexDialogSlideShow + 1} / ${listImageDialogSlideShows.length}`;

        // Ẩn/hiện nút điều hướng
        const isMulti = listImageDialogSlideShows.length > 1;
        document.querySelector('.nav-left-ds').style.display = isMulti ? 'block' : 'none';
        document.querySelector('.nav-right-ds').style.display = isMulti ? 'block' : 'none';
    }
}

function changeImgDialogSlideShow(step) {
    currentImgIndexDialogSlideShow += step;
    if (currentImgIndexDialogSlideShow >= listImageDialogSlideShows.length) currentImgIndexDialogSlideShow = 0;
    if (currentImgIndexDialogSlideShow < 0) currentImgIndexDialogSlideShow = listImageDialogSlideShows.length - 1;

    updateModalImageDialogSlideShow();

    if (window.event) window.event.stopPropagation();
}

// Hỗ trợ phím mũi tên và Esc
document.addEventListener('keydown', function (e) {
    const modal = document.getElementById("dynamicImgModalDialogSlideShow");
    if (modal && modal.style.display === 'flex') {
        if (e.key === "ArrowLeft") changeImgDialogSlideShow(-1);
        if (e.key === "ArrowRight") changeImgDialogSlideShow(1);
        if (e.key === "Escape") modal.style.display = 'none';
    }
});
//#endregion