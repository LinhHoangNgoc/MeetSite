using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

// GroupKey = "BaoCao": báo cáo & KPI tổng hợp.
public class BaoCaoController : MeetBaseController
{
    public BaoCaoController(Connection cn, Sys sys) : base(cn, sys) { }

    [HttpGet] public IActionResult Index() { ViewBag.Active = "baocao"; return View(); }

    [HttpPost]
    public Dictionary<string, object> Kpi([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        int h = I(obj, "IDHoiNghi");
        if (h <= 0) return Ok(new { hasData = false });

        var tong = Table(@"Select
            (Select Count(*) From Meet_DaiBieu Where IDHoiNghi=@h And IsNull(TrangThaiDangKy,1)<>2) As DangKy,
            (Select Count(Distinct IDDaiBieu) From Meet_CheckIn Where IDHoiNghi=@h) As CoMat,
            (Select Count(*) From Meet_Phien Where IDHoiNghi=@h) As SoPhien,
            (Select Count(*) From Meet_TaiLieu Where IDHoiNghi=@h) As SoTaiLieu,
            (Select Count(*) From Meet_TaiLieuLuotXem v Join Meet_TaiLieu t On t.ID=v.IDTaiLieu Where t.IDHoiNghi=@h) As LuotXemTL,
            (Select Count(*) From Meet_TinNhan tn Join Meet_ChienDich c On c.ID=tn.IDChienDich Where c.IDHoiNghi=@h And tn.TrangThai=1) As TinDaGui",
            "@h", null!, h)!.Rows[0];
        int dangKy = Convert.ToInt32(tong["DangKy"]), coMat = Convert.ToInt32(tong["CoMat"]);

        // Điểm danh theo phiên
        var ciPhien = Table(@"Select p.TenPhien As Ten, (Select Count(*) From Meet_CheckIn c Where c.IDPhien=p.ID) As N
                              From Meet_Phien p Where p.IDHoiNghi=@h Order By p.ThuTu, p.ID", "@h", null!, h);
        // Đại biểu theo nhóm
        var theoNhom = Table(@"Select IsNull(n.TenNhom,N'(Chưa nhóm)') As Ten, Count(*) As N
                               From Meet_DaiBieu d Left Join Meet_NhomDaiBieu n On n.ID=d.IDNhom
                               Where d.IDHoiNghi=@h And IsNull(d.TrangThaiDangKy,1)<>2 Group By n.TenNhom", "@h", null!, h);
        // Lượt xem tài liệu (top)
        var xemTL = Table(@"Select Top 8 t.TenTaiLieu As Ten, Count(v.ID) As N
                            From Meet_TaiLieu t Left Join Meet_TaiLieuLuotXem v On v.IDTaiLieu=t.ID
                            Where t.IDHoiNghi=@h Group By t.TenTaiLieu Order By Count(v.ID) Desc", "@h", null!, h);
        // Điểm hài lòng trung bình theo câu hỏi thang điểm
        var diemKS = Table(@"Select ch.NoiDung As Ten, Avg(Cast(tl.DiemThang As Float)) As Diem
                             From Meet_TraLoi tl Join Meet_CauHoi ch On ch.ID=tl.IDCauHoi
                             Join Meet_KhaoSat k On k.ID=tl.IDKhaoSat
                             Where k.IDHoiNghi=@h And ch.LoaiCauHoi=1 And tl.DiemThang Is Not Null
                             Group By ch.NoiDung, ch.ID Order By ch.ID", "@h", null!, h);
        var avgDt = Table(@"Select Avg(Cast(tl.DiemThang As Float)) As D From Meet_TraLoi tl
                            Join Meet_CauHoi ch On ch.ID=tl.IDCauHoi Join Meet_KhaoSat k On k.ID=tl.IDKhaoSat
                            Where k.IDHoiNghi=@h And ch.LoaiCauHoi=1 And tl.DiemThang Is Not Null", "@h", null!, h);
        double avgHaiLong = (avgDt != null && avgDt.Rows.Count > 0 && avgDt.Rows[0]["D"] != DBNull.Value) ? Convert.ToDouble(avgDt.Rows[0]["D"]) : 0;

        return Ok(new
        {
            hasData = true,
            dangKy, coMat,
            tyLeThamDu = dangKy > 0 ? (int)Math.Round(coMat * 100.0 / dangKy) : 0,
            soPhien = Convert.ToInt32(tong["SoPhien"]),
            soTaiLieu = Convert.ToInt32(tong["SoTaiLieu"]),
            luotXemTL = Convert.ToInt32(tong["LuotXemTL"]),
            tinDaGui = Convert.ToInt32(tong["TinDaGui"]),
            avgHaiLong = Math.Round(avgHaiLong, 2),
            ciTheoPhien = ciPhien != null ? _sys.ConvertDataTableToList(ciPhien) : new(),
            theoNhom = theoNhom != null ? _sys.ConvertDataTableToList(theoNhom) : new(),
            xemTaiLieu = xemTL != null ? _sys.ConvertDataTableToList(xemTL) : new(),
            diemKhaoSat = diemKS != null ? _sys.ConvertDataTableToList(diemKS) : new()
        });
    }

    // Kết quả khảo sát chi tiết (cho từng lựa chọn).
    [HttpPost]
    public Dictionary<string, object> KetQuaLuaChon([FromBody] Dictionary<string, object> obj)
    {
        obj = _sys.NormalizeDictionary(obj);
        return Query(@"Select ch.NoiDung As CauHoi, lc.NoiDung As LuaChon, Count(tl.ID) As N
                       From Meet_LuaChon lc Join Meet_CauHoi ch On ch.ID=lc.IDCauHoi
                       Join Meet_KhaoSat k On k.ID=ch.IDKhaoSat
                       Left Join Meet_TraLoi tl On tl.IDLuaChon=lc.ID
                       Where k.IDHoiNghi=@h And ch.LoaiCauHoi In (2,3)
                       Group By ch.NoiDung, lc.NoiDung, ch.ID, lc.ID Order By ch.ID, lc.ID", "@h", null!, I(obj, "IDHoiNghi"));
    }
}
