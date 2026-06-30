-- ============================================================
-- Seed PHÂN QUYỀN CHI TIẾT cho module Hội nghị.
-- Danh mục chức năng (DmChucNang) + vai trò mặc định + ma trận quyền (VaiTro_Quyen).
-- Idempotent: chỉ thêm dòng còn thiếu. RBAC tables tạo sẵn lúc khởi động (Program.cs).
-- ============================================================

-- 1) Danh mục chức năng (GroupKey = controller, ControlKey duy nhất).
Set NoCount On;
Declare @cn Table(GroupKey nVarchar(100), ControlKey nVarchar(100), TenChucNang nVarchar(200), iOrder Int);
Insert Into @cn Values
 (N'HoiNghi',  N'HoiNghi.QuanLy',  N'Hội nghị & Phiên họp', 10),
 (N'PhanCong', N'PhanCong.QuanLy', N'Phân công nhiệm vụ',   15),
 (N'DaiBieu',  N'DaiBieu.QuanLy',  N'Đại biểu',             20),
 (N'SoDo',     N'SoDo.QuanLy',     N'Sơ đồ chỗ ngồi',       30),
 (N'ThuMoi',   N'ThuMoi.QuanLy',   N'Thư mời hội nghị',     35),
 (N'CheckIn',  N'CheckIn.QuanLy',  N'Điểm danh',            40),
 (N'TinNhan',  N'TinNhan.QuanLy',  N'Tin nhắn SMS/Zalo',    50),
 (N'TaiLieu',  N'TaiLieu.QuanLy',  N'Tài liệu',             60),
 (N'KhaoSat',  N'KhaoSat.QuanLy',  N'Khảo sát',             70),
 (N'BaoCao',   N'BaoCao.QuanLy',   N'Báo cáo & KPI',        80),
 (N'PhanQuyen',N'PhanQuyen.QuanLy',N'Phân quyền',           90);
Insert Into DmChucNang(ID, GroupKey, ControlKey, TenChucNang, iOrder)
Select IsNull((Select Max(ID) From DmChucNang),0) + Row_Number() Over(Order By c.iOrder),
       c.GroupKey, c.ControlKey, c.TenChucNang, c.iOrder
From @cn c
Where Not Exists(Select 1 From DmChucNang d Where d.ControlKey = c.ControlKey);
GO

-- 2) Vai trò mặc định.
Set NoCount On;
Declare @vt Table(MaVaiTro nVarchar(50), TenVaiTro nVarchar(200), GhiChu nVarchar(300));
Insert Into @vt Values
 (N'BTC',    N'Ban tổ chức',          N'Toàn quyền nghiệp vụ hội nghị'),
 (N'KYTHUAT',N'Kỹ thuật viên',        N'Sơ đồ, điểm danh, vận hành kỹ thuật'),
 (N'LETAN',  N'Lễ tân đón tiếp',      N'Điểm danh, tra cứu đại biểu');
Insert Into DmVaiTro(ID, MaVaiTro, TenVaiTro, GhiChu, Active)
Select IsNull((Select Max(ID) From DmVaiTro),0) + Row_Number() Over(Order By v.MaVaiTro),
       v.MaVaiTro, v.TenVaiTro, v.GhiChu, 1
From @vt v
Where Not Exists(Select 1 From DmVaiTro d Where d.MaVaiTro = v.MaVaiTro);
GO

-- 3) Ma trận quyền (VaiTro_Quyen): MaVaiTro x GroupKey x ControlKey x Action.
Set NoCount On;
Declare @p Table(MaVaiTro nVarchar(50), GroupKey nVarchar(100), ControlKey nVarchar(100), Action nVarchar(20));

-- Ban tổ chức: toàn quyền các nhóm nghiệp vụ (Xem/Them/Sua/Xoa).
Insert Into @p
Select N'BTC', g.GroupKey, g.ControlKey, a.Act
From (Values
 (N'HoiNghi',N'HoiNghi.QuanLy'),(N'PhanCong',N'PhanCong.QuanLy'),(N'DaiBieu',N'DaiBieu.QuanLy'),
 (N'SoDo',N'SoDo.QuanLy'),(N'ThuMoi',N'ThuMoi.QuanLy'),
 (N'CheckIn',N'CheckIn.QuanLy'),(N'TinNhan',N'TinNhan.QuanLy'),(N'TaiLieu',N'TaiLieu.QuanLy'),
 (N'KhaoSat',N'KhaoSat.QuanLy'),(N'BaoCao',N'BaoCao.QuanLy')) g(GroupKey,ControlKey)
Cross Join (Values(N'Xem'),(N'Them'),(N'Sua'),(N'Xoa')) a(Act);

-- Kỹ thuật viên: Sơ đồ + Điểm danh toàn quyền; Hội nghị/Tài liệu/Báo cáo chỉ Xem.
Insert Into @p
Select N'KYTHUAT', g.GroupKey, g.ControlKey, a.Act
From (Values(N'SoDo',N'SoDo.QuanLy'),(N'CheckIn',N'CheckIn.QuanLy')) g(GroupKey,ControlKey)
Cross Join (Values(N'Xem'),(N'Them'),(N'Sua'),(N'Xoa')) a(Act);
Insert Into @p Values
 (N'KYTHUAT',N'HoiNghi',N'HoiNghi.QuanLy',N'Xem'),
 (N'KYTHUAT',N'TaiLieu',N'TaiLieu.QuanLy',N'Xem'),
 (N'KYTHUAT',N'BaoCao', N'BaoCao.QuanLy', N'Xem');

-- Lễ tân: Điểm danh (Xem/Them), Đại biểu (Xem), Hội nghị (Xem).
Insert Into @p Values
 (N'LETAN',N'CheckIn',N'CheckIn.QuanLy',N'Xem'),
 (N'LETAN',N'CheckIn',N'CheckIn.QuanLy',N'Them'),
 (N'LETAN',N'DaiBieu',N'DaiBieu.QuanLy',N'Xem'),
 (N'LETAN',N'HoiNghi',N'HoiNghi.QuanLy',N'Xem');

Insert Into VaiTro_Quyen(ID, IDVaiTro, GroupKey, ControlKey, Action)
Select IsNull((Select Max(ID) From VaiTro_Quyen),0) + Row_Number() Over(Order By v.ID),
       v.ID, p.GroupKey, p.ControlKey, p.Action
From @p p
Join DmVaiTro v On v.MaVaiTro = p.MaVaiTro
Where Not Exists(Select 1 From VaiTro_Quyen q
                 Where q.IDVaiTro = v.ID And q.GroupKey = p.GroupKey
                   And q.ControlKey = p.ControlKey And q.Action = p.Action);
GO
