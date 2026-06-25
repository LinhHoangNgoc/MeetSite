using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using System.Runtime.Loader;
public class ModuleManager
{
    public static Dictionary<string, Assembly> Assemblies = new();
    private static AssemblyLoadContext? _context;
    public static void Load(IMvcBuilder mvc)
    {
        string moduleFolder = Path.Combine(AppContext.BaseDirectory, "Modules");
        var dllFiles = Directory.GetFiles(moduleFolder, "*.dll");
        foreach (var dll in dllFiles)
        {
            string dllName = Path.GetFileNameWithoutExtension(dll);
            var context = new AssemblyLoadContext(dllName, true);
            var bytes = File.ReadAllBytes(dll);
            var assembly = context.LoadFromStream(new MemoryStream(bytes));
            mvc.PartManager.ApplicationParts.Add(new AssemblyPart(assembly));
            mvc.AddApplicationPart(assembly);
            Assemblies.Add(dllName, assembly);
        }
    }
    public static void Reload(IMvcBuilder mvc)
    {
        if (_context != null)
        {
            _context.Unload();
            _context = null;
        }
        Load(mvc);
    }
    public static Assembly? GetAsm(string AsmName)
    {
        if (Assemblies.ContainsKey(AsmName))
        {
            return Assemblies[AsmName];
        }
        else
        {
            return null;
        }
    }
}