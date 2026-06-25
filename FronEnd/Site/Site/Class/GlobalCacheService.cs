using Microsoft.Extensions.Caching.Memory;
using System.Data;

public class GlobalCacheService
{
    private readonly IMemoryCache _cache;
    private const string KEY = "GLOBAL_DT";
    public GlobalCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }
    public void Set(Dictionary<string, DataTable> data)
    {
        _cache.Set(KEY, data, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1),
            Priority = CacheItemPriority.High
        });
    }
    public Dictionary<string, DataTable>? Get()
    {
        _cache.TryGetValue(KEY, out Dictionary<string, DataTable>? data);
        return data;
    }
    public DataTable? GetTable(string key)
    {
        var data = Get();
        if (data != null && data.ContainsKey(key))
            return data[key];

        return null;
    }
    public void SetTable(string key, DataTable table)
    {
        var data = Get() ?? new Dictionary<string, DataTable>();
        data[key] = table;

        Set(data);
    }
    public void Clear()
    {
        _cache.Remove(KEY);
    }
}