using OdooDeployer.Domain.Enums;

namespace OdooDeployer.Domain.Entities;

public class Deployment : BaseEntity
{
    public Guid InstanceId { get; set; }
    public OdooInstance? Instance { get; set; }

    public DeploymentStatus Status { get; set; } = DeploymentStatus.Queued;
    public string? CommitHash { get; set; }
    public string? TriggeredBy { get; set; }
    
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }

    public ICollection<DeploymentLog> Logs { get; set; } = new List<DeploymentLog>();
}

public class DeploymentLog : BaseEntity
{
    public Guid DeploymentId { get; set; }
    public Deployment? Deployment { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Level { get; set; } = "INFO";
    public string Message { get; set; } = string.Empty;
}
