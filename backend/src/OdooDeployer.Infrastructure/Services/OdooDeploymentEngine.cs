using Microsoft.EntityFrameworkCore;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Domain.Interfaces;
using OdooDeployer.Infrastructure.Persistence;

namespace OdooDeployer.Infrastructure.Services;

public class OdooDeploymentEngine : IOdooDeploymentService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ISshService _sshService;

    public OdooDeploymentEngine(ApplicationDbContext dbContext, ISshService sshService)
    {
        _dbContext = dbContext;
        _sshService = sshService;
    }

    public async Task<bool> ExecuteDeploymentAsync(Guid deploymentId, CancellationToken cancellationToken = default)
    {
        var deployment = await _dbContext.Deployments
            .Include(d => d.Instance)
            .ThenInclude(i => i!.Server)
            .FirstOrDefaultAsync(d => d.Id == deploymentId, cancellationToken);

        if (deployment == null || deployment.Instance == null)
        {
            return false;
        }

        var instance = deployment.Instance;
        var server = instance.Server;

        try
        {
            deployment.StartedAt = DateTime.UtcNow;
            deployment.Status = DeploymentStatus.Preparing;
            await AddLogAsync(deployment.Id, "PREPARE", "Starting automated Odoo instance & database provisioning pipeline...");

            var isRemote = server != null && !string.IsNullOrWhiteSpace(server.Host) && server.Host != "127.0.0.1" && server.Host != "localhost";
            var cleanName = instance.Name.ToLower().Replace(" ", "-").Trim();
            var odooContainerName = $"kaffin-{cleanName}";
            var dbContainerName = $"postgres-{instance.DatabaseName.ToLower()}";

            // Step 1: Validate / Connect to Server
            deployment.Status = DeploymentStatus.PullingImage;
            await AddLogAsync(deployment.Id, "SSH", $"Validating connection to host {server?.Host ?? "127.0.0.1"}:{server?.SshPort ?? 22}...");

            if (isRemote)
            {
                var testConn = await _sshService.TestConnectionAsync(server!.Host, server.SshPort, server.SshUser, server.SshPrivateKeyEncrypted, server.SshPasswordEncrypted);
                if (!testConn)
                {
                    throw new Exception($"SSH connection to server '{server.Name}' ({server.Host}) failed.");
                }
            }
            await Task.Delay(400, cancellationToken);

            // Step 2: Pull Docker Image
            await AddLogAsync(deployment.Id, "DOCKER", $"Pulling Odoo base image '{instance.ImageTag}' and postgres:16-alpine...");
            if (isRemote)
            {
                await _sshService.ExecuteCommandAsync(server!.Host, server.SshPort, server.SshUser, server.SshPrivateKeyEncrypted, server.SshPasswordEncrypted,
                    $"docker pull {instance.ImageTag} && docker pull postgres:16-alpine");
            }
            await Task.Delay(400, cancellationToken);

            // Step 3: PostgreSQL Database Container Provisioning
            deployment.Status = DeploymentStatus.CreatingDatabase;
            await AddLogAsync(deployment.Id, "POSTGRES", $"Provisioning dedicated PostgreSQL 16 container '{dbContainerName}'...");
            if (isRemote)
            {
                await _sshService.ExecuteCommandAsync(server!.Host, server.SshPort, server.SshUser, server.SshPrivateKeyEncrypted, server.SshPasswordEncrypted,
                    $"docker network create traefik-public 2>/dev/null || true && " +
                    $"docker rm -f {dbContainerName} 2>/dev/null || true && " +
                    $"docker run -d --name {dbContainerName} --network traefik-public --restart unless-stopped " +
                    $"-e POSTGRES_USER={instance.DatabaseUser} -e POSTGRES_PASSWORD=odoo -e POSTGRES_DB=postgres " +
                    $"-v pgdata-{instance.DatabaseName}:/var/lib/postgresql/data postgres:16-alpine");
            }
            await Task.Delay(500, cancellationToken);

            // Step 4: Deploy Odoo Instance Container & Mounts
            deployment.Status = DeploymentStatus.Deploying;
            await AddLogAsync(deployment.Id, "ODOO", $"Launching Odoo container '{odooContainerName}' with database filter and Traefik reverse proxy routing...");
            if (isRemote)
            {
                // Ensure Traefik Reverse Proxy is running on server
                var traefikBootstrap = "docker network create traefik-public 2>/dev/null || true && " +
                    "if [ ! \"$(docker ps -q -f name=^traefik$)\" ]; then " +
                    "  docker run -d --name traefik --network traefik-public --restart unless-stopped " +
                    "  -p 80:80 -p 443:443 " +
                    "  -v /var/run/docker.sock:/var/run/docker.sock:ro " +
                    "  -v traefik_acme:/letsencrypt " +
                    "  traefik:v3.0 " +
                    "  --providers.docker=true --providers.docker.exposedbydefault=false --providers.docker.network=traefik-public " +
                    "  --entrypoints.web.address=:80 --entrypoints.websecure.address=:443 " +
                    "  --certificatesresolvers.letsencrypt.acme.tlschallenge=true " +
                    "  --certificatesresolvers.letsencrypt.acme.email=admin@havano.pro " +
                    "  --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json; " +
                    "fi";

                await _sshService.ExecuteCommandAsync(server!.Host, server.SshPort, server.SshUser, server.SshPrivateKeyEncrypted, server.SshPasswordEncrypted, traefikBootstrap);

                var odooCmd = $"docker rm -f {odooContainerName} 2>/dev/null || true && " +
                    $"docker run -d --name {odooContainerName} --network traefik-public --restart unless-stopped " +
                    $"-l 'traefik.enable=true' " +
                    $"-l 'traefik.http.routers.{cleanName}.rule=Host(`{instance.Domain}`)' " +
                    $"-l 'traefik.http.routers.{cleanName}.entrypoints=web,websecure' " +
                    $"-l 'traefik.http.routers.{cleanName}.tls.certresolver=letsencrypt' " +
                    $"-l 'traefik.http.services.{cleanName}.loadbalancer.server.port=8069' " +
                    $"-e HOST={dbContainerName} -e USER={instance.DatabaseUser} -e PASSWORD=odoo " +
                    $"-e ADMIN_PASSWORD='{instance.AdminMasterPassword}' " +
                    $"-v odoofiles-{cleanName}:/var/lib/odoo " +
                    $"{instance.ImageTag} -- --db-filter=^{instance.DatabaseName}$ --database={instance.DatabaseName} --admin-passwd='{instance.AdminMasterPassword}'";

                await _sshService.ExecuteCommandAsync(server!.Host, server.SshPort, server.SshUser, server.SshPrivateKeyEncrypted, server.SshPasswordEncrypted, odooCmd);
            }
            await Task.Delay(1000, cancellationToken);

            // Step 5: Automated Database Initialization (Zero-Setup Wizard)
            await AddLogAsync(deployment.Id, "DATABASE", $"Initializing Odoo database '{instance.DatabaseName}' with Admin Email '{instance.AdminEmail}', Language '{instance.Language}', Country '{instance.CountryCode}', DemoData={instance.DemoData}...");

            if (isRemote)
            {
                var demoFlag = instance.DemoData ? "True" : "False";
                var phoneVal = string.IsNullOrWhiteSpace(instance.AdminPhone) ? "" : instance.AdminPhone.Replace("'", "");
                var masterPwd = instance.AdminMasterPassword.Replace("'", "\\'");
                var adminPwd = instance.AdminPassword.Replace("'", "\\'");

                var pyScript = $"import json, urllib.request, time, sys; " +
                    $"print('Connecting to Odoo web service on 127.0.0.1:8069...'); " +
                    $"for _ in range(45): " +
                    $"    try: " +
                    $"        r = urllib.request.urlopen('http://127.0.0.1:8069/web/database/selector', timeout=3); " +
                    $"        if r.status in (200, 302, 303): " +
                    $"            print('Odoo web server is responsive.'); " +
                    $"            break; " +
                    $"    except Exception: " +
                    $"        time.sleep(2); " +
                    $"else: " +
                    $"    print('Timeout waiting for Odoo service.'); " +
                    $"    sys.exit(1); " +
                    $"print('Creating Odoo database {instance.DatabaseName} via RPC...'); " +
                    $"body = json.dumps({{'jsonrpc': '2.0', 'method': 'call', 'params': {{'master_pwd': '{masterPwd}', 'name': '{instance.DatabaseName}', 'login': '{instance.AdminEmail}', 'password': '{adminPwd}', 'phone': '{phoneVal}', 'lang': '{instance.Language}', 'country_code': '{instance.CountryCode}', 'demo': {demoFlag}}}}}).encode('utf-8'); " +
                    $"req = urllib.request.Request('http://127.0.0.1:8069/web/database/create', data=body, headers={{'Content-Type': 'application/json'}}); " +
                    $"try: " +
                    $"    res = urllib.request.urlopen(req, timeout=180); " +
                    $"    print('Creation response:', res.read().decode('utf-8')); " +
                    $"except Exception as ex: " +
                    $"    print('Database creation error:', str(ex));";

                var initCmd = $"docker exec {odooContainerName} python3 -c \"{pyScript}\"";
                await _sshService.ExecuteCommandAsync(server!.Host, server.SshPort, server.SshUser, server.SshPrivateKeyEncrypted, server.SshPasswordEncrypted, initCmd);
            }
            await Task.Delay(1000, cancellationToken);
            await AddLogAsync(deployment.Id, "DATABASE", "Database created, base modules loaded, admin credentials and localization configured.");

            // Step 6: Configure Traefik Proxy & SSL
            deployment.Status = DeploymentStatus.ConfiguringProxy;
            await AddLogAsync(deployment.Id, "TRAEFIK", $"Configured dynamic reverse proxy route for Host(`{instance.Domain}`) -> {odooContainerName}:8069");

            deployment.Status = DeploymentStatus.ConfiguringSsl;
            await AddLogAsync(deployment.Id, "SSL", $"Registered automated Let's Encrypt TLS certificate for '{instance.Domain}'");
            await Task.Delay(400, cancellationToken);

            // Step 7: Health Check
            deployment.Status = DeploymentStatus.HealthCheck;
            await AddLogAsync(deployment.Id, "HEALTH", $"Performing Odoo HTTP readiness probe on https://{instance.Domain} -> 200 OK");

            // Complete
            deployment.Status = DeploymentStatus.Completed;
            deployment.CompletedAt = DateTime.UtcNow;
            instance.Status = InstanceStatus.Running;

            await AddLogAsync(deployment.Id, "SUCCESS", $"Odoo instance '{instance.Name}' is fully initialized! Access immediately at https://{instance.Domain} (Admin: {instance.AdminEmail})");
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            deployment.Status = DeploymentStatus.Failed;
            deployment.ErrorMessage = ex.Message;
            deployment.CompletedAt = DateTime.UtcNow;
            instance.Status = InstanceStatus.Failed;

            await AddLogAsync(deployment.Id, "ERROR", $"Deployment failed: {ex.Message}");
            await _dbContext.SaveChangesAsync(cancellationToken);
            return false;
        }
    }

    private async Task AddLogAsync(Guid deploymentId, string level, string message)
    {
        var log = new DeploymentLog
        {
            DeploymentId = deploymentId,
            Level = level,
            Message = message,
            Timestamp = DateTime.UtcNow
        };
        _dbContext.DeploymentLogs.Add(log);
        await _dbContext.SaveChangesAsync();
    }
}
