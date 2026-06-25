using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Đăng ký phiên trực tuyến (presence) trong bộ nhớ, an toàn đa luồng.
/// Theo dõi user đang đăng nhập: IP, máy/host, thời điểm đăng nhập và lần hoạt động gần nhất.
/// Lưu trong RAM (ConcurrentDictionary) nên reset khi restart app - chấp nhận được cho mục đích hiển thị "đang online".
/// </summary>
public static class PresenceRegistry
{
    /// <summary>Số phút coi là "đang online" tính từ lần hoạt động gần nhất.</summary>
    public const int OnlineWindowMinutes = 5;

    public class PresenceInfo
    {
        public string TenDangNhap { get; set; } = "";
        public string HoTen { get; set; } = "";
        public string Ip { get; set; } = "";
        public string Machine { get; set; } = "";
        public string SessionId { get; set; } = "";
        public DateTime LoginTime { get; set; }
        public DateTime LastActivity { get; set; }
    }

    // Key = TenDangNhap + "::" + (SessionId hoặc IP) => MỖI THIẾT BỊ/PHIÊN 1 bản ghi.
    // Nhờ vậy 1 user đăng nhập từ 2 máy sẽ hiện 2 dòng (trước đây key theo mình TenDangNhap nên bị gộp,
    // máy sau ghi đè máy trước -> chỉ thấy 1).
    private static readonly ConcurrentDictionary<string, PresenceInfo> _store =
        new ConcurrentDictionary<string, PresenceInfo>(StringComparer.OrdinalIgnoreCase);

    private const string KeySep = "::";
    private static string MakeKey(string ten, string deviceId) => (ten ?? "") + KeySep + (deviceId ?? "");

    // Cache reverse-DNS theo IP để không tra cứu DNS lại mỗi request (CheckLoginFilter chạy mỗi request).
    private static readonly ConcurrentDictionary<string, string> _machineCache =
        new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Cập nhật presence cho 1 request đã xác thực. Gọi từ CheckLoginFilter mỗi request có session.
    /// Mỗi PHIÊN (browser/thiết bị) là 1 bản ghi riêng -> 1 user nhiều máy hiện nhiều dòng.
    /// </summary>
    public static void Touch(HttpContext context, string tenDangNhap, string hoTen)
    {
        if (string.IsNullOrEmpty(tenDangNhap)) return;
        string ip = GetClientIp(context);
        string machine = ResolveMachine(ip);
        // Định danh thiết bị/phiên: ưu tiên SessionId (phân biệt 2 máy dù chung IP gateway);
        // nếu không lấy được thì lùi về IP để vẫn tách theo máy.
        string sid = "";
        try { sid = context.Session?.Id ?? ""; } catch { sid = ""; }
        string deviceId = !string.IsNullOrEmpty(sid) ? sid : (!string.IsNullOrEmpty(ip) ? ip : "?");
        string key = MakeKey(tenDangNhap, deviceId);
        var now = DateTime.Now;

        _store.AddOrUpdate(
            key,
            _ => new PresenceInfo
            {
                TenDangNhap = tenDangNhap,
                HoTen = hoTen ?? "",
                Ip = ip,
                Machine = machine,
                SessionId = sid,
                LoginTime = now,
                LastActivity = now
            },
            (_, existing) =>
            {
                existing.HoTen = string.IsNullOrEmpty(hoTen) ? existing.HoTen : hoTen;
                existing.Ip = ip;
                existing.Machine = machine;
                existing.SessionId = sid;
                existing.LastActivity = now;
                return existing;
            });
    }

    /// <summary>Xóa presence khi logout: gỡ TẤT CẢ phiên của user (đơn giản, an toàn).</summary>
    public static void Remove(string tenDangNhap)
    {
        if (string.IsNullOrEmpty(tenDangNhap)) return;
        string prefix = tenDangNhap + KeySep;
        foreach (var kv in _store)
        {
            if (kv.Key.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                _store.TryRemove(kv.Key, out _);
        }
    }

    /// <summary>
    /// Lấy danh sách phiên đang online (hoạt động trong khoảng OnlineWindowMinutes phút gần đây).
    /// Đồng thời dọn các bản ghi quá hạn để tránh phình bộ nhớ.
    /// </summary>
    public static List<PresenceInfo> GetOnline()
    {
        var now = DateTime.Now;
        var cutoff = now.AddMinutes(-OnlineWindowMinutes);
        var list = new List<PresenceInfo>();
        foreach (var kv in _store)
        {
            if (kv.Value.LastActivity >= cutoff)
            {
                list.Add(kv.Value);
            }
            else
            {
                // Dọn rác phiên đã hết hạn.
                _store.TryRemove(kv.Key, out _);
            }
        }
        return list.OrderBy(x => x.TenDangNhap).ThenByDescending(x => x.LastActivity).ToList();
    }

    /// <summary>
    /// Lấy IP client thật. App chạy sau nginx nên RemoteIpAddress thường là 127.0.0.1;
    /// khi đó ưu tiên IP đầu tiên trong header X-Forwarded-For (nginx cần cấu hình
    /// proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;).
    /// </summary>
    public static string GetClientIp(HttpContext context)
    {
        try
        {
            string remote = context.Connection.RemoteIpAddress?.ToString() ?? "";
            // Chuẩn hóa IPv6 loopback.
            if (remote == "::1") remote = "127.0.0.1";

            string forwarded = context.Request.Headers["X-Forwarded-For"].ToString();
            if (!string.IsNullOrWhiteSpace(forwarded))
            {
                // X-Forwarded-For: client, proxy1, proxy2 -> lấy IP đầu tiên (client thật).
                string first = forwarded.Split(',')[0].Trim();
                if (!string.IsNullOrEmpty(first)) return first;
            }

            // Một số cấu hình dùng X-Real-IP.
            string realIp = context.Request.Headers["X-Real-IP"].ToString();
            if (!string.IsNullOrWhiteSpace(realIp)) return realIp.Trim();

            return remote;
        }
        catch
        {
            return "";
        }
    }

    /// <summary>
    /// Cố gắng lấy tên máy qua reverse-DNS của IP. Tra cứu nhanh, timeout ngầm của OS;
    /// nếu thất bại thì để trống (UI hiển thị IP). Không chặn request lâu.
    /// </summary>
    private static string ResolveMachine(string ip)
    {
        if (string.IsNullOrWhiteSpace(ip) || ip == "127.0.0.1") return "";
        // Đã tra cứu IP này rồi -> dùng cache (kể cả kết quả rỗng) để khỏi gọi DNS mỗi request.
        if (_machineCache.TryGetValue(ip, out var cached)) return cached;

        string result = "";
        try
        {
            if (System.Net.IPAddress.TryParse(ip, out var addr))
            {
                var entry = System.Net.Dns.GetHostEntry(addr);
                if (entry != null && !string.IsNullOrEmpty(entry.HostName) && entry.HostName != ip)
                {
                    result = entry.HostName;
                }
            }
        }
        catch
        {
            // Reverse-DNS không khả dụng (máy không đăng ký PTR) - bỏ qua, lưu rỗng vào cache.
        }
        _machineCache[ip] = result;
        return result;
    }
}
