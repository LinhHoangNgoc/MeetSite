using System.Data;
using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "TinNhan": soạn & gửi SMS/Zalo (provider mock) + log.
public class TinNhanController : MeetBaseController
{
    public TinNhanController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "tinnhan"; return View(); }

    // ===== Mẫu tin =====
    [HttpPost]
    public Dictionary<string, object> ListMauTin([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query("Select ID, TenMau, Kenh, NoiDung From Meet_MauTin Where IDHoiNghi=@h Or IDHoiNghi Is Null Order By TenMau",
            "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveMauTin([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        if (string.IsNullOrWhiteSpace(S(obj, "TenMau"))) return Fail("Nhập tên mẫu");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_MauTin");
        string sql = isNew
            ? "Insert Into Meet_MauTin(ID,IDHoiNghi,TenMau,Kenh,NoiDung) Values(@id,@h,@ten,@k,@nd)"
            : "Update Meet_MauTin Set TenMau=@ten,Kenh=@k,NoiDung=@nd Where ID=@id";
        if (!Exec(sql, ref msg, "@id", null!, id, "@h", null!, Nz(I(obj, "IDHoiNghi")), "@ten", null!, S(obj, "TenMau"),
            "@k", null!, I(obj, "Kenh", 1), "@nd", null!, S(obj, "NoiDung"))) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteMauTin([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string msg = "";
        if (!Exec("Delete From Meet_MauTin Where ID=@id", ref msg, "@id", null!, I(obj, "ID"))) return Fail(msg);
        return Ok();
    }

    // ===== Chiến dịch =====
    [HttpPost]
    public Dictionary<string, object> ListChienDich([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select c.ID, c.TieuDe, c.Kenh, c.PhamVi, c.TrangThai, c.TongSo, c.SoThanhCong, c.SoThatBai,
                              c.NgayTao, c.NgayGui, n.TenNhom
                       From Meet_ChienDich c Left Join Meet_NhomDaiBieu n On n.ID=c.IDNhom
                       Where c.IDHoiNghi=@h Order By c.ID Desc", "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveChienDich([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idHN = I(obj, "IDHoiNghi");
        if (idHN <= 0) return Fail("Chưa chọn hội nghị");
        if (string.IsNullOrWhiteSpace(S(obj, "NoiDung"))) return Fail("Nhập nội dung tin");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_ChienDich");
        string sql = isNew
            ? @"Insert Into Meet_ChienDich(ID,IDHoiNghi,TieuDe,Kenh,IDMauTin,NoiDung,PhamVi,IDNhom,TrangThai,NguoiTao,NgayTao)
                Values(@id,@h,@td,@k,@mt,@nd,@pv,@nh,0,@u,GetDate())"
            : "Update Meet_ChienDich Set TieuDe=@td,Kenh=@k,NoiDung=@nd,PhamVi=@pv,IDNhom=@nh Where ID=@id And TrangThai=0";
        if (!Exec(sql, ref msg, "@id", null!, id, "@h", null!, idHN, "@td", null!, S(obj, "TieuDe"),
            "@k", null!, I(obj, "Kenh", 1), "@mt", null!, Nz(I(obj, "IDMauTin")), "@nd", null!, S(obj, "NoiDung"),
            "@pv", null!, I(obj, "PhamVi", 1), "@nh", null!, Nz(I(obj, "IDNhom")), "@u", null!, CurUser)) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteChienDich([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (!Exec("Delete From Meet_TinNhan Where IDChienDich=@id; Delete From Meet_ChienDich Where ID=@id", ref msg, "@id", null!, id)) return Fail(msg);
        return Ok();
    }

    // ===== GỬI (mock) =====
    [HttpPost]
    public Dictionary<string, object> SendChienDich([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idCD = I(obj, "ID"); string msg = "";
        var cd = Table("Select * From Meet_ChienDich Where ID=@id", "@id", null!, idCD);
        if (cd == null || cd.Rows.Count == 0) return Fail("Không tìm thấy chiến dịch");
        var c = cd.Rows[0];
        if (Convert.ToInt32(c["TrangThai"]) == 1) return Fail("Chiến dịch đã gửi");
        int idHN = Convert.ToInt32(c["IDHoiNghi"]); int kenh = Convert.ToInt32(c["Kenh"]);
        int phamVi = Convert.ToInt32(c["PhamVi"]); string noiDung = c["NoiDung"]?.ToString() ?? "";
        int idNhom = c["IDNhom"] == DBNull.Value ? 0 : Convert.ToInt32(c["IDNhom"]);

        string where = "d.IDHoiNghi=@h And IsNull(d.TrangThaiDangKy,1)<>2";
        if (phamVi == 2 && idNhom > 0) where += " And d.IDNhom=" + idNhom;
        else if (phamVi == 3) where += " And d.LaVIP=1";
        var recips = Table($@"Select d.ID, d.HoTen, d.MaDaiBieu, d.DienThoai,
                                     (Select Top 1 g.MaGhe From Meet_Ghe g Where g.IDDaiBieu=d.ID) As MaGhe,
                                     h.TenHoiNghi
                              From Meet_DaiBieu d Join Meet_HoiNghi h On h.ID=d.IDHoiNghi Where {where}",
            "@h", null!, idHN);
        var sender = MeetSenderFactory.Get(kenh);
        int ok = 0, fail = 0, total = recips?.Rows.Count ?? 0;
        if (recips != null)
            foreach (DataRow r in recips.Rows)
            {
                string content = noiDung
                    .Replace("{HoTen}", r["HoTen"]?.ToString() ?? "")
                    .Replace("{MaDaiBieu}", r["MaDaiBieu"]?.ToString() ?? "")
                    .Replace("{MaGhe}", r["MaGhe"]?.ToString() ?? "(chưa xếp)")
                    .Replace("{TenHoiNghi}", r["TenHoiNghi"]?.ToString() ?? "");
                string phone = r["DienThoai"]?.ToString() ?? "";
                var res = sender.Send(phone, content);
                int idTN = NextId("Meet_TinNhan");
                Exec(@"Insert Into Meet_TinNhan(ID,IDChienDich,IDDaiBieu,Kenh,SoDienThoai,NoiDung,TrangThai,MaPhanHoiMock,ThoiGianGui,LoiMock)
                       Values(@id,@cd,@db,@k,@sdt,@nd,@tt,@ma,GetDate(),@loi)", ref msg,
                    "@id", null!, idTN, "@cd", null!, idCD, "@db", null!, Convert.ToInt32(r["ID"]), "@k", null!, kenh,
                    "@sdt", null!, phone, "@nd", null!, content, "@tt", null!, res.Ok ? 1 : 2,
                    "@ma", null!, res.Code, "@loi", null!, res.Error);
                if (res.Ok) ok++; else fail++;
            }
        Exec("Update Meet_ChienDich Set TrangThai=1, TongSo=@t, SoThanhCong=@ok, SoThatBai=@f, NgayGui=GetDate() Where ID=@id",
            ref msg, "@t", null!, total, "@ok", null!, ok, "@f", null!, fail, "@id", null!, idCD);
        return Ok(new { total, ok, fail });
    }

    [HttpPost]
    public Dictionary<string, object> ListTinNhan([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select t.ID, d.HoTen, t.SoDienThoai, t.NoiDung, t.TrangThai, t.MaPhanHoiMock, t.LoiMock, t.ThoiGianGui
                       From Meet_TinNhan t Left Join Meet_DaiBieu d On d.ID=t.IDDaiBieu
                       Where t.IDChienDich=@id Order By t.ID", "@id", null!, I(obj, "IDChienDich"));
    }

    private static object Nz(int v) => v <= 0 ? (object)DBNull.Value : v;
}
