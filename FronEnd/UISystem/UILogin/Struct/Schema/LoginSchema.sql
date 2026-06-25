If Not Exists(Select Top 1 1 From sys.columns Where name = 'DefUrl' And Object_ID = Object_ID('ListUser'))
Begin
	Alter Table ListUser Add DefUrl NVARCHAR(255) NULL
End
Go
If Not Exists(Select Top 1 1 From sys.Tables Where name = 'ListQuyen')
Begin
	Create Table ListQuyen(
		ID Int Not Null Primary Key,
		IDUser Int,
		GroupKey nVarchar(500),
		ControlKey nVarchar(500),
		Action nVarchar(500)
	)
End