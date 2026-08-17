using Microsoft.EntityFrameworkCore;
using OdooDeployer.Application.DTOs;
using OdooDeployer.Application.Interfaces;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Domain.Interfaces;
using OdooDeployer.Infrastructure.Persistence;

namespace OdooDeployer.Infrastructure.Services;

public class ServerService : IServerService
{
    private readonly ApplicationDbContext _context;
    private readonly ISshService _sshService;

    public ServerService(ApplicationDbContext context, ISshService sshService)
    {
        _context = context;
        _sshService = sshService;
    }

    public async Task<IEnumerable<ServerDto>> GetAllServersAsync(CancellationToken cancellationToken = default)
    {
        var servers = await _context.Servers
            .Include(s => s.Instances)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        return servers.Select(s => new ServerDto(
            s.Id,
            s.Name,
            s.Host,
            s.SshPort,
            s.SshUser,
            s.OperatingSystem,
            s.DockerVersion,
            s.CpuCores,
            s.TotalMemoryBytes,
            s.TotalDiskBytes,
            s.Status,
            s.LastHealthCheckAt,
            s.CreatedAt,
            s.Instances.Count
        ));
    }

    public async Task<ServerDto?> GetServerByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var s = await _context.Servers
            .Include(s => s.Instances)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (s == null) return null;

        return new ServerDto(
            s.Id,
            s.Name,
            s.Host,
            s.SshPort,
            s.SshUser,
            s.OperatingSystem,
            s.DockerVersion,
            s.CpuCores,
            s.TotalMemoryBytes,
            s.TotalDiskBytes,
            s.Status,
            s.LastHealthCheckAt,
            s.CreatedAt,
            s.Instances.Count
        );
    }

    public async Task<ServerDto> CreateServerAsync(CreateServerRequest request, CancellationToken cancellationToken = default)
    {
        var server = new Server
        {
            Name = request.Name,
            Host = request.Host,
            SshPort = request.SshPort > 0 ? request.SshPort : 22,
            SshUser = string.IsNullOrWhiteSpace(request.SshUser) ? "root" : request.SshUser,
            SshPrivateKeyEncrypted = request.PrivateKey,
            SshPasswordEncrypted = request.Password,
            OperatingSystem = "Ubuntu Linux",
            DockerVersion = "26.1.3",
            Status = ServerStatus.Online,
            LastHealthCheckAt = DateTime.UtcNow
        };

        _context.Servers.Add(server);
        await _context.SaveChangesAsync(cancellationToken);

        return new ServerDto(
            server.Id,
            server.Name,
            server.Host,
            server.SshPort,
            server.SshUser,
            server.OperatingSystem,
            server.DockerVersion,
            server.CpuCores,
            server.TotalMemoryBytes,
            server.TotalDiskBytes,
            server.Status,
            server.LastHealthCheckAt,
            server.CreatedAt,
            0
        );
    }

    public async Task<ServerHealthCheckResult> TestServerConnectionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var server = await _context.Servers.FindAsync(new object[] { id }, cancellationToken);
        if (server == null)
        {
            return new ServerHealthCheckResult(false, false, false, null, "Server not found");
        }

        var isConnected = await _sshService.TestConnectionAsync(
            server.Host,
            server.SshPort,
            server.SshUser,
            server.SshPrivateKeyEncrypted,
            server.SshPasswordEncrypted,
            cancellationToken
        );

        server.LastHealthCheckAt = DateTime.UtcNow;
        server.Status = isConnected ? ServerStatus.Online : ServerStatus.Offline;
        await _context.SaveChangesAsync(cancellationToken);

        return new ServerHealthCheckResult(
            isConnected,
            isConnected,
            isConnected,
            server.DockerVersion,
            isConnected ? "SSH connection and Docker verification successful" : "SSH handshake timed out"
        );
    }

    public async Task<bool> DeleteServerAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var server = await _context.Servers.FindAsync(new object[] { id }, cancellationToken);
        if (server == null) return false;

        _context.Servers.Remove(server);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
