namespace UIHoiNghi;

/// <summary>Kết quả gửi 1 tin.</summary>
public record SendResult(bool Ok, string Code, string Error);

/// <summary>
/// Cổng gửi tin (SMS / Zalo). Hiện dùng provider GIẢ LẬP (mock) — chỉ ghi log & trạng thái vào DB.
/// Cắm provider thật về sau: implement interface này và đăng ký theo Kenh.
/// </summary>
public interface IMeetSender
{
    int Kenh { get; }                 // 1 = SMS, 2 = Zalo, 3 = Email
    SendResult Send(string target, string content);   // target = số ĐT (SMS/Zalo) hoặc email
}

/// <summary>Mock SMS — tỉ lệ thành công ~93%, sinh mã phản hồi giả.</summary>
public class MockSmsSender : IMeetSender
{
    public int Kenh => 1;
    public SendResult Send(string phone, string content)
    {
        if (string.IsNullOrWhiteSpace(phone)) return new SendResult(false, "", "Thiếu số điện thoại");
        bool ok = Random.Shared.Next(100) < 93;
        return ok
            ? new SendResult(true, "SMS-" + Random.Shared.Next(100000, 999999), "")
            : new SendResult(false, "", "Thuê bao không tồn tại / gửi thất bại (mock)");
    }
}

/// <summary>Mock Zalo OA — tỉ lệ thành công ~90% (yêu cầu user đã quan tâm OA).</summary>
public class MockZaloSender : IMeetSender
{
    public int Kenh => 2;
    public SendResult Send(string phone, string content)
    {
        if (string.IsNullOrWhiteSpace(phone)) return new SendResult(false, "", "Thiếu số điện thoại");
        bool ok = Random.Shared.Next(100) < 90;
        return ok
            ? new SendResult(true, "ZALO-" + Random.Shared.Next(100000, 999999), "")
            : new SendResult(false, "", "Người dùng chưa quan tâm OA (mock)");
    }
}

/// <summary>Mock Email — tỉ lệ thành công ~96%; target là địa chỉ email.</summary>
public class MockEmailSender : IMeetSender
{
    public int Kenh => 3;
    public SendResult Send(string target, string content)
    {
        if (string.IsNullOrWhiteSpace(target) || !target.Contains('@'))
            return new SendResult(false, "", "Thiếu / sai địa chỉ email");
        bool ok = Random.Shared.Next(100) < 96;
        return ok
            ? new SendResult(true, "MAIL-" + Random.Shared.Next(100000, 999999), "")
            : new SendResult(false, "", "Hộp thư từ chối / rơi spam (mock)");
    }
}

public static class MeetSenderFactory
{
    public static IMeetSender Get(int kenh) => kenh switch
    {
        2 => new MockZaloSender(),
        3 => new MockEmailSender(),
        _ => new MockSmsSender()
    };
    public static string TenKenh(int kenh) => kenh switch { 2 => "Zalo OA", 3 => "Email", _ => "SMS" };
}
