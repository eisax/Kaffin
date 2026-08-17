using Microsoft.EntityFrameworkCore;
using OdooDeployer.Domain.Entities;

namespace OdooDeployer.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Server> Servers => Set<Server>();
    public DbSet<OdooInstance> Instances => Set<OdooInstance>();
    public DbSet<Deployment> Deployments => Set<Deployment>();
    public DbSet<DeploymentLog> DeploymentLogs => Set<DeploymentLog>();
    public DbSet<Addon> Addons => Set<Addon>();
    public DbSet<DomainRecord> Domains => Set<DomainRecord>();
    public DbSet<BackupRecord> Backups => Set<BackupRecord>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Server>(entity =>
        {
            entity.HasMany(s => s.Instances)
                  .WithOne(i => i.Server)
                  .HasForeignKey(i => i.ServerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OdooInstance>(entity =>
        {
            entity.HasMany(i => i.Deployments)
                  .WithOne(d => d.Instance)
                  .HasForeignKey(d => d.InstanceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Deployment>(entity =>
        {
            entity.HasMany(d => d.Logs)
                  .WithOne(l => l.Deployment)
                  .HasForeignKey(l => l.DeploymentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
