namespace OdooDeployer.Domain.Entities;

public class SystemSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class Addon : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string TechnicalName { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string? Description { get; set; }
    public string? GitRepositoryUrl { get; set; }
    public string? Branch { get; set; } = "main";
}

public class DomainRecord : BaseEntity
{
    public string Hostname { get; set; } = string.Empty;
    public Guid? InstanceId { get; set; }
    public OdooInstance? Instance { get; set; }
    public Guid? ServerId { get; set; }
    public Server? Server { get; set; }
    public bool SslEnabled { get; set; } = true;
    public string SslStatus { get; set; } = "Valid";
    public DateTime? SslExpiresAt { get; set; }
}

public class BackupRecord : BaseEntity
{
    public Guid InstanceId { get; set; }
    public OdooInstance? Instance { get; set; }
    public string BackupType { get; set; } = "Full"; // Full | Database | Filestore
    public string StoragePath { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Status { get; set; } = "Verified";
}
