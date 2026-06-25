using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.FileProviders;
using System;
using System.Data;
using System.IO;
using System.Net.Http;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

public class Sys
{
    public Sys()
    {
    }
    public List<Dictionary<string, object>> ConvertDataTableToList(DataTable dt)
    {
        var list = new List<Dictionary<string, object>>();
        foreach (DataRow row in dt.Rows)
        {
            var dict = new Dictionary<string, object>();
            foreach (DataColumn col in dt.Columns)
            {
                var v = row[col];
                dict[col.ColumnName] = v is DBNull ? null! : v; // DBNull -> null (tránh serialize thành {} hiện "[object Object]")
            }
            list.Add(dict);
        }
        return list;
    }
    public Dictionary<string, List<Dictionary<string, object>>> ConvertDataSetToList(DataSet ds)
    {
        if (ds != null)
        {
            Dictionary<string, List<Dictionary<string, object>>> dsReturn = new Dictionary<string, List<Dictionary<string, object>>>();
            foreach (DataTable dt in ds.Tables)
            {
                List<Dictionary<string, object>> dtVar = ConvertDataTableToList(dt);
                dsReturn.Add(dt.TableName, dtVar);
            }
            return dsReturn;
        }
        else
        {
            return new Dictionary<string, List<Dictionary<string, object>>>();
        }
    }
    public Dictionary<string, List<Dictionary<string, object>>> ReturnDataSet(DataSet ds)
    {
        Dictionary<string, List<Dictionary<string, object>>> dsReturn = new Dictionary<string, List<Dictionary<string, object>>>();
        foreach (DataTable dt in ds.Tables)
        {
            List<Dictionary<string, object>> dtVar = ConvertDataTableToList(dt);
            dsReturn.Add(dt.TableName, dtVar);
        }
        return dsReturn;
    }
    public Dictionary<string, object> Return(int Code, string? Msg, object? Data)
    {
        Dictionary<string, object> dict = new Dictionary<string, object>();
        dict.Add("code", Code);
        dict.Add("message", Msg ?? "");
        dict.Add("data", Data ?? "");
        return dict;
    }
    public Dictionary<string, object> NormalizeDictionary(Dictionary<string, object> input)
    {
        var result = new Dictionary<string, object>();
        foreach (var kv in input)
        {
            if (kv.Value is JsonElement element)
            {
                result[kv.Key] = ConvertJsonElement(element);
            }
            else
            {
                result[kv.Key] = kv.Value;
            }
        }
        return result;
    }
    public List<string> GetFullPaths(string parentFolder, List<string> fileNames)
    {
        var fileSet = new HashSet<string>(fileNames, StringComparer.OrdinalIgnoreCase);
        var result = Directory
            .EnumerateFiles(parentFolder, "*", SearchOption.AllDirectories)
            .Where(f => fileSet.Contains(Path.GetFileName(f)))
            .ToList();
        return result;
    }
    private object ConvertJsonElement(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var dict = new Dictionary<string, object>();
                foreach (var prop in element.EnumerateObject())
                {
                    dict[prop.Name] = ConvertJsonElement(prop.Value);
                }
                return dict;
            case JsonValueKind.Array:
                var list = new List<object>();
                foreach (var item in element.EnumerateArray())
                {
                    list.Add(ConvertJsonElement(item));
                }
                return list;
            case JsonValueKind.String:
                var str = element.GetString();
                if (str.Length >= 8)
                {
                    if (DateTime.TryParse(str, out DateTime dt))
                    {
                        return dt;
                    }
                }
                if (Guid.TryParse(str, out Guid g)) return g;
                return str ?? "";
            case JsonValueKind.Number:
                if (element.TryGetInt32(out int i)) return i;
                if (element.TryGetInt64(out long l)) return l;
                if (element.TryGetDecimal(out decimal d)) return d;
                return element.GetDouble();
            case JsonValueKind.True:
            case JsonValueKind.False:
                return element.GetBoolean();
            case JsonValueKind.Null:
                return "";
            default:
                return element.ToString();
        }
    }
    public string ReadAllText(string path)
    {
        using var stream = new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete
        );
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
    public bool DelFolder(string path)
    {
        if (!Directory.Exists(path))
            return true;
        try
        {
            foreach (var file in Directory.GetFiles(path, "*", SearchOption.AllDirectories))
            {
                File.SetAttributes(file, FileAttributes.Normal);
            }
            Directory.Delete(path, true);
            return true;
        }
        catch
        {
            return false;
        }
    }
    public List<string> GetSqlScripts(Assembly asm)
    {
        var resources = asm.GetManifestResourceNames();
        var schema = resources
            .Where(x => x.Contains(".Struct.Schema.") && x.EndsWith(".sql"))
            .OrderBy(x => x)
            .ToList();
        var stored = resources
            .Where(x => x.Contains(".Struct.Stored.") && x.EndsWith(".sql"))
            .OrderBy(x => x)
            .ToList();
        var scripts = new List<string>();
        void ReadScripts(List<string> files)
        {
            foreach (var r in files)
            {
                using var stream = asm.GetManifestResourceStream(r);
                using var reader = new StreamReader(stream!);
                scripts.Add(reader.ReadToEnd());
            }
        }
        ReadScripts(schema);
        ReadScripts(stored);
        return scripts;
    }
    public Dictionary<string, object> RunSqlStruct(Assembly asm, Connection _connection)
    {
        try
        {
            List<string> list = GetSqlScripts(asm);
            string msgErr = "";
            foreach (string s in list)
            {
                string[] lst = GetStringRunFromString(s);
                if (lst.Length > 0)
                {
                    string msg = "";
                    foreach (string item in lst)
                    {
                        if (!_connection.ThucThiSQL(item, ref msg))
                        {
                            msgErr += msg + "\n____________________________________\n" + item + "\n";
                        }
                    }
                }
            }
            if (string.IsNullOrEmpty(msgErr))
            {
                return Return(0, "", "");
            }
            else
            {
                return Return(1, msgErr, "");
            }
        }
        catch (Exception ex)
        {
            return Return(1, ex.ToString(), "");
        }
    }
    public string GetSqlTypeFromDictionaryValue(object val)
    {
        if (val == null) return "NVARCHAR(MAX)";
        var t = val.GetType();
        if (t == typeof(int)) return "INT";
        if (t == typeof(long)) return "BIGINT";
        if (t == typeof(decimal) || t == typeof(double) || t == typeof(float)) return "DECIMAL(18,4)";
        if (t == typeof(DateTime)) return "DATETIME";
        if (t == typeof(bool)) return "BIT";
        return "NVARCHAR(MAX)";
    }
    public List<string> InitSqlStructSystem(Connection cn, string adminUser, string adminPassword)
    {
        string sqlRun = "";
        string msg = "";
        List<string> Err = new List<string>();
        #region Bảng hệ thống
        sqlRun = @"
If Not Exists(Select Top 1 1 From sys.tables Where name = 'SinhMaTM')
Begin
	Create Table SinhMaTM(
		Id Int Identity(1,1) NOT Null,
		TableName nVarchar(150) Null,
		ColumnName nVarchar(150) Null,
		Ext nVarchar(500) Null,
		Value Int Null,
		wh nVarchar(2500) Null,
		Split Int Null,
		Ext1 nVarchar(150) Null
	)
End
Go
If Not Exists(Select Top 1 1 From sys.tables Where name = 'LastModified')
Begin
	Create Table LastModified(
		ID Int Not Null Primary Key,
		TableName nVarchar(500) Null,
		LastModified datetime Null
	)
End
Go
If Not Exists(Select Top 1 1 From sys.tables Where name = 'Report')
Begin
	Create Table Report(
        ID Int Not Null Primary Key,
        ReportName nVarchar(500) Null,
        GroupKey nVarchar(500) Null,
        ProcNoiDung nVarchar(500) Null,
        ColumnConfig nVarchar(max) Null,
        CondicationConfig nVarchar(max)Null,
        IDPrint Int Null
    )
End
";
        string[] lstRun = GetStringRunFromString(sqlRun);
        foreach (string line in lstRun) { if (!cn.ThucThiSQL(line, ref msg)) { Err.Add(msg); } }
        #endregion
        #region Store sinh mã
        sqlRun = @"
Alter PROCEDURE sinhmasql
	@TableName NVARCHAR(250),
	@ColumnName NVARCHAR(250),
	@Ext NVARCHAR(50) = '',
	@Where NVARCHAR(MAX) = '',
	@Format NVARCHAR(50) = '',
	@Ext1 NVARCHAR(50) = '',
	@GiaTri NVARCHAR(250) OUTPUT
AS
BEGIN
	SET DATEFORMAT Dmy;
	DECLARE @Out INT,
	        @IdMax BIGINT
	
	DECLARE @TblOut TABLE(Outp INT)
	DECLARE @NamLV NVARCHAR(2)
	DECLARE @Sql NVARCHAR(MAX)
	SELECT @NamLV = RIGHT(DB_NAME(), 2),
	       @Sql = N'';
	
	SET @IdMax = 0 
	SET @Out = 0
	BEGIN
		IF EXISTS(
		       SELECT TOP 1 1
		       FROM   SinhMaTM(NoLock)
		       WHERE  TableName            = @TableName
		              AND ColumnName       = @ColumnName
		              AND ISNULL(Ext, '')  = @Ext
		              AND ISNULL(wh, '')   = @Where
		              AND ISNULL(Ext1, '') = @Ext1
		              AND SPLIT            = 0
		   )
		BEGIN
		    SET @Out = 0
		    SELECT TOP 1 @Out = MAX(VALUE) + 1
		    FROM   SinhMaTM(NoLock)
		    WHERE  TableName            = @TableName
		           AND ColumnName       = @ColumnName
		           AND ISNULL(Ext, '')  = @Ext
		           AND ISNULL(wh, '')   = @Where
		           AND ISNULL(Ext1, '') = @Ext1
		           AND SPLIT            = 0
		    
		    UPDATE b1
		    SET    VALUE                = ISNULL(@Out, 1)
			FROM  SinhMaTM b1(RowLock)
		    WHERE  TableName            = @TableName
		           AND ColumnName       = @ColumnName
		           AND ISNULL(Ext, '')  = @Ext
		           AND ISNULL(wh, '')   = @Where
		           AND ISNULL(Ext1, '') = @Ext1
		           AND SPLIT            = 0
		END
		ELSE
		BEGIN
		    SET @Sql += N'
				DECLARE @Max INT;
		        SELECT @Max = MAX(giatri)
		        FROM   (SELECT 0 giatri
						UNION ALL
						SELECT MAX(CONVERT(INT, SUBSTRING(CONVERT(NVARCHAR, {0}), LEN(N''{2}'') + 1, LEN(CONVERT(NVARCHAR, {0})) - LEN(N''{2}'') - LEN(N''{3}''))))
						FROM   {1}
						WHERE  CONVERT(NVARCHAR, {0}) LIKE N''{2}%'' AND CONVERT(NVARCHAR, {0}) LIKE N''%{3}''' + (CASE WHEN @Where != '' THEN N' AND ' + @Where ELSE '' END) + '
							   AND ISNUMERIC(SUBSTRING(CONVERT(NVARCHAR, {0}), LEN(N''{2}'') + 1, LEN(CONVERT(NVARCHAR, {0})) - LEN(N''{2}'') - LEN(N''{3}''))) > 0
					   ) xxx
		        WHERE  NOT giatri IS NULL;
		        SELECT ISNULL(@Max, 0) + 1;'
		    SET @Sql = REPLACE(@Sql, '{0}', @ColumnName);
		    SET @Sql = REPLACE(@Sql, '{1}', @TableName);
		    SET @Sql = REPLACE(@Sql, '{2}', @Ext);
		    SET @Sql = REPLACE(@Sql, '{3}', @Ext1);
		   
		    INSERT INTO @TblOut (Outp) EXEC (@Sql);
		    SELECT @Out = Outp FROM @TblOut;
		    INSERT INTO SinhMaTM (TableName, ColumnName, Ext, Ext1, VALUE, Wh, SPLIT)
		    VALUES (@TableName, @ColumnName, @Ext, @Ext1, @Out, @Where, 0);
		END
	END
	IF NOT (@Format IS NULL OR LEN(@Format) = 0) AND LEN(@out) < LEN(@Format)
	BEGIN
	    SET @GiaTri = @Ext + CONVERT(NVARCHAR, SUBSTRING('00000000000000000000000000000000000000', 1, LEN(@Format) - LEN(@out)) + CONVERT(NVARCHAR, @Out)) + @Ext1;
	END
	ELSE
	BEGIN
	    SET @GiaTri = @Ext + CONVERT(NVARCHAR, @out) + @Ext1;
	END
END
";
        cn.ThucThiSQL("Create Proc sinhmasql As Begin Select 1; End", ref msg);
        if (!cn.ThucThiSQL(sqlRun, ref msg)) { Err.Add(msg); }
        #endregion
        #region Dashboard
        sqlRun = @"
If Not Exists(Select Top 1 1 From sys.tables Where name = 'Dash_Control')
Begin
    Create Table Dash_Control(
        ID Int Not Null Primary Key,
        Title nVarchar(500),
        Kieu Int,
        Connect Int,
        Store nVarchar(Max),
        DieuKien nVarchar(Max)
    )
End
Go
If Not Exists(Select Top 1 1 From sys.tables Where name = 'Dash_Connection')
Begin
    Create Table Dash_Connection(
        ID Int Not Null Primary Key,
        TenKetNoi nVarchar(500),
        Server nVarchar(500),
        DataSource nVarchar(500),
        UserName nVarchar(500),
        Pass nVarchar(500),
    )
End
Go
If Not Exists(Select Top 1 1 From sys.columns Where name='LColor' And Object_ID=Object_ID('Dash_Control'))
Begin
    Alter Table Dash_Control Add LColor nVarchar(Max)
End
Go
If Not Exists(Select Top 1 1 From sys.columns Where name='CssClass' And Object_ID=Object_ID('Dash_Control'))
Begin
    Alter Table Dash_Control Add CssClass nVarchar(500)
End
Go
If Not Exists(Select Top 1 1 From sys.tables Where name = 'Dash_Page')
Begin
    Create Table Dash_Page(
        ID Int Not Null Primary Key,
        TieuDe nVarchar(500),
        Control nVarchar(500)
    )
End
Go
If Not Exists(Select Top 1 1 From sys.tables Where name = 'Dash_Class')
Begin
    Create Table Dash_Class(
        ID Int Not Null Primary Key,
        ClassName nVarchar(500),
        DienGiai nVarchar(500),
        ClassContent nVarchar(500)
    )
End
";
        lstRun = GetStringRunFromString(sqlRun);
        foreach (string line in lstRun) { if (!cn.ThucThiSQL(line, ref msg)) { Err.Add(msg); } }
        #endregion
        #region Danh mục chung
        sqlRun = @"
If Not Exists(Select Top 1 1 From sys.tables Where name = 'Ej2_TableSetting')
Begin
	CREATE TABLE Ej2_TableSetting(
		TableName nvarchar(150) NOT NULL,
		Filter nvarchar(max) NULL,
		Text nvarchar(max) NULL,
		 CONSTRAINT PK_Ej2_TableSetting PRIMARY KEY CLUSTERED 
		(
			TableName ASC
		)
	)
End
GO
If Not Exists(Select Top 1 1 From sys.tables Where name = 'Ej2_TableView')
Begin
	CREATE TABLE Ej2_TableView(
		TableName nvarchar(150) NOT NULL,
		ColumnName nvarchar(150) NOT NULL,
		HeaderText nvarchar(max) NULL,
		Width int NULL,
		iOrder int NULL,
		Type int NULL,
		Source nvarchar(max) NULL,
		DisplayMember nvarchar(max) NULL,
		ValueMember nvarchar(max) NULL,
		CONSTRAINT PK_Ej2_TableView PRIMARY KEY CLUSTERED 
		(
			TableName ASC,
			ColumnName ASC
		)
	)
End
GO
If Not Exists(Select Top 1 1 From sys.columns Where name = 'SinhMa' And Object_ID = Object_ID('Ej2_TableView'))
	Alter Table Ej2_TableView Add SinhMa Bit
GO
If Not Exists(Select Top 1 1 From sys.columns Where name = 'An' And Object_ID = Object_ID('Ej2_TableView'))
	Alter Table Ej2_TableView Add An Bit
GO
If Not Exists(Select Top 1 1 From sys.columns Where name = 'ROnly' And Object_ID = Object_ID('Ej2_TableView'))
	Alter Table Ej2_TableView Add ROnly Bit
GO
-- Danh mục CHA-CON (tree): cấu hình ở mức bảng. IsTree=1 -> lưới hiển thị dạng cây;
-- ParentColumn = tên cột chứa khóa CHA (tự tham chiếu PK của bảng). Để trống -> tự dò theo quy ước tên cột.
If Not Exists(Select Top 1 1 From sys.columns Where name = 'IsTree' And Object_ID = Object_ID('Ej2_TableSetting'))
	Alter Table Ej2_TableSetting Add IsTree Bit
GO
If Not Exists(Select Top 1 1 From sys.columns Where name = 'ParentColumn' And Object_ID = Object_ID('Ej2_TableSetting'))
	Alter Table Ej2_TableSetting Add ParentColumn nVarchar(150)
GO
-- Nhóm hệ thống của danh mục (gom card ở hub /DanhMuc theo nhóm). Null/'' -> hiển thị nhóm 'Khác'.
If Col_Length('Ej2_TableSetting','Nhom') Is Null
	Alter Table Ej2_TableSetting Add Nhom nVarchar(100) Null
GO
-- Gán nhóm cho danh mục đã biết (idempotent: CHỈ set khi Nhom còn trống -> không đè chỉnh tay).
Update Ej2_TableSetting Set Nhom = N'Nhân sự & Lương'
Where (Nhom Is Null Or Nhom = '') And TableName In
	('DmNhanVien','LuongNhanVien','DmPhong','DmPhuCap','PhuCapNhanVien','KhauTruNhanVien','TamUngNhanVien','ThuongNhanVien','BHXHNhanVien','BHXHConfig','MucGiamTru','NguoiPhuThuoc','HopDongLaoDong','DmLoaiHopDong','BieuThueTNCN','DmKPITieuChi','KPIConfig')
GO
Update Ej2_TableSetting Set Nhom = N'Kế toán'
Where (Nhom Is Null Or Nhom = '') And TableName In
	('ChungTu','DanhMucTaiKhoan','DmHangHoa','DmNhomHang','DmKho','DmDonViTinh','DmTaiSan','DmNhaCungCap')
GO
Update Ej2_TableSetting Set Nhom = N'Quản lý doanh thu'
Where (Nhom Is Null Or Nhom = '') And TableName In ('DmKhachHang','DmHopDong')
GO
Update Ej2_TableSetting Set Nhom = N'Báo cáo'
Where (Nhom Is Null Or Nhom = '') And TableName In ('DmReportGroup')
GO
Update Ej2_TableSetting Set Nhom = N'Hệ thống'
Where (Nhom Is Null Or Nhom = '') And TableName In ('dash_class','dash_connection','ngayle')
";
        lstRun = GetStringRunFromString(sqlRun);
        foreach (string line in lstRun) { if (!cn.ThucThiSQL(line, ref msg)) { Err.Add(msg); } }
        #endregion
        #region User
        sqlRun = @"
If Not Exists(Select Top 1 1 From sys.tables Where name = 'ListUser')
Begin
    CREATE TABLE ListUser(
	    ID int NOT NULL Primary Key,
	    HoTen nvarchar(250) NULL,
	    TenDangNhap nvarchar(250) NULL,
	    MatKhau nvarchar(250) NULL Default('123@123aA1'),
	    Admin bit NULL,
	    Khoa bit NULL,
        DefUrl nVarchar(255)
    )
End
Go
If Not Exists(Select Top 1 1 From sys.tables Where name = 'UserDesktopConfig')
Begin
    CREATE TABLE UserDesktopConfig(
        UserName nvarchar(250) NOT NULL,
        ConfigJson nvarchar(max) NULL,
        LastModified datetime NULL,
        CONSTRAINT PK_UserDesktopConfig PRIMARY KEY CLUSTERED
        (
            UserName ASC
        )
    )
End
";
        lstRun = GetStringRunFromString(sqlRun);
        foreach (string line in lstRun)
        {
            if (!cn.ThucThiSQL(line, ref msg))
            {
                Err.Add(msg);
            }
        }
        cn.RunSqlByParam(
            "If Not Exists(Select Top 1 1 From ListUser Where ID=0) Insert Into ListUser(ID,HoTen,TenDangNhap,MatKhau,Admin,Khoa,DefUrl) Values(0,N'System',@u,@p,1,0,'/Dashboard')",
            ref msg,
            "@u", null!, adminUser,
            "@p", null!, adminPassword);
        #endregion
        #region Quét & thêm khóa chính cho mọi bảng có cột ID nguyên nhưng thiếu Primary Key
        // Nhiều bảng được tạo bởi các bản schema CŨ (dùng IF NOT EXISTS) nên không có Primary Key.
        // Đường lưu chung Connection.CNDLServer/CNDatarow yêu cầu bảng phải có Primary Key, nếu không
        // sẽ báo "Không tìm thấy khóa chính cho bảng dữ liệu: <Table>".
        // Bất biến của nền tảng: mỗi bảng sửa được có 1 cột khóa số nguyên tên 'ID' cấp qua SinhMa.
        // Vì vậy sweep này: với MỌI bảng người dùng có cột 'ID' kiểu nguyên (int/bigint/smallint/tinyint),
        // KHÔNG phải identity, và CHƯA có Primary Key -> backfill ID NULL, đánh số lại ID trùng,
        // đặt ID NOT NULL (nếu hết NULL), rồi thêm Primary Key PK_<table>.
        // Toàn bộ idempotent: chạy lại là no-op một khi PK đã tồn tại. Mỗi bảng bọc TRY/CATCH riêng:
        // một bảng lỗi KHÔNG làm hỏng các bảng còn lại. Chỉ backfill/đánh số lại ID NULL hoặc trùng và
        // thêm constraint PK — tuyệt đối không DROP/DELETE dữ liệu.
        // Lưu ý: chạy trên DB Default (appsettings.DefaultConnection). Các module trỏ DB khác qua
        // section riêng (vd QLDoanhThu) KHÔNG được sweep này phủ tới.
        string sqlSweepPK = @"
SET NOCOUNT ON;
DECLARE @tbl SYSNAME, @sch SYSNAME, @full NVARCHAR(300), @pk SYSNAME, @typeName SYSNAME,
        @colDef NVARCHAR(200), @sql NVARCHAR(MAX), @nullCnt INT, @dupCnt INT, @maxId BIGINT;

DECLARE curPK CURSOR LOCAL FAST_FORWARD FOR
    SELECT s.name, t.name, ty.name
    FROM   sys.tables t
    JOIN   sys.schemas s ON s.schema_id = t.schema_id
    JOIN   sys.columns c ON c.object_id = t.object_id AND c.name = 'ID'
    JOIN   sys.types   ty ON ty.user_type_id = c.user_type_id
    WHERE  t.is_ms_shipped = 0
      AND  t.type = 'U'
      AND  ty.name IN ('int','bigint','smallint','tinyint')
      AND  c.is_identity = 0
      AND  NOT EXISTS (SELECT 1 FROM sys.indexes i
                       WHERE i.object_id = t.object_id AND i.is_primary_key = 1);

OPEN curPK;
FETCH NEXT FROM curPK INTO @sch, @tbl, @typeName;
WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        SET @full = QUOTENAME(@sch) + '.' + QUOTENAME(@tbl);
        SET @colDef = CASE @typeName
                        WHEN 'bigint'   THEN 'BIGINT'
                        WHEN 'smallint' THEN 'SMALLINT'
                        WHEN 'tinyint'  THEN 'TINYINT'
                        ELSE 'INT' END;

        -- 1) Cấp ID cho các dòng đang NULL (đánh số trên Max(ID) hiện có).
        SET @sql = N'DECLARE @m BIGINT = ISNULL((SELECT MAX(ID) FROM ' + @full + N'),0);
                     ;WITH src AS (SELECT ID, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) rn
                                   FROM ' + @full + N' WHERE ID IS NULL)
                     UPDATE src SET ID = @m + rn;';
        EXEC sp_executesql @sql;

        -- 2) Đánh số lại các ID trùng (giữ 1 dòng, dời các dòng trùng lên trên Max(ID)).
        SET @sql = N'IF EXISTS (SELECT 1 FROM ' + @full + N' GROUP BY ID HAVING COUNT(*) > 1)
                     BEGIN
                         DECLARE @m BIGINT = ISNULL((SELECT MAX(ID) FROM ' + @full + N'),0);
                         ;WITH dup AS (
                            SELECT ID,
                                   ROW_NUMBER() OVER (PARTITION BY ID ORDER BY (SELECT NULL)) rnDup,
                                   ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) rnAll
                            FROM ' + @full + N')
                         UPDATE dup SET ID = @m + rnAll WHERE rnDup > 1;
                     END';
        EXEC sp_executesql @sql;

        -- Kiểm tra còn NULL không sau khi backfill.
        SET @nullCnt = 0;
        SET @sql = N'SELECT @c = COUNT(*) FROM ' + @full + N' WHERE ID IS NULL;';
        EXEC sp_executesql @sql, N'@c INT OUTPUT', @c = @nullCnt OUTPUT;

        -- 3) Đặt cột ID NOT NULL (chỉ khi đã hết NULL). Nếu vẫn còn NULL -> bỏ qua bảng này.
        IF @nullCnt = 0
        BEGIN
            IF EXISTS (SELECT 1 FROM sys.columns
                       WHERE name = 'ID' AND object_id = OBJECT_ID(@full) AND is_nullable = 1)
            BEGIN
                SET @sql = N'ALTER TABLE ' + @full + N' ALTER COLUMN ID ' + @colDef + N' NOT NULL;';
                EXEC sp_executesql @sql;
            END

            -- 4) Thêm Primary Key nếu chưa có (kiểm tra lại để idempotent).
            IF NOT EXISTS (SELECT 1 FROM sys.indexes
                           WHERE object_id = OBJECT_ID(@full) AND is_primary_key = 1)
            BEGIN
                SET @pk = 'PK_' + @tbl;
                SET @sql = N'ALTER TABLE ' + @full + N' ADD CONSTRAINT ' + QUOTENAME(@pk)
                           + N' PRIMARY KEY (ID);';
                EXEC sp_executesql @sql;
            END
        END
    END TRY
    BEGIN CATCH
        -- Nuốt lỗi của từng bảng để không làm hỏng các bảng còn lại.
        PRINT 'SweepPK skip ' + ISNULL(@full,'?') + ': ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM curPK INTO @sch, @tbl, @typeName;
END
CLOSE curPK;
DEALLOCATE curPK;
";
        if (!cn.ThucThiSQL(sqlSweepPK, ref msg)) { Err.Add(msg); }
        #endregion
        return Err;
    }
    public string[] GetStringRunFromString(string sqlRun)
    {
        string[] splitList = new string[] { "\nGo\n", "\nGO\n", "\ngo\n", "\ngO\n", "\r\nGo\r\n", "\r\nGO\r\n", "\r\ngo\r\n", "\r\ngO\r\n" };
        string[] lstRun = sqlRun.Split(splitList, StringSplitOptions.RemoveEmptyEntries);
        return lstRun;
    }
    public bool CheckQuyen(IMemoryCache cache, ISession SS, string ControlKey, string Action,string Category)
    {
        bool Admin = false;
        string isAdmin = SS.GetString("Admin")!;
        if (!string.IsNullOrEmpty(isAdmin))
        {
            bool.TryParse(isAdmin, out Admin);
        }
        if (Admin)
        {
            return true;
        }
        Dictionary<string, DataTable>? cacheQuyen = null;
        DataTable dtQuyen = new DataTable();
        if (cache.TryGetValue("GLOBAL_DT", out cacheQuyen))
        {
            dtQuyen = cacheQuyen![SS.GetString("ID")!];
        }
        if (dtQuyen.Rows.Count==0)
        {
            return false;
        }

        int idUser = 0;
        int.TryParse(SS.GetString("ID"), out idUser);
        // Escape các giá trị nhúng vào biểu thức DataTable.Select để tránh injection biểu thức.
        string filter = $"IDUser = {idUser} And GroupKey='{EscapeFilterValue(Category)}' And ControlKey = '{EscapeFilterValue(ControlKey)}' And Action = '{EscapeFilterValue(Action)}'";
        if (dtQuyen.Select(filter).Length == 0)
        {
            return false;
        }
        else
        {
            return true;
        }
    }
    // ============================================================
    // Overload CO XET VAI TRO (RBAC) — ADDITIVE & FAIL-OPEN.
    // Giu nguyen duong kiem tra per-user cu (cache GLOBAL_DT); chi MO RONG:
    //  - Admin -> true.
    //  - Neu cache per-user da cap quyen -> true (nhu cu).
    //  - Neu chua cap qua per-user, delegate sang PermissionService (RBAC):
    //      * PermissionService TU fail-open: thieu bang RBAC / user chua co vai tro
    //        -> coi nhu toan quyen (true) => deploy KHONG khoa user hien huu.
    //      * Co vai tro -> kiem tra theo union quyen cua cac vai tro.
    // Goi overload nay o nhung controller muon thuc thi quyen co xet vai tro.
    // ============================================================
    public bool CheckQuyen(IMemoryCache cache, ISession SS, Connection cn, string ControlKey, string Action, string Category)
    {
        // 1) Admin / per-user cache (hanh vi cu, khong doi).
        bool Admin = false;
        string isAdmin = SS.GetString("Admin")!;
        if (!string.IsNullOrEmpty(isAdmin)) bool.TryParse(isAdmin, out Admin);
        if (Admin) return true;

        Dictionary<string, DataTable>? cacheQuyen = null;
        if (cache.TryGetValue("GLOBAL_DT", out cacheQuyen) && cacheQuyen != null)
        {
            string sid = SS.GetString("ID") ?? "";
            if (!string.IsNullOrEmpty(sid) && cacheQuyen.ContainsKey(sid))
            {
                DataTable dtQuyen = cacheQuyen[sid];
                if (dtQuyen != null && dtQuyen.Rows.Count > 0)
                {
                    int idUser = 0; int.TryParse(SS.GetString("ID"), out idUser);
                    string filter = $"IDUser = {idUser} And GroupKey='{EscapeFilterValue(Category)}' And ControlKey = '{EscapeFilterValue(ControlKey)}' And Action = '{EscapeFilterValue(Action)}'";
                    if (dtQuyen.Select(filter).Length > 0) return true;
                }
            }
        }

        // 2) RBAC (fail-open ben trong PermissionService).
        try
        {
            string username = SS.GetString("TenDangNhap") ?? "";
            if (string.IsNullOrEmpty(username)) return false;
            var ps = new PermissionService(cn);
            return ps.Has(username, Category, ControlKey, Action);
        }
        catch
        {
            // Loi tra cuu RBAC -> khong chan (fail-open) de tranh khoa nham user.
            return true;
        }
    }
    public List<string> GetTables(string query)
    {
        var tables = new List<string>();
        var matches = Regex.Matches(query,
            @"\bFROM\s+([a-zA-Z0-9_\.\[\]]+)|\bJOIN\s+([a-zA-Z0-9_\.\[\]]+)",
            RegexOptions.IgnoreCase);
        foreach (Match match in matches)
        {
            if (match.Groups[1].Success)
                tables.Add(match.Groups[1].Value);
            if (match.Groups[2].Success)
                tables.Add(match.Groups[2].Value);
        }
        return tables.Distinct().ToList();
    }
    #region SQL safety helpers
    // Kiểm tra một định danh (tên bảng/cột) hợp lệ: chỉ cho phép chữ, số, gạch dưới.
    // Dùng để chặn SQL injection ở những chỗ buộc phải nối tên đối tượng vào câu lệnh
    // (không thể tham số hóa tên bảng/cột bằng SqlParameter).
    public static bool IsValidIdentifier(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        return Regex.IsMatch(name, @"^[A-Za-z_][A-Za-z0-9_]*$");
    }
    // Cho phép tên có schema: dbo.Bang hoặc Bang.
    public static bool IsValidQualifiedName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        return Regex.IsMatch(name, @"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$");
    }
    // Bọc định danh đã được kiểm tra trong dấu ngoặc vuông an toàn ([Bang]).
    public static string QuoteIdent(string name)
    {
        var parts = (name ?? "").Split('.');
        return string.Join(".", parts.Select(p => "[" + p.Replace("]", "]]") + "]"));
    }
    // Escape một giá trị chuỗi để nhúng vào literal SQL ('...') khi không thể tham số hóa.
    public static string EscapeSqlLiteral(string? s)
    {
        return (s ?? "").Replace("'", "''");
    }
    // Escape giá trị dùng trong DataTable.Select / RowFilter để tránh injection biểu thức.
    public static string EscapeFilterValue(string? s)
    {
        return (s ?? "").Replace("'", "''");
    }
    #endregion
}
