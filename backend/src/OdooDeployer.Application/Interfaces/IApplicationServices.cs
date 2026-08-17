using OdooDeployer.Application.DTOs;

namespace OdooDeployer.Application.Interfaces;

public interface IServerService
{
    Task<IEnumerable<ServerDto>> GetAllServersAsync(CancellationToken cancellationToken = default);
    Task<ServerDto?> GetServerByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ServerDto> CreateServerAsync(CreateServerRequest request, CancellationToken cancellationToken = default);
    Task<ServerHealthCheckResult> TestServerConnectionAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> DeleteServerAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface IInstanceService
{
    Task<IEnumerable<InstanceDto>> GetAllInstancesAsync(CancellationToken cancellationToken = default);
    Task<InstanceDto?> GetInstanceByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<InstanceDto> CreateInstanceAsync(CreateInstanceRequest request, CancellationToken cancellationToken = default);
    Task<bool> RestartInstanceAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> StopInstanceAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> DeleteInstanceAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface IDeploymentService
{
    Task<IEnumerable<DeploymentDto>> GetAllDeploymentsAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<DeploymentLogDto>> GetDeploymentLogsAsync(Guid deploymentId, CancellationToken cancellationToken = default);
    Task<Guid> TriggerDeploymentAsync(Guid instanceId, string triggeredBy, CancellationToken cancellationToken = default);
}
