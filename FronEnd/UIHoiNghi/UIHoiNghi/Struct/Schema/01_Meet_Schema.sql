-- ============================================================
-- HỆ THỐNG QUẢN LÝ HỘI NGHỊ THÔNG MINH (ITKA) — schema bảng Meet_*
-- Idempotent: If Not Exists ... Create Table. PK Int (sinh mã qua SinhMa).
-- ============================================================

-- ===== TN1: Hội nghị / Địa điểm / Phòng / Phiên / Diễn giả =====
If Not Exists(Select 1 From sys.tables Where name='Meet_DiaDiem')
Create Table Meet_DiaDiem(
    ID Int Not Null Primary Key,
    TenDiaDiem nVarchar(300), DiaChi nVarchar(500), GhiChu nVarchar(500)
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_PhongHop')
Create Table Meet_PhongHop(
    ID Int Not Null Primary Key,
    IDDiaDiem Int, TenPhong nVarchar(200), SucChua Int, GhiChu nVarchar(500)
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_HoiNghi')
Create Table Meet_HoiNghi(
    ID Int Not Null Primary Key,
    MaHoiNghi nVarchar(50), TenHoiNghi nVarchar(500), MoTa nVarchar(max),
    NgayBatDau DateTime, NgayKetThuc DateTime,
    IDDiaDiem Int, DonViToChuc nVarchar(300),
    TrangThai Int Default(0),   -- 0 nháp, 1 mở đăng ký, 2 đang diễn ra, 3 đã đóng/chốt
    AnhBia nVarchar(500), NguoiTao nVarchar(100), NgayTao DateTime
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_Phien')
Create Table Meet_Phien(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, TenPhien nVarchar(500), MoTa nVarchar(max),
    IDPhongHop Int, ThoiGianBatDau DateTime, ThoiGianKetThuc DateTime,
    ThuTu Int, TrangThai Int Default(0),
    NguoiTao nVarchar(100), NgayTao DateTime
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_DienGia')
Create Table Meet_DienGia(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, HoTen nVarchar(300), ChucDanh nVarchar(300), DonVi nVarchar(300),
    Email nVarchar(200), DienThoai nVarchar(50), Anh nVarchar(500), TieuSu nVarchar(max)
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_PhienDienGia')
Create Table Meet_PhienDienGia(
    ID Int Not Null Primary Key,
    IDPhien Int, IDDienGia Int, VaiTro nVarchar(100)   -- chủ tọa / diễn giả / điều phối
)
GO

-- ===== TN2: Nhóm đại biểu / Đại biểu / Sơ đồ / Ghế =====
If Not Exists(Select 1 From sys.tables Where name='Meet_NhomDaiBieu')
Create Table Meet_NhomDaiBieu(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, TenNhom nVarchar(200), MauSac nVarchar(20), GhiChu nVarchar(300)
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_DaiBieu')
Create Table Meet_DaiBieu(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, MaDaiBieu nVarchar(50), HoTen nVarchar(300),
    ChucDanh nVarchar(300), DonVi nVarchar(300), Email nVarchar(200), DienThoai nVarchar(50),
    IDNhom Int, LaVIP Bit Default(0), QRToken nVarchar(100),
    TrangThaiDangKy Int Default(1),  -- 0 mời, 1 xác nhận, 2 hủy
    NguoiTao nVarchar(100), NgayTao DateTime
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_SoDo')
Create Table Meet_SoDo(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, IDPhongHop Int, TenSoDo nVarchar(200),
    LayoutJson nVarchar(max),   -- cấu hình khối/sân khấu/nhãn
    RongCanvas Int Default(1000), CaoCanvas Int Default(640),
    DaChot Bit Default(0), NgayChot DateTime, NguoiSua nVarchar(100), NgaySua DateTime
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_Ghe')
Create Table Meet_Ghe(
    ID Int Not Null Primary Key,
    IDSoDo Int, MaGhe nVarchar(50), Hang nVarchar(20), Cot Int,
    ToaDoX Int, ToaDoY Int,
    LoaiGhe Int Default(0),    -- 0 thường, 1 VIP, 2 dự phòng
    IDDaiBieu Int Null, GhiChu nVarchar(200)
)
GO

-- ===== TN3: Kiosk / Check-in =====
If Not Exists(Select 1 From sys.tables Where name='Meet_Kiosk')
Create Table Meet_Kiosk(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, TenKiosk nVarchar(200), ViTri nVarchar(200), KichHoat Bit Default(1)
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_CheckIn')
Create Table Meet_CheckIn(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, IDPhien Int Null, IDDaiBieu Int,
    ThoiGianCheckIn DateTime, PhuongThuc Int Default(1),  -- 1 QR, 2 NFC, 3 khuôn mặt, 4 thủ công
    IDKiosk nVarchar(100), GhiChu nVarchar(300)
)
GO

-- ===== TN4: SMS / Zalo (mock) =====
If Not Exists(Select 1 From sys.tables Where name='Meet_MauTin')
Create Table Meet_MauTin(
    ID Int Not Null Primary Key,
    IDHoiNghi Int Null, TenMau nVarchar(200), Kenh Int Default(1),  -- 1 SMS, 2 Zalo
    NoiDung nVarchar(max)
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_ChienDich')
Create Table Meet_ChienDich(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, TieuDe nVarchar(300), Kenh Int Default(1), IDMauTin Int Null,
    NoiDung nVarchar(max), PhamVi Int Default(1), IDNhom Int Null,  -- 1 tất cả, 2 theo nhóm, 3 VIP
    TrangThai Int Default(0), TongSo Int Default(0), SoThanhCong Int Default(0), SoThatBai Int Default(0),
    NguoiTao nVarchar(100), NgayTao DateTime, NgayGui DateTime
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_TinNhan')
Create Table Meet_TinNhan(
    ID Int Not Null Primary Key,
    IDChienDich Int, IDDaiBieu Int, Kenh Int, SoDienThoai nVarchar(50),
    NoiDung nVarchar(max), TrangThai Int Default(0),  -- 0 chờ, 1 thành công, 2 thất bại
    MaPhanHoiMock nVarchar(100), ThoiGianGui DateTime, LoiMock nVarchar(300)
)
GO

-- ===== TN5: Tài liệu =====
If Not Exists(Select 1 From sys.tables Where name='Meet_TaiLieu')
Create Table Meet_TaiLieu(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, IDPhien Int Null, TenTaiLieu nVarchar(300),
    TenFileGoc nVarchar(300), DuongDan nVarchar(500), KichThuoc BigInt, LoaiFile nVarchar(50),
    PhamViTruyCap Int Default(1),  -- 1 công khai, 2 theo nhóm
    ChiaSeQR Bit Default(1), ShareToken nVarchar(100),
    NguoiTaiLen nVarchar(100), NgayTaiLen DateTime
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_TaiLieuNhom')
Create Table Meet_TaiLieuNhom(
    ID Int Not Null Primary Key, IDTaiLieu Int, IDNhom Int
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_TaiLieuLuotXem')
Create Table Meet_TaiLieuLuotXem(
    ID Int Not Null Primary Key, IDTaiLieu Int, IDDaiBieu Int Null, ThoiGianXem DateTime, IP nVarchar(50)
)
GO

-- ===== TN6: Khảo sát / KPI =====
If Not Exists(Select 1 From sys.tables Where name='Meet_KhaoSat')
Create Table Meet_KhaoSat(
    ID Int Not Null Primary Key,
    IDHoiNghi Int, IDPhien Int Null, TieuDe nVarchar(300), MoTa nVarchar(max),
    TrangThai Int Default(1), NgayTao DateTime  -- 0 nháp, 1 mở, 2 đóng
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_CauHoi')
Create Table Meet_CauHoi(
    ID Int Not Null Primary Key,
    IDKhaoSat Int, NoiDung nVarchar(500),
    LoaiCauHoi Int Default(1),  -- 1 thang điểm(1-5), 2 một lựa chọn, 3 nhiều lựa chọn, 4 văn bản
    ThuTu Int, BatBuoc Bit Default(0)
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_LuaChon')
Create Table Meet_LuaChon(
    ID Int Not Null Primary Key, IDCauHoi Int, NoiDung nVarchar(300), ThuTu Int
)
GO
If Not Exists(Select 1 From sys.tables Where name='Meet_TraLoi')
Create Table Meet_TraLoi(
    ID Int Not Null Primary Key,
    IDKhaoSat Int, IDCauHoi Int, IDDaiBieu Int Null,
    IDLuaChon Int Null, DiemThang Int Null, NoiDungVanBan nVarchar(max), ThoiGian DateTime
)
GO
