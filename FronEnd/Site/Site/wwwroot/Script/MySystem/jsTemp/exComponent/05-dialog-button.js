function ensureBootstrapModalRoot() {
    if ($('#globalBootstrapModal').length > 0) return;
    $('body').append(`
<div class="modal fade" id="globalBootstrapModal" tabindex="-1" role="dialog" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered" role="document">
<div class="modal-content shadow">
<div class="modal-header">
<h5 class="modal-title" id="globalBootstrapModalTitle">Thông báo</h5>
<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
</div>
<div class="modal-body" id="globalBootstrapModalBody"></div>
<div class="modal-footer" id="globalBootstrapModalFooter"></div>
</div>
</div>
</div>
`);
}
// Nhận biết message LƯU THÀNH CÔNG để chỉ hiện toast nhẹ, không bắt bấm "Đồng ý".
// Quan trọng: phải loại trừ các mẫu PHỦ ĐỊNH/ LỖI (vd "Lưu không thành công", "thất bại", "Lỗi")
// để không nuốt nhầm thông báo lỗi.
function isSuccessMessageToas(mes) {
    if (mes == null) return false;
    var s = ('' + mes).trim();
    if (s === '') return false;
    var low = s.toLowerCase();
    // Phủ định / lỗi -> luôn coi là KHÔNG thành công (giữ modal)
    if (/(không thành công|chưa thành công|thất bại|không thể|lỗi|error|fail|sai |cảnh báo|warning|exception)/.test(low)) {
        return false;
    }
    // Mẫu thành công
    return /(thành công|hoàn thành|đã lưu|đã ghi|đã xóa|đã xoá|đã cập nhật|đã thêm|đã duyệt|đã chốt|lưu thành|saved)/.test(low);
}
function showToastSuccess(mes) {
    var $root = $('#globalSuccessToast');
    if ($root.length === 0) {
        $('body').append(`<div id="globalSuccessToast" style="position:fixed;z-index:20000;top:18px;left:50%;transform:translateX(-50%);
            min-width:180px;max-width:80vw;padding:10px 18px;border-radius:6px;background:#28a745;color:#fff;
            box-shadow:0 4px 14px rgba(0,0,0,.25);font-size:14px;text-align:center;display:none;"></div>`);
        $root = $('#globalSuccessToast');
    }
    if (window.__globalSuccessToastTimer) clearTimeout(window.__globalSuccessToastTimer);
    $root.text(mes == null ? '' : mes).stop(true, true).fadeIn(120);
    window.__globalSuccessToastTimer = setTimeout(function () {
        $root.fadeOut(200);
    }, 1500);
}
// forceModal=true (truyền qua pos hoặc gọi alertToasModal) để ép hiện modal kể cả message thành công.
function alertToas(id, mes, title, pos, actionCancer) {
    var forceModal = (pos === true) || (pos && pos.forceModal === true);
    if (!forceModal && isSuccessMessageToas(mes)) {
        showToastSuccess(mes);
        // Vẫn chạy callback sau-lưu (vd điều hướng) để không phá luồng cũ.
        if (actionCancer) actionCancer();
        return;
    }
    ensureBootstrapModalRoot();
    $('#globalBootstrapModalTitle').text(title || 'Thông báo');
    // Dùng .text() để tránh XSS khi message chứa dữ liệu/exception từ server.
    $('#globalBootstrapModalBody').text(mes == null ? '' : mes);
    $('#globalBootstrapModalFooter').html(`<button type="button" class="btn btn-primary" id="globalAlertOk">Đồng ý</button>`);
    $('#globalAlertOk').off('click').on('click', function () {
        $('#globalBootstrapModal').modal('hide');
        if (actionCancer) actionCancer();
    });
    $('#globalBootstrapModal').modal({ backdrop: 'static', keyboard: true, show: true });
}
// Tiện ích: ép hiện modal "Đồng ý" dù message khớp mẫu thành công.
function alertToasModal(id, mes, title, actionCancer) {
    return alertToas(id, mes, title, true, actionCancer);
}
function questionToas(id, mes, title, actionOK, actionCancer, pos) {
    ensureBootstrapModalRoot();
    let modalObj = {
        hide: function () { $('#globalBootstrapModal').modal('hide'); },
        show: function () { $('#globalBootstrapModal').modal('show'); }
    };
    $('#globalBootstrapModalTitle').text(title || 'Xác nhận');
    $('#globalBootstrapModalBody').text(mes == null ? '' : mes);
    $('#globalBootstrapModalFooter').html(`
<button type="button" class="btn btn-secondary" id="globalConfirmCancel">Hủy</button>
<button type="button" class="btn btn-danger" id="globalConfirmOk">Đồng ý</button>
`);
    $('#globalConfirmOk').off('click').on('click', function () { if (actionOK) actionOK(); $('#globalBootstrapModal').modal('hide'); });
    $('#globalConfirmCancel').off('click').on('click', function () { if (actionCancer) actionCancer(); $('#globalBootstrapModal').modal('hide'); });
    $('#globalBootstrapModal').modal({ backdrop: 'static', keyboard: true, show: true });
    return modalObj;
}
function dialogDiv(id, idpr, title, iwidth, iheigth, dlg, openEvent, closeEvent) {
    let content = document.getElementById(id);
    if (!content) return null;
    let modalId = id + '_bs_modal';
    let bodyId = id + '_bs_body';
    if ($('#' + modalId).length === 0) {
        $('body').append(`
<div class="modal fade" id="${modalId}" tabindex="-1" role="dialog" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered modal-xl" role="document" style="max-width:${iwidth || '900px'}">
<div class="modal-content shadow">
<div class="modal-header">
<h5 class="modal-title">${title || ''}</h5>
<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
</div>
<div class="modal-body" id="${bodyId}" style="height:${iheigth || 'auto'};overflow:auto"></div>
</div>
</div>
</div>
`);
        $('#' + modalId).on('shown.bs.modal', function () { if (openEvent) openEvent(); });
        $('#' + modalId).on('hidden.bs.modal', function () { if (closeEvent) closeEvent(); });
        $('#' + bodyId).append(content);
    }
    content.style.display = 'block';
    let obj = {
        show: function () { $('#' + modalId).modal({ backdrop: 'static', keyboard: true, show: true }); },
        hide: function () { $('#' + modalId).modal('hide'); }
    };
    obj.show();
    return obj;
}
function addCustonButtonToDialog(id, iconID, iconClass, iconStyle, title, clickEvent) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    const idIcon = id + '_' + iconID;
    if (!document.getElementById(idIcon)) {
        const i = document.createElement('i');
        i.id = idIcon;
        i.className = iconClass;
        i.title = title;
        i.style.cssText = iconStyle || '';
        if (clickEvent) i.addEventListener('click', clickEvent);
        dialog.prepend(i);
    }
}
function enableBtn(id, event) {
    const elm = document.getElementById(id);
    if (!elm) return;
    elm.disabled = false;
    elm.classList.remove('buttondeactive');
    elm.classList.add('buttonactive');
    if (event) { elm.removeEventListener('click', event, false); elm.addEventListener('click', event, false); }
}
function disableBtn(id, event) {
    const elm = document.getElementById(id);
    if (!elm) return;
    elm.disabled = true;
    elm.classList.remove('buttonactive');
    elm.classList.add('buttondeactive');
    if (event) elm.removeEventListener('click', event, false);
}
function btnIsEnable(id) {
    const elm = document.getElementById(id);
    return !!elm && !elm.disabled;
}
