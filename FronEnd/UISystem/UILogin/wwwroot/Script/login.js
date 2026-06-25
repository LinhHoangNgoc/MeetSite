let timeDangNhap = 6, countDangNhap;
$(function () {
    var user = localStorage.getItem("username");
    document.getElementById('txtUserName').value = user;
    var remember = localStorage.getItem("remember");
    if (remember === "1") {
        var cipherPass = localStorage.getItem("password");
        var pass = decrypt(cipherPass);
        document.getElementById('txtPassWord').value = pass;
        document.getElementById('chkRemember').checked = true;
        countDangNhap = setInterval(CountDownDangNhap, 1000);
        document.getElementById('txtUserName').focus();
    }
})
function DoiTrangThaiDem() {
    if (document.getElementById('chkRemember').checked == false && timeDangNhap > 0) {
        clearInterval(countDangNhap);
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        localStorage.removeItem("remember");
    }
}
function CountDownDangNhap() {
    timeDangNhap -= 1;
    if (timeDangNhap <= 0) {
        clearInterval(countDangNhap);
        DangNhap();
    }
    else {
        $('#btnDangNhap').val('Đăng nhập (' + timeDangNhap + 's)');
    }
}
document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        var active = document.activeElement;
        if (active.id == 'txtUserName') {
            document.getElementById('txtPassWord').focus();
        }
        else {
            DangNhap();
        }
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        let lbl = document.getElementById('lblRunScriptInit');
        if (lbl.style.display === 'none' || lbl.style.display === '') {
            lbl.style.display = 'block';
        } else {
            lbl.style.display = 'none';
        }
    }
});
function DangNhap() {
    var username = getValueInput('txtUserName');
    var password = getValueInput('txtPassWord');

    if (!username) { alertToas(null, 'Vui lòng nhập tên đăng nhập'); return; }
    if (!password) { alertToas(null, 'Vui lòng nhập mật khẩu'); return; }

    WaitDialog('tabLogin');
    jAjax('/Login/Login', { UserName: getValueInput('txtUserName'), PassWord: getValueInput('txtPassWord') }, function (obj) {
        CompleteDialog('tabLogin');
        if (obj.code == 0) {
            localStorage.setItem("username", getValueInput('txtUserName'));
            if (document.getElementById('chkRemember').checked) {
                localStorage.setItem("password", encrypt(password));
                localStorage.setItem("remember", "1");
            } else {
                localStorage.removeItem("password");
                localStorage.removeItem("remember");
            }
            window.location = obj.data;
        }
        else {
            alertToas(null, 'Có lỗi khi đăng nhập: ' + obj.message);
        }
    });
}
function CNCT() {
    WaitDialog('divBody');
    jAjax('/Update/UpdateAllDll', {}, function () {
        CompleteDialog('divBody');
    });
}