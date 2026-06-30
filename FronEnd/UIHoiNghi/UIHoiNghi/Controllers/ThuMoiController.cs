using System.Data;
using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "ThuMoi": Cửa sổ Quản lý Thư mời hội nghị — soạn thư cho từng đại biểu,
// theo dõi TRẠNG THÁI GỬI riêng từng người, Gửi riêng / Gửi tất cả qua SMS / Zalo / Email (mock),
// Sao chép thư, và thống kê TỶ LỆ GỬI đạt được.
public class ThuMoiController : MeetBaseController
{
    public ThuMoiController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "thumoi"; return View(); }

    // Danh sách đại biểu kèm thông tin thư mời (left join) — hiển thị trạng thái gửi từng người.
    [HttpPost]
    public Dictionary<string, object> ListThuMoi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select d.ID As IDDaiBieu, d.MaDaiBieu, d.HoTen, d.NamSinh, d.DonVi, d.Email, d.DienThoai, d.LaVIP,
                              n.TenNhom,
                              t.ID As IDThuMoi, t.DiaDiem, t.ThoiGian, t.LuuY, t.NoiDung, t.Kenh,
                              IsNull(t.TrangThaiGui,-1) As TrangThaiGui, t.SoLanGui, t.ThoiGianGui, t.MaPhanHoiMock, t.LoiMock
                       From Meet_DaiBieu d
                       Left Join Meet_NhomDaiBieu n On n.ID=d.IDNhom
                       Left Join Meet_ThuMoi t On t.IDDaiBieu=d.ID
                       Where d.IDHoiNghi=@h And IsNull(d.TrangThaiDangKy,1)<>2
                       Order By d.HoTen", "@h", null!, I(obj, "IDHoiNghi"));
    }

    // Thông tin mặc định của hội nghị để điền nhanh khi soạn thư (địa điểm + thời gian).
    [HttpPost]
    public Dictionary<string, object> MacDinhHoiNghi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select h.TenHoiNghi,
                              IsNull(d.TenDiaDiem,'') + IsNull(' - '+d.DiaChi,'') As DiaDiem,
                              h.NgayBatDau, h.NgayKetThuc, h.DonViToChuc
                       From Meet_HoiNghi h Left Join Meet_DiaDiem d On d.ID=h.IDDiaDiem
                       Where h.ID=@h", "@h", null!, I(obj, "IDHoiNghi"));
    }

    // Thống kê tỷ lệ gửi thư mời đạt được.
    [HttpPost]
    public Dictionary<string, object> ThongKe([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int h = I(obj, "IDHoiNghi");
        var dt = Table(@"Select
            (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=@h And IsNull(TrangThaiDangKy,1)<>2) As TongDaiBieu,
            (Select Count(*) From Meet_ThuMoi Where IDHoiNghi=@h) As DaSoan,
            (Select Count(*) From Meet_ThuMoi Where IDHoiNghi=@h And TrangThaiGui=1) As DaGui,
            (Select Count(*) From Meet_ThuMoi Where IDHoiNghi=@h And TrangThaiGui=2) As GuiLoi",
            "@h", null!, h);
        var r = dt!.Rows[0];
        int tong = Convert.ToInt32(r["TongDaiBieu"]), daGui = Convert.ToInt32(r["DaGui"]);
        return Ok(new
        {
            tongDaiBieu = tong,
            daSoan = Convert.ToInt32(r["DaSoan"]),
            daGui,
            guiLoi = Convert.ToInt32(r["GuiLoi"]),
            chuaGui = tong - daGui,
            tyLe = tong > 0 ? (int)Math.Round(daGui * 100.0 / tong) : 0
        });
    }

    // Tạo / cập nhật thư mời cho 1 đại biểu (Thêm & Sửa).
    [HttpPost]
    public Dictionary<string, object> SaveThuMoi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idHN = I(obj, "IDHoiNghi"); int idDB = I(obj, "IDDaiBieu");
        if (idHN <= 0) return Fail("Chưa chọn hội nghị");
        if (idDB <= 0) return Fail("Thiếu đại biểu");
        string msg = "";
        var ex = Table("Select Top 1 ID, TrangThaiGui From Meet_ThuMoi Where IDDaiBieu=@d", "@d", null!, idDB);
        bool isNew = ex == null || ex.Rows.Count == 0;
        int id = isNew ? NextId("Meet_ThuMoi") : Convert.ToInt32(ex!.Rows[0]["ID"]);
        object[] pc = {
            "@id",null!,id, "@h",null!,idHN, "@db",null!,idDB,
            "@dd",null!,S(obj,"DiaDiem"), "@tg",null!,S(obj,"ThoiGian"), "@ly",null!,S(obj,"LuuY"),
            "@nd",null!,S(obj,"NoiDung"), "@k",null!,I(obj,"Kenh",2)
        };
        string sql = isNew
            ? @"Insert Into Meet_ThuMoi(ID,IDHoiNghi,IDDaiBieu,DiaDiem,ThoiGian,LuuY,NoiDung,Kenh,TrangThaiGui,SoLanGui,NguoiTao,NgayTao)
                Values(@id,@h,@db,@dd,@tg,@ly,@nd,@k,0,0,@u,GetDate())"
            : @"Update Meet_ThuMoi Set DiaDiem=@dd,ThoiGian=@tg,LuuY=@ly,NoiDung=@nd,Kenh=@k Where ID=@id";
        if (isNew) { var l = new List<object>(pc) { "@u", null!, CurUser }; pc = l.ToArray(); }
        if (!Exec(sql, ref msg, pc)) return Fail(msg);
        return Ok(new { id });
    }

    // Sao chép nội dung thư từ 1 thư nguồn sang nhiều đại biểu (giữ địa điểm/thời gian/lưu ý/nội dung/kênh).
    [HttpPost]
    public Dictionary<string, object> SaoChep([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idNguon = I(obj, "IDThuMoiNguon"); int idHN = I(obj, "IDHoiNghi");
        string dsRaw = S(obj, "IDDaiBieus");  // danh sách id đại biểu, ngăn cách dấu phẩy
        if (idNguon <= 0) return Fail("Thiếu thư nguồn");
        var src = Table("Select * From Meet_ThuMoi Where ID=@id", "@id", null!, idNguon);
        if (src == null || src.Rows.Count == 0) return Fail("Không tìm thấy thư nguồn");
        var s = src.Rows[0];
        var ids = dsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries)
                       .Select(x => int.TryParse(x.Trim(), out var v) ? v : 0).Where(v => v > 0).ToList();
        if (ids.Count == 0) return Fail("Chưa chọn đại biểu đích");
        int n = 0; string msg = "";
        foreach (int idDB in ids)
        {
            var ex = Table("Select Top 1 ID From Meet_ThuMoi Where IDDaiBieu=@d", "@d", null!, idDB);
            bool isNew = ex == null || ex.Rows.Count == 0;
            int id = isNew ? NextId("Meet_ThuMoi") : Convert.ToInt32(ex!.Rows[0]["ID"]);
            object[] pc = {
                "@id",null!,id, "@h",null!,idHN, "@db",null!,idDB,
                "@dd",null!,s["DiaDiem"], "@tg",null!,s["ThoiGian"], "@ly",null!,s["LuuY"],
                "@nd",null!,s["NoiDung"], "@k",null!,Convert.ToInt32(s["Kenh"])
            };
            string sql = isNew
                ? @"Insert Into Meet_ThuMoi(ID,IDHoiNghi,IDDaiBieu,DiaDiem,ThoiGian,LuuY,NoiDung,Kenh,TrangThaiGui,SoLanGui,NguoiTao,NgayTao)
                    Values(@id,@h,@db,@dd,@tg,@ly,@nd,@k,0,0,@u,GetDate())"
                : @"Update Meet_ThuMoi Set DiaDiem=@dd,ThoiGian=@tg,LuuY=@ly,NoiDung=@nd,Kenh=@k Where ID=@id And TrangThaiGui<>1";
            if (isNew) { var l = new List<object>(pc) { "@u", null!, CurUser }; pc = l.ToArray(); }
            if (Exec(sql, ref msg, pc)) n++;
        }
        return Ok(new { count = n });
    }

    // Hủy & Xóa thư (1 thư).
    [HttpPost]
    public Dictionary<string, object> DeleteThuMoi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        if (id <= 0) return Fail("Thiếu ID thư");
        if (!Exec("Delete From Meet_ThuMoi Where ID=@id", ref msg, "@id", null!, id)) return Fail(msg);
        return Ok();
    }

    // Gửi RIÊNG 1 thư mời (mock).
    [HttpPost]
    public Dictionary<string, object> GuiRieng([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID");
        if (id <= 0) return Fail("Thiếu thư");
        var dt = Table(GuiSelectSql() + " Where t.ID=@id", "@id", null!, id);
        if (dt == null || dt.Rows.Count == 0) return Fail("Không tìm thấy thư");
        var res = GuiMot(dt.Rows[0]);
        return Ok(new { ok = res ? 1 : 0, fail = res ? 0 : 1 });
    }

    // Gửi TẤT CẢ thư chưa gửi (hoặc gửi lỗi) của hội nghị (mock).
    [HttpPost]
    public Dictionary<string, object> GuiTatCa([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idHN = I(obj, "IDHoiNghi");
        if (idHN <= 0) return Fail("Chưa chọn hội nghị");
        bool guiLai = B(obj, "GuiLai");  // true: gửi cả thư lỗi; false: chỉ thư chưa gửi
        string cond = guiLai ? "t.TrangThaiGui In (0,2)" : "t.TrangThaiGui=0";
        var dt = Table(GuiSelectSql() + $" Where t.IDHoiNghi=@h And {cond}", "@h", null!, idHN);
        int ok = 0, fail = 0;
        if (dt != null)
            foreach (DataRow r in dt.Rows) { if (GuiMot(r)) ok++; else fail++; }
        return Ok(new { total = ok + fail, ok, fail });
    }

    // ===== helpers gửi =====
    private static string GuiSelectSql() => @"
        Select t.ID, t.IDDaiBieu, t.Kenh, t.NoiDung, t.DiaDiem, t.ThoiGian, t.LuuY, t.SoLanGui,
               d.HoTen, d.MaDaiBieu, d.DienThoai, d.Email, h.TenHoiNghi,
               (Select Top 1 g.MaGhe From Meet_Ghe g Where g.IDDaiBieu=d.ID) As MaGhe
        From Meet_ThuMoi t
        Join Meet_DaiBieu d On d.ID=t.IDDaiBieu
        Join Meet_HoiNghi h On h.ID=t.IDHoiNghi";

    private bool GuiMot(DataRow r)
    {
        int id = Convert.ToInt32(r["ID"]);
        int kenh = Convert.ToInt32(r["Kenh"]);
        string noiDung = r["NoiDung"]?.ToString() ?? "";
        if (string.IsNullOrWhiteSpace(noiDung))
            noiDung = "Kính mời {HoTen} tham dự {TenHoiNghi}. Thời gian: {ThoiGian}. Địa điểm: {DiaDiem}. Ghế: {MaGhe}.";
        string content = noiDung
            .Replace("{HoTen}", r["HoTen"]?.ToString() ?? "")
            .Replace("{MaDaiBieu}", r["MaDaiBieu"]?.ToString() ?? "")
            .Replace("{MaGhe}", r["MaGhe"]?.ToString() ?? "(chưa xếp)")
            .Replace("{TenHoiNghi}", r["TenHoiNghi"]?.ToString() ?? "")
            .Replace("{DiaDiem}", r["DiaDiem"]?.ToString() ?? "")
            .Replace("{ThoiGian}", r["ThoiGian"]?.ToString() ?? "")
            .Replace("{LuuY}", r["LuuY"]?.ToString() ?? "");
        string target = kenh == 3 ? (r["Email"]?.ToString() ?? "") : (r["DienThoai"]?.ToString() ?? "");
        var res = MeetSenderFactory.Get(kenh).Send(target, content);
        int soLan = (r["SoLanGui"] == DBNull.Value ? 0 : Convert.ToInt32(r["SoLanGui"])) + 1;
        string msg = "";
        Exec(@"Update Meet_ThuMoi Set TrangThaiGui=@tt, SoLanGui=@sl, ThoiGianGui=GetDate(),
               MaPhanHoiMock=@ma, LoiMock=@loi Where ID=@id", ref msg,
            "@tt", null!, res.Ok ? 1 : 2, "@sl", null!, soLan,
            "@ma", null!, res.Code, "@loi", null!, res.Error, "@id", null!, id);
        return res.Ok;
    }
}
