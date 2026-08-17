namespace OdooDeployer.Domain.Entities;

public class AuditLog : BaseEntity
{
    public string User { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? Details { get; set; }
}
