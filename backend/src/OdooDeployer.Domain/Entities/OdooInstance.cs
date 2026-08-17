using OdooDeployer.Domain.Enums;

namespace OdooDeployer.Domain.Entities;

public class OdooInstance : BaseEntity
{
    public Guid ServerId { get; set; }
    public Server? Server { get; set; }

    public string Name { get; set; } = string.Empty;
    public string OdooVersion { get; set; } = "19.0";
    public string ImageTag { get; set; } = "odoo:19.0";
    
    public string DatabaseName { get; set; } = string.Empty;
    public string DatabaseUser { get; set; } = "odoo";
    public string? DatabasePasswordEncrypted { get; set; }
    
    public string AdminMasterPassword { get; set; } = "admin";
    public string AdminEmail { get; set; } = "admin@example.com";
    public string AdminPassword { get; set; } = "Admin123!";
    public string? AdminPhone { get; set; }
    public string Language { get; set; } = "en_US";
    public string CountryCode { get; set; } = "us";
    public bool DemoData { get; set; } = false;

    public string Domain { get; set; } = string.Empty;
    public InstanceStatus Status { get; set; } = InstanceStatus.Pending;

    public string? ContainerId { get; set; }
    public string? DbContainerId { get; set; }

    public string? CpuLimit { get; set; }
    public string? MemoryLimit { get; set; }

    public ICollection<Deployment> Deployments { get; set; } = new List<Deployment>();
}
