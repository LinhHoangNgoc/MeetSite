using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "CheckIn": màn điều hành điểm danh (desktop) — thống kê realtime + điểm danh thủ công.
public class CheckInController : MeetBaseController
{
    public CheckInController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "checkin"; return View(); }

    [HttpPost]
    public Dictionary<string, object> Stats([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idHN = I(obj, "IDHoiNghi");
        var dt = Table(@"Select
            (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=@h And IsNull(TrangThaiDangKy,1)<>2) As Total,
            (Select Count(Distinct IDDaiBieu) From Meet_CheckIn Where IDHoiNghi=@h) As Present,
            (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=@h And LaVIP=1) As TotalVIP,
            (Select Count(Distinct c.IDDaiBieu) From Meet_CheckIn c Join Meet_DaiBieu d On d.ID=c.IDDaiBieu Where c.IDHoiNghi=@h And d.LaVIP=1) As PresentVIP",
            "@h", null!, idHN);
        var r = dt!.Rows[0];
        int total = Convert.ToInt32(r["Total"]), present = Convert.ToInt32(r["Present"]);
        return Ok(new
        {
            total, present, percent = total > 0 ? (int)Math.Round(present * 100.0 / total) : 0,
            totalVIP = Convert.ToInt32(r["TotalVIP"]), presentVIP = Convert.ToInt32(r["PresentVIP"])
        });
    }

    [HttpPost]
    public Dictionary<string, object> ListCheckIn([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select c.ID, d.MaDaiBieu, d.HoTen, d.DonVi, d.LaVIP, c.ThoiGianCheckIn, c.PhuongThuc, c.IDKiosk,
                              (Select Top 1 g.MaGhe From Meet_Ghe g Where g.IDDaiBieu=d.ID) As MaGhe
                       From Meet_CheckIn c Join Meet_DaiBieu d On d.ID=c.IDDaiBieu
                       Where c.IDHoiNghi=@h Order By c.ThoiGianCheckIn Desc", "@h", null!, I(obj, "IDHoiNghi"));
    }

    // Đại biểu chưa điểm danh (cho điểm danh thủ công).
    [HttpPost]
    public Dictionary<string, object> ChuaCheckIn([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select d.ID, d.MaDaiBieu, d.HoTen, d.DonVi From Meet_DaiBieu d
                       Where d.IDHoiNghi=@h And IsNull(d.TrangThaiDangKy,1)<>2
                         And Not Exists(Select 1 From Meet_CheckIn c Where c.IDDaiBieu=d.ID)
                       Order By d.HoTen", "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> ManualCheckIn([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idDB = I(obj, "IDDaiBieu"); int idHN = I(obj, "IDHoiNghi"); string msg = "";
        if (idDB <= 0 || idHN <= 0) return Fail("Thiếu thông tin");
        var ex = Table("Select Top 1 1 As X From Meet_CheckIn Where IDHoiNghi=@h And IDDaiBieu=@d", "@h", null!, idHN, "@d", null!, idDB);
        if (ex != null && ex.Rows.Count > 0) return Ok(new { already = true });
        int id = NextId("Meet_CheckIn");
        if (!Exec(@"Insert Into Meet_CheckIn(ID,IDHoiNghi,IDDaiBieu,ThoiGianCheckIn,PhuongThuc,IDKiosk)
                    Values(@id,@h,@d,GetDate(),4,N'Thủ công')", ref msg, "@id", null!, id, "@h", null!, idHN, "@d", null!, idDB))
            return Fail(msg);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> UndoCheckIn([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string msg = "";
        if (!Exec("Delete From Meet_CheckIn Where ID=@id", ref msg, "@id", null!, I(obj, "ID"))) return Fail(msg);
        return Ok();
    }
}
