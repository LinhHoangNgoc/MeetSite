using System.Data;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace UIHoiNghi.Controllers;

// Lớp CÔNG KHAI cho mobile/kiosk — KHÔNG cần login desktop (exempt trong CheckLoginFilter).
// Tự xác thực bằng QRToken cá nhân của đại biểu.
public class MeetPublicController : MeetBaseController
{
    private readonly IConfiguration _config;
    public MeetPublicController(Connection cn, Sys sys, IConfiguration config) : base(cn, sys) { _config = config; }

    // ===== Trang (mobile) =====
    [HttpGet] public IActionResult Kiosk() => View();
    [HttpGet] public IActionResult DaiBieu() => View();
    [HttpGet] public IActionResult KhaoSat() => View();

    private string UploadDir()
    {
        string root = _config["AppConfig:RootFolder"] ?? "";
        if (string.IsNullOrWhiteSpace(root)) root = Path.Combine(AppContext.BaseDirectory, "MeetData");
        string dir = Path.Combine(root, "uploads", "meet");
        Directory.CreateDirectory(dir);
        return dir;
    }

    // Mở/xem tài liệu qua share token (ghi nhận lượt xem). dbtoken = token đại biểu (tùy chọn).
    [HttpGet("meetpublic/OpenTaiLieu")]
    public IActionResult OpenTaiLieu(string share, string dbtoken = "")
    {
        if (string.IsNullOrWhiteSpace(share)) return NotFound();
        var dt = Table("Select ID, DuongDan, TenFileGoc, LoaiFile From Meet_TaiLieu Where ShareToken=@s", "@s", null!, share);
        if (dt == null || dt.Rows.Count == 0) return NotFound();
        var r = dt.Rows[0]; int idTL = Convert.ToInt32(r["ID"]);
        // Ghi lượt xem
        int idDB = 0;
        if (!string.IsNullOrWhiteSpace(dbtoken))
        {
            var d = Table("Select ID From Meet_DaiBieu Where QRToken=@t", "@t", null!, dbtoken);
            if (d != null && d.Rows.Count > 0) idDB = Convert.ToInt32(d.Rows[0]["ID"]);
        }
        string msg = "";
        Exec("Insert Into Meet_TaiLieuLuotXem(ID,IDTaiLieu,IDDaiBieu,ThoiGianXem,IP) Values(@id,@t,@d,GetDate(),@ip)", ref msg,
            "@id", null!, NextId("Meet_TaiLieuLuotXem"), "@t", null!, idTL,
            "@d", null!, idDB > 0 ? (object)idDB : DBNull.Value, "@ip", null!, HttpContext.Connection.RemoteIpAddress?.ToString() ?? "");
        string path = Path.Combine(UploadDir(), r["DuongDan"]?.ToString() ?? "");
        if (!System.IO.File.Exists(path)) return NotFound();
        string ext = (r["LoaiFile"]?.ToString() ?? "").ToLower();
        string ct = ext switch { "pdf" => "application/pdf", "png" => "image/png", "jpg" or "jpeg" => "image/jpeg", "txt" => "text/plain", _ => "application/octet-stream" };
        var bytes = System.IO.File.ReadAllBytes(path);
        // PDF/ảnh: xem inline; còn lại tải về.
        if (ct == "application/octet-stream") return File(bytes, ct, r["TenFileGoc"]?.ToString() ?? "taptin");
        Response.Headers["Content-Disposition"] = "inline";
        return File(bytes, ct);
    }

    // ===== Check-in bằng QRToken (kiosk/điện thoại) =====
    [HttpPost]
    public Dictionary<string, object> CheckIn([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string token = S(obj, "Token").Trim();
        string kiosk = S(obj, "Kiosk");
        if (token == "") return Fail("Thiếu mã QR");
        // Hỗ trợ quét QR chứa URL: tách token sau 'token='
        int p = token.IndexOf("token=", StringComparison.OrdinalIgnoreCase);
        if (p >= 0) { token = token.Substring(p + 6); int amp = token.IndexOf('&'); if (amp > 0) token = token.Substring(0, amp); }

        var d = Table(@"Select d.ID, d.HoTen, d.MaDaiBieu, d.IDHoiNghi, d.LaVIP, h.TenHoiNghi,
                               (Select Top 1 g.MaGhe From Meet_Ghe g Where g.IDDaiBieu=d.ID) As MaGhe
                        From Meet_DaiBieu d Join Meet_HoiNghi h On h.ID=d.IDHoiNghi
                        Where d.QRToken=@t", "@t", null!, token);
        if (d == null || d.Rows.Count == 0) return Fail("Mã QR không hợp lệ");
        var r = d.Rows[0];
        int idDB = Convert.ToInt32(r["ID"]); int idHN = Convert.ToInt32(r["IDHoiNghi"]);
        string msg = "";
        var existed = Table("Select Top 1 ThoiGianCheckIn From Meet_CheckIn Where IDHoiNghi=@h And IDDaiBieu=@d Order By ID",
            "@h", null!, idHN, "@d", null!, idDB);
        bool already = existed != null && existed.Rows.Count > 0;
        if (!already)
        {
            int id = NextId("Meet_CheckIn");
            Exec(@"Insert Into Meet_CheckIn(ID,IDHoiNghi,IDDaiBieu,ThoiGianCheckIn,PhuongThuc,IDKiosk)
                   Values(@id,@h,@d,GetDate(),1,@k)", ref msg, "@id", null!, id, "@h", null!, idHN, "@d", null!, idDB, "@k", null!, kiosk);
        }
        return Ok(new
        {
            hoTen = r["HoTen"]?.ToString(),
            maDaiBieu = r["MaDaiBieu"]?.ToString(),
            maGhe = r["MaGhe"]?.ToString(),
            laVIP = r["LaVIP"] != DBNull.Value && Convert.ToBoolean(r["LaVIP"]),
            tenHoiNghi = r["TenHoiNghi"]?.ToString(),
            already,
            thoiGian = already ? Convert.ToDateTime(existed!.Rows[0]["ThoiGianCheckIn"]).ToString("HH:mm dd/MM") : DateTime.Now.ToString("HH:mm dd/MM")
        });
    }

    // ===== Check-in ĐA PHƯƠNG THỨC: QR / NFC / CCCD / Nhận diện khuôn mặt =====
    // PhuongThuc: 1 QR(Token), 2 NFC(MaNFC), 3 khuôn mặt(IDDaiBieu mô phỏng), 5 CCCD(SoCCCD).
    [HttpPost]
    public Dictionary<string, object> CheckInDinhDanh([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int pt = I(obj, "PhuongThuc", 1);
        string kiosk = S(obj, "Kiosk");
        string giaTri = S(obj, "GiaTri").Trim();
        int idHNloc = I(obj, "IDHoiNghi");

        string where; object val;
        switch (pt)
        {
            case 2: // NFC
                if (giaTri == "") return Fail("Thiếu mã thẻ NFC");
                where = "d.MaNFC=@v"; val = giaTri; break;
            case 5: // CCCD
                if (giaTri == "") return Fail("Thiếu số căn cước công dân");
                where = "d.SoCCCD=@v"; val = giaTri; break;
            case 3: // Khuôn mặt (mô phỏng: nhận diện trả về IDDaiBieu)
                int idFace = I(obj, "IDDaiBieu");
                if (idFace <= 0) return Fail("Không nhận diện được khuôn mặt");
                where = "d.ID=@v"; val = idFace; break;
            default: // QR
                if (giaTri == "") return Fail("Thiếu mã QR");
                int p2 = giaTri.IndexOf("token=", StringComparison.OrdinalIgnoreCase);
                if (p2 >= 0) { giaTri = giaTri.Substring(p2 + 6); int amp = giaTri.IndexOf('&'); if (amp > 0) giaTri = giaTri.Substring(0, amp); }
                where = "d.QRToken=@v"; val = giaTri; pt = 1; break;
        }

        var d = Table($@"Select d.ID, d.HoTen, d.MaDaiBieu, d.IDHoiNghi, d.LaVIP, h.TenHoiNghi,
                                (Select Top 1 g.MaGhe From Meet_Ghe g Where g.IDDaiBieu=d.ID) As MaGhe
                         From Meet_DaiBieu d Join Meet_HoiNghi h On h.ID=d.IDHoiNghi
                         Where {where}" + (idHNloc > 0 ? " And d.IDHoiNghi=@h" : ""),
            idHNloc > 0 ? new object[] { "@v", null!, val, "@h", null!, idHNloc } : new object[] { "@v", null!, val });
        if (d == null || d.Rows.Count == 0)
            return Fail(pt switch { 2 => "Thẻ NFC chưa gắn đại biểu", 5 => "Không tìm thấy đại biểu theo CCCD", 3 => "Khuôn mặt chưa khớp đại biểu nào", _ => "Mã QR không hợp lệ" });
        var r = d.Rows[0];
        int idDB = Convert.ToInt32(r["ID"]); int idHN = Convert.ToInt32(r["IDHoiNghi"]);
        string msg = "";
        var existed = Table("Select Top 1 ThoiGianCheckIn From Meet_CheckIn Where IDHoiNghi=@h And IDDaiBieu=@d Order By ID",
            "@h", null!, idHN, "@d", null!, idDB);
        bool already = existed != null && existed.Rows.Count > 0;
        if (!already)
            Exec(@"Insert Into Meet_CheckIn(ID,IDHoiNghi,IDDaiBieu,ThoiGianCheckIn,PhuongThuc,IDKiosk)
                   Values(@id,@h,@d,GetDate(),@pt,@k)", ref msg,
                "@id", null!, NextId("Meet_CheckIn"), "@h", null!, idHN, "@d", null!, idDB, "@pt", null!, pt, "@k", null!, kiosk);
        return Ok(new
        {
            hoTen = r["HoTen"]?.ToString(),
            maDaiBieu = r["MaDaiBieu"]?.ToString(),
            maGhe = r["MaGhe"]?.ToString(),
            laVIP = r["LaVIP"] != DBNull.Value && Convert.ToBoolean(r["LaVIP"]),
            tenHoiNghi = r["TenHoiNghi"]?.ToString(),
            phuongThuc = pt,
            already,
            thoiGian = already ? Convert.ToDateTime(existed!.Rows[0]["ThoiGianCheckIn"]).ToString("HH:mm dd/MM") : DateTime.Now.ToString("HH:mm dd/MM")
        });
    }

    // Danh sách đại biểu (ảnh/tên) phục vụ mô phỏng nhận diện khuôn mặt trên kiosk.
    [HttpPost]
    public Dictionary<string, object> DanhSachKhuonMat([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select d.ID, d.HoTen, d.MaDaiBieu, d.DonVi,
                              (Case When Exists(Select 1 From Meet_CheckIn c Where c.IDDaiBieu=d.ID) Then 1 Else 0 End) As DaCheckIn
                       From Meet_DaiBieu d
                       Where d.IDHoiNghi=@h And IsNull(d.TrangThaiDangKy,1)<>2
                       Order By d.HoTen", "@h", null!, I(obj, "IDHoiNghi"));
    }

    // ===== Khảo sát (mobile) =====
    [HttpPost]
    public Dictionary<string, object> GetKhaoSat([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int id = I(obj, "ID");
        var ks = Table("Select ID, TieuDe, MoTa, TrangThai From Meet_KhaoSat Where ID=@id", "@id", null!, id);
        if (ks == null || ks.Rows.Count == 0) return Fail("Không tìm thấy khảo sát");
        if (Convert.ToInt32(ks.Rows[0]["TrangThai"]) == 2) return Fail("Khảo sát đã đóng");
        var ch = Table("Select ID, NoiDung, LoaiCauHoi, BatBuoc From Meet_CauHoi Where IDKhaoSat=@id Order By ThuTu, ID", "@id", null!, id);
        var lc = Table("Select ID, IDCauHoi, NoiDung From Meet_LuaChon Where IDCauHoi In (Select ID From Meet_CauHoi Where IDKhaoSat=@id) Order By ThuTu, ID", "@id", null!, id);
        return Ok(new
        {
            khaoSat = _sys.ConvertDataTableToList(ks)[0],
            cauHoi = ch != null ? _sys.ConvertDataTableToList(ch) : new(),
            luaChon = lc != null ? _sys.ConvertDataTableToList(lc) : new()
        });
    }

    [HttpPost]
    public Dictionary<string, object> SubmitTraLoi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idKS = I(obj, "IDKhaoSat");
        string token = S(obj, "Token");
        int idDB = 0;
        if (!string.IsNullOrWhiteSpace(token))
        {
            var d = Table("Select ID From Meet_DaiBieu Where QRToken=@t", "@t", null!, token);
            if (d != null && d.Rows.Count > 0) idDB = Convert.ToInt32(d.Rows[0]["ID"]);
        }
        // Chống trả lời trùng (nếu đã định danh).
        if (idDB > 0)
        {
            var ex = Table("Select Top 1 1 As X From Meet_TraLoi Where IDKhaoSat=@k And IDDaiBieu=@d", "@k", null!, idKS, "@d", null!, idDB);
            if (ex != null && ex.Rows.Count > 0) return Fail("Bạn đã gửi khảo sát này rồi. Cảm ơn!");
        }
        string aj = S(obj, "AnswersJson"); string msg = ""; int n = 0;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(aj) ? "[]" : aj);
            foreach (var a in doc.RootElement.EnumerateArray())
            {
                int idCH = a.TryGetProperty("IDCauHoi", out var c) ? c.GetInt32() : 0;
                int loai = a.TryGetProperty("Loai", out var l) ? l.GetInt32() : 1;
                if (idCH <= 0) continue;
                if (loai == 1) // thang điểm
                {
                    int diem = a.TryGetProperty("Diem", out var dd) ? dd.GetInt32() : 0;
                    if (diem > 0) { InsertTL(idKS, idCH, idDB, 0, diem, "", ref msg); n++; }
                }
                else if (loai == 2) // 1 lựa chọn
                {
                    int lcv = a.TryGetProperty("LuaChon", out var lv) ? lv.GetInt32() : 0;
                    if (lcv > 0) { InsertTL(idKS, idCH, idDB, lcv, 0, "", ref msg); n++; }
                }
                else if (loai == 3) // nhiều lựa chọn
                {
                    if (a.TryGetProperty("LuaChonList", out var arr) && arr.ValueKind == JsonValueKind.Array)
                        foreach (var it in arr.EnumerateArray()) { InsertTL(idKS, idCH, idDB, it.GetInt32(), 0, "", ref msg); n++; }
                }
                else // văn bản
                {
                    string vb = a.TryGetProperty("VanBan", out var v) ? (v.GetString() ?? "") : "";
                    if (!string.IsNullOrWhiteSpace(vb)) { InsertTL(idKS, idCH, idDB, 0, 0, vb, ref msg); n++; }
                }
            }
        }
        catch (Exception ex) { return Fail("Dữ liệu không hợp lệ: " + ex.Message); }
        return Ok(new { count = n });
    }

    private void InsertTL(int idKS, int idCH, int idDB, int idLC, int diem, string vb, ref string msg)
    {
        Exec(@"Insert Into Meet_TraLoi(ID,IDKhaoSat,IDCauHoi,IDDaiBieu,IDLuaChon,DiemThang,NoiDungVanBan,ThoiGian)
               Values(@id,@k,@c,@d,@lc,@dm,@vb,GetDate())", ref msg,
            "@id", null!, NextId("Meet_TraLoi"), "@k", null!, idKS, "@c", null!, idCH,
            "@d", null!, idDB > 0 ? (object)idDB : DBNull.Value, "@lc", null!, idLC > 0 ? (object)idLC : DBNull.Value,
            "@dm", null!, diem > 0 ? (object)diem : DBNull.Value, "@vb", null!, vb);
    }

    // ===== Thống kê realtime (cho kiosk + desktop) =====
    [HttpPost]
    public Dictionary<string, object> Stats([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int idHN = I(obj, "IDHoiNghi");
        var dt = Table(@"Select
            (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=@h And IsNull(TrangThaiDangKy,1)<>2) As Total,
            (Select Count(Distinct IDDaiBieu) From Meet_CheckIn Where IDHoiNghi=@h) As Present", "@h", null!, idHN);
        var r = dt!.Rows[0];
        int total = Convert.ToInt32(r["Total"]), present = Convert.ToInt32(r["Present"]);
        return Ok(new { total, present, percent = total > 0 ? (int)Math.Round(present * 100.0 / total) : 0 });
    }

    // ===== Cổng đại biểu (info + ghế + tài liệu) =====
    [HttpPost]
    public Dictionary<string, object> MyInfo([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        string token = S(obj, "Token").Trim();
        if (token == "") return Fail("Thiếu mã");
        var d = Table(@"Select d.ID, d.HoTen, d.MaDaiBieu, d.ChucDanh, d.DonVi, d.LaVIP, d.IDHoiNghi, d.IDNhom,
                               h.TenHoiNghi, h.NgayBatDau, h.DonViToChuc,
                               (Select Top 1 g.MaGhe From Meet_Ghe g Where g.IDDaiBieu=d.ID) As MaGhe,
                               (Case When Exists(Select 1 From Meet_CheckIn c Where c.IDDaiBieu=d.ID) Then 1 Else 0 End) As DaCheckIn
                        From Meet_DaiBieu d Join Meet_HoiNghi h On h.ID=d.IDHoiNghi Where d.QRToken=@t", "@t", null!, token);
        if (d == null || d.Rows.Count == 0) return Fail("Mã không hợp lệ");
        var r = d.Rows[0];
        int idHN = Convert.ToInt32(r["IDHoiNghi"]);
        int idNhom = r["IDNhom"] == DBNull.Value ? 0 : Convert.ToInt32(r["IDNhom"]);
        // Tài liệu đại biểu được phép xem (công khai hoặc thuộc nhóm)
        var docs = Table(@"Select t.ID, t.TenTaiLieu, t.LoaiFile, t.ShareToken
                           From Meet_TaiLieu t
                           Where t.IDHoiNghi=@h And (t.PhamViTruyCap=1
                                 Or Exists(Select 1 From Meet_TaiLieuNhom tn Where tn.IDTaiLieu=t.ID And tn.IDNhom=@n))
                           Order By t.NgayTaiLen Desc", "@h", null!, idHN, "@n", null!, idNhom);
        // Khảo sát đang mở
        var surveys = Table("Select ID, TieuDe From Meet_KhaoSat Where IDHoiNghi=@h And TrangThai=1 Order By ID", "@h", null!, idHN);
        return Ok(new
        {
            hoTen = r["HoTen"]?.ToString(),
            maDaiBieu = r["MaDaiBieu"]?.ToString(),
            chucDanh = r["ChucDanh"]?.ToString(),
            donVi = r["DonVi"]?.ToString(),
            laVIP = r["LaVIP"] != DBNull.Value && Convert.ToBoolean(r["LaVIP"]),
            tenHoiNghi = r["TenHoiNghi"]?.ToString(),
            maGhe = r["MaGhe"]?.ToString(),
            daCheckIn = Convert.ToInt32(r["DaCheckIn"]) == 1,
            idHoiNghi = idHN,
            taiLieu = docs != null ? _sys.ConvertDataTableToList(docs) : new(),
            khaoSat = surveys != null ? _sys.ConvertDataTableToList(surveys) : new()
        });
    }
}
