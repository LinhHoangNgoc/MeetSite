using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "SoDo": sơ đồ chỗ ngồi kéo-thả.
public class SoDoController : MeetBaseController
{
    public SoDoController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "sodo"; return View(); }

    // Lấy (hoặc tạo) sơ đồ của hội nghị + ghế + đại biểu chưa xếp.
    [HttpPost]
    public Dictionary<string, object> GetSoDo([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        string msg = "";
        var dt = Table("Select Top 1 * From Meet_SoDo Where IDHoiNghi=@h Order By ID", "@h", null!, idhn);
        int idSoDo;
        if (dt == null || dt.Rows.Count == 0)
        {
            idSoDo = NextId("Meet_SoDo");
            Exec("Insert Into Meet_SoDo(ID,IDHoiNghi,TenSoDo,RongCanvas,CaoCanvas,DaChot) Values(@id,@h,N'Sơ đồ chính',1000,640,0)",
                ref msg, "@id", null!, idSoDo, "@h", null!, idhn);
            dt = Table("Select * From Meet_SoDo Where ID=@id", "@id", null!, idSoDo);
        }
        var soDo = _sys.ConvertDataTableToList(dt!)[0];
        idSoDo = Convert.ToInt32(soDo["ID"]);
        var ghe = Table(@"Select g.ID, g.MaGhe, g.ToaDoX, g.ToaDoY, g.LoaiGhe, g.IDDaiBieu,
                                 d.HoTen, d.LaVIP, n.MauSac
                          From Meet_Ghe g Left Join Meet_DaiBieu d On d.ID=g.IDDaiBieu
                          Left Join Meet_NhomDaiBieu n On n.ID=d.IDNhom
                          Where g.IDSoDo=@s Order By g.ID", "@s", null!, idSoDo);
        var chuaXep = Table(@"Select d.ID, d.HoTen, d.MaDaiBieu, d.LaVIP, n.TenNhom, n.MauSac
                              From Meet_DaiBieu d Left Join Meet_NhomDaiBieu n On n.ID=d.IDNhom
                              Where d.IDHoiNghi=@h And IsNull(d.TrangThaiDangKy,1)<>2
                                And Not Exists(Select 1 From Meet_Ghe g Where g.IDDaiBieu=d.ID)
                              Order By d.LaVIP Desc, d.HoTen", "@h", null!, idhn);
        return Ok(new
        {
            soDo,
            ghe = ghe != null ? _sys.ConvertDataTableToList(ghe) : new(),
            chuaXep = chuaXep != null ? _sys.ConvertDataTableToList(chuaXep) : new()
        });
    }

    // Sinh lưới ghế rows x cols.
    [HttpPost]
    public Dictionary<string, object> GenSeats([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idSoDo = I(obj, "IDSoDo"); int rows = I(obj, "Rows"); int cols = I(obj, "Cols");
        if (idSoDo <= 0 || rows <= 0 || cols <= 0) return Fail("Thiếu thông tin lưới");
        if (rows * cols > 600) return Fail("Tối đa 600 ghế mỗi lần sinh");
        string msg = "";
        if (Locked(idSoDo)) return Fail("Sơ đồ đã chốt, không thể sửa");
        int startX = 60, startY = 90, gapX = 46, gapY = 50;
        int id = NextId("Meet_Ghe");
        string letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
            {
                string ma = (r < 26 ? letters[r].ToString() : "R" + (r + 1)) + "-" + (c + 1).ToString("D2");
                Exec("Insert Into Meet_Ghe(ID,IDSoDo,MaGhe,Hang,Cot,ToaDoX,ToaDoY,LoaiGhe) Values(@id,@s,@ma,@hg,@ct,@x,@y,0)",
                    ref msg, "@id", null!, id, "@s", null!, idSoDo, "@ma", null!, ma,
                    "@hg", null!, (r < 26 ? letters[r].ToString() : "R" + (r + 1)), "@ct", null!, c + 1,
                    "@x", null!, startX + c * gapX, "@y", null!, startY + r * gapY);
                id++;
            }
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> AddGhe([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idSoDo = I(obj, "IDSoDo"); string msg = "";
        if (Locked(idSoDo)) return Fail("Sơ đồ đã chốt");
        int id = NextId("Meet_Ghe");
        if (!Exec("Insert Into Meet_Ghe(ID,IDSoDo,MaGhe,ToaDoX,ToaDoY,LoaiGhe) Values(@id,@s,@ma,@x,@y,@l)", ref msg,
            "@id", null!, id, "@s", null!, idSoDo, "@ma", null!, S(obj, "MaGhe"),
            "@x", null!, I(obj, "ToaDoX"), "@y", null!, I(obj, "ToaDoY"), "@l", null!, I(obj, "LoaiGhe")))
            return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> MoveGhe([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string msg = "";
        if (!Exec("Update Meet_Ghe Set ToaDoX=@x, ToaDoY=@y Where ID=@id", ref msg,
            "@x", null!, I(obj, "ToaDoX"), "@y", null!, I(obj, "ToaDoY"), "@id", null!, I(obj, "ID"))) return Fail(msg);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> SaveGhe([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string msg = "";
        if (!Exec("Update Meet_Ghe Set MaGhe=@ma, LoaiGhe=@l Where ID=@id", ref msg,
            "@ma", null!, S(obj, "MaGhe"), "@l", null!, I(obj, "LoaiGhe"), "@id", null!, I(obj, "ID"))) return Fail(msg);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> DeleteGhe([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idSoDo = I(obj, "IDSoDo"); string msg = "";
        if (idSoDo > 0 && Locked(idSoDo)) return Fail("Sơ đồ đã chốt");
        if (!Exec("Delete From Meet_Ghe Where ID=@id", ref msg, "@id", null!, I(obj, "ID"))) return Fail(msg);
        return Ok();
    }

    // Gán / bỏ gán đại biểu vào ghế. IDDaiBieu=0 -> bỏ gán.
    [HttpPost]
    public Dictionary<string, object> AssignGhe([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idGhe = I(obj, "IDGhe"); int idDB = I(obj, "IDDaiBieu"); string msg = "";
        if (idDB > 0)
        {
            // Bỏ đại biểu khỏi ghế cũ (1 đại biểu chỉ ngồi 1 ghế).
            Exec("Update Meet_Ghe Set IDDaiBieu=Null Where IDDaiBieu=@d And IDSoDo=(Select IDSoDo From Meet_Ghe Where ID=@g)",
                ref msg, "@d", null!, idDB, "@g", null!, idGhe);
            if (!Exec("Update Meet_Ghe Set IDDaiBieu=@d Where ID=@g", ref msg, "@d", null!, idDB, "@g", null!, idGhe)) return Fail(msg);
        }
        else
        {
            if (!Exec("Update Meet_Ghe Set IDDaiBieu=Null Where ID=@g", ref msg, "@g", null!, idGhe)) return Fail(msg);
        }
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> SaveLayout([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string msg = "";
        if (!Exec("Update Meet_SoDo Set LayoutJson=@j, RongCanvas=@w, CaoCanvas=@h, NguoiSua=@u, NgaySua=GetDate() Where ID=@id", ref msg,
            "@j", null!, S(obj, "LayoutJson"), "@w", null!, I(obj, "RongCanvas", 1000), "@h", null!, I(obj, "CaoCanvas", 640),
            "@u", null!, CurUser, "@id", null!, I(obj, "ID"))) return Fail(msg);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> ChotSoDo([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); bool chot = B(obj, "Chot"); string msg = "";
        if (!Exec("Update Meet_SoDo Set DaChot=@c, NgayChot=GetDate() Where ID=@id", ref msg,
            "@c", null!, chot ? 1 : 0, "@id", null!, id)) return Fail(msg);
        return Ok();
    }

    private bool Locked(int idSoDo)
    {
        var dt = Table("Select DaChot From Meet_SoDo Where ID=@id", "@id", null!, idSoDo);
        return dt != null && dt.Rows.Count > 0 && dt.Rows[0]["DaChot"] != DBNull.Value && Convert.ToBoolean(dt.Rows[0]["DaChot"]);
    }
}
