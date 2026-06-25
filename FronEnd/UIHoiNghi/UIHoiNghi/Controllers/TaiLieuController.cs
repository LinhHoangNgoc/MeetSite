using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace UIHoiNghi.Controllers;

// GroupKey = "TaiLieu": quản lý & chia sẻ tài liệu (upload, phân quyền nhóm, QR).
public class TaiLieuController : MeetBaseController
{
    private readonly IConfiguration _config;
    public TaiLieuController(Connection cn, Sys sys, IConfiguration config) : base(cn, sys) { _config = config; }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "tailieu"; return View(); }

    private string UploadDir()
    {
        string root = _config["AppConfig:RootFolder"] ?? "";
        if (string.IsNullOrWhiteSpace(root)) root = Path.Combine(AppContext.BaseDirectory, "MeetData");
        string dir = Path.Combine(root, "uploads", "meet");
        Directory.CreateDirectory(dir);
        return dir;
    }

    [HttpPost]
    public Dictionary<string, object> ListTaiLieu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select t.ID, t.TenTaiLieu, t.TenFileGoc, t.LoaiFile, t.KichThuoc, t.PhamViTruyCap,
                              t.ShareToken, t.NgayTaiLen, p.TenPhien,
                              (Select Count(*) From Meet_TaiLieuLuotXem v Where v.IDTaiLieu=t.ID) As LuotXem,
                              (Select Count(*) From Meet_TaiLieuNhom tn Where tn.IDTaiLieu=t.ID) As SoNhom
                       From Meet_TaiLieu t Left Join Meet_Phien p On p.ID=t.IDPhien
                       Where t.IDHoiNghi=@h Order By t.NgayTaiLen Desc", "@h", null!, I(obj, "IDHoiNghi"));
    }

    [HttpPost]
    [RequestSizeLimit(31_457_280)] // 30MB
    public async Task<Dictionary<string, object>> UploadTaiLieu()
    {
        var form = await Request.ReadFormAsync();
        int idHN = int.TryParse(form["IDHoiNghi"], out var h) ? h : 0;
        if (idHN <= 0) return Fail("Chưa chọn hội nghị");
        if (form.Files.Count == 0) return Fail("Chưa chọn tệp");
        var file = form.Files[0];
        if (file.Length == 0) return Fail("Tệp rỗng");
        if (file.Length > 31_457_280) return Fail("Tệp vượt quá 30MB");
        string ext = Path.GetExtension(file.FileName);
        var allow = new[] { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".txt", ".zip" };
        if (!allow.Contains(ext.ToLower())) return Fail("Định dạng không được phép");
        string stored = Guid.NewGuid().ToString("N") + ext;
        try { using var fs = new FileStream(Path.Combine(UploadDir(), stored), FileMode.Create); await file.CopyToAsync(fs); }
        catch (Exception ex) { return Fail("Lỗi lưu tệp: " + ex.Message); }

        int id = NextId("Meet_TaiLieu"); string msg = "";
        string ten = form["TenTaiLieu"].ToString(); if (string.IsNullOrWhiteSpace(ten)) ten = Path.GetFileNameWithoutExtension(file.FileName);
        int idPhien = int.TryParse(form["IDPhien"], out var p) ? p : 0;
        int phamVi = int.TryParse(form["PhamViTruyCap"], out var pv) ? pv : 1;
        string share = Guid.NewGuid().ToString("N").Substring(0, 16);
        if (!Exec(@"Insert Into Meet_TaiLieu(ID,IDHoiNghi,IDPhien,TenTaiLieu,TenFileGoc,DuongDan,KichThuoc,LoaiFile,PhamViTruyCap,ChiaSeQR,ShareToken,NguoiTaiLen,NgayTaiLen)
                    Values(@id,@h,@ph,@ten,@goc,@dd,@kt,@lf,@pv,1,@st,@u,GetDate())", ref msg,
            "@id", null!, id, "@h", null!, idHN, "@ph", null!, idPhien > 0 ? (object)idPhien : DBNull.Value,
            "@ten", null!, ten, "@goc", null!, file.FileName, "@dd", null!, stored, "@kt", null!, file.Length,
            "@lf", null!, ext.TrimStart('.').ToUpper(), "@pv", null!, phamVi, "@st", null!, share, "@u", null!, CurUser))
            return Fail(msg);
        // Gán nhóm nếu phạm vi = theo nhóm
        string nhoms = form["IDNhom"].ToString();
        if (phamVi == 2 && !string.IsNullOrWhiteSpace(nhoms))
            foreach (var n in nhoms.Split(',', StringSplitOptions.RemoveEmptyEntries))
                if (int.TryParse(n, out var idn))
                    Exec("Insert Into Meet_TaiLieuNhom(ID,IDTaiLieu,IDNhom) Values(@id,@t,@n)", ref msg,
                        "@id", null!, NextId("Meet_TaiLieuNhom"), "@t", null!, id, "@n", null!, idn);
        return Ok(new { id, share });
    }

    [HttpPost]
    public Dictionary<string, object> SaveQuyen([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); int phamVi = I(obj, "PhamViTruyCap", 1); string msg = "";
        Exec("Update Meet_TaiLieu Set PhamViTruyCap=@pv Where ID=@id", ref msg, "@pv", null!, phamVi, "@id", null!, id);
        Exec("Delete From Meet_TaiLieuNhom Where IDTaiLieu=@id", ref msg, "@id", null!, id);
        string nhoms = S(obj, "IDNhom");
        if (phamVi == 2 && !string.IsNullOrWhiteSpace(nhoms))
            foreach (var n in nhoms.Split(',', StringSplitOptions.RemoveEmptyEntries))
                if (int.TryParse(n, out var idn))
                    Exec("Insert Into Meet_TaiLieuNhom(ID,IDTaiLieu,IDNhom) Values(@id,@t,@n)", ref msg,
                        "@id", null!, NextId("Meet_TaiLieuNhom"), "@t", null!, id, "@n", null!, idn);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> DeleteTaiLieu([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID"); string msg = "";
        var dt = Table("Select DuongDan From Meet_TaiLieu Where ID=@id", "@id", null!, id);
        if (dt != null && dt.Rows.Count > 0)
        {
            try { var f = Path.Combine(UploadDir(), dt.Rows[0]["DuongDan"]?.ToString() ?? ""); if (System.IO.File.Exists(f)) System.IO.File.Delete(f); } catch { }
        }
        Exec("Delete From Meet_TaiLieuNhom Where IDTaiLieu=@id; Delete From Meet_TaiLieuLuotXem Where IDTaiLieu=@id; Delete From Meet_TaiLieu Where ID=@id", ref msg, "@id", null!, id);
        return Ok();
    }

    [HttpPost]
    public Dictionary<string, object> GetQuyen([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query("Select IDNhom From Meet_TaiLieuNhom Where IDTaiLieu=@id", "@id", null!, I(obj, "ID"));
    }

    // Tải/xem tài liệu (desktop, đã đăng nhập).
    [HttpGet("TaiLieu/Download/{id}")]
    public IActionResult Download(int id)
    {
        var dt = Table("Select DuongDan, TenFileGoc From Meet_TaiLieu Where ID=@id", "@id", null!, id);
        if (dt == null || dt.Rows.Count == 0) return NotFound();
        string path = Path.Combine(UploadDir(), dt.Rows[0]["DuongDan"]?.ToString() ?? "");
        if (!System.IO.File.Exists(path)) return NotFound();
        var bytes = System.IO.File.ReadAllBytes(path);
        return File(bytes, "application/octet-stream", dt.Rows[0]["TenFileGoc"]?.ToString() ?? "taptin");
    }
}
