-- ============================================================
-- DỮ LIỆU TEST (chạy 1 lần — guard theo MaHoiNghi='HN-DEMO').
-- Hội nghị mẫu đầy đủ: phiên, diễn giả, nhóm, 20 đại biểu, sơ đồ ghế,
-- check-in, mẫu tin + chiến dịch đã gửi, khảo sát, và 3 user vai trò.
-- ============================================================
If Not Exists(Select 1 From Meet_HoiNghi Where MaHoiNghi = 'HN-DEMO')
Begin
    -- Địa điểm & phòng
    Insert Into Meet_DiaDiem(ID,TenDiaDiem,DiaChi) Values
        (1,N'Trung tâm Hội nghị Quốc gia',N'Số 1 Đại lộ Thăng Long, Hà Nội'),
        (2,N'Khách sạn Grand Plaza',N'117 Trần Duy Hưng, Hà Nội');
    Insert Into Meet_PhongHop(ID,IDDiaDiem,TenPhong,SucChua) Values
        (1,1,N'Hội trường lớn A',500),(2,1,N'Phòng họp B2',120),(3,2,N'Ballroom',300);

    -- Hội nghị
    Insert Into Meet_HoiNghi(ID,MaHoiNghi,TenHoiNghi,MoTa,NgayBatDau,NgayKetThuc,IDDiaDiem,DonViToChuc,TrangThai,NguoiTao,NgayTao) Values
        (1,'HN-DEMO',N'Hội nghị Khách hàng Thường niên ITKA 2026',N'<p>Hội nghị tổng kết và tri ân khách hàng, ra mắt giải pháp số hóa sự kiện.</p>','2026-07-15 08:00','2026-07-15 17:00',1,N'Công ty ITKA',2,'admin',GetDate()),
        (2,'HN-002',N'Hội thảo Chuyển đổi số Doanh nghiệp',N'<p>Chia sẻ kinh nghiệm chuyển đổi số.</p>','2026-08-20 08:30','2026-08-20 12:00',2,N'Công ty ITKA',1,'admin',GetDate());

    -- Phiên (hội nghị 1)
    Insert Into Meet_Phien(ID,IDHoiNghi,TenPhien,MoTa,IDPhongHop,ThoiGianBatDau,ThoiGianKetThuc,ThuTu,TrangThai,NguoiTao,NgayTao) Values
        (1,1,N'Phiên khai mạc',N'Phát biểu khai mạc & báo cáo tổng kết',1,'2026-07-15 08:30','2026-07-15 10:00',1,2,'admin',GetDate()),
        (2,1,N'Tham luận chuyên đề',N'Giải pháp quản lý hội nghị thông minh',1,'2026-07-15 10:15','2026-07-15 11:30',2,1,'admin',GetDate()),
        (3,1,N'Tọa đàm & Bế mạc',N'Thảo luận và tri ân khách hàng',1,'2026-07-15 14:00','2026-07-15 16:30',3,0,'admin',GetDate());

    -- Diễn giả
    Insert Into Meet_DienGia(ID,IDHoiNghi,HoTen,ChucDanh,DonVi,Email,DienThoai,TieuSu) Values
        (1,1,N'TS. Nguyễn Văn An',N'Tổng Giám đốc',N'Công ty ITKA',N'an@itka.vn',N'0901000001',N'<p>20 năm kinh nghiệm công nghệ.</p>'),
        (2,1,N'ThS. Trần Thị Bình',N'Giám đốc Sản phẩm',N'Công ty ITKA',N'binh@itka.vn',N'0901000002',N'<p>Chuyên gia sản phẩm số.</p>');
    Insert Into Meet_PhienDienGia(ID,IDPhien,IDDienGia,VaiTro) Values
        (1,1,1,N'Chủ tọa'),(2,2,2,N'Diễn giả');

    -- Nhóm đại biểu
    Insert Into Meet_NhomDaiBieu(ID,IDHoiNghi,TenNhom,MauSac,GhiChu) Values
        (1,1,N'Khách VIP',N'#c08a1e',N'Khách mời đặc biệt'),
        (2,1,N'Đối tác',N'#0f6e9c',N'Đối tác chiến lược'),
        (3,1,N'Khách hàng',N'#0a8f7e',N'Khách hàng doanh nghiệp'),
        (4,1,N'Báo chí',N'#7d5bb0',N'Phóng viên, truyền thông');

    -- 20 đại biểu (token TKDB001..020)
    Declare @i Int = 1;
    Declare @names Table(n Int, ten nVarchar(200), cd nVarchar(100), dv nVarchar(200), nhom Int, vip Bit);
    Insert Into @names Values
     (1,N'Nguyễn Minh Khôi',N'Chủ tịch HĐQT',N'Tập đoàn FPT',1,1),
     (2,N'Trần Thu Hà',N'Tổng Giám đốc',N'VNG Corporation',1,1),
     (3,N'Lê Hoàng Nam',N'Phó TGĐ',N'Viettel Solutions',1,1),
     (4,N'Phạm Thị Lan',N'Giám đốc CNTT',N'Vietcombank',2,0),
     (5,N'Vũ Đức Thắng',N'Trưởng phòng',N'MB Bank',2,0),
     (6,N'Đặng Quốc Bảo',N'Giám đốc',N'Công ty TNHH An Phát',2,0),
     (7,N'Hoàng Thị Mai',N'Phó Giám đốc',N'Công ty CP Hòa Bình',3,0),
     (8,N'Bùi Văn Hùng',N'Quản lý dự án',N'Tập đoàn Hoa Sen',3,0),
     (9,N'Ngô Thanh Tùng',N'Chuyên viên',N'Công ty Đại Dương',3,0),
     (10,N'Dương Thị Hoa',N'Giám đốc Marketing',N'Công ty Sao Mai',3,0),
     (11,N'Lý Quang Vinh',N'Trưởng ban',N'Công ty Tân Tiến',3,0),
     (12,N'Mai Thị Ngọc',N'Phó phòng',N'Công ty Việt Long',3,0),
     (13,N'Phan Văn Đạt',N'Giám đốc KD',N'Công ty Minh Quân',2,0),
     (14,N'Trịnh Thu Trang',N'Phóng viên',N'Báo Tuổi Trẻ',4,0),
     (15,N'Cao Văn Lâm',N'Biên tập viên',N'VTV',4,0),
     (16,N'Đỗ Thị Hương',N'Phóng viên',N'Báo Thanh Niên',4,0),
     (17,N'Nguyễn Thế Anh',N'Chuyên viên',N'Công ty Bình Minh',3,0),
     (18,N'Trần Văn Sơn',N'Quản lý',N'Công ty Phương Nam',3,0),
     (19,N'Lê Thị Thủy',N'Giám đốc',N'Công ty Hồng Hà',2,0),
     (20,N'Võ Minh Tuấn',N'Phó TGĐ',N'Công ty Thành Đạt',1,1);
    Insert Into Meet_DaiBieu(ID,IDHoiNghi,MaDaiBieu,HoTen,ChucDanh,DonVi,Email,DienThoai,IDNhom,LaVIP,QRToken,TrangThaiDangKy,NguoiTao,NgayTao)
    Select n,1,'DB'+Right('000'+Cast(n As Varchar),4),ten,cd,dv,
           Lower(Replace(ten,N' ',''))+'@email.vn','09'+Right('00000000'+Cast(100000+n*37 As Varchar),8),
           nhom,vip,'TKDB'+Right('000'+Cast(n As Varchar),3),1,'admin',GetDate()
    From @names;

    -- Sơ đồ + ghế (lưới 4x6 = 24 ghế)
    Insert Into Meet_SoDo(ID,IDHoiNghi,IDPhongHop,TenSoDo,RongCanvas,CaoCanvas,DaChot) Values(1,1,1,N'Sơ đồ Hội trường A',1000,640,0);
    Declare @r Int=0,@c Int,@gid Int=1;
    While @r<4 Begin
      Set @c=0;
      While @c<6 Begin
        Insert Into Meet_Ghe(ID,IDSoDo,MaGhe,Hang,Cot,ToaDoX,ToaDoY,LoaiGhe)
        Values(@gid,1,Char(65+@r)+'-'+Right('0'+Cast(@c+1 As Varchar),2),Char(65+@r),@c+1,60+@c*70,90+@r*70,Case When @r=0 Then 1 Else 0 End);
        Set @gid=@gid+1; Set @c=@c+1;
      End
      Set @r=@r+1;
    End
    -- Gán 12 đại biểu đầu vào 12 ghế đầu
    Update g Set IDDaiBieu=g.ID From Meet_Ghe g Where g.ID Between 1 And 12;

    -- Check-in 8 đại biểu (QR)
    Declare @k Int=1;
    While @k<=8 Begin
      Insert Into Meet_CheckIn(ID,IDHoiNghi,IDDaiBieu,ThoiGianCheckIn,PhuongThuc,IDKiosk)
      Values(@k,1,@k,DateAdd(Minute,@k*3,'2026-07-15 07:40'),1,'KIOSK-01');
      Set @k=@k+1;
    End

    -- Mẫu tin + chiến dịch đã gửi
    Insert Into Meet_MauTin(ID,IDHoiNghi,TenMau,Kenh,NoiDung) Values
        (1,1,N'Nhắc lịch khai mạc',1,N'Kính mời {HoTen} tham dự {TenHoiNghi}. Vị trí ghế của Quý vị: {MaGhe}.'),
        (2,1,N'Lời mời Zalo',2,N'{HoTen} ơi, sự kiện sắp bắt đầu! Ghế {MaGhe}. Hẹn gặp Quý vị.');
    Insert Into Meet_ChienDich(ID,IDHoiNghi,TieuDe,Kenh,IDMauTin,NoiDung,PhamVi,TrangThai,TongSo,SoThanhCong,SoThatBai,NguoiTao,NgayTao,NgayGui)
        Values(1,1,N'Nhắc lịch khai mạc (toàn bộ)',1,1,N'Kính mời {HoTen} tham dự {TenHoiNghi}. Ghế: {MaGhe}.',1,1,20,19,1,'admin','2026-07-14 09:00','2026-07-14 09:01');
    -- Vài tin nhắn mẫu cho chiến dịch
    Insert Into Meet_TinNhan(ID,IDChienDich,IDDaiBieu,Kenh,SoDienThoai,NoiDung,TrangThai,MaPhanHoiMock,ThoiGianGui,LoiMock)
    Select d.ID,1,d.ID,1,d.DienThoai,N'Kính mời '+d.HoTen+N' tham dự hội nghị.',Case When d.ID=5 Then 2 Else 1 End,
           Case When d.ID=5 Then '' Else 'SMS-'+Cast(100000+d.ID As Varchar) End,'2026-07-14 09:01',
           Case When d.ID=5 Then N'Thuê bao không tồn tại (mock)' Else '' End
    From Meet_DaiBieu d Where d.IDHoiNghi=1;

    -- Khảo sát + câu hỏi + lựa chọn
    Insert Into Meet_KhaoSat(ID,IDHoiNghi,TieuDe,MoTa,TrangThai,NgayTao) Values
        (1,1,N'Khảo sát mức độ hài lòng hội nghị',N'Vui lòng đánh giá để chúng tôi phục vụ tốt hơn.',1,GetDate());
    Insert Into Meet_CauHoi(ID,IDKhaoSat,NoiDung,LoaiCauHoi,ThuTu,BatBuoc) Values
        (1,1,N'Đánh giá chung về công tác tổ chức',1,1,1),
        (2,1,N'Chất lượng nội dung tham luận',1,2,1),
        (3,1,N'Bạn biết đến sự kiện qua kênh nào?',2,3,0),
        (4,1,N'Nội dung bạn quan tâm (chọn nhiều)',3,4,0),
        (5,1,N'Góp ý thêm cho ban tổ chức',4,5,0);
    Insert Into Meet_LuaChon(ID,IDCauHoi,NoiDung,ThuTu) Values
        (1,3,N'Email mời',1),(2,3,N'Zalo/SMS',2),(3,3,N'Đồng nghiệp giới thiệu',3),(4,3,N'Mạng xã hội',4),
        (5,4,N'Chuyển đổi số',1),(6,4,N'Quản lý sự kiện',2),(7,4,N'Trí tuệ nhân tạo',3),(8,4,N'Bảo mật dữ liệu',4);
    -- Vài câu trả lời mẫu (đại biểu 1..6)
    Declare @q Int=1;
    While @q<=6 Begin
      Insert Into Meet_TraLoi(ID,IDKhaoSat,IDCauHoi,IDDaiBieu,DiemThang,ThoiGian) Values
        (@q*2-1,1,1,@q,4+(@q%2),GetDate()),
        (@q*2,1,2,@q,4+((@q+1)%2),GetDate());
      Set @q=@q+1;
    End

    -- ===== Người dùng test theo 3 vai trò =====
    Insert Into ListUser(ID,HoTen,TenDangNhap,MatKhau,Admin,Khoa,DefUrl) Values
        (101,N'Trần Ban Tổ Chức','btc','btc@123',0,0,'/'),
        (102,N'Lê Kỹ Thuật','kythuat','kt@123',0,0,'/'),
        (103,N'Phạm Lễ Tân','letan','lt@123',0,0,'/');
    Insert Into NguoiDung_VaiTro(ID,IDVaiTro,Username)
    Select 101,(Select ID From DmVaiTro Where MaVaiTro='BTC'),'btc'
    Union All Select 102,(Select ID From DmVaiTro Where MaVaiTro='KYTHUAT'),'kythuat'
    Union All Select 103,(Select ID From DmVaiTro Where MaVaiTro='LETAN'),'letan';
End
GO

-- ============================================================
-- Bổ sung dữ liệu mẫu cho Thư mời / Nhân viên / Phân công (idempotent riêng,
-- chạy cả trên DB demo đã tồn tại). Guard: hội nghị 1 có & chưa có nhân viên nào.
-- ============================================================
If Exists(Select 1 From Meet_HoiNghi Where ID=1) And Not Exists(Select 1 From Meet_NhanVien)
Begin
    -- Năm sinh + CCCD + mã NFC cho đại biểu hội nghị 1 (phục vụ check-in CCCD/NFC)
    Update Meet_DaiBieu
       Set NamSinh = 1970 + (ID * 2) % 30,
           SoCCCD  = '0010990' + Right('00000' + Cast(12000 + ID As Varchar), 5),
           MaNFC   = 'NFC-' + Right('0000' + Cast(ID * 7 As Varchar), 4)
     Where IDHoiNghi = 1 And NamSinh Is Null;

    -- Nhân viên tổ chức
    Insert Into Meet_NhanVien(ID,IDHoiNghi,HoTen,ChucDanh,DonVi,DienThoai,Email,VaiTroTC,Active,GhiChu) Values
        (1,1,N'Nguyễn Quản Lý',N'Trưởng ban tổ chức',N'Công ty ITKA',N'0911000001',N'ql@itka.vn',N'Ban tổ chức',1,N'Điều phối chung'),
        (2,1,N'Lê Kỹ Thuật',N'Kỹ sư hệ thống',N'Công ty ITKA',N'0911000002',N'kt@itka.vn',N'Kỹ thuật',1,N'Âm thanh, máy chiếu, mạng'),
        (3,1,N'Phạm Lễ Tân',N'Nhân viên lễ tân',N'Công ty ITKA',N'0911000003',N'lt@itka.vn',N'Lễ tân',1,N'Đón tiếp đại biểu'),
        (4,1,N'Trần Hậu Cần',N'Nhân viên hậu cần',N'Công ty ITKA',N'0911000004',N'hc@itka.vn',N'Hậu cần',1,N'Trang trí, nước uống'),
        (5,Null,N'Vũ Truyền Thông',N'Cán bộ truyền thông',N'Công ty ITKA',N'0911000005',N'tt@itka.vn',N'Truyền thông',1,N'Dùng chung mọi hội nghị');

    -- Phân công nhiệm vụ
    Insert Into Meet_NhiemVu(ID,IDHoiNghi,IDNhanVien,IDPhien,TenNhiemVu,MoTa,ThoiHan,DoUuTien,TrangThai,NguoiTao,NgayTao) Values
        (1,1,2,1,N'Lắp đặt & kiểm tra âm thanh, máy chiếu',N'Hoàn tất kiểm tra trước 7h00 ngày khai mạc',  '2026-07-15 07:00',3,2,'admin',GetDate()),
        (2,1,3,1,N'Bố trí quầy check-in & kiosk tại sảnh', N'2 kiosk + 1 quầy thủ công',                  '2026-07-15 07:30',2,1,'admin',GetDate()),
        (3,1,4,Null,N'Trang trí sân khấu & backdrop',      N'Theo nhận diện thương hiệu ITKA',            '2026-07-14 17:00',2,2,'admin',GetDate()),
        (4,1,1,Null,N'Duyệt danh sách & gửi thư mời',      N'Đảm bảo 100% đại biểu nhận thư trước sự kiện','2026-07-13 17:00',3,1,'admin',GetDate()),
        (5,1,5,2,N'Quay phim, chụp ảnh phiên tham luận',   N'Tư liệu truyền thông sau sự kiện',           '2026-07-15 11:30',1,0,'admin',GetDate());

    -- Thư mời (trạng thái hỗn hợp: đã gửi / chưa gửi / lỗi) cho 12 đại biểu đầu
    Insert Into Meet_ThuMoi(ID,IDHoiNghi,IDDaiBieu,DiaDiem,ThoiGian,LuuY,NoiDung,Kenh,TrangThaiGui,SoLanGui,ThoiGianGui,MaPhanHoiMock,LoiMock,NguoiTao,NgayTao)
    Select d.ID, 1, d.ID,
           N'Trung tâm Hội nghị Quốc gia - Số 1 Đại lộ Thăng Long, Hà Nội',
           N'08:00 ngày 15/07/2026',
           N'Vui lòng có mặt trước 30 phút để làm thủ tục check-in. Trang phục lịch sự.',
           N'Kính mời {HoTen} tham dự {TenHoiNghi}. Thời gian: {ThoiGian}. Địa điểm: {DiaDiem}. Ghế: {MaGhe}.',
           Case When d.ID % 3 = 0 Then 3 When d.ID % 3 = 1 Then 2 Else 1 End,        -- Kênh: Email/Zalo/SMS xoay vòng
           Case When d.ID <= 7 Then 1 When d.ID = 8 Then 2 Else 0 End,               -- 1..7 đã gửi, 8 lỗi, 9..12 chưa gửi
           Case When d.ID <= 8 Then 1 Else 0 End,
           Case When d.ID <= 8 Then '2026-07-13 09:00' Else Null End,
           Case When d.ID <= 7 Then 'MAIL-' + Cast(200000 + d.ID As Varchar) Else '' End,
           Case When d.ID = 8 Then N'Hộp thư từ chối / rơi spam (mock)' Else '' End,
           'admin', GetDate()
    From Meet_DaiBieu d Where d.IDHoiNghi = 1 And d.ID <= 12;
End
GO
