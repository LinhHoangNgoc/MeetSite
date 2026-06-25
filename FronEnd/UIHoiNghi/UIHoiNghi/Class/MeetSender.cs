namespace UIHoiNghi;

/// <summary>Kết quả gửi 1 tin.</summary>
public record SendResult(bool Ok, string Code, string Error);

/// <summary>
/// Cổng gửi tin (SMS / Zalo). Hiện dùng provider GIẢ LẬP (mock) — chỉ ghi log & trạng thái vào DB.
/// Cắm provider thật về sau: implement interface này và đăng ký theo Kenh.
/// </summary>
public interface IMeetSender
{
    int Kenh { get; }                 // 1 = SMS, 2 = Zalo
    SendResult Send(string phone, string content);
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

public static class MeetSenderFactory
{
    public static IMeetSender Get(int kenh) => kenh == 2 ? new MockZaloSender() : new MockSmsSender();
}
