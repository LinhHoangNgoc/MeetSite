var curDiv;
let offsetX, offsetY, isDragging = false;
// Cache kích thước khi bắt đầu kéo để không phải đọc layout (gây reflow) mỗi mousemove.
let _mvMaxLeft = 0, _mvMaxTop = 0;
let _mvRaf = null, _mvLeft = 0, _mvTop = 0;
document.addEventListener('DOMContentLoaded', function () {
    $(function () {
        //Move
        var lstDiv = document.getElementsByName('divMove');
        for (var i = 0; i < lstDiv.length; i++) {
            lstDiv[i].addEventListener("mousedown", moverctr_mouseDown);
        }
        document.addEventListener("mousemove", moverctr_moveCtr);
        document.addEventListener("mouseup", moverctr_stopMoveCtr);
        window.addEventListener("keydown", moverctrCmdKey, true);
    });
})
function moverctr_mouseDown(e) {
    var lstDiv = document.getElementsByName('divMove');
    for (var i = 0; i < lstDiv.length; i++) {
        $(lstDiv[i]).css('border-color','#d2d3d5');
    }
    curDiv = e.target;
    $(curDiv).css('border-color', 'darkblue');
    var dw = $(curDiv).width(), dh = $(curDiv).height();
    if (e.offsetX < dw - 10 || e.offsetY < dh - 10) {
        isDragging = true;
        offsetX = e.clientX - curDiv.offsetLeft;
        offsetY = e.clientY - curDiv.offsetTop;
        // Đọc kích thước cha/con một lần duy nhất tại đây.
        _mvMaxLeft = $(curDiv.parentElement).width() - dw;
        _mvMaxTop = $(curDiv.parentElement).height() - dh;
        curDiv.style.cursor = "grabbing";
    }
    else {
        moverctr_stopMoveCtr();
    }
}
function moverctr_moveCtr(e) {
    if (!isDragging) return;
    var iLeft = e.clientX - offsetX;
    var iTop = e.clientY - offsetY;
    if (iLeft < 0) iLeft = 0;
    if (iTop < 0) iTop = 0;
    if (iLeft > _mvMaxLeft) iLeft = _mvMaxLeft;
    if (iTop > _mvMaxTop) iTop = _mvMaxTop;
    _mvLeft = iLeft;
    _mvTop = iTop;
    // Gom các thao tác ghi style vào 1 frame để di chuyển mượt, tránh layout thrash.
    if (_mvRaf == null) {
        _mvRaf = requestAnimationFrame(function () {
            _mvRaf = null;
            if (curDiv) {
                curDiv.style.left = _mvLeft + "px";
                curDiv.style.top = _mvTop + "px";
            }
        });
    }
}
function moverctr_stopMoveCtr() {
    if (isDragging) {
        curDiv.style.cursor = "grab";
        isDragging = false;
        if (_mvRaf != null) { cancelAnimationFrame(_mvRaf); _mvRaf = null; }
    }
}
function moverctrCmdKey(evt) {
    if (curDiv != undefined) {
        if (evt.shiftKey && evt.key === "ArrowLeft") {
            curDiv.style.width = ($(curDiv).outerWidth() - 1) + "px";
            evt.preventDefault();
        }
        else {
            if ((evt.keyCode) == 37) {
                var iLeft = $(curDiv).position().left - 1;
                if (iLeft < 0) {
                    iLeft = 0;
                }
                curDiv.style.left = iLeft + "px";
                evt.preventDefault();
            }
        }
        if (evt.shiftKey && evt.key === "ArrowUp") {
            curDiv.style.height = ($(curDiv).outerHeight() - 1) + "px";
            evt.preventDefault();
        }
        else {
            if ((evt.keyCode) == 38) {
                var iTop = $(curDiv).position().top - 1;
                if (iTop < 0) {
                    iTop = 0;
                }
                curDiv.style.top = iTop + "px";
                evt.preventDefault();
            }
        }
        if (evt.shiftKey && evt.key === "ArrowRight") {
            curDiv.style.width = ($(curDiv).outerWidth() + 1) + "px";
            evt.preventDefault();
        }
        else {
            if ((evt.keyCode) == 39) {
                var iLeft = $(curDiv).position().left + 1;
                if (iLeft > $(curDiv.parentElement).width() - $(curDiv).width()) {
                    iLeft = $(curDiv.parentElement).width() - $(curDiv).width();
                }
                curDiv.style.left = iLeft + "px";
                evt.preventDefault();
            }
        }
        if (evt.shiftKey && evt.key === "ArrowDown") {
            curDiv.style.height = ($(curDiv).outerHeight() + 1) + "px";
            evt.preventDefault();
        }
        else {
            if ((evt.keyCode) == 40) {
                var iTop = $(curDiv).position().top + 1;
                if (iTop > $(curDiv.parentElement).height() - $(curDiv).height()) {
                    iTop = $(curDiv.parentElement).height() - $(curDiv).height();
                }
                curDiv.style.top = iTop + "px";
                evt.preventDefault();
            }
        }
    }
}