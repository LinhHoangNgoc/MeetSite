using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "HoiNghi": Tổng quan + Quản lý hội nghị / phiên / diễn giả.
public class HoiNghiController : MeetBaseController
{
    public HoiNghiController(Connection cn, Sys sys) : base(cn, sys) { }

    // ===== Views (desktop, trong shell) =====
    // Trang chủ module = DANH SÁCH hội nghị (lọc + mở). Dùng layout danh sách (không menu ngang).
    [HttpGet] public IActionResult Index() => View();
    // Workspace: tổng quan hội nghị đang chọn (menu ngang).
    [HttpGet] public IActionResult TongQuan() { ViewBag.Active = "home"; return View(); }
    [HttpGet] public IActionResult DanhSach() { ViewBag.Active = "hoinghi"; return View(); }

    // ===== Combo cho thanh chọn hội nghị (layout) =====
    [HttpPost]
    public Dictionary<string, object> Combo()
        => Query("Select ID, TenHoiNghi, TrangThai From Meet_HoiNghi Order By IsNull(NgayBatDau,'2100-01-01') Desc, ID Desc");

    [HttpPost]
    public Dictionary<string, object> ComboPhong()
        => Query("Select p.ID, p.TenPhong + IsNull(' — '+d.TenDiaDiem,'') As TenPhong, p.SucChua From Meet_PhongHop p Left Join Meet_DiaDiem d On d.ID=p.IDDiaDiem Order By p.TenPhong");

    [HttpPost]
    public Dictionary<string, object> ComboDiaDiem()
        => Query("Select ID, TenDiaDiem, DiaChi From Meet_DiaDiem Order By TenDiaDiem");

    [HttpPost]
    public Dictionary<string, object> QuickAddDiaDiem([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        if (string.IsNullOrWhiteSpace(S(obj, "TenDiaDiem"))) return Fail("Thiếu tên địa điểm");
        int id = NextId("Meet_DiaDiem"); string msg = "";
        if (!Exec("Insert Into Meet_DiaDiem(ID,TenDiaDiem,DiaChi) Values(@id,@t,@c)", ref msg,
            "@id", null!, id, "@t", null!, S(obj, "TenDiaDiem"), "@c", null!, S(obj, "DiaChi"))) return Fail(msg);
        return Ok(new { id, ten = S(obj, "TenDiaDiem") });
    }

    [HttpPost]
    public Dictionary<string, object> QuickAddPhong([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        if (string.IsNullOrWhiteSpace(S(obj, "TenPhong"))) return Fail("Thiếu tên phòng");
        int id = NextId("Meet_PhongHop"); string msg = "";
        if (!Exec("Insert Into Meet_PhongHop(ID,IDDiaDiem,TenPhong,SucChua) Values(@id,@d,@t,@s)", ref msg,
            "@id", null!, id, "@d", null!, Nz(I(obj, "IDDiaDiem")), "@t", null!, S(obj, "TenPhong"), "@s", null!, I(obj, "SucChua")))
            return Fail(msg);
        return Ok(new { id, ten = S(obj, "TenPhong") });
    }

    // ===== Dashboard tổng quan =====
    [HttpPost]
    public Dictionary<string, object> DashboardData([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Ok(new { hasData = false });
        var dt = Table(@"
Select
 (Select Count(*) From Meet_Phien Where IDHoiNghi=@h) As SoPhien,
 (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=@h And IsNull(TrangThaiDangKy,1)<>2) As SoDaiBieu,
 (Select Count(Distinct IDDaiBieu) From Meet_CheckIn Where IDHoiNghi=@h) As SoCheckIn,
 (Select Count(*) From Meet_TaiLieu Where IDHoiNghi=@h) As SoTaiLieu,
 (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=@h And LaVIP=1) As SoVIP,
 (Select Count(*) From Meet_KhaoSat Where IDHoiNghi=@h) As SoKhaoSat",
            "@h", null!, idhn);
        var row = (dt != null && dt.Rows.Count > 0) ? dt.Rows[0] : null;
        int soPhien = row != null ? Convert.ToInt32(row["SoPhien"]) : 0;
        int soDB = row != null ? Convert.ToInt32(row["SoDaiBieu"]) : 0;
        int soCI = row != null ? Convert.ToInt32(row["SoCheckIn"]) : 0;
        // Check-in theo phiên (cho biểu đồ)
        var dtCi = Table(@"Select p.TenPhien As Ten, (Select Count(*) From Meet_CheckIn c Where c.IDPhien=p.ID) As SoLuong
                           From Meet_Phien p Where p.IDHoiNghi=@h Order By p.ThuTu, p.ID", "@h", null!, idhn);
        return Ok(new
        {
            hasData = true,
            soPhien,
            soDaiBieu = soDB,
            soCheckIn = soCI,
            soTaiLieu = row != null ? Convert.ToInt32(row["SoTaiLieu"]) : 0,
            soVIP = row != null ? Convert.ToInt32(row["SoVIP"]) : 0,
            soKhaoSat = row != null ? Convert.ToInt32(row["SoKhaoSat"]) : 0,
            tyLeCheckIn = soDB > 0 ? (int)Math.Round(soCI * 100.0 / soDB) : 0,
            checkInTheoPhien = dtCi != null ? _sys.ConvertDataTableToList(dtCi) : new()
        });
    }

    // ===== Hội nghị (CRUD) =====
    [HttpPost]
    public Dictionary<string, object> ListHoiNghi()
        => Query(@"Select h.ID, h.MaHoiNghi, h.TenHoiNghi, h.NgayBatDau, h.NgayKetThuc, h.DonViToChuc,
                          h.TrangThai, d.TenDiaDiem,
                          (Select Count(*) From Meet_Phien Where IDHoiNghi=h.ID) As SoPhien,
                          (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=h.ID) As SoDaiBieu
                   From Meet_HoiNghi h Left Join Meet_DiaDiem d On d.ID=h.IDDiaDiem
                   Order By IsNull(h.NgayBatDau,'2100-01-01') Desc, h.ID Desc");

    [HttpPost]
    public Dictionary<string, object> SaveHoiNghi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID");
        string msg = "";
        bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_HoiNghi");
        string ma = S(obj, "MaHoiNghi"); if (string.IsNullOrWhiteSpace(ma)) ma = "HN" + id.ToString("D3");
        if (string.IsNullOrWhiteSpace(S(obj, "TenHoiNghi"))) return Fail("Vui lòng nhập tên hội nghị");
        object[] pc = {
            "@id", null!, id, "@ma", null!, ma, "@ten", null!, S(obj,"TenHoiNghi"),
            "@mt", null!, S(obj,"MoTa"), "@bd", null!, NullDate(S(obj,"NgayBatDau")),
            "@kt", null!, NullDate(S(obj,"NgayKetThuc")), "@dd", null!, Nz(I(obj,"IDDiaDiem")),
            "@dv", null!, S(obj,"DonViToChuc"), "@tt", null!, I(obj,"TrangThai")
        };
        string sql = isNew
            ? @"Insert Into Meet_HoiNghi(ID,MaHoiNghi,TenHoiNghi,MoTa,NgayBatDau,NgayKetThuc,IDDiaDiem,DonViToChuc,TrangThai,NguoiTao,NgayTao)
                Values(@id,@ma,@ten,@mt,@bd,@kt,@dd,@dv,@tt,@nguoi,GetDate())"
            : @"Update Meet_HoiNghi Set MaHoiNghi=@ma,TenHoiNghi=@ten,MoTa=@mt,NgayBatDau=@bd,NgayKetThuc=@kt,
                IDDiaDiem=@dd,DonViToChuc=@dv,TrangThai=@tt Where ID=@id";
        if (isNew) { var l = new List<object>(pc) { "@nguoi", null!, CurUser }; pc = l.ToArray(); }
        if (!Exec(sql, ref msg, pc)) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteHoiNghi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (id <= 0) return Fail("Thiếu ID");
        if (!Exec("Delete From Meet_HoiNghi Where ID=@id", ref msg, "@id", null!, id)) return Fail(msg);
        return Ok();
    }

    // ===== Phiên họp =====
    [HttpPost]
    public Dictionary<string, object> ListPhien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select p.ID, p.TenPhien, p.ThoiGianBatDau, p.ThoiGianKetThuc, p.ThuTu, p.TrangThai,
                              ph.TenPhong, p.IDPhongHop, p.MoTa,
                              (Select Count(*) From Meet_PhienDienGia Where IDPhien=p.ID) As SoDienGia
                       From Meet_Phien p Left Join Meet_PhongHop ph On ph.ID=p.IDPhongHop
                       Where p.IDHoiNghi=@h Order By p.ThuTu, p.ThoiGianBatDau, p.ID",
            "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SavePhien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        if (string.IsNullOrWhiteSpace(S(obj, "TenPhien"))) return Fail("Vui lòng nhập tên phiên");
        string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_Phien");
        object[] pc = {
            "@id",null!,id, "@h",null!,idhn, "@ten",null!,S(obj,"TenPhien"), "@mt",null!,S(obj,"MoTa"),
            "@p",null!,Nz(I(obj,"IDPhongHop")), "@bd",null!,NullDate(S(obj,"ThoiGianBatDau")),
            "@kt",null!,NullDate(S(obj,"ThoiGianKetThuc")), "@tu",null!,I(obj,"ThuTu"), "@tt",null!,I(obj,"TrangThai")
        };
        string sql = isNew
            ? @"Insert Into Meet_Phien(ID,IDHoiNghi,TenPhien,MoTa,IDPhongHop,ThoiGianBatDau,ThoiGianKetThuc,ThuTu,TrangThai,NguoiTao,NgayTao)
                Values(@id,@h,@ten,@mt,@p,@bd,@kt,@tu,@tt,@nguoi,GetDate())"
            : @"Update Meet_Phien Set TenPhien=@ten,MoTa=@mt,IDPhongHop=@p,ThoiGianBatDau=@bd,ThoiGianKetThuc=@kt,ThuTu=@tu,TrangThai=@tt Where ID=@id";
        if (isNew) { var l = new List<object>(pc) { "@nguoi", null!, CurUser }; pc = l.ToArray(); }
        if (!Exec(sql, ref msg, pc)) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeletePhien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (!Exec("Delete From Meet_PhienDienGia Where IDPhien=@id; Delete From Meet_Phien Where ID=@id", ref msg, "@id", null!, id))
            return Fail(msg);
        return Ok();
    }

    // ===== Diễn giả =====
    [HttpPost]
    public Dictionary<string, object> ListDienGia([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query("Select ID, HoTen, ChucDanh, DonVi, Email, DienThoai, TieuSu From Meet_DienGia Where IDHoiNghi=@h Order By HoTen",
            "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveDienGia([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        if (string.IsNullOrWhiteSpace(S(obj, "HoTen"))) return Fail("Vui lòng nhập họ tên diễn giả");
        string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_DienGia");
        object[] pc = {
            "@id",null!,id, "@h",null!,idhn, "@ten",null!,S(obj,"HoTen"), "@cd",null!,S(obj,"ChucDanh"),
            "@dv",null!,S(obj,"DonVi"), "@em",null!,S(obj,"Email"), "@dt",null!,S(obj,"DienThoai"), "@ts",null!,S(obj,"TieuSu")
        };
        string sql = isNew
            ? "Insert Into Meet_DienGia(ID,IDHoiNghi,HoTen,ChucDanh,DonVi,Email,DienThoai,TieuSu) Values(@id,@h,@ten,@cd,@dv,@em,@dt,@ts)"
            : "Update Meet_DienGia Set HoTen=@ten,ChucDanh=@cd,DonVi=@dv,Email=@em,DienThoai=@dt,TieuSu=@ts Where ID=@id";
        if (!Exec(sql, ref msg, pc)) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteDienGia([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (!Exec("Delete From Meet_PhienDienGia Where IDDienGia=@id; Delete From Meet_DienGia Where ID=@id", ref msg, "@id", null!, id))
            return Fail(msg);
        return Ok();
    }

    // ===== helpers =====
    private static object NullDate(string s) => string.IsNullOrWhiteSpace(s) ? (object)DBNull.Value : s;
    private static object Nz(int v) => v <= 0 ? (object)DBNull.Value : v;
}
