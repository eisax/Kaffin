using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OdooDeployer.Application.DTOs;
using OdooDeployer.Application.Interfaces;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Domain.Interfaces;
using OdooDeployer.Infrastructure.Persistence;

namespace OdooDeployer.Infrastructure.Services;

public class InstanceService : IInstanceService
{
    private readonly ApplicationDbContext _context;
    private readonly IServiceScopeFactory _scopeFactory;

    public InstanceService(ApplicationDbContext context, IServiceScopeFactory scopeFactory)
    {
        _context = context;
        _scopeFactory = scopeFactory;
    }

    public async Task<IEnumerable<InstanceDto>> GetAllInstancesAsync(CancellationToken cancellationToken = default)
    {
        var instances = await _context.Instances
            .Include(i => i.Server)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

        return instances.Select(i => new InstanceDto(
            i.Id,
            i.ServerId,
            i.Server?.Name ?? "Unassigned",
            i.Name,
            i.OdooVersion,
            i.ImageTag,
            i.DatabaseName,
            i.DatabaseUser,
            i.Domain,
            i.Status,
            i.CpuLimit,
            i.MemoryLimit,
            i.AdminEmail,
            i.Language,
            i.CountryCode,
            i.DemoData,
            i.CreatedAt
        ));
    }

    public async Task<InstanceDto?> GetInstanceByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var i = await _context.Instances
            .Include(i => i.Server)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (i == null) return null;

        return new InstanceDto(
            i.Id,
            i.ServerId,
            i.Server?.Name ?? "Unassigned",
            i.Name,
            i.OdooVersion,
            i.ImageTag,
            i.DatabaseName,
            i.DatabaseUser,
            i.Domain,
            i.Status,
            i.CpuLimit,
            i.MemoryLimit,
            i.AdminEmail,
            i.Language,
            i.CountryCode,
            i.DemoData,
            i.CreatedAt
        );
    }

    public async Task<InstanceDto> CreateInstanceAsync(CreateInstanceRequest request, CancellationToken cancellationToken = default)
    {
        var instance = new OdooInstance
        {
            ServerId = request.ServerId,
            Name = request.Name,
            OdooVersion = request.Version,
            ImageTag = request.ImageTag,
            DatabaseName = request.DatabaseName,
            DatabaseUser = request.DatabaseUser,
            AdminMasterPassword = string.IsNullOrWhiteSpace(request.AdminMasterPassword) ? "admin" : request.AdminMasterPassword,
            AdminEmail = string.IsNullOrWhiteSpace(request.AdminEmail) ? "admin@havano.pro" : request.AdminEmail,
            AdminPassword = string.IsNullOrWhiteSpace(request.AdminPassword) ? "Admin123!" : request.AdminPassword,
            AdminPhone = request.AdminPhone,
            Language = string.IsNullOrWhiteSpace(request.Language) ? "en_US" : request.Language,
            CountryCode = string.IsNullOrWhiteSpace(request.CountryCode) ? "us" : request.CountryCode,
            DemoData = request.DemoData ?? false,
            Domain = request.Domain,
            Status = InstanceStatus.Provisioning,
            CpuLimit = request.CpuLimit ?? "2.0",
            MemoryLimit = request.MemoryLimit ?? "4G"
        };

        _context.Instances.Add(instance);
        await _context.SaveChangesAsync(cancellationToken);

        // Create deployment record and start orchestration
        var deployment = new Deployment
        {
            InstanceId = instance.Id,
            Status = DeploymentStatus.Queued,
            TriggeredBy = "Web UI Admin",
            StartedAt = DateTime.UtcNow
        };
        _context.Deployments.Add(deployment);
        await _context.SaveChangesAsync(cancellationToken);

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var deploymentEngine = scope.ServiceProvider.GetRequiredService<IOdooDeploymentService>();
                await deploymentEngine.ExecuteDeploymentAsync(deployment.Id);
            }
            catch (Exception)
            {
                // Background execution errors are handled within the deployment service
            }
        });

        return new InstanceDto(
            instance.Id,
            instance.ServerId,
            "Target Server",
            instance.Name,
            instance.OdooVersion,
            instance.ImageTag,
            instance.DatabaseName,
            instance.DatabaseUser,
            instance.Domain,
            instance.Status,
            instance.CpuLimit,
            instance.MemoryLimit,
            instance.AdminEmail,
            instance.Language,
            instance.CountryCode,
            instance.DemoData,
            instance.CreatedAt
        );
    }

    public async Task<bool> RestartInstanceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var instance = await _context.Instances.FindAsync(new object[] { id }, cancellationToken);
        if (instance == null) return false;

        instance.Status = InstanceStatus.Running;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> StopInstanceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var instance = await _context.Instances.FindAsync(new object[] { id }, cancellationToken);
        if (instance == null) return false;

        instance.Status = InstanceStatus.Stopped;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteInstanceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var instance = await _context.Instances.FindAsync(new object[] { id }, cancellationToken);
        if (instance == null) return false;

        _context.Instances.Remove(instance);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
