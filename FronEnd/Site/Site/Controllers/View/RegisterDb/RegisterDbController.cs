using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;
// Removed unused using directive for DLL support.

namespace Site.Controllers.View.RegisterDB
{
    public class RegisterDBController : Controller
    {
        private readonly Sys _Sys;
        private readonly IConfiguration _Configuration;
        private readonly IHostApplicationLifetime _lifetime;
        public RegisterDBController(Sys sys, IConfiguration configuration, IHostApplicationLifetime lifetime    )
        {
            _Sys = sys;
            _Configuration = configuration;
            _lifetime = lifetime;
        }
        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }
        // Màn hình đăng ký DB là public (để cài đặt lần đầu). Vì vậy chỉ cho phép thao tác
        // khi hệ thống CHƯA cấu hình được DB; nếu DB đã chạy thì bắt buộc phải là admin đăng nhập.
        private bool DuocPhepCauHinh()
        {
            string existing = _Configuration.GetConnectionString("DefaultConnection") ?? "";
            if (string.IsNullOrWhiteSpace(existing)) return true;
            string m = "";
            bool dbOk = new Connection(existing).CheckConnect(ref m);
            if (!dbOk) return true; // chưa cấu hình được -> cho phép cài đặt
            // DB đã hoạt động -> chỉ admin mới được tái cấu hình
            bool admin = false;
            bool.TryParse(HttpContext.Session.GetString("Admin"), out admin);
            return admin;
        }
        public List<Dictionary<string, object>> GetDataBase([FromBody] Dictionary<string, object> obj)
        {
            obj = _Sys.NormalizeDictionary(obj);
            if (!DuocPhepCauHinh())
                return new List<Dictionary<string, object>>();
            string ServerName = obj["ServerName"].ToString()!;
            string Username = obj["Username"].ToString()!;
            string Password = obj["Password"].ToString()!;
            var msg = "";
            try
            {
                if (string.IsNullOrWhiteSpace(ServerName) ||
                    string.IsNullOrWhiteSpace(Username))
                {
                    return new List<Dictionary<string, object>>();
                }
                var connStr = Connection.BuildConnString(ServerName, "master", Username, Password);
                var conn = new Connection(connStr);
                string sqlDatabases = "SELECT name FROM sys.databases WHERE state_desc='ONLINE' AND is_read_only=0 And database_id > 4";
                DataTable dt = conn.LayBangDL(sqlDatabases, ref msg) ?? new DataTable();
                return _Sys.ConvertDataTableToList(dt);
            }
            catch (Exception ex)
            {
                return new List<Dictionary<string, object>>();
            }
        }
        public Dictionary<string, object> SaveDbConfig([FromBody] Dictionary<string, object> obj)
        {
            obj = _Sys.NormalizeDictionary(obj);
            if (!DuocPhepCauHinh())
                return _Sys.Return(1, "Hệ thống đã được cấu hình. Cần quyền quản trị để thay đổi.", "");
            string serverName = obj["serverName"].ToString()!;
            string userName = obj["userName"].ToString()!;
            string passWord = obj["passWord"].ToString()!;
            string databaseName = obj["databaseName"].ToString()!;
            string newDb = "";
            if (obj.ContainsKey("newDb") && obj["newDb"] != null)
            {
                newDb = obj["newDb"].ToString()!;
            }

            string adminUser = obj["adminUser"].ToString()!;
            string adminPassword = obj["adminPassword"].ToString()!;
            string msg = "";
            string targetDb;
            if (!string.IsNullOrEmpty(newDb))
            {
                // Tên database phải là định danh hợp lệ (chống injection vào Create Database).
                if (!Sys.IsValidIdentifier(newDb))
                    return _Sys.Return(1, "Tên database mới không hợp lệ", "");
                var masterConn = Connection.BuildConnString(serverName, "master", userName, passWord);
                Connection connCreate = new Connection(masterConn);
                connCreate.ThucThiSQL("Create Database " + Sys.QuoteIdent(newDb), ref msg);
                targetDb = newDb;
            }
            else
            {
                if (!Sys.IsValidIdentifier(databaseName))
                    return _Sys.Return(1, "Tên database không hợp lệ", "");
                targetDb = databaseName;
            }
            var builder = new SqlConnectionStringBuilder
            {
                DataSource = serverName,
                InitialCatalog = targetDb,
                UserID = userName,
                Password = passWord,
                TrustServerCertificate = true,
                ConnectTimeout = 300,
                MaxPoolSize = 1500,
                ApplicationName = _Configuration["ApplicationName"] ?? "App"
            };
            string connStr = builder.ConnectionString;
            UpdateConnectionString(connStr);
            Connection conn = new Connection(connStr);
            List<string> Err = _Sys.InitSqlStructSystem(conn, adminUser, adminPassword);
            if (Err.Count > 0)
            {
                return _Sys.Return(1, "", Err);
            }
            _lifetime.StopApplication();
            return _Sys.Return(0, "", "");
        }

        public static void UpdateConnectionString(string conn)
        {
            var path = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
            var json = global::System.IO.File.ReadAllText(path);

            var node = JsonNode.Parse(json)!;

            node["ConnectionStrings"]!["DefaultConnection"] = conn;

            var output = node.ToJsonString(new JsonSerializerOptions
            {
                WriteIndented = true
            });

            global::System.IO.File.WriteAllText(path, output);
        }
    }
}
