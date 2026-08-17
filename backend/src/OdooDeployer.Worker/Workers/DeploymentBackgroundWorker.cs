using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OdooDeployer.Domain.Interfaces;

namespace OdooDeployer.Worker.Workers;

public class DeploymentBackgroundWorker : BackgroundService
{
    private readonly ILogger<DeploymentBackgroundWorker> _logger;

    public DeploymentBackgroundWorker(ILogger<DeploymentBackgroundWorker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OdooDeployer Background Job Worker active.");

        while (!stoppingToken.IsCancellationRequested)
        {
            // Process long-running background tasks (deployments, backups, health checks)
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }
}
