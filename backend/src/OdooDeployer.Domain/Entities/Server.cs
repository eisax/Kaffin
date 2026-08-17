using OdooDeployer.Domain.Enums;

namespace OdooDeployer.Domain.Entities;

public class Server : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int SshPort { get; set; } = 22;
    public string SshUser { get; set; } = "root";
    public string? SshPrivateKeyEncrypted { get; set; }
    public string? SshPasswordEncrypted { get; set; }
    
    public string? OperatingSystem { get; set; }
    public string? DockerVersion { get; set; }
    public int? CpuCores { get; set; }
    public long? TotalMemoryBytes { get; set; }
    public long? TotalDiskBytes { get; set; }
    
    public ServerStatus Status { get; set; } = ServerStatus.Pending;
    public DateTime? LastHealthCheckAt { get; set; }

    public ICollection<OdooInstance> Instances { get; set; } = new List<OdooInstance>();
}
