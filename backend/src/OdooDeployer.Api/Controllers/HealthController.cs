using Microsoft.AspNetCore.Mvc;

namespace OdooDeployer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            Status = "Healthy",
            Service = "Kaffin Control Plane API",
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0"
        });
    }
}
