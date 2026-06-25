using System.Net.Http.Json;

namespace Support.Class
{
    public class ApiCall
    {
        private readonly HttpClient _http;
        public ApiCall(HttpClient http)
        {
            _http = http;
        }
        public async Task<T> CallToApi<T>(string url, object data)
        {
            var res = await _http.PostAsJsonAsync(url,data);
            res.EnsureSuccessStatusCode();
            var response = await res.Content.ReadFromJsonAsync<T>();
            return response!;
        }
    }
}
