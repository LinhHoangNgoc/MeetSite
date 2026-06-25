using System.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace UIHoiNghi.Controllers;

/// <summary>Lớp cơ sở cho mọi controller nghiệp vụ Hội nghị — gom helper truy vấn & response.</summary>
public abstract class MeetBaseController : Controller
{
    protected readonly Connection _cn;
    protected readonly Sys _sys;
    protected MeetBaseController(Connection cn, Sys sys) { _cn = cn; _sys = sys; }

    protected string CurUser => HttpContext.Session.GetString("TenDangNhap") ?? "";
    protected string CurHoTen => HttpContext.Session.GetString("HoTen") ?? CurUser;

    protected new Dictionary<string, object> Ok(object? data = null) => _sys.Return(0, "", data ?? "");
    protected Dictionary<string, object> Fail(string msg) => _sys.Return(1, msg, "");

    /// <summary>Sinh ID nguyên kế tiếp cho bảng (Max(ID)+1).</summary>
    protected int NextId(string table)
    {
        string msg = "";
        var dt = _cn.LayBangDL($"Select IsNull(Max(ID),0)+1 As N From {table}", ref msg);
        return (dt != null && dt.Rows.Count > 0) ? Convert.ToInt32(dt.Rows[0]["N"]) : 1;
    }

    /// <summary>Chạy 1 truy vấn trả về danh sách (cho grid). pc = bộ ba (tên, kiểu|null, giá trị).</summary>
    protected Dictionary<string, object> Query(string sql, params object[] pc)
    {
        string msg = "";
        var dt = pc.Length == 0 ? _cn.LayBangDL(sql, ref msg) : _cn.LayBangDLParam(sql, ref msg, false, pc);
        if (dt == null) return Fail(msg);
        return Ok(_sys.ConvertDataTableToList(dt));
    }

    /// <summary>Lấy 1 DataTable (xử lý nội bộ).</summary>
    protected DataTable? Table(string sql, params object[] pc)
    {
        string msg = "";
        return pc.Length == 0 ? _cn.LayBangDL(sql, ref msg) : _cn.LayBangDLParam(sql, ref msg, false, pc);
    }

    /// <summary>Chạy INSERT/UPDATE/DELETE có tham số. Trả true nếu OK.</summary>
    protected bool Exec(string sql, ref string msg, params object[] pc) => _cn.RunSqlByParam(sql, ref msg, pc);

    protected static int I(Dictionary<string, object> o, string k, int def = 0)
        => o.ContainsKey(k) && o[k] != null && int.TryParse(o[k]!.ToString(), out var v) ? v : def;
    protected static string S(Dictionary<string, object> o, string k)
        => o.ContainsKey(k) && o[k] != null ? o[k]!.ToString()! : "";
    protected static bool B(Dictionary<string, object> o, string k)
    {
        if (!o.ContainsKey(k) || o[k] == null) return false;
        var s = o[k]!.ToString()!.ToLower();
        return s == "true" || s == "1";
    }
}
