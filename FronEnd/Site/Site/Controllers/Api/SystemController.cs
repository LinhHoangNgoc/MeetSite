using DinkToPdf;
using DinkToPdf.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using System.Data;
using System.Security.Cryptography.X509Certificates;

namespace Site.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemController : ControllerBase
    {
        private readonly Connection _connection;
        private readonly Sys _sys;
        private readonly IConverter _converter;
        private readonly IMemoryCache _cache;
        public SystemController(Connection connection, Sys sys, IConverter converter,IMemoryCache cache)
        {
            _connection = connection;
            _sys = sys;
            _converter = converter;
            _cache = cache;
        }
        #region Dyamic
        [HttpPost("DyamicQueryTable")]
        public object DyamicQueryTable([FromBody] Dictionary<string, object> obj)
        {
            string qr = obj["Query"].ToString()!;
            List<string> lstTable = _sys.GetTables(qr);
            foreach (var item in lstTable)
            {
                if (!_sys.CheckQuyen(_cache, HttpContext.Session,item,"Query","Dyamic"))
                {
                    return _sys.Return(1, $"Không có quyền thao tác", "");
                }
            }
            obj = _sys.NormalizeDictionary(obj);
            string msg = "";
            DataTable dt = _connection.LayBangDL(obj["Query"].ToString()!, ref msg)!;
            return _sys.Return(0, "", _sys.ConvertDataTableToList(dt));
        }
        [HttpPost("DyamicGetTable")]
        public object DyamicGetTable([FromBody] Dictionary<string, object> obj)
        {
            obj = _sys.NormalizeDictionary(obj);
            string tableName = obj["tableName"].ToString()!;
            if (!_sys.CheckQuyen(_cache, HttpContext.Session, tableName, "TableGet", "Dyamic"))
            {
                return _sys.Return(1, $"Không có quyền thao tác", "");
            }
            var data = (Dictionary<string, object>)obj["data"];
            return GetTableToServices(tableName, data);
        }
        [HttpPost("DyamicSaveTable")]
        public object DyamicSaveTable([FromBody] Dictionary<string, object> obj)
        {
            obj = _sys.NormalizeDictionary(obj);
            string tableName = obj["tableName"].ToString()!;
            if (!_sys.CheckQuyen(_cache, HttpContext.Session, tableName, "TableSave", "Dyamic"))
            {
                return _sys.Return(1, $"Không có quyền thao tác", "");
            }
            var data = (Dictionary<string, object>)obj["data"];
            var cSinhMa = obj.ContainsKey("cSinhMa") ? ((List<object>)obj["cSinhMa"]!).Select(x => x.ToString()).ToList() : new List<string>();
            return SetDataTableFromServices(tableName, data, cSinhMa);
        }
        [HttpPost("DyamicDeleteTable")]
        public object DyamicDeleteTable([FromBody] Dictionary<string, object> obj)
        {
            string msg = "";
            obj = _sys.NormalizeDictionary(obj);
            string tableName = obj["tableName"].ToString()!;
            if (!_sys.CheckQuyen(_cache, HttpContext.Session, tableName, "TableDelete", "Dyamic"))
            {
                return _sys.Return(1, $"Không có quyền thao tác", "");
            }
            if (!Sys.IsValidQualifiedName(tableName))
                return _sys.Return(1, "Tên bảng không hợp lệ", "");
            var data = (Dictionary<string, object>)obj["data"];
            var dtcolumns = _connection.LayBangDLParam("Select k.COLUMN_NAME From INFORMATION_SCHEMA.KEY_COLUMN_USAGE k Join INFORMATION_SCHEMA.TABLE_CONSTRAINTS t On k.CONSTRAINT_NAME = t.CONSTRAINT_NAME And k.TABLE_NAME = t.TABLE_NAME Where t.TABLE_NAME = @t And t.CONSTRAINT_TYPE = 'PRIMARY KEY';", ref msg, false, "@t", null!, tableName)!;
            string sWhere = "";
            foreach (var item in data)
            {
                if (dtcolumns.Select($"Column_Name = '{Sys.EscapeFilterValue(item.Key)}'").Length == 0)
                    continue;
                sWhere += (sWhere == "" ? " " : " And ") + $"{item.Key}=@{item.Key}";
            }
            if (string.IsNullOrEmpty(sWhere.Trim()))
                return _sys.Return(1, "Không có điều kiện xóa dữ liệu", "");
            List<object?> pc = new();
            foreach (var item in data)
            {
                if (dtcolumns.Select($"Column_Name = '{item.Key}'").Length == 0)
                    continue;
                pc.Add(item.Key);
                pc.Add(null);
                pc.Add(item.Value);
            }
            string sql = $"Delete {tableName} Where {sWhere}";
            if (!_connection.RunSqlByParam(sql, ref msg, pc.ToArray()!))
                return _sys.Return(1, "Lỗi khi xóa dữ liệu: \n" + msg, "");
            return _sys.Return(0, "", "");
        }
        [HttpPost("DyamicStoreExec")]
        public object DyamicStoreExec([FromBody] Dictionary<string, object> obj)
        {
            try
            {
                obj = _sys.NormalizeDictionary(obj);
                string storeName = obj["storeName"].ToString()!;
                if (!_sys.CheckQuyen(_cache, HttpContext.Session, storeName, "StoreExec", "Dyamic"))
                {
                    return _sys.Return(1, $"Không có quyền thao tác", "");
                }
                var data = (Dictionary<string, object>)obj["data"];
                List<object?> pc = new();
                foreach (var item in data)
                {
                    pc.Add(item.Key);
                    pc.Add(null);
                    pc.Add(item.Value);
                }
                string msg = "";

                if (!_connection.StoredExec(storeName, ref msg, pc.ToArray()!))
                    return _sys.Return(1, msg, "");
                return _sys.Return(0, "", "");
            }
            catch (Exception ex)
            {
                return _sys.Return(1, ex.ToString(), "");
            }
        }
        [HttpPost("DyamicGetDataDropDown")]
        public object DyamicGetDataDropDown([FromBody] Dictionary<string, object> data)
        {
            data = _sys.NormalizeDictionary(data);
            var dataSource = data.ContainsKey("dataSource") ? data["dataSource"]?.ToString() : "";
            var tableGet = data.ContainsKey("tableGet") ? data["tableGet"]?.ToString() : "";
            if (!_sys.CheckQuyen(_cache, HttpContext.Session, tableGet!, "TableGet", "Dyamic"))
            {
                return _sys.Return(1, $"Không có quyền thao tác", "");
            }
            var exCondication = data.ContainsKey("exCondication") ? data["exCondication"]?.ToString() : "";
            var colSelect = data.ContainsKey("colSelect") ? data["colSelect"]?.ToString() : "";
            string msg = "";
            string query = dataSource!;
            if (string.IsNullOrEmpty(query))
            {
                if (!Sys.IsValidQualifiedName(tableGet))
                    return _sys.Return(1, "Tên bảng không hợp lệ", null);
                if (string.IsNullOrEmpty(colSelect)) colSelect = "*";
                query = $"Select {colSelect} From {Sys.QuoteIdent(tableGet!)}";
                if (!string.IsNullOrEmpty(exCondication)) query += $" Where {exCondication}";
            }
            DataTable dt = _connection.LayBangDL(query, ref msg)!;
            if (dt == null) return _sys.Return(1, "Lỗi khi lấy dữ liệu " + msg, null);
            Dictionary<string, object> dict = new();
            if (!string.IsNullOrEmpty(tableGet))
            {
                var dtLast = _connection.LayBangDLParam("Select * From LastModified(NoLock) Where TableName=@t", ref msg, false, "@t", null!, tableGet)!;
                if (dtLast.Rows.Count == 0)
                {
                    dtLast.Rows.Add(dtLast.NewRow());
                    dtLast.Rows[0]["ID"] = _connection.SinhMa(tableGet, "ID", ref msg);
                    dtLast.Rows[0]["TableName"] = tableGet;
                    dtLast.Rows[0]["LastModified"] = DateTime.Now;
                    _connection.CNDLServer(dtLast, "Select * From LastModified", ref msg);
                }
                dict.Add("LastModified", dtLast.Rows[0]["LastModified"]);
            }
            return _sys.Return(0, "", _sys.ConvertDataTableToList(dt));
        }
        [HttpPost("DyamicListControlForm")]
        public object DyamicListControlForm()
        {
            string msg = "";
            var dt = _connection.LayBangDL("Select ControlName,Title From SettingControl", ref msg);
            if (dt == null) return _sys.Return(1, "Lỗi khi lấy dữ liệu " + msg, null);
            return _sys.Return(0, "", dt);
        }
        [HttpPost("DyamicGetControlForm")]
        public object DyamicGetControlForm([FromBody] Dictionary<string, object> obj)
        {
            obj = _sys.NormalizeDictionary(obj);
            var id = obj["ID"].ToString();
            DateTime lastModified = obj.ContainsKey("LastModified") ? Convert.ToDateTime(obj["LastModified"]) : DateTime.MinValue;
            string msg = "";
            var dt = _connection.LayBangDLParam("Select * From SettingControl Where ControlName=@n", ref msg, false, "@n", null!, id);
            if (dt == null) return _sys.Return(1, "Lỗi khi lấy dữ liệu " + msg, null);
            if (dt.Rows.Count == 0) return _sys.Return(0, "", null);
            if (lastModified == DateTime.MinValue || Convert.ToDateTime(dt.Rows[0]["LastModified"]) != lastModified) return _sys.Return(0, "", dt);
            return _sys.Return(0, "", null);
        }
        [HttpPost("DyamicSaveControlForm")]
        public object DyamicSaveControlForm([FromBody] Dictionary<string, object> obj)
        {
            obj = _sys.NormalizeDictionary(obj);
            var id = obj["ID"].ToString();
            var settingControl = obj["SettingControl"].ToString();
            var title = obj["Title"].ToString();
            string msg = "";
            var dt = _connection.LayBangDLParam("Select * From SettingControl Where ControlName=@n", ref msg, false, "@n", null!, id);
            if (dt == null) return _sys.Return(1, "Lỗi khi lấy dữ liệu " + msg, null);
            if (dt.Rows.Count == 0)
            {
                dt.Rows.Add(dt.NewRow());
                dt.Rows[0]["ID"] = _connection.SinhMa("SettingControl", "ID", ref msg);
            }
            dt.Rows[0]["ControlName"] = id;
            dt.Rows[0]["SettingControl"] = settingControl;
            dt.Rows[0]["Title"] = title;
            dt.Rows[0]["LastModified"] = DateTime.Now;
            if (_connection.CNDLServer(dt, "Select * From SettingControl", ref msg)) return _sys.Return(0, "", null);
            return _sys.Return(1, msg, null);
        }
        [HttpPost("DyamicGetColumnTable")]
        public object DyamicGetColumnTable([FromBody] Dictionary<string, object> obj)
        {
            obj = _sys.NormalizeDictionary(obj);
            var table = obj["Table"].ToString();
            string msg = "";
            string sql = "Select c.Name ColumnName,t.Name DataType,ep.Value Ms_Description From Sys.Columns c Inner Join Sys.Types t On c.User_Type_Id=t.User_Type_Id Left Join Sys.Extended_Properties ep On ep.Major_Id=c.Object_Id And ep.Minor_Id=c.Column_Id And ep.Name='MS_Description' Where c.Object_Id=Object_Id(@t) Order By c.Column_Id";
            var dt = _connection.LayBangDLParam(sql, ref msg, false, "@t", null!, table);
            if (dt == null) return _sys.Return(1, msg, null);
            return _sys.Return(0, "", dt);
        }
        [HttpPost("DyamicGetTableCache")]
        public object DyamicGetTableCache([FromBody] Dictionary<string, object> obj)
        {
            obj = _sys.NormalizeDictionary(obj);
            var table = obj["Table"].ToString();
            DateTime lastModified = Convert.ToDateTime(obj["LastModified"]);
            string msg = "";
            var dt = _connection.LayBangDLParam("Select * From LastModified(NoLock) Where TableName=@t", ref msg, false, "@t", null!, table);
            if (dt == null || dt.Rows.Count == 0) return _sys.Return(0, "", null);
            if (Convert.ToDateTime(dt.Rows[0]["LastModified"]) != lastModified) return _sys.Return(0, "", null);
            return _sys.Return(0, "", dt);
        }
        [HttpGet("pdfExport")]
        public object pdfExport()
        {
            // Endpoint thử nghiệm: chỉ đọc file mẫu nếu tồn tại, tránh ném lỗi lộ thông tin.
            const string samplePath = "d:\\test.html";
            if (!global::System.IO.File.Exists(samplePath))
                return _sys.Return(1, "Không tìm thấy file mẫu.", "");
            var html = global::System.IO.File.ReadAllText(samplePath);
            var doc = new HtmlToPdfDocument()
            {
                GlobalSettings = {
                    PaperSize = PaperKind.A4,
                    Orientation = Orientation.Landscape
                },
                Objects = {
                    new ObjectSettings
                    {
                        HtmlContent = html,
                        WebSettings =
                        {
                            DefaultEncoding = "utf-8",
                            LoadImages = true
                        }
                    }
                }
            };
            byte[] _byte = _converter.Convert(doc);
            var result = new FileContentResult(_byte, "application/pdf");
            Response.Headers.Append("Content-Disposition", "inline; filename=test.pdf");
            return result;
        }
        #endregion
        #region Support
        private Dictionary<string, object> SetDataTableFromServices(string tableName, Dictionary<string, object> data, List<string> cSinhMa)
        {
            string msg = "";
            if (!Sys.IsValidQualifiedName(tableName))
                return _sys.Return(1, "Tên bảng không hợp lệ", "");
            var dtcolumns = _connection.LayBangDLParam("Select Column_Name From Information_Schema.Columns Where Table_Name = @t", ref msg, false, "@t", null!, tableName)!;
            var dtkeycolumn = _connection.LayBangDLParam(@"
Select b1.Column_Name
From Information_Schema.Key_Column_Usage b1
Join Information_Schema.Table_Constraints b2
On b1.CONSTRAINT_NAME = b2.CONSTRAINT_NAME
And b2.Constraint_Type='PRIMARY KEY'
Where b1.Table_Name = @t
", ref msg, false, "@t", null!, tableName)!;
            var dictData = new Dictionary<string, object>();
            var dic1 = data.ToDictionary(p => p.Key.ToLower(), p => p.Value);
            object val;
            foreach (DataRow item in dtcolumns.Rows)
            {
                string sKey = item["Column_Name"].ToString()!;
                if (dic1.TryGetValue(sKey.ToLower(), out val!))
                {
                    dictData.Add(sKey, val);
                }
            }
            data = dictData;
            if (dtkeycolumn.Rows.Count == 0)
            {
                return _sys.Return(1, "Không tìm thấy khóa chính", "");
            }
            bool autoSM = cSinhMa.Count == 0;
            string sWhere = "";
            foreach (DataRow item in dtkeycolumn.Rows)
            {
                string col = item["Column_Name"].ToString()!;
                sWhere += (sWhere == "" ? " " : " And ") + $"{col}=@{col}";
                if (autoSM)
                    cSinhMa.Add(col);
            }
            string sInsertColumn = "";
            string sInsertValues = "";
            string sUpdateColumn = "";
            foreach (DataRow item in dtcolumns.Rows)
            {
                string col = item["Column_Name"].ToString()!;
                if (!data.ContainsKey(col) && !cSinhMa.Contains(col))
                    continue;
                bool isPK = dtkeycolumn.Select($"Column_Name = '{col}'").Length > 0;
                if (!isPK)
                    sUpdateColumn += (sUpdateColumn == "" ? "" : ",") + $"{col}=@{col}";
                sInsertColumn += (sInsertColumn == "" ? "" : ",") + col;
                sInsertValues += (sInsertValues == "" ? "@" : ",@") + col;
            }
            string sql = $@"
If Exists(Select Top 1 1 From {tableName} Where {sWhere})
Begin
    Update {tableName} Set {sUpdateColumn} Where {sWhere}
End
Else
Begin
    Insert Into {tableName}({sInsertColumn}) Values({sInsertValues})
End
";
            if (string.IsNullOrEmpty(sUpdateColumn))
                return _sys.Return(1, "Không thấy trường dữ liệu nào để update", "");
            List<object> lstReturn = new List<object>();
            List<object?> pc = new List<object?>();
            foreach (var item in data)
            {
                pc.Add(item.Key);
                pc.Add(null);
                var objValue = item.Value;
                var skey = item.Key;

                if (cSinhMa.Contains(skey))
                {
                    if (objValue == null || objValue == DBNull.Value || string.IsNullOrEmpty(objValue.ToString()))
                    {
                        objValue = _connection.SinhMa(tableName, skey, ref msg);
                        lstReturn.Add(skey);
                        lstReturn.Add(objValue);
                    }
                }
                pc.Add(objValue);
            }
            foreach (var item in cSinhMa)
            {
                if (!data.ContainsKey(item))
                {
                    var obj = _connection.SinhMa(tableName, item, ref msg);
                    lstReturn.Add(item);
                    lstReturn.Add(obj);
                    pc.Add(item);
                    pc.Add(null);
                    pc.Add(obj);
                }
            }
            if (!_connection.RunSqlByParam(sql, ref msg, pc.ToArray()!))
            {
                return _sys.Return(1, "Lỗi khi lưu dữ liệu: \n" + msg, "");
            }
            else
            {
                return _sys.Return(0, "", lstReturn);
            }
        }
        private Dictionary<string, object> GetTableToServices(string tableName, Dictionary<string, object> data, bool TabObject = false)
        {
            string msg = "";
            if (!Sys.IsValidQualifiedName(tableName))
                return _sys.Return(1, "Tên bảng không hợp lệ", null);
            var dtcolumns = _connection.LayBangDLParam("Select Column_Name From Information_Schema.Columns Where Table_Name = @t", ref msg, false, "@t", null!, tableName)!;
            string sWhere = "";
            List<object?> pc = new List<object?>();
            foreach (var item in data)
            {
                if (dtcolumns.Select($"Column_Name = '{Sys.EscapeFilterValue(item.Key)}'").Length > 0)
                {
                    sWhere += (string.IsNullOrEmpty(sWhere) ? " " : " And ") + $"{item.Key}=@{item.Key}";
                    pc.Add(item.Key);
                    pc.Add(null);
                    pc.Add(item.Value);
                }
            }
            if (string.IsNullOrEmpty(sWhere.Trim()))
            {
                return _sys.Return(1, "Không có điều kiện lấy dữ liệu", null);
            }
            var sql = $"Select {(data.ContainsKey("ListColSelect") ? data["ListColSelect"] : "*")} From {tableName} Where {sWhere}";
            DataTable dt = _connection.LayBangDLParam(sql, ref msg, false, pc.ToArray()!)!;
            if (dt == null)
            {
                return _sys.Return(1, "Lỗi khi lấy dữ liệu: \n" + msg, "");
            }
            else
            {
                if (TabObject)
                {
                    var dict = new Dictionary<string, object?>();
                    var dictCT = new Dictionary<string, object?>();
                    foreach (DataColumn col in dt.Columns)
                    {
                        if (dt.Rows.Count > 0)
                            dictCT.Add(col.ColumnName, dt.Rows[0][col.ColumnName]);
                        else
                            dictCT.Add(col.ColumnName, null);
                    }
                    dict.Add(tableName, dictCT);
                    return _sys.Return(0, "", dict);
                }
                else
                {
                    return _sys.Return(0, "", _sys.ConvertDataTableToList(dt));
                }
            }
        }
        #endregion
    }
}
