using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "PhanCong": Danh mục NHÂN VIÊN tổ chức + PHÂN CÔNG NHIỆM VỤ theo vai trò/phiên.
// (Khác Đại biểu = khách dự, khác Diễn giả = người trình bày: đây là nhân sự vận hành sự kiện.)
public class PhanCongController : MeetBaseController
{
    public PhanCongController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "phancong"; return View(); }

    // ===== Danh mục nhân viên =====
    [HttpPost]
    public Dictionary<string, object> ListNhanVien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        return Query(@"Select nv.ID, nv.HoTen, nv.ChucDanh, nv.DonVi, nv.DienThoai, nv.Email, nv.VaiTroTC, nv.Active, nv.GhiChu,
                              (Select Count(*) From Meet_NhiemVu v Where v.IDNhanVien=nv.ID) As SoNhiemVu
                       From Meet_NhanVien nv
                       Where (nv.IDHoiNghi=@h Or nv.IDHoiNghi Is Null)
                       Order By IsNull(nv.Active,1) Desc, nv.HoTen", "@h", null!, idhn);
    }

    [HttpPost]
    public Dictionary<string, object> ComboNhanVien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select ID, HoTen + IsNull(' ('+VaiTroTC+')','') As HoTen From Meet_NhanVien
                       Where (IDHoiNghi=@h Or IDHoiNghi Is Null) And IsNull(Active,1)=1 Order By HoTen",
            "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveNhanVien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        if (string.IsNullOrWhiteSpace(S(obj, "HoTen"))) return Fail("Vui lòng nhập họ tên nhân viên");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_NhanVien");
        bool dungChung = B(obj, "DungChung");
        object idHNVal = (dungChung || idhn <= 0) ? (object)DBNull.Value : idhn;
        object[] pc = {
            "@id",null!,id, "@h",null!,idHNVal, "@ten",null!,S(obj,"HoTen"), "@cd",null!,S(obj,"ChucDanh"),
            "@dv",null!,S(obj,"DonVi"), "@dt",null!,S(obj,"DienThoai"), "@em",null!,S(obj,"Email"),
            "@vt",null!,S(obj,"VaiTroTC"), "@ac",null!,(B(obj,"Active")||isNew?1:0), "@gc",null!,S(obj,"GhiChu")
        };
        string sql = isNew
            ? @"Insert Into Meet_NhanVien(ID,IDHoiNghi,HoTen,ChucDanh,DonVi,DienThoai,Email,VaiTroTC,Active,GhiChu)
                Values(@id,@h,@ten,@cd,@dv,@dt,@em,@vt,@ac,@gc)"
            : @"Update Meet_NhanVien Set HoTen=@ten,ChucDanh=@cd,DonVi=@dv,DienThoai=@dt,Email=@em,
                VaiTroTC=@vt,Active=@ac,GhiChu=@gc Where ID=@id";
        if (!Exec(sql, ref msg, pc)) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteNhanVien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        var busy = Table("Select Top 1 1 As X From Meet_NhiemVu Where IDNhanVien=@id", "@id", null!, id);
        if (busy != null && busy.Rows.Count > 0) return Fail("Nhân viên còn nhiệm vụ — xóa nhiệm vụ trước hoặc ngừng kích hoạt.");
        if (!Exec("Delete From Meet_NhanVien Where ID=@id", ref msg, "@id", null!, id)) return Fail(msg);
        return Ok();
    }

    // ===== Nhiệm vụ =====
    [HttpPost]
    public Dictionary<string, object> ListNhiemVu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select v.ID, v.IDNhanVien, v.IDPhien, v.TenNhiemVu, v.MoTa, v.ThoiHan, v.DoUuTien, v.TrangThai,
                              nv.HoTen, nv.VaiTroTC, p.TenPhien,
                              (Case When v.TrangThai<>2 And v.ThoiHan Is Not Null And v.ThoiHan<GetDate() Then 1 Else 0 End) As QuaHan
                       From Meet_NhiemVu v
                       Join Meet_NhanVien nv On nv.ID=v.IDNhanVien
                       Left Join Meet_Phien p On p.ID=v.IDPhien
                       Where v.IDHoiNghi=@h
                       Order By v.TrangThai, v.DoUuTien Desc, v.ThoiHan", "@h", null!, I(obj, "IDHoiNghi"));
    }

    // Tiến độ theo nhân viên (cho biểu đồ + nhắc quá hạn).
    [HttpPost]
    public Dictionary<string, object> TienDoNhanVien([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select nv.HoTen, nv.VaiTroTC,
                              Count(v.ID) As Tong,
                              Sum(Case When v.TrangThai=2 Then 1 Else 0 End) As HoanThanh,
                              Sum(Case When v.TrangThai=1 Then 1 Else 0 End) As DangLam,
                              Sum(Case When IsNull(v.TrangThai,0)=0 Then 1 Else 0 End) As ChuaLam,
                              Sum(Case When v.TrangThai<>2 And v.ThoiHan Is Not Null And v.ThoiHan<GetDate() Then 1 Else 0 End) As QuaHan
                       From Meet_NhanVien nv Join Meet_NhiemVu v On v.IDNhanVien=nv.ID
                       Where v.IDHoiNghi=@h
                       Group By nv.HoTen, nv.VaiTroTC
                       Order By Count(v.ID) Desc, nv.HoTen", "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveNhiemVu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        if (I(obj, "IDNhanVien") <= 0) return Fail("Chọn nhân viên được giao");
        if (string.IsNullOrWhiteSpace(S(obj, "TenNhiemVu"))) return Fail("Nhập tên nhiệm vụ");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_NhiemVu");
        object[] pc = {
            "@id",null!,id, "@h",null!,idhn, "@nv",null!,I(obj,"IDNhanVien"), "@p",null!,Nz(I(obj,"IDPhien")),
            "@ten",null!,S(obj,"TenNhiemVu"), "@mt",null!,S(obj,"MoTa"), "@th",null!,NullDate(S(obj,"ThoiHan")),
            "@ut",null!,I(obj,"DoUuTien",1), "@tt",null!,I(obj,"TrangThai")
        };
        string sql = isNew
            ? @"Insert Into Meet_NhiemVu(ID,IDHoiNghi,IDNhanVien,IDPhien,TenNhiemVu,MoTa,ThoiHan,DoUuTien,TrangThai,NguoiTao,NgayTao)
                Values(@id,@h,@nv,@p,@ten,@mt,@th,@ut,@tt,@u,GetDate())"
            : @"Update Meet_NhiemVu Set IDNhanVien=@nv,IDPhien=@p,TenNhiemVu=@ten,MoTa=@mt,ThoiHan=@th,
                DoUuTien=@ut,TrangThai=@tt Where ID=@id";
        if (isNew) { var l = new List<object>(pc) { "@u", null!, CurUser }; pc = l.ToArray(); }
        if (!Exec(sql, ref msg, pc)) return Fail(msg);
        return Ok(new { id });
    }

    // Cập nhật nhanh trạng thái nhiệm vụ (kéo trạng thái trên lưới).
    [HttpPost]
    public Dictionary<string, object> SetTrangThai([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (!Exec("Update Meet_NhiemVu Set TrangThai=@tt Where ID=@id", ref msg,
            "@tt", null!, I(obj, "TrangThai"), "@id", null!, id)) return Fail(msg);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> DeleteNhiemVu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (!Exec("Delete From Meet_NhiemVu Where ID=@id", ref msg, "@id", null!, id)) return Fail(msg);
        return Ok();
    }

    private static object Nz(int v) => v <= 0 ? (object)DBNull.Value : v;
    private static object NullDate(string s) => string.IsNullOrWhiteSpace(s) ? (object)DBNull.Value : s;
}
