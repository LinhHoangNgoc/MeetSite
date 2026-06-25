using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.Common;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Template.Controllers.View
{
    public class LoginController : Controller
    {
        #region Khởi tạo
        private readonly Connection _connection;
        public readonly Sys _sys;
        public readonly IMemoryCache _cache;
        private readonly IConfiguration _config;
        public LoginController(Connection connection, IMemoryCache cache, IConfiguration config)
        {
            _connection = connection;
            _sys = new Sys();
            _cache = cache;
            _config = config;
        }
        [HttpGet("Login")]
        public IActionResult Index()
        {
            ViewData["Company"] = _config["AppConfig:Company"];
            ViewData["SolutionName"] = _config["AppConfig:SolutionName"];
            return View("Login");
        }
        #endregion
        public Dictionary<string, object> Login([FromBody] Dictionary<string, object> obj)
        {
            try
            {
                obj = _sys.NormalizeDictionary(obj);
                string msg = "";
                DataTable? dt = _connection.LayBangDLParam("Select * From ListUser Where TenDangNhap = @u", ref msg, false,
                    "@u", null!, obj.ContainsKey("UserName") ? obj["UserName"]?.ToString() : "");
                if (dt == null)
                {
                    return _sys.Return(1, msg, "");
                }
                if (dt.Rows.Count == 0)
                {
                    return _sys.Return(1, "Sai thông tin tài khoản", "");
                }
                if (dt.Rows[0]["MatKhau"].ToString() != obj["PassWord"].ToString())
                {
                    return _sys.Return(1, "Sai thông tin tài khoản", "");
                }
                foreach (DataColumn col in dt.Columns)
                {
                    HttpContext.Session.SetString(col.ColumnName, dt.Rows[0][col.ColumnName].ToString()!);
                }
                //Lấy cache quyền ra
                Dictionary<string, DataTable>? cacheQuyen = null;
                DataTable dtQuyen = _connection.StoredToDatatable("spQuyenNguoiDung", ref msg, ["ID", SqlDbType.Int, dt.Rows[0]["ID"]])!;
                if (_cache.TryGetValue("GLOBAL_DT", out cacheQuyen))
                {
                    cacheQuyen![dt.Rows[0]["ID"].ToString()!] = dtQuyen;
                }
                else
                {
                    cacheQuyen = new Dictionary<string, DataTable>();
                    cacheQuyen.Add(dt.Rows[0]["ID"].ToString()!, dtQuyen);
                }
                _cache.Set("GLOBAL_DT", cacheQuyen, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(200)
                });
                return _sys.Return(0, "", (string.IsNullOrEmpty(dt.Rows[0]["DefUrl"].ToString()) ? "/" : dt.Rows[0]["DefUrl"].ToString()));
            }
            catch (Exception)
            {
                // Không trả chi tiết exception cho client (tránh lộ thông tin hệ thống ở màn đăng nhập).
                return _sys.Return(1, "Có lỗi hệ thống khi đăng nhập.", "");
            }

        }
        public Dictionary<string, object> Logout()
        {
            try
            {
                // Gỡ presence (đang online) trước khi xóa session.
                PresenceRegistry.Remove(HttpContext.Session.GetString("TenDangNhap") ?? "");
                HttpContext.Session.Clear();
                Redirect("/Login");
                return _sys.Return(0, "", "");
            }
            catch (Exception)
            {
                return _sys.Return(1, "Có lỗi khi đăng xuất.", "");
            }

        }
        public Dictionary<string, object> DoiMatKhau([FromBody] Dictionary<string, object> obj)
        {
            obj = _sys.NormalizeDictionary(obj);
            string msg = "";
            try
            {
                DataTable? dt = _connection.LayBangDLParam("Select * From ListUser Where ID = @id", ref msg, false,
                    "@id", System.Data.SqlDbType.Int, Convert.ToInt32(HttpContext.Session.GetString("ID")));
                if (dt == null || dt.Rows.Count == 0 || dt!.Rows[0]["matkhau"].ToString()!.ToLower() != obj["OldPass"].ToString()!.ToLower())
                {
                    return _sys.Return(1, "Sai thông tin đăng nhập!","");
                }
                else
                {
                    dt.Rows[0]["matkhau"] = obj["NewPass"].ToString();
                    if (_connection.CNDLServer(dt, "Select * From ListUser", ref msg))
                    {
                        return _sys.Return(0,"","");
                    }
                    else
                    {
                        return _sys.Return(1, msg, "");
                    }
                }
            }
            catch (Exception)
            {
                return _sys.Return(1, "Có lỗi khi đổi mật khẩu.", "");
            }

        }
    }
}
