using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;

/// <summary>
/// RBAC effective-permission resolver (vai tro -> quyen).
/// Mo rong tren nen tang login/quyen san co, KHONG thay the.
///
/// Nguyen tac AN TOAN (fail-open):
///  - Admin (co bang ListUser.Admin = 1, hoac username 'admin', hoac thuoc vai tro 'Admin')
///    => toan quyen (isAdmin = true).
///  - Neu cac bang RBAC (DmVaiTro/VaiTro_Quyen/NguoiDung_VaiTro) CHUA ton tai,
///    hoac user CHUA duoc gan vai tro nao => coi nhu "khong gioi han boi RBAC"
///    (isAdmin-style allow-all theo nghia khong chan), de viec deploy KHONG khoa
///    nguoi dung hien huu ra ngoai.
///  - Chi khi user CO it nhat 1 vai tro thi quyen moi bi gioi han theo union cac vai tro do.
/// </summary>
public class PermissionService
{
    private readonly Connection _cn;
    public PermissionService(Connection cn)
    {
        _cn = cn;
    }

    public class EffectivePermission
    {
        // Toan quyen (admin HOAC fail-open vi chua co du lieu RBAC cho user).
        public bool IsAdmin { get; set; }
        // Tap (GroupKey, ControlKey, Action) duoc cap (rong khi IsAdmin).
        public HashSet<(string GroupKey, string ControlKey, string Action)> Perms { get; set; }
            = new HashSet<(string, string, string)>();
        // Danh sach GroupKey duy nhat duoc phep (de Start-menu/desktop bat/tat module).
        public List<string> AllowedGroups { get; set; } = new List<string>();
    }

    private static bool RbacTablesExist(Connection cn)
    {
        string msg = "";
        try
        {
            var dt = cn.LayBangDL(
                "Select Count(*) c From sys.tables Where name In ('DmVaiTro','VaiTro_Quyen','NguoiDung_VaiTro')",
                ref msg);
            if (dt == null || dt.Rows.Count == 0) return false;
            return Convert.ToInt32(dt.Rows[0]["c"]) >= 3;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Xac dinh user co phai Admin khong:
    ///  - username 'admin' (khong phan biet hoa thuong), HOAC
    ///  - ListUser.Admin = 1, HOAC
    ///  - thuoc vai tro co MaVaiTro='Admin' hoac TenVaiTro='Admin'.
    /// </summary>
    public bool IsAdmin(string username)
    {
        if (string.IsNullOrWhiteSpace(username)) return false;
        if (string.Equals(username.Trim(), "admin", StringComparison.OrdinalIgnoreCase)) return true;
        string msg = "";
        try
        {
            var dt = _cn.LayBangDLParam(
                "Select Top 1 Admin From ListUser Where TenDangNhap = @u",
                ref msg, false, "@u", null!, username);
            if (dt != null && dt.Rows.Count > 0)
            {
                var v = dt.Rows[0]["Admin"];
                if (v != null && v != DBNull.Value)
                {
                    try { if (Convert.ToBoolean(v)) return true; } catch { }
                }
            }
        }
        catch { }

        // Vai tro Admin (chi khi bang RBAC ton tai).
        try
        {
            if (RbacTablesExist(_cn))
            {
                var dtR = _cn.LayBangDLParam(
                    @"Select Top 1 1
                      From NguoiDung_VaiTro nv
                      Join DmVaiTro v On v.ID = nv.IDVaiTro
                      Where nv.Username = @u
                        And (v.MaVaiTro = N'Admin' Or v.TenVaiTro = N'Admin')
                        And IsNull(v.Active, 1) = 1",
                    ref msg, false, "@u", null!, username);
                if (dtR != null && dtR.Rows.Count > 0) return true;
            }
        }
        catch { }
        return false;
    }

    /// <summary>
    /// Tinh quyen hieu luc cho user (union cac vai tro), hoac toan quyen neu admin/fail-open.
    /// </summary>
    public EffectivePermission GetEffective(string username)
    {
        var result = new EffectivePermission();

        if (IsAdmin(username))
        {
            result.IsAdmin = true;
            return result;
        }

        // Fail-open: thieu bang RBAC -> khong gioi han.
        if (!RbacTablesExist(_cn))
        {
            result.IsAdmin = true;
            return result;
        }

        string msg = "";
        DataTable? dtRoles = null;
        try
        {
            dtRoles = _cn.LayBangDLParam(
                @"Select v.ID
                  From NguoiDung_VaiTro nv
                  Join DmVaiTro v On v.ID = nv.IDVaiTro
                  Where nv.Username = @u And IsNull(v.Active, 1) = 1",
                ref msg, false, "@u", null!, username);
        }
        catch { dtRoles = null; }

        // Fail-open: user CHUA duoc gan vai tro nao -> khong gioi han.
        if (dtRoles == null || dtRoles.Rows.Count == 0)
        {
            result.IsAdmin = true;
            return result;
        }

        // Union quyen cua cac vai tro.
        try
        {
            var dtPerms = _cn.LayBangDLParam(
                @"Select Distinct q.GroupKey, q.ControlKey, q.Action
                  From VaiTro_Quyen q
                  Join NguoiDung_VaiTro nv On nv.IDVaiTro = q.IDVaiTro
                  Join DmVaiTro v On v.ID = nv.IDVaiTro
                  Where nv.Username = @u And IsNull(v.Active, 1) = 1",
                ref msg, false, "@u", null!, username);
            if (dtPerms != null)
            {
                foreach (DataRow r in dtPerms.Rows)
                {
                    string g = (r["GroupKey"] ?? "").ToString() ?? "";
                    string c = (r["ControlKey"] ?? "").ToString() ?? "";
                    string a = (r["Action"] ?? "").ToString() ?? "";
                    result.Perms.Add((g, c, a));
                }
            }
        }
        catch { }

        result.AllowedGroups = result.Perms
            .Select(p => p.GroupKey)
            .Where(g => !string.IsNullOrWhiteSpace(g))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return result;
    }

    // Cache danh sach GroupKey "co bi RBAC quan ly" (xuat hien trong VaiTro_Quyen).
    // Chi nhung group nay moi bi gac server-side; group khong cau hinh quyen -> KHONG gac (fail-open).
    private static HashSet<string>? _gatedCache;
    private static DateTime _gatedAt;
    /// <summary>
    /// Tap GroupKey dang chiu su quan ly cua RBAC (co it nhat 1 vai tro cau hinh quyen cho no).
    /// Cache 60s. Loi/thieu bang -> tap rong (nghia la KHONG gac gi -> fail-open).
    /// </summary>
    public HashSet<string> GetGatedGroups()
    {
        try
        {
            if (_gatedCache != null && (DateTime.UtcNow - _gatedAt).TotalSeconds < 60)
                return _gatedCache;
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (RbacTablesExist(_cn))
            {
                string msg = "";
                var dt = _cn.LayBangDL(
                    "Select Distinct GroupKey From VaiTro_Quyen Where GroupKey Is Not Null And GroupKey <> ''",
                    ref msg);
                if (dt != null)
                    foreach (DataRow r in dt.Rows)
                    {
                        var g = (r["GroupKey"] ?? "").ToString();
                        if (!string.IsNullOrWhiteSpace(g)) set.Add(g.Trim());
                    }
            }
            _gatedCache = set; _gatedAt = DateTime.UtcNow;
            return set;
        }
        catch { return _gatedCache ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase); }
    }

    /// <summary>
    /// Kiem tra user co quyen (groupKey, controlKey, action) khong.
    /// Admin / fail-open -> luon true. So khop khong phan biet hoa thuong.
    /// </summary>
    public bool Has(string username, string groupKey, string controlKey, string action)
    {
        var eff = GetEffective(username);
        if (eff.IsAdmin) return true;
        return eff.Perms.Any(p =>
            string.Equals(p.GroupKey, groupKey, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(p.ControlKey, controlKey, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(p.Action, action, StringComparison.OrdinalIgnoreCase));
    }
}
