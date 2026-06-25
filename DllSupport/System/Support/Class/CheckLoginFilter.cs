using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Linq;

public class CheckLoginFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var session = context.HttpContext.Session;
        bool Admin = false;
        string isAdmin = session.GetString("Admin")!;
        if (!string.IsNullOrEmpty(isAdmin))
        {
            bool.TryParse(isAdmin, out Admin);
        }
        var tenDangNhap = session.GetString("TenDangNhap");
        var controller = context.RouteData.Values["controller"]?.ToString().ToLower();
        var action = context.RouteData.Values["action"]?.ToString().ToLower();
        var param = context.RouteData.Values["params"]?.ToString().ToLower();
        var isAjax = context.HttpContext.Request.Headers["X-Requested-With"] == "XMLHttpRequest";
        if (controller == "login" || controller == "home" || controller == "update" || controller == "registerdb")
            return;
        // MeetSite: lớp công khai cho mobile/kiosk (check-in QR, cổng đại biểu, khảo sát, xem tài liệu).
        // Controller tự xác thực bằng token cá nhân -> cho ẩn danh để chạy ngoài shell, không cần login desktop.
        if (controller == "meetpublic")
            return;
        // OnlyOffice Document Server gọi 2 route này từ container (KHÔNG có session người dùng):
        // VanPhong/Api/Download (tải tệp về để soạn) và VanPhong/Api/Callback (lưu sau khi sửa).
        // Cho ẩn danh để không bị 302 về trang đăng nhập. Bản thân controller tự xác thực bằng
        // JWT/HMAC nên an toàn. KHÔNG ảnh hưởng các route khác của module Văn phòng.
        // viewpublic + publiceditorconfig: link chia sẻ CÔNG KHAI (không cần login), controller tự kiểm token + cờ Congkhai.
        if (controller == "vanphong" && (action == "download" || action == "callback" || action == "viewpublic" || action == "publiceditorconfig"))
            return;
        // Trang giới thiệu công ty (Website builder) CÔNG KHAI — render server-side, không cần đăng nhập.
        if (controller == "website" && action == "trang")
            return;
        if (controller=="danhmuc" && action =="danhmucchung" && param=="tablename/listuser")
        {
            if (!Admin)
            {
                context.Result = new RedirectToActionResult("Index", "Login", null);
                return;
            }
        }
        if (string.IsNullOrEmpty(tenDangNhap))
        {
            if (isAjax)
            {
                context.Result = new JsonResult(new
                {
                    code = 1,
                    message = "Chưa đăng nhập",
                    data = (object)null
                });
            }
            else
            {
                context.Result = new RedirectToActionResult("Index", "Login", null);
            }
            return;
        }

        // Đã xác thực: cập nhật presence (đang online + IP/máy).
        PresenceRegistry.Touch(context.HttpContext, tenDangNhap, session.GetString("HoTen") ?? "");

        // ===== Gác RBAC server-side (mirror việc ẩn module ở client) — FAIL-OPEN tuyệt đối =====
        // Chỉ chặn khi: user KHÔNG phải admin, controller là 1 module CÓ trong catalog quyền
        // (đã được cấu hình quyền cho vai trò nào đó), NHƯNG user không được cấp module đó.
        // Catalog rỗng / chưa gán vai trò / admin / lỗi bất kỳ -> cho qua (không khóa người đang dùng).
        try
        {
            if (!Admin && !string.IsNullOrEmpty(controller))
            {
                var cn = context.HttpContext.RequestServices.GetService(typeof(Connection)) as Connection;
                if (cn != null)
                {
                    var perm = new PermissionService(cn);
                    var eff = perm.GetEffective(tenDangNhap);
                    if (!eff.IsAdmin) // eff.IsAdmin cũng = true khi fail-open (chưa có RBAC / chưa gán vai trò)
                    {
                        var gated = perm.GetGatedGroups(); // HashSet OrdinalIgnoreCase
                        bool isGated = gated.Contains(controller);
                        bool allowed = eff.AllowedGroups.Any(g =>
                            string.Equals(g, controller, System.StringComparison.OrdinalIgnoreCase));
                        if (isGated && !allowed)
                        {
                            if (isAjax)
                            {
                                context.Result = new JsonResult(new
                                {
                                    code = 1,
                                    message = "Bạn không có quyền truy cập chức năng này.",
                                    data = (object)null
                                });
                            }
                            else
                            {
                                context.Result = new ContentResult
                                {
                                    StatusCode = 403,
                                    ContentType = "text/html; charset=utf-8",
                                    Content = "<div style='font-family:Segoe UI,Roboto,sans-serif;padding:48px;text-align:center;color:#b4231f'>"
                                            + "<h3 style='margin:0 0 8px'>Không có quyền truy cập</h3>"
                                            + "<p style='color:#5b6b81'>Bạn chưa được phân quyền cho chức năng này. Vui lòng liên hệ quản trị viên.</p></div>"
                                };
                            }
                            return;
                        }

                        // ===== Gác ACTION-level (Xem/Them/Sua/Xoa) — FAIL-OPEN tuyệt đối =====
                        // Chỉ chạy khi module đã được phép (allowed) và bị RBAC quản lý.
                        // Map tên action method -> hành động. Chỉ chặn khi user CÓ cấu hình quyền chi tiết
                        // cho group này (Perms có >=1 dòng GroupKey==group) NHƯNG KHÔNG có dòng nào khớp hành động.
                        // Nếu group không có dòng Perms nào (chỉ ở mức nhóm) -> CHO QUA. Mọi lỗi -> cho qua.
                        // GET "Xem" gần như không bao giờ bị chặn (mặc định map về "Xem").
                        if (allowed && isGated && !string.IsNullOrEmpty(action))
                        {
                            // Có cấu hình quyền chi tiết cho group này không?
                            bool hasGroupPerms = eff.Perms.Any(p =>
                                string.Equals(p.GroupKey, controller, System.StringComparison.OrdinalIgnoreCase));
                            if (hasGroupPerms)
                            {
                                string a = action; // đã ToLower ở trên
                                bool HasAct(string act) => eff.Perms.Any(p =>
                                    string.Equals(p.GroupKey, controller, System.StringComparison.OrdinalIgnoreCase) &&
                                    string.Equals(p.Action, act, System.StringComparison.OrdinalIgnoreCase));

                                bool blocked = false;
                                if (a.Contains("xoa") || a.Contains("delete") || a.Contains("remove"))
                                {
                                    blocked = !HasAct("Xoa");
                                }
                                else if (a.Contains("them") || a.Contains("themmoi") || a.Contains("add")
                                         || a.Contains("insert") || a.Contains("create"))
                                {
                                    blocked = !HasAct("Them");
                                }
                                else if (a.Contains("sua") || a.Contains("update") || a.Contains("edit"))
                                {
                                    blocked = !HasAct("Sua");
                                }
                                else if (a.Contains("save") || a.Contains("luu"))
                                {
                                    // Lưu = Thêm HOẶC Sửa: cho qua nếu có 1 trong 2.
                                    blocked = !(HasAct("Them") || HasAct("Sua"));
                                }
                                else
                                {
                                    // get/list/load/index... -> "Xem". Chỉ chặn nếu chắc chắn không có "Xem".
                                    blocked = !HasAct("Xem");
                                }

                                if (blocked)
                                {
                                    if (isAjax)
                                    {
                                        context.Result = new JsonResult(new
                                        {
                                            code = 1,
                                            message = "Bạn không có quyền thực hiện thao tác này.",
                                            data = (object)null
                                        });
                                    }
                                    else
                                    {
                                        context.Result = new ContentResult
                                        {
                                            StatusCode = 403,
                                            ContentType = "text/html; charset=utf-8",
                                            Content = "<div style='font-family:Segoe UI,Roboto,sans-serif;padding:48px;text-align:center;color:#b4231f'>"
                                                    + "<h3 style='margin:0 0 8px'>Không đủ quyền thao tác</h3>"
                                                    + "<p style='color:#5b6b81'>Bạn không được phép thực hiện thao tác này. Vui lòng liên hệ quản trị viên.</p></div>"
                                        };
                                    }
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        catch { /* fail-open: bất kỳ lỗi nào cũng cho qua, không khóa người dùng */ }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
    }
}