# MeetSite — Hệ thống Quản lý Hội nghị Thông minh (ITKA)

Nền tảng web-desktop ASP.NET Core 8 (module hóa, nạp DLL động) — xây trên bộ khung `BaseCode_NoEJ`,
đã lột bỏ toàn bộ phân hệ ERP, chỉ giữ **vỏ** (login + desktop + taskbar) và bổ sung module
**UIHoiNghi** với 6 nhóm tính năng quản lý hội nghị theo giải pháp ITKA.

## Chạy
```
dotnet build MeetSite.slnx -c Debug
dotnet run --project FronEnd/Site/Site/Site.csproj   # http://localhost:5014
```
- Lần chạy đầu **tự tạo database `MeetDB`** (trên SQL Server cấu hình ở `appsettings.json`),
  tạo bảng hệ thống + RBAC + bảng `Meet_*`, và nạp **dữ liệu test** (1 hội nghị mẫu đầy đủ).
- Đổi máy chủ/CSDL trong `FronEnd/Site/Site/appsettings.json` → `ConnectionStrings:DefaultConnection`.

## Tài khoản
| Tài khoản | Mật khẩu | Vai trò |
|-----------|----------|---------|
| `admin`   | `admin@123` | Quản trị (toàn quyền) |
| `btc`     | `btc@123`   | Ban tổ chức (toàn quyền nghiệp vụ) |
| `kythuat` | `kt@123`    | Kỹ thuật viên (Sơ đồ, Điểm danh) |
| `letan`   | `lt@123`    | Lễ tân đón tiếp (Điểm danh, tra cứu) |

## Tính năng (module UIHoiNghi)
Mỗi tính năng là 1 controller = 1 **GroupKey** để phân quyền chi tiết (Xem/Thêm/Sửa/Xóa).

**Lớp desktop (Ban tổ chức)** — mở qua app "Quản lý Hội nghị" trên desktop:
1. **Hội nghị & Phiên** (`/HoiNghi`) — tạo hội nghị, lịch phiên họp, diễn giả + dashboard tổng quan.
2. **Đại biểu** (`/DaiBieu`) — danh sách, nhóm, nhãn VIP, sinh **QR cá nhân**, nhập nhanh.
3. **Sơ đồ chỗ ngồi** (`/SoDo`) — thiết kế hội trường, **kéo-thả** đại biểu vào ghế, chốt sơ đồ.
4. **Điểm danh** (`/CheckIn`) — thống kê **realtime**, điểm danh thủ công, mở màn Kiosk.
5. **Tin nhắn SMS/Zalo** (`/TinNhan`) — soạn & gửi chiến dịch (**mock** provider), mẫu tin, log.
6. **Tài liệu** (`/TaiLieu`) — upload, phân quyền theo nhóm, chia sẻ QR, đếm lượt xem.
7. **Khảo sát** (`/KhaoSat`) — thiết kế phiếu (thang điểm/lựa chọn/văn bản) + QR.
8. **Báo cáo & KPI** (`/BaoCao`) — biểu đồ tỉ lệ tham dự, tương tác tài liệu, điểm hài lòng.
9. **Phân quyền** (`/PhanQuyen`) — vai trò, ma trận quyền chi tiết, gán vai trò cho người dùng.

**Lớp mobile/kiosk (công khai, xác thực bằng token)** — `/meetpublic/*`, responsive dọc/ngang:
- `Kiosk` — check-in quét QR (BarcodeDetector) + nhập tay, đếm có mặt realtime.
- `DaiBieu?token=` — cổng đại biểu: ghế, trạng thái, tài liệu, khảo sát.
- `KhaoSat?id=&token=` — trả lời khảo sát (sao/radio/checkbox/văn bản).
- `OpenTaiLieu?share=` — xem tài liệu qua QR (ghi nhận lượt xem).

## Kiến trúc
- `DllSupport/System/Support` — thư viện chung (Connection, ModuleLoader, RBAC, CheckLoginFilter).
- `FronEnd/Site/Site` — vỏ desktop (taskbar/cửa sổ), khởi tạo DB lúc chạy (`Program.cs`).
- `FronEnd/UISystem/UILogin` — đăng nhập.
- `FronEnd/UIHoiNghi/UIHoiNghi` — module nghiệp vụ; build PostBuild copy DLL vào `Site/bin/.../Modules`.
- Giao diện dùng bộ **exControl** (Tabulator, Tom-Select, Flatpickr, Jodit, Chart.js, qrcode) + framework `MySystem`.
- Phân quyền: bảng RBAC `DmVaiTro / VaiTro_Quyen / NguoiDung_VaiTro / DmChucNang`, gác server-side ở `CheckLoginFilter` (fail-open).

> **Lưu ý SMS/Zalo:** hiện dùng provider **giả lập** (`Class/MeetSender.cs`, interface `IMeetSender`).
> Cắm provider thật: implement `IMeetSender` và đăng ký theo `Kenh`.
