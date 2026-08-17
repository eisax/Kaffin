using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Infrastructure.Persistence;

namespace OdooDeployer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DeploymentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DeploymentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var deployments = await _context.Deployments
            .Include(d => d.Instance)
            .Include(d => d.Logs)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return Ok(deployments);
    }

    [HttpGet("{id:guid}/logs")]
    public async Task<IActionResult> GetLogs(Guid id)
    {
        var logs = await _context.DeploymentLogs
            .Where(l => l.DeploymentId == id)
            .OrderBy(l => l.Timestamp)
            .ToListAsync();

        return Ok(logs);
    }
}

[ApiController]
[Route("api/[controller]")]
public class AddonsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AddonsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _context.Addons.ToListAsync());
    }
}

public record CreateDomainDto(string Hostname, Guid? InstanceId = null, Guid? ServerId = null);

[ApiController]
[Route("api/[controller]")]
public class DomainsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DomainsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _context.Domains
            .Include(d => d.Instance)
            .Include(d => d.Server)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDomainDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Hostname))
        {
            return BadRequest(new { message = "Hostname cannot be empty." });
        }

        var domain = new DomainRecord
        {
            Hostname = dto.Hostname.Trim().ToLower(),
            InstanceId = dto.InstanceId,
            ServerId = dto.ServerId,
            SslEnabled = true,
            SslStatus = "Active",
            SslExpiresAt = DateTime.UtcNow.AddDays(90)
        };

        _context.Domains.Add(domain);
        await _context.SaveChangesAsync();

        return Ok(domain);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var domain = await _context.Domains.FindAsync(id);
        if (domain == null) return NotFound();

        _context.Domains.Remove(domain);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class BackupsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public BackupsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _context.Backups.Include(b => b.Instance).ToListAsync());
    }
}

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SettingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _context.SystemSettings.ToListAsync());
    }
}
