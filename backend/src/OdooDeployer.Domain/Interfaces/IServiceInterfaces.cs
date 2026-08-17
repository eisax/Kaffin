namespace OdooDeployer.Domain.Interfaces;

public interface IDockerService
{
    Task<bool> PullImageAsync(string host, string imageName, CancellationToken cancellationToken = default);
    Task<string> CreateContainerAsync(string host, string containerName, string image, IDictionary<string, string> env, CancellationToken cancellationToken = default);
    Task<bool> StartContainerAsync(string host, string containerId, CancellationToken cancellationToken = default);
    Task<bool> StopContainerAsync(string host, string containerId, CancellationToken cancellationToken = default);
    Task<bool> RestartContainerAsync(string host, string containerId, CancellationToken cancellationToken = default);
    Task<string> GetContainerLogsAsync(string host, string containerId, int tailLines = 100, CancellationToken cancellationToken = default);
}

public interface ISshService
{
    Task<bool> TestConnectionAsync(string host, int port, string user, string? privateKey, string? password, CancellationToken cancellationToken = default);
    Task<(int ExitCode, string Output, string Error)> ExecuteCommandAsync(string host, int port, string user, string? privateKey, string? password, string command, CancellationToken cancellationToken = default);
}

public interface IOdooDeploymentService
{
    Task<bool> ExecuteDeploymentAsync(Guid deploymentId, CancellationToken cancellationToken = default);
}
