window.CacheReady = (async function () {
    window.AppCache = new locationDB("locationDB", 1);
    await window.AppCache.init();
})();
function DangXuat() {
    jAjax('/Login/Logout', {}, function (obj) {
        if (obj.code == 0) {
            location.href = '/Login';
        }
        else {
            alertToas(null, 'Lỗi khi đăng xuất: ' + obj.message);
        }
    });
}
let dlgDoiMatKhau;
function DoiMatKhau() {
    dlgDoiMatKhau = dialogDiv('divDoiMatKhau', 'dialogDoiMatKhau', 'Đổi mật khẩu', '400px', null, dlgDoiMatKhau, function () {
        inputStyle('divDoiMatKhau');
        $('#txtUserNameOld').val($('#divTenDangNhapSave').html());
    }, null);
}
function LuuDoiMatKhau() {
    if ($('#txtPassWordNew').val() != $('#txtPassWordPre').val()) {
        alertToas(null, 'Hai ô mật khẩu không khớp');
        return;
    }
    WaitDialog('divBody');
    jAjax('/Login/DoiMatKhau', { OldPass: $('#txtPassWordOld').val(), NewPass: $('#txtPassWordNew').val() }, function (obj) {
        CompleteDialog('divBody');
        if (obj.code == 0) {
            dlgDoiMatKhau.hide();
            $('#txtPassWordNew').val('');
            $('#txtPassWordOld').val('');
            $('#txtPassWordPre').val('');
        }
        else {
            alertToas(null, 'Có lỗi khi đổi mật khẩu: ' + obj.message);
        }
    });
}
async function getCacheDB(name) {
    await window.CacheReady;
    let item = await AppCache.getWithMeta(name);
    return item;
}
async function setCacheDB(name, data, lastmodified) {
    await AppCache.set(name, data, lastmodified);
}
async function GetLocationSetting(key) {
    let objx = await getCacheDB("LocationSetting");
    if (objx == null) {
        objx = [];
    }
    else {
        objx = objx.data;
    }
    let item = objx.find(x => x.Key == key);
    if (item != undefined) {
        return item.Value;
    }
    else {
        return null;
    }
}
async function SetLocationSetting(key, value) {
    let objx = await getCacheDB("LocationSetting");
    if (objx == null) {
        objx = [];
    }
    else {
        objx = objx.data;
    }
    let item = objx.find(x => x.Key == key);
    if (item != undefined) {
        item.Value = value
    }
    else {
        objx.push({ Key: key, Value: value });
    }
    await setCacheDB("LocationSetting", objx);
}
function ShowPanelThongBao() {
    if ($('#panelThongBao').css('display') == 'none') {
        $('#panelThongBao').slideDown(500);
    }
    else {
        $('#panelThongBao').slideUp(500);
    }
}
var MultiSelectUltimate = (function () {
    const pageSize = 1000; // số item load mặc định mỗi lần
    function createMultiSelect(id, dataSource, displayMember, valueMember, defValue, changeEvent) {
        let skipCount = 0;
        let lazyData = dataSource.slice(0, pageSize);
        skipCount += pageSize;
        const ms = new ej.dropdowns.MultiSelect({
            dataSource: lazyData,
            value: defValue,
            fields: { text: displayMember, value: valueMember },
            mode: "CheckBox",
            allowSearch: true,
            showDropDownIcon: true,
            enableVirtualization: true,
            itemHeight: 29,
            change: changeEvent,
            showSelectAll: false,
            filtering: function (e) {
                e.preventDefaultAction = true;
                skipCount = 0;
                const filterText = (e.text || '').toLowerCase();
                const filteredData = dataSource.filter(x =>
                    String(x[displayMember]).toLowerCase().includes(filterText) || String(x[valueMember]).toLowerCase().includes(filterText)
                );
                lazyData = filteredData.length ? filteredData.slice(0, pageSize) : [];
                skipCount = lazyData.length;
                ms._lazyData = filteredData;
                e.updateData(lazyData.length ? lazyData : []);
            },
            actionBegin: function (e) {
                if (e.requestType === 'virtualscroll' && ms._lazyData && ms._lazyData.length) {
                    const nextData = ms._lazyData.slice(skipCount, skipCount + pageSize) || [];
                    if (nextData.length) {
                        skipCount += nextData.length;
                        e.updateData(nextData, null, true);
                    }
                }
            }
        });
        ms.appendTo("#" + id);
        ms.selectAll = function () {
            const allValues = dataSource.map(x => x[valueMember]);
            ms.value = allValues;
        };
        return ms;
    }
    return {
        MultiSelect: createMultiSelect
    };
})();
