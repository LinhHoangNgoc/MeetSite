using Microsoft.AspNetCore.DataProtection;
using Microsoft.CodeAnalysis.RulesetToEditorconfig;
using Microsoft.Extensions.FileProviders;
using System;
using System.IO;
using System.Reflection;
using DinkToPdf;
using DinkToPdf.Contracts;
//Build WebApplication
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<GlobalCacheService>();
builder.Services.AddDistributedMemoryCache();
// Cố định khóa Data Protection ra ĐĨA. Mặc định khóa lưu RAM/ephemeral -> mỗi lần service restart đổi khóa,
// làm cookie phiên cũ KHÔNG giải mã được -> người dùng bị bắt đăng nhập lại. Lưu cố định để phiên sống qua restart.
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "dpkeys")))
    .SetApplicationName("wdsite");
//Session configuration
builder.Services.AddSession(options =>
{
    // Cho phép phiên sống TỐI ĐA 1 năm (server). Thời lượng THỰC TẾ do từng MÁY tự cấu hình
    // ở client (localStorage) và client tự đăng xuất khi quá hạn user chọn. Cookie persistent
    // (Cookie.MaxAge) để phiên sống qua việc đóng/mở lại trình duyệt thay vì bắt đăng nhập lại.
    options.IdleTimeout = TimeSpan.FromDays(365);
    options.Cookie.MaxAge = TimeSpan.FromDays(365);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    // Bật cờ bảo mật cho cookie phiên.
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = SameSiteMode.Lax;
});
//DinkToPdf configuration
builder.Services.AddSingleton(typeof(IConverter), new SynchronizedConverter(new PdfTools()));
//Add MVC with global filter
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add<CheckLoginFilter>();
});
//Add Sys and Connection services
builder.Services.AddScoped<Sys>();
builder.Services.AddScoped<Connection>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var connStr = config.GetConnectionString("DefaultConnection");
    return new Connection(connStr!);
});
//Load modules and configure static file providers
var mvc = builder.Services.AddControllersWithViews();
ModuleManager.Load(mvc);
//Register background services declared inside modules (e.g. UIThongKeAI schema watcher)
foreach (var moduleAsm in ModuleManager.Assemblies.Values)
{
    try
    {
        foreach (var svcType in moduleAsm.GetTypes()
                     .Where(t => !t.IsAbstract && !t.IsInterface && typeof(IHostedService).IsAssignableFrom(t)))
            builder.Services.AddSingleton(typeof(IHostedService), svcType);
    }
    catch (ReflectionTypeLoadException)
    {
        // Module thiếu dependency phụ: bỏ qua, không chặn app khởi động.
    }
}
//Build the app and configure middleware
var app = builder.Build();
//Configure static file providers for each module
foreach (var dItem in ModuleManager.Assemblies)
{
    Assembly item = dItem.Value;
    var moduleName = item.GetName().Name;
    var ns = moduleName + ".wwwroot";
    IFileProvider provider;
    if (app.Environment.IsDevelopment())
    {
        string dir = Directory.GetCurrentDirectory();
        DirectoryInfo dicInfor = new DirectoryInfo(dir);
        dicInfor = dicInfor.Parent!.Parent!;
        string[] dictList = Directory.GetDirectories(dicInfor.FullName);
        string pathPhysical = "";
        string modName = moduleName!;
        foreach (var dirModule in dictList)
        {
            if (Directory.Exists(dirModule + "\\" + modName))
            {
                pathPhysical = dirModule + "\\" + modName;
                break;
            }
            if (Directory.Exists(dirModule + "\\" + modName.Replace("UI", "")))
            {
                pathPhysical = dirModule + "\\" + modName;
                break;
            }
        }
        if (!string.IsNullOrEmpty(pathPhysical))
        {
            var path = Path.Combine(
                pathPhysical,
                "wwwroot"
            );
            if (Directory.Exists(path))
            {
                provider = new PhysicalFileProvider(path);
            }
            else
            {
                provider = new EmbeddedFileProvider(item, ns);
            }
        }
        else
        {
            provider = new EmbeddedFileProvider(item, ns);
        }
    }
    else
    {
        provider = new EmbeddedFileProvider(item, ns);
    }
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = provider
    });
}
// ===== MeetSite: TỰ KHỞI TẠO database + schema lúc chạy (thay luồng RegisterDb/Update đã bỏ) =====
// 1) Tạo database MeetDB nếu chưa tồn tại (kết nối master). 2) Tạo bảng hệ thống + seed admin.
// 3) Chạy schema *.Struct.Schema/Stored.*.sql nhúng trong từng module DLL. Toàn bộ idempotent.
try
{
    var defConn = builder.Configuration.GetConnectionString("DefaultConnection")!;
    var dbMatch = System.Text.RegularExpressions.Regex.Match(defConn, @"Initial Catalog=([^;]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    string dbName = dbMatch.Success ? dbMatch.Groups[1].Value.Trim() : "MeetDB";
    var masterConnStr = System.Text.RegularExpressions.Regex.Replace(defConn, @"Initial Catalog=[^;]+", "Initial Catalog=master", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    string mInit = "";
    var masterCn = new Connection(masterConnStr);
    masterCn.ThucThiSQL($"If DB_ID('{dbName}') Is Null Create Database [{dbName}]", ref mInit);

    var initCn = new Connection(defConn);
    var initSys = new Sys();
    initSys.InitSqlStructSystem(initCn, "admin", "admin@123"); // bảng hệ thống + seed user admin/admin@123
    // ===== RBAC core (phân quyền chi tiết) + proc spQuyenNguoiDung (login gọi) =====
    string mr = "";
    initCn.ThucThiSQL(@"
If Not Exists(Select 1 From sys.tables Where name='DmVaiTro')
 Create Table DmVaiTro(ID Int Not Null Primary Key, MaVaiTro nVarchar(100), TenVaiTro nVarchar(250), GhiChu nVarchar(500), Active Bit);
If Not Exists(Select 1 From sys.tables Where name='VaiTro_Quyen')
 Create Table VaiTro_Quyen(ID Int Not Null Primary Key, IDVaiTro Int, GroupKey nVarchar(500), ControlKey nVarchar(500), Action nVarchar(500));
If Not Exists(Select 1 From sys.tables Where name='NguoiDung_VaiTro')
 Create Table NguoiDung_VaiTro(ID Int Not Null Primary Key, IDVaiTro Int, Username nVarchar(250));
If Not Exists(Select 1 From sys.tables Where name='DmChucNang')
 Create Table DmChucNang(ID Int Not Null Primary Key, GroupKey nVarchar(500), ControlKey nVarchar(500), TenChucNang nVarchar(500), iOrder Int);", ref mr);
    // Proc trả quyền hiệu lực của user (union các vai trò) — login cache vào GLOBAL_DT; CheckLoginFilter dùng PermissionService.
    initCn.ThucThiSQL(@"Create Or Alter Procedure spQuyenNguoiDung @ID Int As
Begin
  Set NoCount On;
  Select Distinct q.GroupKey, q.ControlKey, q.Action
  From ListUser u
  Join NguoiDung_VaiTro nv On nv.Username = u.TenDangNhap
  Join VaiTro_Quyen q On q.IDVaiTro = nv.IDVaiTro
  Join DmVaiTro v On v.ID = nv.IDVaiTro And IsNull(v.Active,1)=1
  Where u.ID = @ID;
End", ref mr);
    foreach (var asm in ModuleManager.Assemblies.Values)
    {
        try { initSys.RunSqlStruct(asm, initCn); } catch { /* lỗi schema 1 module không chặn app */ }
    }
    string m2 = "";
    initCn.RunSqlByParam("Update ListUser Set DefUrl='/' Where TenDangNhap='admin' And (DefUrl Is Null Or DefUrl='' Or DefUrl='/Dashboard')", ref m2);
}
catch (Exception ex) { Console.WriteLine("[MeetSite Init] " + ex.Message); }

//Configure error handling, HTTPS, routing, session, and authorization
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseSession();
// "Nhớ đăng nhập qua restart/đóng trình duyệt": session lưu RAM nên restart là mất. Sao lưu toàn bộ phiên
// vào COOKIE BỀN (mã hóa bằng Data Protection cố định) và TỰ KHÔI PHỤC khi session trống mà cookie còn hiệu lực.
app.Use(async (ctx, next) =>
{
    try
    {
        if (ctx.Request.Path.StartsWithSegments("/Login/Logout"))
        {
            // Đăng xuất: xóa cookie bền để KHÔNG tự khôi phục lại.
            ctx.Response.Cookies.Delete("wd_auth", new CookieOptions { Path = "/" });
        }
        else
        {
            await ctx.Session.LoadAsync();
            var sess = ctx.Session;
            var prot = ctx.RequestServices
                .GetRequiredService<Microsoft.AspNetCore.DataProtection.IDataProtectionProvider>()
                .CreateProtector("wd_auth_v1");
            bool loggedIn = !string.IsNullOrEmpty(sess.GetString("TenDangNhap"));
            if (!loggedIn && ctx.Request.Cookies.TryGetValue("wd_auth", out var enc) && !string.IsNullOrEmpty(enc))
            {
                try
                {
                    var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(prot.Unprotect(enc));
                    if (dict != null) foreach (var kv in dict) sess.Set(kv.Key, Convert.FromBase64String(kv.Value));
                    loggedIn = !string.IsNullOrEmpty(sess.GetString("TenDangNhap"));
                }
                catch { ctx.Response.Cookies.Delete("wd_auth", new CookieOptions { Path = "/" }); }
            }
            if (loggedIn)
            {
                var dict = new Dictionary<string, string>();
                foreach (var k in sess.Keys)
                    if (sess.TryGetValue(k, out var bytes) && bytes != null) dict[k] = Convert.ToBase64String(bytes);
                var payload = System.Text.Json.JsonSerializer.Serialize(dict);
                if (payload.Length < 3200) // tránh vượt giới hạn cookie ~4KB
                    ctx.Response.Cookies.Append("wd_auth", prot.Protect(payload),
                        new CookieOptions { MaxAge = TimeSpan.FromDays(365), HttpOnly = true, IsEssential = true, SameSite = SameSiteMode.Lax, Path = "/" });
            }
        }
    }
    catch { }
    await next();
});
app.UseAuthorization();
//Configure endpoints for controllers and default route
app.MapControllers();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.Run();
