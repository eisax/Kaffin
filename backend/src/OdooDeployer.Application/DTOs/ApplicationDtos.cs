using OdooDeployer.Domain.Enums;

namespace OdooDeployer.Application.DTOs;

public record InstanceDto(
    Guid Id,
    Guid ServerId,
    string ServerName,
    string Name,
    string OdooVersion,
    string ImageTag,
    string DatabaseName,
    string DatabaseUser,
    string Domain,
    InstanceStatus Status,
    string? CpuLimit,
    string? MemoryLimit,
    string? AdminEmail,
    string? Language,
    string? CountryCode,
    bool DemoData,
    DateTime CreatedAt
);

public record CreateInstanceRequest(
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

public record DeploymentDto(
    Guid Id,
    Guid InstanceId,
    string InstanceName,
    string Domain,
    DeploymentStatus Status,
    string? TriggeredBy,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    string? ErrorMessage,
    DateTime CreatedAt
);

public record DeploymentLogDto(
    Guid Id,
    Guid DeploymentId,
    string Level,
    string Message,
    DateTime Timestamp
);

public record AuthDto(
    string Token,
    Guid UserId,
    string Name,
    string Email,
    string Role,
    Guid? OrganizationId
);
