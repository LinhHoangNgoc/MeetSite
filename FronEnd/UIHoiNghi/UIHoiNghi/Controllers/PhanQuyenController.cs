using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "PhanQuyen": quản trị RBAC — vai trò, ma trận quyền, người dùng.
// CHỈ QUẢN TRỊ VIÊN: gác cứng ở server (vì nhóm PhanQuyen không nằm trong ma trận quyền nên
// CheckLoginFilter fail-open — chốt admin tại đây để chặn truy cập trực tiếp bằng URL).
public class PhanQuyenController : MeetBaseController
{
    public PhanQuyenController(Connection cn, Sys sys) : base(cn, sys) { }

    public override void OnActionExecuting(Microsoft.AspNetCore.Mvc.Filters.ActionExecutingContext context)
    {
        var admin = HttpContext.Session.GetString("Admin");
        bool isAdmin = !string.IsNullOrEmpty(admin) && (admin.Equals("True", StringComparison.OrdinalIgnoreCase) || admin == "1");
        if (!isAdmin) { context.Result = new StatusCodeResult(403); return; }
        base.OnActionExecuting(context);
    }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "phanquyen"; return View(); }

    // ===== Vai trò =====
    [HttpPost]
    public Dictionary<string, object> ListVaiTro()
        => Query(@"Select v.ID, v.MaVaiTro, v.TenVaiTro, v.GhiChu, v.Active,
                          (Select Count(*) From NguoiDung_VaiTro nv Where nv.IDVaiTro=v.ID) As SoNguoiDung
                   From DmVaiTro v Order By v.ID");

    [HttpPost]
    public Dictionary<string, object> SaveVaiTro([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        if (string.IsNullOrWhiteSpace(S(obj, "TenVaiTro"))) return Fail("Nhập tên vai trò");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("DmVaiTro");
        string ma = S(obj, "MaVaiTro"); if (string.IsNullOrWhiteSpace(ma)) ma = "VT" + id;
        string sql = isNew
            ? "Insert Into DmVaiTro(ID,MaVaiTro,TenVaiTro,GhiChu,Active) Values(@id,@ma,@ten,@gc,@ac)"
            : "Update DmVaiTro Set MaVaiTro=@ma,TenVaiTro=@ten,GhiChu=@gc,Active=@ac Where ID=@id";
        if (!Exec(sql, ref msg, "@id", null!, id, "@ma", null!, ma, "@ten", null!, S(obj, "TenVaiTro"),
            "@gc", null!, S(obj, "GhiChu"), "@ac", null!, (obj.ContainsKey("Active") && !B(obj, "Active") ? 0 : 1))) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteVaiTro([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        Exec("Delete From VaiTro_Quyen Where IDVaiTro=@id; Delete From NguoiDung_VaiTro Where IDVaiTro=@id; Delete From DmVaiTro Where ID=@id", ref msg, "@id", null!, id);
        return Ok();
    }

    // ===== Danh mục chức năng =====
    [HttpPost]
    public Dictionary<string, object> ListChucNang()
        => Query("Select ID, GroupKey, ControlKey, TenChucNang, iOrder From DmChucNang Order By iOrder, ID");

    // Quyền hiện tại của 1 vai trò.
    [HttpPost]
    public Dictionary<string, object> GetQuyen([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query("Select GroupKey, ControlKey, Action From VaiTro_Quyen Where IDVaiTro=@id", "@id", null!, I(obj, "ID"));
    }

    // Lưu ma trận quyền cho vai trò. Perms = JSON [{GroupKey,ControlKey,Action}].
    [HttpPost]
    public Dictionary<string, object> SaveQuyen([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idVT = I(obj, "ID"); if (idVT <= 0) return Fail("Thiếu vai trò");
        string msg = "";
        Exec("Delete From VaiTro_Quyen Where IDVaiTro=@id", ref msg, "@id", null!, idVT);
        try
        {
            using var doc = JsonDocument.Parse(S(obj, "Perms"));
            foreach (var p in doc.RootElement.EnumerateArray())
            {
                Exec("Insert Into VaiTro_Quyen(ID,IDVaiTro,GroupKey,ControlKey,Action) Values(@id,@vt,@g,@c,@a)", ref msg,
                    "@id", null!, NextId("VaiTro_Quyen"), "@vt", null!, idVT,
                    "@g", null!, p.GetProperty("GroupKey").GetString(),
                    "@c", null!, p.GetProperty("ControlKey").GetString(),
                    "@a", null!, p.GetProperty("Action").GetString());
            }
        }
        catch (Exception ex) { return Fail("Dữ liệu quyền lỗi: " + ex.Message); }
        return Ok();
    }

    // ===== Người dùng hệ thống =====
    [HttpPost]
    public Dictionary<string, object> ListUser()
        => Query(@"Select u.ID, u.HoTen, u.TenDangNhap, u.Admin, u.Khoa,
                          Stuff((Select N', '+v.TenVaiTro From NguoiDung_VaiTro nv Join DmVaiTro v On v.ID=nv.IDVaiTro
                                 Where nv.Username=u.TenDangNhap For Xml Path('')),1,2,'') As VaiTro
                   From ListUser u Order By u.ID");

    [HttpPost]
    public Dictionary<string, object> SaveUser([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string user = S(obj, "TenDangNhap").Trim();
        if (string.IsNullOrWhiteSpace(user)) return Fail("Nhập tên đăng nhập");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew)
        {
            var ex = Table("Select Top 1 1 As X From ListUser Where TenDangNhap=@u", "@u", null!, user);
            if (ex != null && ex.Rows.Count > 0) return Fail("Tên đăng nhập đã tồn tại");
            id = NextId("ListUser");
            if (!Exec("Insert Into ListUser(ID,HoTen,TenDangNhap,MatKhau,Admin,Khoa,DefUrl) Values(@id,@ht,@u,@mk,@ad,@kh,'/')", ref msg,
                "@id", null!, id, "@ht", null!, S(obj, "HoTen"), "@u", null!, user,
                "@mk", null!, (string.IsNullOrWhiteSpace(S(obj, "MatKhau")) ? "123" : S(obj, "MatKhau")),
                "@ad", null!, (B(obj, "Admin") ? 1 : 0), "@kh", null!, (B(obj, "Khoa") ? 1 : 0))) return Fail(msg);
        }
        else
        {
            string setPass = string.IsNullOrWhiteSpace(S(obj, "MatKhau")) ? "" : ", MatKhau=@mk";
            object[] pc = { "@ht", null!, S(obj, "HoTen"), "@ad", null!, (B(obj, "Admin") ? 1 : 0), "@kh", null!, (B(obj, "Khoa") ? 1 : 0), "@id", null!, id };
            if (setPass != "") { var l = new List<object>(pc); l.AddRange(new object[] { "@mk", null!, S(obj, "MatKhau") }); pc = l.ToArray(); }
            if (!Exec($"Update ListUser Set HoTen=@ht, Admin=@ad, Khoa=@kh{setPass} Where ID=@id", ref msg, pc)) return Fail(msg);
        }
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteUser([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        var u = Table("Select TenDangNhap From ListUser Where ID=@id", "@id", null!, id);
        if (u != null && u.Rows.Count > 0)
        {
            string un = u.Rows[0]["TenDangNhap"]?.ToString() ?? "";
            if (un.ToLower() == "admin") return Fail("Không thể xóa tài khoản admin");
            Exec("Delete From NguoiDung_VaiTro Where Username=@u", ref msg, "@u", null!, un);
        }
        Exec("Delete From ListUser Where ID=@id", ref msg, "@id", null!, id);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> GetUserRoles([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query("Select IDVaiTro From NguoiDung_VaiTro Where Username=@u", "@u", null!, S(obj, "Username"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveUserRoles([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string user = S(obj, "Username"); string msg = "";
        if (string.IsNullOrWhiteSpace(user)) return Fail("Thiếu người dùng");
        Exec("Delete From NguoiDung_VaiTro Where Username=@u", ref msg, "@u", null!, user);
        try
        {
            using var doc = JsonDocument.Parse(S(obj, "RoleIds"));
            foreach (var r in doc.RootElement.EnumerateArray())
                Exec("Insert Into NguoiDung_VaiTro(ID,IDVaiTro,Username) Values(@id,@vt,@u)", ref msg,
                    "@id", null!, NextId("NguoiDung_VaiTro"), "@vt", null!, r.GetInt32(), "@u", null!, user);
        }
        catch (Exception ex) { return Fail("Dữ liệu vai trò lỗi: " + ex.Message); }
        return Ok();
    }
}
