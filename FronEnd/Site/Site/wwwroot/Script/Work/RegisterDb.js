$(function () {
    inputStyle('divSetupDB');
    LoadDb();
});
document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        var active = document.activeElement;
        if (active && (active.id === "serverName" || active.id == "userName") || active.id == "passWord") {
            e.preventDefault();
            LoadDb();
        }
    }
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        SaveDbConfig();
    }
});
function LoadDb() {
    if (getValueInput("serverName") == '' || getValueInput("userName") == '' || getValueInput("passWord") == '' || getValueInput("serverName") == null || getValueInput("userName") == null || getValueInput("passWord") == null) {
        newDropDownSingle('databaseName', [{ name: '-- Chưa chọn database --' }], 'name', 'name', '-- Chưa chọn database --');
    }
    else {
        WaitDialog('divBody');
        jAjax("/RegisterDB/GetDataBase", { ServerName: getValueInput('serverName'), Username: getValueInput("userName"), Password: getValueInput("passWord") }, function (result) {
            newDropDownSingle('databaseName', result, 'name', 'name', null, null);
            CompleteDialog('divBody');
        }, 'divBody');
    }
}
function SaveDbConfig() {
    let objTest = getValueInput('serverName');
    if (objTest == '' || objTest == null) {
        alert('Nhập vào server!');
        document.getElementById('serverName').focus();
        return;
    }
    objTest = getValueInput('userName');
    if (objTest == '' || objTest == null) {
        alert('Nhập vào tài khoản sql!');
        document.getElementById('userName').focus();
        return;
    }
    objTest = getValueInput('passWord');
    if (objTest == '' || objTest == null) {
        alert('Nhập vào mật khẩu sql!');
        document.getElementById('passWord').focus();
        return;
    }
    objTest = getValueInput('databaseName');
    if (objTest == '-- Chưa chọn database --' || objTest == '' || objTest == null) {
        objTest = getValueInput('newDb');
        if (objTest == '' || objTest == null) {
            alert('Chọn database hoặc nhập tên database mới!');
            document.getElementById('newDb').focus();
            return;
        }
    }
    objTest = getValueInput('adminUser');
    if (objTest == '' || objTest == null) {
        alert('Nhập vào user admin!');
        document.getElementById('adminUser').focus();
        return;
    }
    objTest = getValueInput('adminPassword');
    if (objTest == '' || objTest == null) {
        alert('Nhập vào passworrd admin!');
        document.getElementById('adminPassword').focus();
        return;
    }
    let obj = {};
    $('#divSetupDB').find('input').each(function () {
        let idCtr = this.id;
        if (idCtr != undefined) {
            obj[idCtr] = getValueInput(idCtr);
        }
    })
    WaitDialog('divBody');
    jAjax('/RegisterDB/SaveDbConfig', obj, function (result) {
        if (result.code == 0) {
            alertToas(null, 'Lưu thành công');
        }
        else {
            alertToas(null, 'Lỗi cấu hình database: ' + result.message);
        }
        CompleteDialog('divBody');
    }, 'divSetupDb');
}