using OdooDeployer.Domain.Enums;

namespace OdooDeployer.Application.DTOs;

public record ServerDto(
    Guid Id,
    string Name,
    string Host,
    int SshPort,
    string SshUser,
    string? OperatingSystem,
    string? DockerVersion,
    int? CpuCores,
    long? TotalMemoryBytes,
    long? TotalDiskBytes,
    ServerStatus Status,
    DateTime? LastHealthCheckAt,
    DateTime CreatedAt,
    int InstancesCount
);

public record CreateServerRequest(
    string Name,
    string Host,
    int SshPort,
    string SshUser,
    string? PrivateKey,
    string? Password
);

public record ServerHealthCheckResult(
    bool Success,
    bool SshConnected,
    bool DockerRunning,
    string? DockerVersion,
    string? Details
);
