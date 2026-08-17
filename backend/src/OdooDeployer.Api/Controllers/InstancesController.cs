using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Domain.Interfaces;
using OdooDeployer.Infrastructure.Persistence;

namespace OdooDeployer.Api.Controllers;

public record CreateInstanceDto(
    string Name,
    string Version,
    string ImageTag,
    Guid ServerId,
    string DatabaseName,
    string DatabaseUser,
    string Domain,
    List<string>? Addons,
    string? CpuLimit,
    string? MemoryLimit,
    string? AdminMasterPassword,
    string? AdminEmail,
    string? AdminPassword,
    string? AdminPhone,
    string? Language,
    string? CountryCode,
    bool? DemoData
);

[ApiController]
[Route("api/[controller]")]
public class InstancesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ISshService _sshService;

    public InstancesController(ApplicationDbContext context, IServiceScopeFactory scopeFactory, ISshService sshService)
    {
        _context = context;
        _scopeFactory = scopeFactory;
        _sshService = sshService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var instances = await _context.Instances
            .Include(i => i.Server)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(instances);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var instance = await _context.Instances
            .Include(i => i.Server)
            .Include(i => i.Deployments)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (instance == null) return NotFound();
        return Ok(instance);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInstanceDto dto)
    {
        var instance = new OdooInstance
        {
            Name = dto.Name,
            OdooVersion = dto.Version,
            ImageTag = dto.ImageTag,
            ServerId = dto.ServerId,
            DatabaseName = dto.DatabaseName,
            DatabaseUser = dto.DatabaseUser,
            AdminMasterPassword = string.IsNullOrWhiteSpace(dto.AdminMasterPassword) ? "admin" : dto.AdminMasterPassword,
            AdminEmail = string.IsNullOrWhiteSpace(dto.AdminEmail) ? "admin@havano.pro" : dto.AdminEmail,
            AdminPassword = string.IsNullOrWhiteSpace(dto.AdminPassword) ? "Admin123!" : dto.AdminPassword,
            AdminPhone = dto.AdminPhone,
            Language = string.IsNullOrWhiteSpace(dto.Language) ? "en_US" : dto.Language,
            CountryCode = string.IsNullOrWhiteSpace(dto.CountryCode) ? "us" : dto.CountryCode,
            DemoData = dto.DemoData ?? false,
            Domain = dto.Domain,
            Status = InstanceStatus.Provisioning,
            CpuLimit = dto.CpuLimit ?? "2.0",
            MemoryLimit = dto.MemoryLimit ?? "4G"
        };

        _context.Instances.Add(instance);
        await _context.SaveChangesAsync();

        // Automatically create a queued deployment record and run orchestrator
        var deployment = new Deployment
        {
            InstanceId = instance.Id,
            Status = DeploymentStatus.Queued,
            TriggeredBy = "Web UI Admin",
            StartedAt = DateTime.UtcNow
        };
        _context.Deployments.Add(deployment);
        await _context.SaveChangesAsync();

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var deploymentService = scope.ServiceProvider.GetRequiredService<IOdooDeploymentService>();
                await deploymentService.ExecuteDeploymentAsync(deployment.Id);
            }
            catch (Exception)
            {
                // Background execution errors are captured in the deployment log or ignored
            }
        });

        return CreatedAtAction(nameof(GetById), new { id = instance.Id }, instance);
    }

    [HttpPost("{id:guid}/restart")]
    public async Task<IActionResult> Restart(Guid id)
    {
        var instance = await _context.Instances.Include(i => i.Server).FirstOrDefaultAsync(i => i.Id == id);
        if (instance == null) return NotFound();

        instance.Status = InstanceStatus.Running;
        await _context.SaveChangesAsync();

        // Asynchronously restart containers on server
        if (instance.Server != null && !string.IsNullOrWhiteSpace(instance.Server.Host) && instance.Server.Host != "127.0.0.1" && instance.Server.Host != "localhost")
        {
            var s = instance.Server;
            var cleanName = instance.Name.ToLower().Replace(" ", "-").Trim();
            var odooContainer = $"kaffin-{cleanName}";
            var dbContainer = $"postgres-{instance.DatabaseName.ToLower()}";

            _ = Task.Run(async () =>
            {
                var cmd = $"docker restart {odooContainer} {dbContainer} 2>/dev/null || true";
                await _sshService.ExecuteCommandAsync(s.Host, s.SshPort, s.SshUser, s.SshPrivateKeyEncrypted, s.SshPasswordEncrypted, cmd);
            });
        }

        return Ok(new { success = true, status = "Restarted" });
    }

    [HttpPost("{id:guid}/stop")]
    public async Task<IActionResult> Stop(Guid id)
    {
        var instance = await _context.Instances.Include(i => i.Server).FirstOrDefaultAsync(i => i.Id == id);
        if (instance == null) return NotFound();

        // 1. Immediately cancel/purge any pending or active deployment queue records for this instance
        var activeDeployments = await _context.Deployments
            .Where(d => d.InstanceId == id && d.Status != DeploymentStatus.Completed && d.Status != DeploymentStatus.Failed)
            .ToListAsync();

        foreach (var dep in activeDeployments)
        {
            dep.Status = DeploymentStatus.Failed;
            dep.ErrorMessage = "Deployment cancelled: Instance was stopped.";
            dep.CompletedAt = DateTime.UtcNow;
        }

        instance.Status = InstanceStatus.Stopped;
        await _context.SaveChangesAsync();

        // 2. Asynchronously stop and remove live containers from the server
        if (instance.Server != null && !string.IsNullOrWhiteSpace(instance.Server.Host) && instance.Server.Host != "127.0.0.1" && instance.Server.Host != "localhost")
        {
            var s = instance.Server;
            var cleanName = instance.Name.ToLower().Replace(" ", "-").Trim();
            var odooContainer = $"kaffin-{cleanName}";
            var dbContainer = $"postgres-{instance.DatabaseName.ToLower()}";

            _ = Task.Run(async () =>
            {
                var stopCmd = $"docker stop {odooContainer} {dbContainer} 2>/dev/null || true";
                await _sshService.ExecuteCommandAsync(s.Host, s.SshPort, s.SshUser, s.SshPrivateKeyEncrypted, s.SshPasswordEncrypted, stopCmd);
            });
        }

        return Ok(new { success = true, status = "Stopped" });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var instance = await _context.Instances
            .Include(i => i.Server)
            .Include(i => i.Deployments)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (instance == null) return NotFound();

        // 1. Remove all deployment logs and deployments
        var deploymentIds = instance.Deployments.Select(d => d.Id).ToList();
        var logs = await _context.DeploymentLogs.Where(l => deploymentIds.Contains(l.DeploymentId)).ToListAsync();
        _context.DeploymentLogs.RemoveRange(logs);
        _context.Deployments.RemoveRange(instance.Deployments);

        // 2. Clear domain bindings
        var domains = await _context.Domains.Where(d => d.InstanceId == id).ToListAsync();
        _context.Domains.RemoveRange(domains);

        // 3. Complete container and volume purge on server
        if (instance.Server != null && !string.IsNullOrWhiteSpace(instance.Server.Host) && instance.Server.Host != "127.0.0.1" && instance.Server.Host != "localhost")
        {
            var s = instance.Server;
            var cleanName = instance.Name.ToLower().Replace(" ", "-").Trim();
            var odooContainer = $"kaffin-{cleanName}";
            var dbContainer = $"postgres-{instance.DatabaseName.ToLower()}";

            _ = Task.Run(async () =>
            {
                var purgeCmd = $"docker rm -f {odooContainer} {dbContainer} 2>/dev/null || true && " +
                               $"docker volume rm odoofiles-{cleanName} pgdata-{instance.DatabaseName.ToLower()} 2>/dev/null || true";
                await _sshService.ExecuteCommandAsync(s.Host, s.SshPort, s.SshUser, s.SshPrivateKeyEncrypted, s.SshPasswordEncrypted, purgeCmd);
            });
        }

        _context.Instances.Remove(instance);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
