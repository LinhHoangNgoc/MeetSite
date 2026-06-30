using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "SoDo": sơ đồ chỗ ngồi kéo-thả.
public class SoDoController : MeetBaseController
{
    public SoDoController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "sodo"; return View(); }

    // Danh sách phòng họp khả dụng cho hội nghị (để chọn sơ đồ theo phòng).
    [HttpPost]
    public Dictionary<string, object> ComboPhong()
        => Query(@"Select p.ID, p.TenPhong + IsNull(' — '+d.TenDiaDiem,'') As TenPhong, IsNull(p.SucChua,0) As SucChua
                   From Meet_PhongHop p Left Join Meet_DiaDiem d On d.ID=p.IDDiaDiem Order By p.TenPhong");

    // Lấy (hoặc tạo) sơ đồ của hội nghị THEO PHÒNG HỌP + ghế + đại biểu chưa xếp.
    [HttpPost]
    public Dictionary<string, object> GetSoDo([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idhn = I(obj, "IDHoiNghi");
        int idPhong = I(obj, "IDPhongHop");
        if (idhn <= 0) return Fail("Chưa chọn hội nghị");
        string msg = "";
        // Mỗi (hội nghị, phòng họp) là 1 sơ đồ riêng. Nếu chưa chọn phòng -> lấy sơ đồ gần nhất.
        var dt = idPhong > 0
            ? Table("Select Top 1 * From Meet_SoDo Where IDHoiNghi=@h And IDPhongHop=@p Order By ID", "@h", null!, idhn, "@p", null!, idPhong)
            : Table("Select Top 1 * From Meet_SoDo Where IDHoiNghi=@h Order By ID", "@h", null!, idhn);
        int idSoDo;
        if (dt == null || dt.Rows.Count == 0)
        {
            idSoDo = NextId("Meet_SoDo");
            // Tên sơ đồ lấy theo phòng (nếu có).
            string tenPhong = "Sơ đồ chính";
            if (idPhong > 0)
            {
                var rp = Table("Select TenPhong From Meet_PhongHop Where ID=@p", "@p", null!, idPhong);
                if (rp != null && rp.Rows.Count > 0) tenPhong = "Sơ đồ — " + (rp.Rows[0]["TenPhong"]?.ToString() ?? "");
            }
            Exec("Insert Into Meet_SoDo(ID,IDHoiNghi,IDPhongHop,TenSoDo,RongCanvas,CaoCanvas,DaChot) Values(@id,@h,@p,@t,1000,640,0)",
                ref msg, "@id", null!, idSoDo, "@h", null!, idhn, "@p", null!, (idPhong > 0 ? (object)idPhong : DBNull.Value), "@t", null!, tenPhong);
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

    // Tự động phân ngẫu nhiên đại biểu (KHÔNG VIP, chưa xếp) vào các ghế THƯỜNG còn trống.
    // Ghế VIP giữ nguyên để Ban tổ chức chọn người trước.
    [HttpPost]
    public Dictionary<string, object> RandomAssign([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idSoDo = I(obj, "IDSoDo");
        if (idSoDo <= 0) return Fail("Thiếu sơ đồ");
        if (Locked(idSoDo)) return Fail("Sơ đồ đã chốt, không thể phân ghế");
        var sd = Table("Select IDHoiNghi From Meet_SoDo Where ID=@id", "@id", null!, idSoDo);
        if (sd == null || sd.Rows.Count == 0) return Fail("Không tìm thấy sơ đồ");
        int idhn = Convert.ToInt32(sd.Rows[0]["IDHoiNghi"]);

        // Ghế thường còn trống (loại trừ ghế VIP = 1), xếp theo vị trí.
        var seatTb = Table("Select ID From Meet_Ghe Where IDSoDo=@s And IDDaiBieu Is Null And IsNull(LoaiGhe,0)<>1 Order By ToaDoY, ToaDoX",
            "@s", null!, idSoDo);
        // Đại biểu KHÔNG VIP, chưa ngồi ghế nào.
        var dbTb = Table(@"Select d.ID From Meet_DaiBieu d
                           Where d.IDHoiNghi=@h And IsNull(d.TrangThaiDangKy,1)<>2 And IsNull(d.LaVIP,0)=0
                             And Not Exists(Select 1 From Meet_Ghe g Where g.IDDaiBieu=d.ID)",
            "@h", null!, idhn);
        var seats = new List<int>();
        if (seatTb != null) foreach (System.Data.DataRow r in seatTb.Rows) seats.Add(Convert.ToInt32(r["ID"]));
        var dbs = new List<int>();
        if (dbTb != null) foreach (System.Data.DataRow r in dbTb.Rows) dbs.Add(Convert.ToInt32(r["ID"]));
        // Trộn ngẫu nhiên danh sách đại biểu (Fisher–Yates).
        for (int i = dbs.Count - 1; i > 0; i--) { int j = Random.Shared.Next(i + 1); (dbs[i], dbs[j]) = (dbs[j], dbs[i]); }

        int n = Math.Min(seats.Count, dbs.Count); string msg = "";
        for (int k = 0; k < n; k++)
            Exec("Update Meet_Ghe Set IDDaiBieu=@d Where ID=@g", ref msg, "@d", null!, dbs[k], "@g", null!, seats[k]);
        return Ok(new { count = n, gheTrong = seats.Count, conLai = Math.Max(0, dbs.Count - n) });
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
