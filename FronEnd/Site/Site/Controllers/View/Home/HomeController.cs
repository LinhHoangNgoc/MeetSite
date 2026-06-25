using System.Data;
using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Site.Controllers.View.Home
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly Connection _connection;

        public HomeController(ILogger<HomeController> logger, IConfiguration config, IWebHostEnvironment env, Connection connection)
        {
            _logger = logger;
            _config = config;
            _env = env;
            _connection = connection;
        }

        public IActionResult Index()
        {
            var conn = _config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(conn))
            {
                return Redirect("/RegisterDb");
            }

            if (HttpContext.Session.GetString("TenDangNhap") == null)
            {
                return Redirect("/Login");
            }
            else
            {
                // MeetSite: vào thẳng app Hội nghị (toàn trang, 1 header duy nhất) — bỏ vỏ desktop lồng iframe.
                return Redirect("/HoiNghi");
            }
        }

        // Trang hub danh mục hệ thống: liệt kê các danh mục đã cấu hình (Ej2_TableSetting)
        [HttpGet("DanhMuc")]
        public IActionResult DanhMuc()
        {
            if (HttpContext.Session.GetString("TenDangNhap") == null)
            {
                return Redirect("/Login");
            }
            return View();
        }

        // Endpoint DEMO cho widget tùy biến gọi controller (trả JSON). Widget type 'api' trên desktop fetch endpoint này.
        [HttpGet("api/widget/demo")]
        public IActionResult WidgetDemo()
        {
            var user = HttpContext.Session.GetString("TenDangNhap") ?? "khách";
            var now = System.DateTime.Now;
            return Json(new
            {
                code = 0,
                message = "Widget gọi controller thành công",
                items = new[]
                {
                    new { label = "Người dùng", value = user },
                    new { label = "Giờ máy chủ", value = now.ToString("HH:mm:ss") },
                    new { label = "Ngày", value = now.ToString("dd/MM/yyyy") },
                    new { label = "Trạng thái", value = "Hoạt động" }
                }
            });
        }

        // ===== Cấu hình desktop lưu THEO USER (ảnh nền, widget, layout, ghim...) =====
        // Tên đăng nhập lấy từ session -> theo dõi người dùng qua mọi máy.
        private string? CurrentUser()
        {
            return HttpContext.Session.GetString("TenDangNhap");
        }

        // Tải cấu hình desktop của user hiện tại (JSON đã lưu trên server).
        [HttpGet("api/desktop/config")]
        public IActionResult GetDesktopConfig()
        {
            var user = CurrentUser();
            if (string.IsNullOrEmpty(user))
                return Json(new { code = 1, message = "Chưa đăng nhập", data = (object?)null });
            string msg = "";
            var dt = _connection.LayBangDLParam(
                "Select ConfigJson From UserDesktopConfig Where UserName=@u",
                ref msg, false, "@u", null!, user);
            if (dt == null)
                return Json(new { code = 1, message = msg, data = (object?)null });
            string? json = dt.Rows.Count > 0 ? dt.Rows[0]["ConfigJson"] as string : null;
            return Json(new { code = 0, message = "", data = json });
        }

        // Lưu cấu hình desktop của user hiện tại (upsert theo UserName).
        [HttpPost("api/desktop/config")]
        public IActionResult SaveDesktopConfig([FromBody] DesktopConfigDto dto)
        {
            var user = CurrentUser();
            if (string.IsNullOrEmpty(user))
                return Json(new { code = 1, message = "Chưa đăng nhập" });
            string json = dto?.ConfigJson ?? "";
            // Giới hạn kích thước phòng lạm dụng (cho phép nhiều ảnh nền base64 ~ 8MB).
            if (json.Length > 8_000_000)
                return Json(new { code = 1, message = "Cấu hình quá lớn" });
            string msg = "";
            string sql = @"
If Exists(Select Top 1 1 From UserDesktopConfig Where UserName=@u)
    Update UserDesktopConfig Set ConfigJson=@j, LastModified=GetDate() Where UserName=@u
Else
    Insert Into UserDesktopConfig(UserName, ConfigJson, LastModified) Values(@u, @j, GetDate())";
            bool ok = _connection.RunSqlByParam(sql, ref msg,
                "@u", null!, user,
                "@j", null!, json);
            if (!ok)
                return Json(new { code = 1, message = msg });
            return Json(new { code = 0, message = "" });
        }

        public class DesktopConfigDto
        {
            public string? ConfigJson { get; set; }
        }

    }
}
