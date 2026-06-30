using System.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// Endpoint RBAC phía client (genSupport.js gọi để ẩn/hiện nút Thêm/Sửa/Xóa theo quyền).
// Trả về cấu trúc PHẲNG: { code, isAdmin, allowed:[GroupKey], perms:["GroupKey|Action"] }.
[Route("api/Auth")]
public class AuthController : Controller
{
    private readonly Connection _cn;
    private readonly Sys _sys;
    public AuthController(Connection cn, Sys sys) { _cn = cn; _sys = sys; }

    [HttpGet("MyPermissions")]
    public IActionResult MyPermissions()
    {
        string user = HttpContext.Session.GetString("TenDangNhap") ?? "";
        string adm = HttpContext.Session.GetString("Admin") ?? "";
        bool isAdmin = adm.Equals("True", StringComparison.OrdinalIgnoreCase) || adm == "1";

        var allowed = new List<string>();
        var perms = new List<string>();
        if (!isAdmin && !string.IsNullOrEmpty(user))
        {
            string msg = "";
            var dt = _cn.LayBangDLParam(@"
                Select Distinct q.GroupKey, q.Action
                From ListUser u
                Join NguoiDung_VaiTro nv On nv.Username = u.TenDangNhap
                Join VaiTro_Quyen q On q.IDVaiTro = nv.IDVaiTro
                Join DmVaiTro v On v.ID = nv.IDVaiTro And IsNull(v.Active,1) = 1
                Where u.TenDangNhap = @u", ref msg, false, "@u", null!, user);
            if (dt != null)
                foreach (DataRow r in dt.Rows)
                {
                    string g = (r["GroupKey"]?.ToString() ?? "").Trim();
                    string a = (r["Action"]?.ToString() ?? "").Trim();
                    if (g == "") continue;
                    if (!allowed.Contains(g)) allowed.Add(g);
                    if (a != "") perms.Add(g + "|" + a);
                }
        }
        return Json(new { code = 0, isAdmin, allowed, perms });
    }
}
