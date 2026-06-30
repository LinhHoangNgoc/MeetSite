using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "DaiBieu": quản lý đại biểu, nhóm, sinh QR cá nhân.
public class DaiBieuController : MeetBaseController
{
    public DaiBieuController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "daibieu"; return View(); }

    [HttpPost]
    public Dictionary<string, object> ListDaiBieu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        return Query(@"Select d.ID, d.MaDaiBieu, d.HoTen, d.NamSinh, d.SoCCCD, d.MaNFC, d.ChucDanh, d.DonVi, d.Email, d.DienThoai,
                              d.IDNhom, n.TenNhom, d.LaVIP, d.QRToken, d.TrangThaiDangKy,
                              (Select Top 1 g.MaGhe From Meet_Ghe g Where g.IDDaiBieu=d.ID) As MaGhe,
                              (Case When Exists(Select 1 From Meet_CheckIn c Where c.IDDaiBieu=d.ID) Then 1 Else 0 End) As DaCheckIn
                       From Meet_DaiBieu d Left Join Meet_NhomDaiBieu n On n.ID=d.IDNhom
                       Where d.IDHoiNghi=@h Order By d.HoTen", "@h", null!, idhn);
    }

    [HttpPost]
    public Dictionary<string, object> SaveDaiBieu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        if (string.IsNullOrWhiteSpace(S(obj, "HoTen"))) return Fail("Vui lòng nhập họ tên đại biểu");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_DaiBieu");
        string ma = S(obj, "MaDaiBieu"); if (string.IsNullOrWhiteSpace(ma)) ma = "DB" + id.ToString("D4");
        string token = S(obj, "QRToken"); if (string.IsNullOrWhiteSpace(token)) token = NewToken();
        object[] pc = {
            "@id",null!,id, "@h",null!,idhn, "@ma",null!,ma, "@ten",null!,S(obj,"HoTen"),
            "@ns",null!,Nz(I(obj,"NamSinh")), "@cccd",null!,S(obj,"SoCCCD"), "@nfc",null!,S(obj,"MaNFC"),
            "@cd",null!,S(obj,"ChucDanh"), "@dv",null!,S(obj,"DonVi"), "@em",null!,S(obj,"Email"),
            "@dt",null!,S(obj,"DienThoai"), "@nh",null!,Nz(I(obj,"IDNhom")), "@vip",null!,(B(obj,"LaVIP")?1:0),
            "@tk",null!,token, "@tt",null!,I(obj,"TrangThaiDangKy",1)
        };
        string sql = isNew
            ? @"Insert Into Meet_DaiBieu(ID,IDHoiNghi,MaDaiBieu,HoTen,NamSinh,SoCCCD,MaNFC,ChucDanh,DonVi,Email,DienThoai,IDNhom,LaVIP,QRToken,TrangThaiDangKy,NguoiTao,NgayTao)
                Values(@id,@h,@ma,@ten,@ns,@cccd,@nfc,@cd,@dv,@em,@dt,@nh,@vip,@tk,@tt,@nguoi,GetDate())"
            : @"Update Meet_DaiBieu Set MaDaiBieu=@ma,HoTen=@ten,NamSinh=@ns,SoCCCD=@cccd,MaNFC=@nfc,ChucDanh=@cd,DonVi=@dv,Email=@em,DienThoai=@dt,
                IDNhom=@nh,LaVIP=@vip,TrangThaiDangKy=@tt Where ID=@id";
        if (isNew) { var l = new List<object>(pc) { "@nguoi", null!, CurUser }; pc = l.ToArray(); }
        if (!Exec(sql, ref msg, pc)) return Fail(msg);
        return Ok(new { id, token });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteDaiBieu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (!Exec("Update Meet_Ghe Set IDDaiBieu=Null Where IDDaiBieu=@id; Delete From Meet_DaiBieu Where ID=@id", ref msg, "@id", null!, id))
            return Fail(msg);
        return Ok();
    }

    // Import nhanh nhiều đại biểu (mỗi dòng: HoTen | ChucDanh | DonVi | DienThoai | Email)
    [HttpPost]
    public Dictionary<string, object> ImportDaiBieu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        string raw = S(obj, "Data"); int idNhom = I(obj, "IDNhom");
        if (string.IsNullOrWhiteSpace(raw)) return Fail("Không có dữ liệu");
        var lines = raw.Replace("\r", "").Split('\n', StringSplitOptions.RemoveEmptyEntries);
        int n = 0; string msg = "";
        foreach (var ln in lines)
        {
            var c = ln.Split('|', '\t');
            string ten = c.Length > 0 ? c[0].Trim() : ""; if (ten == "") continue;
            int id = NextId("Meet_DaiBieu");
            Exec(@"Insert Into Meet_DaiBieu(ID,IDHoiNghi,MaDaiBieu,HoTen,ChucDanh,DonVi,DienThoai,Email,IDNhom,LaVIP,QRToken,TrangThaiDangKy,NguoiTao,NgayTao)
                   Values(@id,@h,@ma,@ten,@cd,@dv,@dt,@em,@nh,0,@tk,1,@nguoi,GetDate())", ref msg,
                "@id", null!, id, "@h", null!, idhn, "@ma", null!, "DB" + id.ToString("D4"),
                "@ten", null!, ten, "@cd", null!, c.Length > 1 ? c[1].Trim() : "",
                "@dv", null!, c.Length > 2 ? c[2].Trim() : "", "@dt", null!, c.Length > 3 ? c[3].Trim() : "",
                "@em", null!, c.Length > 4 ? c[4].Trim() : "", "@nh", null!, Nz(idNhom), "@tk", null!, NewToken(), "@nguoi", null!, CurUser);
            n++;
        }
        return Ok(new { count = n });
    }

    [HttpPost]
    public Dictionary<string, object> GenQR([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = ""; string token = NewToken();
        if (!Exec("Update Meet_DaiBieu Set QRToken=@tk Where ID=@id", ref msg, "@tk", null!, token, "@id", null!, id))
            return Fail(msg);
        return Ok(new { token });
    }

    // ===== Nhóm đại biểu =====
    [HttpPost]
    public Dictionary<string, object> ListNhom([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select n.ID, n.TenNhom, n.MauSac, n.GhiChu,
                              (Select Count(*) From Meet_DaiBieu d Where d.IDNhom=n.ID) As SoDaiBieu
                       From Meet_NhomDaiBieu n Where n.IDHoiNghi=@h Order By n.TenNhom", "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> ComboNhom([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query("Select ID, TenNhom From Meet_NhomDaiBieu Where IDHoiNghi=@h Order By TenNhom", "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveNhom([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        if (string.IsNullOrWhiteSpace(S(obj, "TenNhom"))) return Fail("Vui lòng nhập tên nhóm");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_NhomDaiBieu");
        string sql = isNew
            ? "Insert Into Meet_NhomDaiBieu(ID,IDHoiNghi,TenNhom,MauSac,GhiChu) Values(@id,@h,@ten,@mau,@gc)"
            : "Update Meet_NhomDaiBieu Set TenNhom=@ten,MauSac=@mau,GhiChu=@gc Where ID=@id";
        if (!Exec(sql, ref msg, "@id", null!, id, "@h", null!, idhn, "@ten", null!, S(obj, "TenNhom"),
            "@mau", null!, S(obj, "MauSac"), "@gc", null!, S(obj, "GhiChu"))) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteNhom([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (!Exec("Update Meet_DaiBieu Set IDNhom=Null Where IDNhom=@id; Delete From Meet_NhomDaiBieu Where ID=@id", ref msg, "@id", null!, id))
            return Fail(msg);
        return Ok();
    }

    private static object Nz(int v) => v <= 0 ? (object)DBNull.Value : v;
    private static string NewToken() => Guid.NewGuid().ToString("N").Substring(0, 20);
}
