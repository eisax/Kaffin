using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OdooDeployer.Application.DTOs;
using OdooDeployer.Application.Interfaces;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Domain.Interfaces;
using OdooDeployer.Infrastructure.Persistence;

namespace OdooDeployer.Infrastructure.Services;

public class DeploymentService : IDeploymentService
{
    private readonly ApplicationDbContext _context;
    private readonly IServiceScopeFactory _scopeFactory;

    public DeploymentService(ApplicationDbContext context, IServiceScopeFactory scopeFactory)
    {
        _context = context;
        _scopeFactory = scopeFactory;
    }

    public async Task<IEnumerable<DeploymentDto>> GetAllDeploymentsAsync(CancellationToken cancellationToken = default)
    {
        var deployments = await _context.Deployments
            .Include(d => d.Instance)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);

        return deployments.Select(d => new DeploymentDto(
            d.Id,
            d.InstanceId,
            d.Instance?.Name ?? "Odoo Instance",
            d.Instance?.Domain ?? string.Empty,
            d.Status,
            d.TriggeredBy,
            d.StartedAt,
            d.CompletedAt,
            d.ErrorMessage,
            d.CreatedAt
        ));
    }

    public async Task<IEnumerable<DeploymentLogDto>> GetDeploymentLogsAsync(Guid deploymentId, CancellationToken cancellationToken = default)
    {
        var logs = await _context.DeploymentLogs
            .Where(l => l.DeploymentId == deploymentId)
            .OrderBy(l => l.Timestamp)
            .ToListAsync(cancellationToken);

        return logs.Select(l => new DeploymentLogDto(
            l.Id,
            l.DeploymentId,
            l.Level,
            l.Message,
            l.Timestamp
        ));
    }

    public async Task<Guid> TriggerDeploymentAsync(Guid instanceId, string triggeredBy, CancellationToken cancellationToken = default)
    {
        var deployment = new Deployment
        {
            InstanceId = instanceId,
            Status = DeploymentStatus.Queued,
            TriggeredBy = triggeredBy,
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
                // Errors handled within deployment orchestrator logs
            }
        });

        return deployment.Id;
    }
}
