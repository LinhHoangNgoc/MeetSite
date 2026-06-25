using System.Data;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "KhaoSat": thiết kế phiếu khảo sát + câu hỏi.
public class KhaoSatController : MeetBaseController
{
    public KhaoSatController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "khaosat"; return View(); }

    [HttpPost]
    public Dictionary<string, object> ListKhaoSat([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select k.ID, k.TieuDe, k.MoTa, k.TrangThai, k.NgayTao,
                              (Select Count(*) From Meet_CauHoi Where IDKhaoSat=k.ID) As SoCauHoi,
                              (Select Count(Distinct IsNull(IDDaiBieu,ID)) From Meet_TraLoi Where IDKhaoSat=k.ID) As SoPhanHoi
                       From Meet_KhaoSat k Where k.IDHoiNghi=@h Order By k.ID Desc", "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    public Dictionary<string, object> SaveKhaoSat([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idHN = I(obj, "IDHoiNghi");
        if (idHN <= 0) return Fail("Chưa chọn hội nghị");
        if (string.IsNullOrWhiteSpace(S(obj, "TieuDe"))) return Fail("Nhập tiêu đề khảo sát");
        int id = I(obj, "ID"); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_KhaoSat");
        string sql = isNew
            ? "Insert Into Meet_KhaoSat(ID,IDHoiNghi,TieuDe,MoTa,TrangThai,NgayTao) Values(@id,@h,@td,@mt,@tt,GetDate())"
            : "Update Meet_KhaoSat Set TieuDe=@td,MoTa=@mt,TrangThai=@tt Where ID=@id";
        if (!Exec(sql, ref msg, "@id", null!, id, "@h", null!, idHN, "@td", null!, S(obj, "TieuDe"),
            "@mt", null!, S(obj, "MoTa"), "@tt", null!, I(obj, "TrangThai", 1))) return Fail(msg);
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteKhaoSat([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        Exec(@"Delete From Meet_TraLoi Where IDKhaoSat=@id;
               Delete From Meet_LuaChon Where IDCauHoi In (Select ID From Meet_CauHoi Where IDKhaoSat=@id);
               Delete From Meet_CauHoi Where IDKhaoSat=@id; Delete From Meet_KhaoSat Where ID=@id", ref msg, "@id", null!, id);
        return Ok();
    }

    // Trả về câu hỏi + lựa chọn (cho thiết kế).
    [HttpPost]
    public Dictionary<string, object> ListCauHoi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idKS = I(obj, "IDKhaoSat");
        var ch = Table("Select ID, NoiDung, LoaiCauHoi, ThuTu, BatBuoc From Meet_CauHoi Where IDKhaoSat=@k Order By ThuTu, ID", "@k", null!, idKS);
        var lc = Table("Select ID, IDCauHoi, NoiDung, ThuTu From Meet_LuaChon Where IDCauHoi In (Select ID From Meet_CauHoi Where IDKhaoSat=@k) Order By ThuTu, ID", "@k", null!, idKS);
        return Ok(new
        {
            cauHoi = ch != null ? _sys.ConvertDataTableToList(ch) : new(),
            luaChon = lc != null ? _sys.ConvertDataTableToList(lc) : new()
        });
    }

    [HttpPost]
    public Dictionary<string, object> SaveCauHoi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idKS = I(obj, "IDKhaoSat");
        if (idKS <= 0) return Fail("Thiếu khảo sát");
        if (string.IsNullOrWhiteSpace(S(obj, "NoiDung"))) return Fail("Nhập nội dung câu hỏi");
        int id = I(obj, "ID"); int loai = I(obj, "LoaiCauHoi", 1); string msg = ""; bool isNew = id <= 0;
        if (isNew) id = NextId("Meet_CauHoi");
        string sql = isNew
            ? "Insert Into Meet_CauHoi(ID,IDKhaoSat,NoiDung,LoaiCauHoi,ThuTu,BatBuoc) Values(@id,@k,@nd,@l,@tu,@bb)"
            : "Update Meet_CauHoi Set NoiDung=@nd,LoaiCauHoi=@l,ThuTu=@tu,BatBuoc=@bb Where ID=@id";
        if (!Exec(sql, ref msg, "@id", null!, id, "@k", null!, idKS, "@nd", null!, S(obj, "NoiDung"),
            "@l", null!, loai, "@tu", null!, I(obj, "ThuTu"), "@bb", null!, (B(obj, "BatBuoc") ? 1 : 0))) return Fail(msg);
        // Lựa chọn (cho loại 2,3): nhận OptionsJson = ["A","B",...]
        Exec("Delete From Meet_LuaChon Where IDCauHoi=@id", ref msg, "@id", null!, id);
        if (loai == 2 || loai == 3)
        {
            string oj = S(obj, "OptionsJson");
            if (!string.IsNullOrWhiteSpace(oj))
                try
                {
                    var arr = JsonSerializer.Deserialize<List<string>>(oj) ?? new();
                    int ord = 1;
                    foreach (var o in arr)
                    {
                        if (string.IsNullOrWhiteSpace(o)) continue;
                        Exec("Insert Into Meet_LuaChon(ID,IDCauHoi,NoiDung,ThuTu) Values(@id,@c,@nd,@tu)", ref msg,
                            "@id", null!, NextId("Meet_LuaChon"), "@c", null!, id, "@nd", null!, o.Trim(), "@tu", null!, ord++);
                    }
                }
                catch { }
        }
        return Ok(new { id });
    }

    [HttpPost]
    public Dictionary<string, object> DeleteCauHoi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        Exec("Delete From Meet_TraLoi Where IDCauHoi=@id; Delete From Meet_LuaChon Where IDCauHoi=@id; Delete From Meet_CauHoi Where ID=@id", ref msg, "@id", null!, id);
        return Ok();
    }
}
