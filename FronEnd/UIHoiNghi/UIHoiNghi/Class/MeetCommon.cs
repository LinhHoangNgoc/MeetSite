using Microsoft.AspNetCore.Http;

namespace UIHoiNghi;

/// <summary>Một mục điều hướng (menu ngang trong header workspace).</summary>
public class MeetNavItem
{
    public string Key { get; set; } = "";
    public string Route { get; set; } = "";
    public string Icon { get; set; } = "";
    public string Title { get; set; } = "";
    public string Group { get; set; } = "";   // = controller (GroupKey) để gác RBAC
    public string Cat { get; set; } = "";      // nhóm menu ngang ("" = mục cấp 1 không dropdown)
    public bool AdminOnly { get; set; } = false;
}

public static class MeetNav
{
    // Mỗi nhóm nghiệp vụ = 1 controller = 1 GroupKey. Cat = nhóm trên menu ngang.
    public static readonly List<MeetNavItem> Items = new()
    {
        new() { Key="home",      Route="/HoiNghi/TongQuan",  Icon="fa-gauge-high",            Title="Tổng quan",        Group="HoiNghi", Cat="" },
        new() { Key="hoinghi",   Route="/HoiNghi/DanhSach",  Icon="fa-calendar-star",         Title="Hội nghị & Phiên", Group="HoiNghi", Cat="Tổ chức" },
        new() { Key="phancong",  Route="/PhanCong",         Icon="fa-list-check",            Title="Phân công nhiệm vụ",Group="PhanCong",Cat="Tổ chức" },
        new() { Key="daibieu",   Route="/DaiBieu",          Icon="fa-user-group",            Title="Đại biểu",         Group="DaiBieu", Cat="Tổ chức" },
        new() { Key="sodo",      Route="/SoDo",             Icon="fa-chair",                 Title="Sơ đồ chỗ ngồi",   Group="SoDo",    Cat="Tổ chức" },
        new() { Key="thumoi",    Route="/ThuMoi",           Icon="fa-envelope-open-text",    Title="Thư mời hội nghị", Group="ThuMoi",  Cat="Tổ chức" },
        new() { Key="checkin",   Route="/CheckIn",          Icon="fa-qrcode",                Title="Điểm danh",        Group="CheckIn", Cat="Vận hành" },
        new() { Key="tinnhan",   Route="/TinNhan",          Icon="fa-comment-sms",           Title="Tin nhắn SMS/Zalo",Group="TinNhan", Cat="Vận hành" },
        new() { Key="tailieu",   Route="/TaiLieu",          Icon="fa-folder-open",           Title="Tài liệu",         Group="TaiLieu", Cat="Vận hành" },
        new() { Key="khaosat",   Route="/KhaoSat",          Icon="fa-square-poll-vertical",  Title="Khảo sát",         Group="KhaoSat", Cat="Đánh giá" },
        new() { Key="baocao",    Route="/BaoCao",           Icon="fa-chart-pie",             Title="Báo cáo & KPI",    Group="BaoCao",  Cat="Đánh giá" },
        new() { Key="phanquyen", Route="/PhanQuyen",        Icon="fa-user-shield",           Title="Phân quyền",       Group="PhanQuyen",Cat="Hệ thống", AdminOnly=true },
    };

    // Thứ tự nhóm menu ngang
    public static readonly string[] Cats = { "Tổ chức", "Vận hành", "Đánh giá", "Hệ thống" };
    public static readonly Dictionary<string, string> CatIcon = new()
    {
        ["Tổ chức"] = "fa-sitemap", ["Vận hành"] = "fa-gears", ["Đánh giá"] = "fa-chart-line", ["Hệ thống"] = "fa-gear"
    };

    /// <summary>Các mục người dùng được phép thấy (RBAC, fail-open).</summary>
    public static List<MeetNavItem> Visible(HttpContext ctx, Connection cn)
    {
        var user = ctx.Session.GetString("TenDangNhap") ?? "";
        var perm = new PermissionService(cn);
        bool isAdmin = false;
        try { isAdmin = perm.IsAdmin(user); } catch { }
        if (isAdmin) return Items;
        var eff = perm.GetEffective(user);
        if (eff.IsAdmin) return Items.FindAll(i => !i.AdminOnly); // fail-open
        var gated = perm.GetGatedGroups();
        var allowed = new HashSet<string>(eff.AllowedGroups, StringComparer.OrdinalIgnoreCase);
        return Items.FindAll(i => !i.AdminOnly && (!gated.Contains(i.Group) || allowed.Contains(i.Group)));
    }
}
