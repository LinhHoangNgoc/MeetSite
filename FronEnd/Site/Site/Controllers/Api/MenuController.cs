using Microsoft.AspNetCore.Mvc;
using System.Data;

namespace Site.Controllers.Api
{
    // Cấu hình ĐỘNG start menu (danh sách module + chức năng) — lưu JSON trong DB.
    // Launcher nạp config này; nếu rỗng/lỗi thì dùng mặc định hardcoded (fallback an toàn).
    [Route("api/[controller]")]
    [ApiController]
    public class MenuController : ControllerBase
    {
        private readonly Connection _connection;
        private readonly Sys _sys;
        public MenuController(Connection connection, Sys sys) { _connection = connection; _sys = sys; }

        private void EnsureTable()
        {
            string m = "";
            try
            {
                _connection.ThucThiSQL(
                    "If Not Exists(Select 1 From sys.tables Where name='Sys_StartMenu') " +
                    "Create Table Sys_StartMenu(ID Int Not Null Primary Key, NoiDung nVarChar(Max) Null, NgaySua DateTime Null)", ref m);
            }
            catch { }
        }

        private bool IsAdmin()
        {
            var s = HttpContext.Session.GetString("Admin");
            return bool.TryParse(s, out var b) && b;
        }

        // Lấy config (rỗng nếu chưa cấu hình -> launcher dùng mặc định)
        [HttpGet("GetStartMenu")]
        [HttpPost("GetStartMenu")]
        public object GetStartMenu()
        {
            try
            {
                EnsureTable();
                string m = "";
                var dt = _connection.LayBangDL("Select Top 1 NoiDung From Sys_StartMenu Order By ID Desc", ref m);
                string json = (dt != null && dt.Rows.Count > 0 && dt.Rows[0]["NoiDung"] != DBNull.Value)
                    ? (Convert.ToString(dt.Rows[0]["NoiDung"]) ?? "") : "";
                return _sys.Return(0, "", new Dictionary<string, object?> { ["NoiDung"] = json });
            }
            catch (Exception ex) { return _sys.Return(1, ex.Message, null); }
        }

        // Lưu config (chỉ admin). NoiDung = chuỗi JSON {modules:[...], funcs:{...}}.
        [HttpPost("SaveStartMenu")]
        public object SaveStartMenu([FromBody] Dictionary<string, object> obj)
        {
            try
            {
                if (!IsAdmin()) return _sys.Return(1, "Chỉ quản trị viên mới được cấu hình menu.", null);
                EnsureTable();
                obj = _sys.NormalizeDictionary(obj);
                string json = obj.TryGetValue("NoiDung", out var v) ? (Convert.ToString(v) ?? "") : "";
                string m = "";
                _connection.ThucThiSQL("Delete From Sys_StartMenu", ref m);
                _connection.RunSqlByParam(
                    "Insert Into Sys_StartMenu(ID, NoiDung, NgaySua) Values(1,@n,GetDate())", ref m,
                    "@n", SqlDbType.NVarChar, json);
                return _sys.Return(0, "Đã lưu cấu hình menu.", null);
            }
            catch (Exception ex) { return _sys.Return(1, ex.Message, null); }
        }

        // Khôi phục mặc định = xóa config (launcher quay về hardcoded)
        [HttpPost("ResetStartMenu")]
        public object ResetStartMenu()
        {
            try
            {
                if (!IsAdmin()) return _sys.Return(1, "Chỉ quản trị viên.", null);
                EnsureTable();
                string m = "";
                _connection.ThucThiSQL("Delete From Sys_StartMenu", ref m);
                return _sys.Return(0, "Đã khôi phục menu mặc định.", null);
            }
            catch (Exception ex) { return _sys.Return(1, ex.Message, null); }
        }
    }
}
