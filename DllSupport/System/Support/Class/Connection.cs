using System;
using System.Collections;
using System.Data;
using System.Text.Json;
using Microsoft.Data.SqlClient;
public class Connection
{
    private readonly string _connectionString;
    public Connection(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }
    // Ép giá trị tham số về kiểu mà SqlClient hiểu được.
    // Frontend gửi JSON -> NormalizeDictionary biến object lồng thành Dictionary, mảng thành List<object>.
    // Nếu một field mang giá trị là Dictionary/List/mảng mà đẩy thẳng vào SqlParameter sẽ gây lỗi
    // "No mapping exists from object type System.Collections.Generic.Dictionary...".
    // Với những giá trị phức hợp như vậy, serialize sang chuỗi JSON để lưu vào cột nvarchar.
    private static readonly JsonSerializerOptions _jsonOpt = new() { WriteIndented = false };
    public static object CoerceSqlValue(object? value)
    {
        if (value == null)
            return DBNull.Value;
        // Các kiểu SqlClient hỗ trợ trực tiếp -> giữ nguyên
        switch (value)
        {
            case string:
            case bool:
            case byte:
            case sbyte:
            case short:
            case ushort:
            case int:
            case uint:
            case long:
            case ulong:
            case float:
            case double:
            case decimal:
            case DateTime:
            case DateTimeOffset:
            case TimeSpan:
            case Guid:
            case char:
            case byte[]:
            case DBNull:
                return value;
        }
        if (value is JsonElement je)
        {
            switch (je.ValueKind)
            {
                case JsonValueKind.String:
                    return je.GetString() ?? (object)DBNull.Value;
                case JsonValueKind.Number:
                    if (je.TryGetInt64(out long l)) return l;
                    if (je.TryGetDecimal(out decimal d)) return d;
                    return je.GetDouble();
                case JsonValueKind.True:
                case JsonValueKind.False:
                    return je.GetBoolean();
                case JsonValueKind.Null:
                case JsonValueKind.Undefined:
                    return DBNull.Value;
                case JsonValueKind.Object:
                    // Object rỗng {} = bỏ trống -> NULL; object có dữ liệu -> JSON string
                    return je.EnumerateObject().MoveNext() ? je.GetRawText() : (object)DBNull.Value;
                case JsonValueKind.Array:
                    // Mảng rỗng [] = bỏ trống -> NULL; mảng có dữ liệu -> JSON string
                    return je.GetArrayLength() > 0 ? je.GetRawText() : (object)DBNull.Value;
                default:
                    return je.GetRawText();
            }
        }
        // Dictionary, List, mảng, object phức hợp khác
        if (value is IDictionary || value is IEnumerable)
        {
            // Rỗng (vd frontend gửi {} hoặc [] cho ô bỏ trống) -> NULL, tránh nhồi chuỗi "{}" vào cột số.
            if (IsEmptyCollection(value))
                return DBNull.Value;
            try { return JsonSerializer.Serialize(value, _jsonOpt); }
            catch { return value.ToString() ?? (object)DBNull.Value; }
        }
        // Kiểu khác chưa biết -> để nguyên, SqlClient tự xử lý hoặc báo lỗi rõ ràng
        return value;
    }
    private static bool IsEmptyCollection(object value)
    {
        if (value is IDictionary d) return d.Count == 0;
        if (value is ICollection c) return c.Count == 0;
        if (value is IEnumerable e)
        {
            var en = e.GetEnumerator();
            try { return !en.MoveNext(); }
            finally { (en as IDisposable)?.Dispose(); }
        }
        return false;
    }
    // Dựng chuỗi kết nối an toàn từ các thành phần (chống connection-string injection
    // khi Server/User/Pass đến từ dữ liệu người dùng nhập).
    public static string BuildConnString(object? server, object? catalog, object? user, object? pass)
    {
        var b = new SqlConnectionStringBuilder
        {
            DataSource = server?.ToString() ?? "",
            InitialCatalog = catalog?.ToString() ?? "",
            UserID = user?.ToString() ?? "",
            Password = pass?.ToString() ?? "",
            TrustServerCertificate = true
        };
        return b.ConnectionString;
    }
    private void GanParameter(ref SqlCommand cmd, params object[] pc)
    {
        // 👉 Nếu là Stored Procedure
        if (cmd.CommandType == CommandType.StoredProcedure)
        {
            SqlCommandBuilder.DeriveParameters(cmd);
            Dictionary<string, object?> inputParams = new();
            for (int i = 0; i <= pc.Length - 3; i += 3)
            {
                string name = pc[i].ToString()!;
                object? value = pc[i + 2];
                if (name[0] != '@')
                {
                    name = "@" + name;
                }
                inputParams[name] = value;
            }
            foreach (SqlParameter p in cmd.Parameters)
            {
                if (p.Direction == ParameterDirection.ReturnValue)
                    continue;
                if (inputParams.ContainsKey(p.ParameterName))
                {
                    p.Value = CoerceSqlValue(inputParams[p.ParameterName]);
                }
                else
                {
                    p.Value = DBNull.Value;
                }
            }
        }
        // 👉 Nếu là SQL text (SELECT, INSERT…)
        else
        {
            for (int i = 0; i <= pc.Length - 3; i += 3)
            {
                SqlParameter sqlPR = new()
                {
                    ParameterName = pc[i].ToString()!
                };
                if (pc[i + 1] != null)
                    sqlPR.SqlDbType = (SqlDbType)Convert.ToInt32(pc[i + 1]);
                sqlPR.Value = CoerceSqlValue(pc[i + 2]);
                cmd.Parameters.Add(sqlPR);
            }
        }
    }
    private void GanParameterWithOutput(ref SqlCommand Cmd, string[] OutParam, params object[] pc)
    {
        for (var i = 0; i <= pc.Length - 3; i += 3)
        {
            SqlParameter sqlPR = new()
            {
                ParameterName = (string)pc[i]
            };
            if (pc[i + 1] != null)
                sqlPR.SqlDbType = (SqlDbType)pc[i + 1];
            sqlPR.Value = CoerceSqlValue(pc[i + 2]);
            var idx = Array.IndexOf(OutParam, pc[i]);
            if (idx >= 0 && idx < OutParam.Length - 1)
            {
                sqlPR.Size = Convert.ToInt32(OutParam[idx + 1]);
                sqlPR.Precision = 18;
                sqlPR.Scale = 5;
                sqlPR.Direction = ParameterDirection.Output;
            }
            else
            {
                sqlPR.Direction = ParameterDirection.Input;
            }
            Cmd.Parameters.Add(sqlPR);
        }
    }
    public bool StoredExec(string StoreName, ref string Msg, params object[] pc)
    {
        Msg = "";
        SqlConnection? sConn_ = null;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlCommand cmd = new()
            {
                Connection = sConn_,
                CommandType = CommandType.StoredProcedure,
                CommandText = StoreName
            };
            GanParameter(ref cmd, pc);
            cmd.ExecuteNonQuery();
            cmd.Dispose();
            sConn_?.Close();
            return true;
        }
        catch (Exception ex)
        {
            sConn_?.Close();
            Msg = StoreName + ":\n" + ex.Message;
            return false;
        }
    }
    public DataSet? StoredToDataset(string StoredName, ref string Msg, DataRow Dr)
    {
        Msg = "";
        try
        {
            object[] pc = Array.Empty<object>();
            if (!CreateStoredParam(StoredName, Dr, ref pc, ref Msg)) return null;
            return StoredToDataset(StoredName, ref Msg, pc);
        }
        catch (Exception ex)
        {
            Msg = StoredName + ":\n" + ex.Message;
            return null;
        }
    }
    public DataSet? StoredToDataset(string StoreName, ref string Msg, params object[] pc)
    {
        Msg = "";
        SqlConnection? sConn_ = null;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlCommand cmd = new()
            {
                Connection = sConn_,
                CommandType = CommandType.StoredProcedure,
                CommandText = StoreName
            };
            GanParameter(ref cmd, pc);
            SqlDataAdapter sda = new(cmd);
            DataSet ds = new();
            sda.Fill(ds);
            cmd.Dispose();
            sda.Dispose();
            sConn_?.Close();
            return ds;
        }
        catch (Exception ex)
        {
            sConn_?.Close();
            Msg = StoreName + ":\n" + ex.Message;
            return null;
        }
    }
    public DataTable? StoredToDatatable(string StoreName, ref string Msg, params object[] pc)
    {
        Msg = "";
        SqlConnection? sConn_ = null;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlCommand cmd = new()
            {
                Connection = sConn_,
                CommandType = CommandType.StoredProcedure,
                CommandText = StoreName
            };
            GanParameter(ref cmd, pc);
            SqlDataAdapter sda = new(cmd);
            DataSet ds = new();
            sda.Fill(ds);
            DataTable dt;
            dt = ds.Tables[0];
            ds.Tables.Remove(dt);
            cmd.Dispose();
            ds.Dispose();
            sda.Dispose();
            sConn_?.Close();
            return dt;
        }
        catch (Exception ex)
        {
            sConn_?.Close();
            Msg = StoreName + ":\n" + ex.Message;
            return null;
        }
    }
    public DataTable? StoredToDatatable(string StoredName, ref string Msg, DataRow Dr)
    {
        Msg = "";
        try
        {
            object[] pc = Array.Empty<object>();
            if (!CreateStoredParam(StoredName, Dr, ref pc, ref Msg)) return null;
            return StoredToDatatable(StoredName, ref Msg, pc);
        }
        catch (Exception ex)
        {
            Msg = StoredName + ":\n" + ex.Message;
            return null;
        }
    }
    public object? StoredExecuteScalar(string StoreName, ref string Msg, params object[] pc)
    {
        Msg = "";
        SqlConnection sConn_;
        try
        {
            sConn_ = new SqlConnection(_connectionString);

            sConn_.Open();
            SqlCommand cmd = new()
            {
                Connection = sConn_,
                CommandType = CommandType.StoredProcedure,
                CommandText = StoreName
            };
            GanParameter(ref cmd, pc);
            sConn_?.Close();
            return cmd.ExecuteScalar();
        }
        catch (Exception ex)
        {
            Msg = StoreName + ":\n" + ex.Message;
            return null;
        }
    }
    public object[]? StoredExecReturn(string StoreName, ref string Msg, string[] OutParam, params object[] pc)
    {
        Msg = "";
        SqlConnection sConn_;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlCommand cmd = new()
            {
                Connection = sConn_,
                CommandType = CommandType.StoredProcedure,
                CommandText = StoreName
            };
            GanParameterWithOutput(ref cmd, OutParam, pc);
            cmd.ExecuteNonQuery();
            object[]? dsObject = null;
            for (var i = 0; i < OutParam.Length; i += 2)
            {
                Array.Resize(ref dsObject, dsObject == null ? 1 : dsObject.Length + 1);
                dsObject[^1] = cmd.Parameters[OutParam[i]].Value;
            }
            sConn_?.Close();
            return dsObject;
        }
        catch (Exception ex)
        {
            Msg = StoreName + ":\n" + ex.Message;
            return null;
        }
    }
    public bool StoredCNDatarow(DataRow Dr, string StoredName, ref string Msg)
    {
        Msg = "";
        try
        {
            object[] pc = Array.Empty<object>();
            if (!CreateStoredParam(StoredName, Dr, ref pc, ref Msg)) return false;
            var bThanhCong = StoredExec(StoredName, ref Msg, pc);
            if (bThanhCong)
                Dr.AcceptChanges();
            return bThanhCong;
        }
        catch (Exception ex)
        {
            Msg = StoredName + ":\n" + ex.Message;
            return false;
        }
    }
    public bool StoredCNDatatable(DataTable Dt, string StoredName, ref string Msg)
    {
        Msg = "";
        try
        {
            foreach (DataRow item in Dt.Rows)
            {
                string msg1Row = "";
                StoredCNDatarow(item, StoredName, ref msg1Row);
                if (!string.IsNullOrEmpty(msg1Row))
                    Msg += "\n" + msg1Row;
                else
                    item.AcceptChanges();
            }
            return string.IsNullOrEmpty(Msg.Trim());
        }
        catch (Exception ex)
        {
            Msg = StoredName + ":\n" + ex.Message;
            return false;
        }
    }
    public bool StoredCNDataset(DataSet Ds, string[] StoredName, ref string Msg)
    {
        Msg = "";
        try
        {
            for (var i = 0; i <= Ds.Tables.Count - 1; i++)
            {
                string msg1Row = "";
                StoredCNDatatable(Ds.Tables[i], StoredName[i], ref msg1Row);
                if (!string.IsNullOrEmpty(msg1Row))
                    Msg += "\n" + msg1Row;
            }
            return string.IsNullOrEmpty(Msg.Trim());
        }
        catch (Exception ex)
        {
            Msg = ex.Message;
            return false;
        }
    }
    public object[]? StoredCNDatarowWithOut(DataRow Dr, string StoredName, string[] OutParam, ref string Msg)
    {
        Msg = "";
        try
        {
            object[] pc = Array.Empty<object>();
            if (!CreateStoredParam(StoredName, Dr, ref pc, ref Msg)) return null;
            object[]? bThanhCong = StoredExecReturn(StoredName, ref Msg, OutParam, pc);
            if (bThanhCong != null)
                Dr.AcceptChanges();
            return bThanhCong;
        }
        catch (Exception ex)
        {
            Msg = StoredName + ":\n" + ex.Message;
            return null;
        }
    }
    public DataTable? LayBangDL(string SQL, ref string Msg, bool AddSetDate = false)
    {
        Msg = "";
        SqlConnection? sConn_ = null;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            if (AddSetDate && !SQL.ToLower().Contains("set dateformat"))
                SQL = "Set Dateformat Dmy;\n" + SQL;
            SqlCommand cmd = new(SQL, sConn_);
            SqlDataAdapter sda = new(cmd);
            DataSet ds = new();
            sda.Fill(ds);
            if (ds.Tables.Count == 0)
                return null;
            DataTable dt = ds.Tables[0];
            ds.Tables.Remove(dt);
            cmd.Dispose();
            sda.Dispose();
            ds.Dispose();
            sConn_?.Close();
            return dt;
        }
        catch (Exception ex)
        {
            sConn_?.Close();
            Msg = ex.Message;
            return null;
        }
    }
    public DataTable? LayBangDLParam(string SQL, ref string Msg, bool AddSetDate = false, params object[] pc)
    {
        Msg = "";
        SqlConnection? sConn_ = null;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            if (AddSetDate && !SQL.ToLower().Contains("set dateformat"))
                SQL = "Set Dateformat Dmy;\n" + SQL;
            SqlCommand cmd = new(SQL, sConn_);
            GanParameter(ref cmd, pc);
            SqlDataAdapter sda = new(cmd);
            DataSet ds = new();
            sda.Fill(ds);
            if (ds.Tables.Count == 0)
                return null;
            DataTable dt = ds.Tables[0];
            ds.Tables.Remove(dt);
            cmd.Dispose();
            sda.Dispose();
            ds.Dispose();
            sConn_?.Close();
            return dt;
        }
        catch (Exception ex)
        {
            sConn_?.Close();
            Msg = ex.Message;
            return null;
        }
    }
    public DataSet? LayDataset(string SQL, ref string Msg)
    {
        Msg = "";
        SqlConnection sConn_;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlCommand cmd = new(SQL, sConn_);
            SqlDataAdapter sda = new(cmd);
            DataSet ds = new();
            sda.Fill(ds);
            if (ds.Tables.Count == 0)
                return null;
            DataTable dt = ds.Tables[0];
            cmd.Dispose();
            sda.Dispose();
            sConn_?.Close();
            return ds;
        }
        catch (Exception ex)
        {
            Msg = ex.Message;
            return null;
        }
    }
    public DataSet? LayDatasetParam(string SQL, ref string Msg, params object[] pc)
    {
        Msg = "";
        SqlConnection? sConn_ = null;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlCommand cmd = new(SQL, sConn_);
            GanParameter(ref cmd, pc);
            SqlDataAdapter sda = new(cmd);
            DataSet ds = new();
            sda.Fill(ds);
            cmd.Dispose();
            sda.Dispose();
            sConn_?.Close();
            if (ds.Tables.Count == 0)
                return null;
            return ds;
        }
        catch (Exception ex)
        {
            sConn_?.Close();
            Msg = ex.Message;
            return null;
        }
    }
    public bool ThucThiSQL(string SQL, ref string Msg)
    {
        Msg = "";
        SqlConnection sConn_;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            var _SqlAdapter = new SqlDataAdapter(SQL, sConn_);
            _SqlAdapter.SelectCommand.CommandTimeout = 36000;
            _SqlAdapter.SelectCommand.CommandType = CommandType.Text;
            _SqlAdapter.SelectCommand.ExecuteNonQuery();
            sConn_?.Close();
            return true;
        }
        catch (Exception ex)
        {
            Msg = ex.Message;
            return false;
        }
    }
    public bool CNDLServer(object Dt, string SQL, ref string Msg)
    {
        Msg = "";
        SqlConnection? sConn_ = null;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlDataAdapter sda = new(SQL, sConn_);
            if (SQL.Contains(';'))
            {
                string[] SQLSP = SQL.Split(';');
                for (int i = 0; i <= ((DataSet)Dt).Tables.Count - 1; i++)
                {
                    sda.SelectCommand.CommandText = SQLSP[i];
                    SqlCommandBuilder scb = new(sda);
                    sda.Update(((DataSet)Dt).Tables[i]);
                    scb.DataAdapter = null;
                }
            }
            else
            {
                var scb = new SqlCommandBuilder(sda);
                if (Dt is DataSet && ((DataTable)Dt).ExtendedProperties.Count != 0)
                {
                    sda.InsertCommand = ((DataTable)Dt).ExtendedProperties["Insert"] as SqlCommand;
                    sda.DeleteCommand = ((DataTable)Dt).ExtendedProperties["Delete"] as SqlCommand;
                    sda.UpdateCommand = ((DataTable)Dt).ExtendedProperties["Update"] as SqlCommand;
                }
                else
                    sda.SelectCommand.CommandText = SQL;
                sda.SelectCommand.CommandTimeout = 900;
                sda.Update((DataTable)Dt);
                scb.DataAdapter = null;
            }
            sConn_?.Close();
            return true;
        }
        catch (Exception ex)
        {
            sConn_?.Close();
            Msg = ex.Message;
            return false;
        }
    }
    public bool CNDatarow(DataRow Dr, string TableName, ref string Msg, string GetIdent, ref int ValIdent)
    {
        Msg = "";
        try
        {
            ValIdent = -1;
            if (Dr.RowState == DataRowState.Unchanged)
            {
                Msg = "Không có gì thay đổi trong dòng dữ liệu.";
                return true;
            }
            SqlConnection sConn_ = new(_connectionString);
            sConn_.Open();
            DataSet? ds = GetSchemaTable(TableName);
            if (ds == null) return false;
            DataRow[] dsPK = ds.Tables[2].Select("CONSTRAINT_TYPE='PRIMARY KEY'");
            if (dsPK.Length == 0)
            {
                Msg = "Không tìm thấy khóa chính cho bảng dữ liệu: " + TableName;
                sConn_?.Close();
                return false;
            }
            else
            {
                string pkName = (string)dsPK[0]["CONSTRAINT_NAME"];
                var dsColPK = ds.Tables[1].Select("CONSTRAINT_NAME='" + pkName + "'");
                if (dsColPK.Length == 0)
                {
                    Msg = "Không tìm thấy các cột khóa chính cho bảng dữ liệu: " + TableName;
                    sConn_?.Close();
                    return false;
                }
                else
                {
                    DataTable dtColPK = dsColPK.CopyToDataTable();
                    string sql = "";
                    SqlCommand cmd = new()
                    {
                        Connection = sConn_
                    };
                    if (Dr.RowState == DataRowState.Added)
                    {
                        string sCol = "";
                        string sVal = "";
                        foreach (DataRow item in ds.Tables[0].Rows)
                        {
                            if (Dr.Table.Columns.Contains((string)item["COLUMN_Name"]) && !Convert.IsDBNull(Dr[(string)item["COLUMN_NAME"]]))
                            {
                                sCol += string.IsNullOrEmpty(sCol) ? "" : "," + "[" + item["COLUMN_NAME"] + "]";
                                sVal += string.IsNullOrEmpty(sVal) ? "" : "," + "@" + item["COLUMN_NAME"] + "";
                                SqlParameter sqlPR = new((string)item["COLUMN_NAME"], CoerceSqlValue(Dr[(string)item["COLUMN_NAME"]]))
                                {
                                    SqlDbType = GetSQLDBType((string)item["Data_Type"])
                                };
                                cmd.Parameters.Add(sqlPR);
                            }
                        }
                        if (!string.IsNullOrEmpty(GetIdent))
                        {
                            sql = "insert into " + TableName + " (" + sCol + ") values (" + sVal + ")";
                            sql += "\nSELECT SCOPE_IDENTITY()";
                            ValIdent = 0;
                        }
                        else
                        {
                            sql = "insert into " + TableName + " (" + sCol + ") values (" + sVal + ")";
                        }
                        cmd.CommandText = sql;
                    }
                    else if (Dr.RowState == DataRowState.Deleted)
                    {
                        string sWhere = "";
                        foreach (var item in dsColPK)
                        {
                            if (!Dr.Table.Columns.Contains((string)item["COLUMN_NAME"]))
                            {
                                Msg = "Không có cột " + item["COLUMN_NAME"] + " trong bảng dữ liệu";
                                return false;
                            }
                            DataRow[] colInfor = ds.Tables[0].Select("COLUMN_NAME='" + item["COLUMN_NAME"] + "'");
                            sWhere += " and [" + item["COLUMN_NAME"] + "] = @" + item["COLUMN_NAME"];
                            SqlParameter sqlPR = new((string)item["COLUMN_NAME"], CoerceSqlValue(Dr[(string)item["COLUMN_NAME"], DataRowVersion.Original]));
                            cmd.Parameters.Add(sqlPR);
                        }
                        sql = "delete " + TableName + " where 1=1 " + sWhere;
                        cmd.CommandText = sql;
                    }
                    else if (Dr.RowState == DataRowState.Modified)
                    {
                        string sWhere = "";
                        string sUpdate = "";
                        foreach (var item in dsColPK)
                        {
                            if (!Dr.Table.Columns.Contains((string)item["COLUMN_NAME"]))
                            {
                                Msg = "Không có cột " + item["COLUMN_NAME"] + " trong bảng dữ liệu";
                                return false;
                            }
                            DataRow[] colInfor = ds.Tables[0].Select("COLUMN_NAME='" + item["COLUMN_NAME"] + "'");
                            sWhere += " and [" + item["COLUMN_NAME"] + "] = @" + item["COLUMN_NAME"];
                            SqlParameter sqlPR = new((string)item["COLUMN_NAME"], CoerceSqlValue(Dr[(string)item["COLUMN_NAME"]]));
                            cmd.Parameters.Add(sqlPR);
                        }
                        foreach (DataRow item in ds.Tables[0].Rows)
                        {
                            if (dtColPK.Select("COLUMN_NAME='" + item["COLUMN_NAME"] + "'").Length == 0 && Dr.Table.Columns.Contains((string)item["COLUMN_NAME"]))
                            {
                                if (!Dr[(string)item["COLUMN_NAME"]].Equals(Dr[(string)item["COLUMN_NAME"], DataRowVersion.Original]))
                                {
                                    sUpdate += (string.IsNullOrEmpty(sUpdate) ? "set " : ",") + " [" + item["COLUMN_NAME"] + "] = @" + item["COLUMN_NAME"];
                                    SqlParameter sqlPR = new((string)item["COLUMN_NAME"], CoerceSqlValue(Dr[(string)item["COLUMN_NAME"]]))
                                    {
                                        SqlDbType = GetSQLDBType((string)item["Data_Type"])
                                    };
                                    cmd.Parameters.Add(sqlPR);
                                }
                            }
                        }
                        if (string.IsNullOrEmpty(sUpdate))
                        {
                            Msg = "Không có gì thay đổi trong dòng dữ liệu.";
                            cmd.Dispose();
                            return true;
                        }
                        sql = "update " + TableName + " " + sUpdate + " where 1=1 " + sWhere;
                        cmd.CommandText = sql;
                    }
                    if (ValIdent < 0)
                    {
                        cmd.ExecuteNonQuery();
                        cmd.Dispose();
                    }
                    else
                    {
                        ValIdent = (int)cmd.ExecuteScalar();
                    }
                }
            }
            if (Dr.RowState != DataRowState.Deleted) Dr.AcceptChanges();
            sConn_?.Close();
            return true;
        }
        catch (Exception ex)
        {
            Msg = ex.Message;
            return false;
        }
    }
    public bool CNDatatable(DataTable Dt, string TableName, ref string Msg)
    {
        Msg = "";
        try
        {
            DataTable? dtChange = Dt.GetChanges();
            if (dtChange == null)
                return true;
            DataRow[] dsRowDelete = Array.Empty<DataRow>();
            foreach (DataRow item in Dt.Rows)
            {
                if (item.RowState == DataRowState.Unchanged)
                    continue;
                string msg1Row = "";
                int ident = -1;
                if (!CNDatarow(item, TableName, ref msg1Row, "", ref ident))
                    Msg += "\n" + msg1Row;
                else if (item.RowState == DataRowState.Deleted)
                {
                    var oldDsRowDelete = dsRowDelete;
                    dsRowDelete = new DataRow[dsRowDelete.Length + 1];
                    if (oldDsRowDelete != null)
                        Array.Copy(oldDsRowDelete, dsRowDelete, Math.Min(dsRowDelete.Length + 1, oldDsRowDelete.Length));
                    dsRowDelete[^1] = item;
                }
                else
                    item.AcceptChanges();
            }
            foreach (DataRow item in dsRowDelete)
                item.AcceptChanges();
            if (!string.IsNullOrEmpty(Msg))
            {
            }
            return string.IsNullOrEmpty(Msg.Trim());
        }
        catch (Exception ex)
        {
            Msg = ex.Message;
            return false;
        }
    }
    public bool CNDataset(DataSet Ds, string[] TableName, ref string Msg)
    {
        Msg = "";
        try
        {
            for (var i = 0; i <= Ds.Tables.Count - 1; i++)
            {
                string msg1Row = "";
                CNDatatable(Ds.Tables[i], TableName[i], ref msg1Row);
                if (!string.IsNullOrEmpty(msg1Row))
                    Msg += "\n" + msg1Row;
            }
            return string.IsNullOrEmpty(Msg.Trim());
        }
        catch (Exception ex)
        {
            Msg = ex.Message;
            return false;
        }
    }
    public bool RunSqlByParam(string SQL, ref string Msg, params object[] pc)
    {
        Msg = "";
        SqlConnection sConn_;
        try
        {
            sConn_ = new SqlConnection(_connectionString);
            sConn_.Open();
            SqlCommand cmd = new()
            {
                Connection = sConn_,
                CommandText = SQL
            };
            GanParameter(ref cmd, pc);
            cmd.ExecuteNonQuery();
            cmd.Dispose();
            sConn_?.Close();
            return true;
        }
        catch (Exception ex)
        {
            Msg = ex.Message;
            return false;
        }
    }
    public SqlDbType GetSQLDBType(string s)
    {
        switch (s.ToLower())
        {
            case "nvarchar":
                {
                    return SqlDbType.NVarChar;
                }

            case "bigint":
                {
                    return SqlDbType.BigInt;
                }

            case "binary":
                {
                    return SqlDbType.Binary;
                }

            case "bit":
                {
                    return SqlDbType.Bit;
                }

            case "char":
                {
                    return SqlDbType.Char;
                }

            case "date":
                {
                    return SqlDbType.Date;
                }

            case "datetime":
                {
                    return SqlDbType.DateTime;
                }

            case "datetime2":
                {
                    return SqlDbType.DateTime2;
                }

            case "datetimeoffset":
                {
                    return SqlDbType.DateTimeOffset;
                }

            case "decimal":
                {
                    return SqlDbType.Decimal;
                }

            case "float":
                {
                    return SqlDbType.Float;
                }

            case "image":
                {
                    return SqlDbType.Image;
                }

            case "int":
                {
                    return SqlDbType.Int;
                }

            case "money":
                {
                    return SqlDbType.Money;
                }

            case "nchar":
                {
                    return SqlDbType.NChar;
                }

            case "ntext":
                {
                    return SqlDbType.NText;
                }

            case "real":
                {
                    return SqlDbType.Real;
                }

            case "smalldatetime":
                {
                    return SqlDbType.SmallDateTime;
                }

            case "smallint":
                {
                    return SqlDbType.SmallInt;
                }

            case "smallmoney":
                {
                    return SqlDbType.SmallMoney;
                }

            case "structured":
                {
                    return SqlDbType.Structured;
                }

            case "text":
                {
                    return SqlDbType.Text;
                }

            case "time":
                {
                    return SqlDbType.Time;
                }

            case "timestamp":
                {
                    return SqlDbType.Timestamp;
                }

            case "tinyint":
                {
                    return SqlDbType.TinyInt;
                }

            case "udt":
                {
                    return SqlDbType.Udt;
                }

            case "uniqueidentifier":
                {
                    return SqlDbType.UniqueIdentifier;
                }

            case "varbinary":
                {
                    return SqlDbType.VarBinary;
                }

            case "varchar":
                {
                    return SqlDbType.VarChar;
                }

            case "variant":
                {
                    return SqlDbType.Variant;
                }

            case "xml":
                {
                    return SqlDbType.Xml;
                }

            default:
                {
                    return SqlDbType.NVarChar;
                }
        }
    }
    public DataSet? GetSchemaTable(string TableName)
    {
        DataSet? ds;
        // Tên bảng được nhúng vào câu lệnh nên bắt buộc phải là định danh hợp lệ để chặn SQL injection.
        if (!Sys.IsValidQualifiedName(TableName))
            return null;
        if (!clcSchema_.ContainsKey("Table_" + TableName))
        {
            string Msg = "";
            string nameLiteral = Sys.EscapeSqlLiteral(TableName);
            string sqlGetInfo = "" +
                "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = N'" + nameLiteral + "';" +
                "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = N'" + nameLiteral + "';" +
                "SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = N'" + nameLiteral + "';";
            ds = LayDataset(sqlGetInfo, ref Msg);
            if (ds != null) clcSchema_.Add("Table_" + TableName, ds);
        }
        else
            ds = clcSchema_["Table_" + TableName];
        return ds;
    }
    public DataSet? GetSchemaStore(string StoredName)
    {
        string Msg = "";
        DataSet? ds;
        if (!Sys.IsValidQualifiedName(StoredName))
            return null;
        if (!clcSchema_.ContainsKey("Stored_" + StoredName))
        {
            string SQL = @$"
SELECT b1.*, b2.name AS kieu
FROM   sys.parameters b1
       JOIN sys.types b2
            ON  b1.user_type_id = b2.user_type_id
WHERE  object_id = OBJECT_ID(N'{Sys.EscapeSqlLiteral(StoredName)}')";
            ds = LayDataset(SQL, ref Msg);
            if (ds != null) clcSchema_.Add("Stored_" + StoredName, ds);
        }
        else
        {
            ds = clcSchema_["Stored_" + StoredName];
        }
        return ds;
    }
    public bool CreateStoredParam(string StoredName, DataRow Dr, ref object[] pc, ref string Msg)
    {
        DataSet? ds = GetSchemaStore(StoredName);
        if (ds == null) return false;
        foreach (DataRow item in ds.Tables[0].Rows)
        {
            string prName = ((string)item["name"])[1..];
            if (Dr.Table.Columns.Contains(prName))
            {
                var oldPc = pc;
                pc = new object[pc.Length + 2 + 1];
                if (oldPc != null)
                    Array.Copy(oldPc, pc, Math.Min(pc.Length + 2 + 1, oldPc.Length));
                pc[^3] = prName;
                pc[^2] = GetSQLDBType((string)item["kieu"]);
                pc[^1] = Dr[prName];
            }
            else if ((bool)item["is_output"])
            {
                var oldPc = pc;
                pc = new object[pc.Length + 2 + 1];
                if (oldPc != null)
                    Array.Copy(oldPc, pc, Math.Min(pc.Length + 2 + 1, oldPc.Length));
                pc[^3] = prName;
                pc[^2] = GetSQLDBType((string)item["kieu"]);
                pc[^1] = DBNull.Value;
            }
            else if (!(bool)item["is_nullable"])
            {
                Msg = $"Không tìm thấy param {prName} trong dòng dữ liệu.";
                return false;
            }
        }
        return true;
    }
    public bool CheckConnect(ref string Msg)
    {
        try
        {
            SqlConnection sConn_ = new(_connectionString);
            if (sConn_.State != ConnectionState.Open) sConn_.Open();
            return true;
        }
        catch (Exception ex)
        {
            Msg = "Lỗi khi kết nối dữ liệu: " + ex.Message;
            return false;
        }
    }
    public string SinhMa(string tableName, string columnName, ref string msgErr, string chuoiNoiThem = "", string dieuKien = "", string dinhDang = "", bool bonho = false, bool boxonglay = false, string chuoiNoiThem1 = "")
    {
        if (bonho)
        {
            this.RunSqlByParam("delete sinhmatm where tablename = @t and columnName = @c and wh = @w", ref msgErr,
                "@t", null!, tableName, "@c", null!, columnName, "@w", null!, dieuKien);
            if (boxonglay)
            {
                try
                {
                    object[] param = { "TableName", SqlDbType.NVarChar, tableName, "ColumnName", SqlDbType.NVarChar, columnName, "Ext", SqlDbType.NVarChar, chuoiNoiThem, "Ext1", SqlDbType.NVarChar, chuoiNoiThem1, "Where", SqlDbType.NVarChar, dieuKien, "Format", SqlDbType.NVarChar, dinhDang, "GiaTri", SqlDbType.NVarChar, "" };
                    string[] outparam = { "GiaTri", "250" };
                    object[]? outobj = null;
                    outobj = this.StoredExecReturn("sinhmasql", ref msgErr, outparam, param);
                    if (outobj == null)
                    {
                        return "1";
                    }
                    else
                    {
                        return outobj?[0]?.ToString() ?? "1";
                    }
                }
                catch (Exception ex)
                {
                    msgErr = ex.Message;
                    return "1";
                }
            }
            return "1";
        }
        else
        {
            object[] param = { "TableName", SqlDbType.NVarChar, tableName, "ColumnName", SqlDbType.NVarChar, columnName, "Ext", SqlDbType.NVarChar, chuoiNoiThem, "Ext1", SqlDbType.NVarChar, chuoiNoiThem1, "Where", SqlDbType.NVarChar, dieuKien, "Format", SqlDbType.NVarChar, dinhDang, "GiaTri", SqlDbType.NVarChar, "" };
            string[] outparam = { "GiaTri", "250" };
            object[]? outobj = null;
            outobj = this.StoredExecReturn("sinhmasql", ref msgErr, outparam, param);
            if (outobj == null)
            {
                return "";
            }
            else
            {
                return outobj?[0]?.ToString() ?? "1";
            }
        }
    }
    private readonly Dictionary<string, DataSet> clcSchema_ = new();
}
