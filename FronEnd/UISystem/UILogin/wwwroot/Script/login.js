let timeDangNhap = 5, countDangNhap;
$(function () {
    var user = localStorage.getItem("username") || "";
    document.getElementById('txtUserName').value = user;
    var remember = localStorage.getItem("remember");
    // Tránh vòng lặp: nếu lần trước đã tự đăng nhập mà vẫn quay về /Login -> không tự lặp lại.
    var triedOnce = sessionStorage.getItem("meet.autoLoginTried") === "1";
    if (remember === "1" && user) {
        var pass = "";
        try { pass = decrypt(localStorage.getItem("password")) || ""; } catch (e) { pass = ""; }
        document.getElementById('txtPassWord').value = pass;
        document.getElementById('chkRemember').checked = true;
        if (pass && !triedOnce) {
            // Bắt đầu đếm ngược 5s rồi tự đăng nhập.
            timeDangNhap = 5;
            $('#btnDangNhap').val('Tự đăng nhập (' + timeDangNhap + 's)');
            countDangNhap = setInterval(CountDownDangNhap, 1000);
            // Bấm vào ô / nút sẽ hủy tự động (để người dùng chủ động)
            ['txtUserName', 'txtPassWord'].forEach(function (id) {
                document.getElementById(id).addEventListener('focus', HuyTuDangNhap, { once: true });
            });
        }
    }
})
function HuyTuDangNhap() {
    if (countDangNhap) { clearInterval(countDangNhap); countDangNhap = null; }
    $('#btnDangNhap').val('Đăng nhập');
}
function DoiTrangThaiDem() {
    if (document.getElementById('chkRemember').checked == false) {
        HuyTuDangNhap();
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        localStorage.removeItem("remember");
    }
}
function CountDownDangNhap() {
    timeDangNhap -= 1;
    if (timeDangNhap <= 0) {
        clearInterval(countDangNhap); countDangNhap = null;
        sessionStorage.setItem("meet.autoLoginTried", "1");
        DangNhap();
    }
    else {
        $('#btnDangNhap').val('Tự đăng nhập (' + timeDangNhap + 's)');
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
            sessionStorage.removeItem("meet.autoLoginTried");
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
            // Đăng nhập thất bại: DỌN dữ liệu ghi nhớ để tránh tự điền / tự đăng nhập sai lặp lại.
            HuyTuDangNhap();
            localStorage.removeItem('password');
            localStorage.removeItem('remember');
            sessionStorage.removeItem('meet.autoLoginTried');
            try { document.getElementById('chkRemember').checked = false; } catch (e) { }
            document.getElementById('txtPassWord').value = '';
            document.getElementById('txtPassWord').focus();
            alertToas(null, obj.message || 'Sai thông tin tài khoản');
        }
    });
}
function CNCT() {
    WaitDialog('divBody');
    jAjax('/Update/UpdateAllDll', {}, function () {
        CompleteDialog('divBody');
    });
}