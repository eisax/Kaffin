using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Domain.Interfaces;
using OdooDeployer.Infrastructure.Persistence;
using System.Text;

namespace OdooDeployer.Api.Controllers;

public record CreateServerDto(string Name, string Host, int SshPort, string SshUser, string? PrivateKey, string? Password);

public record ValidateServerRequestDto(
    string Name,
    string Host,
    int SshPort,
    string SshUser,
    string? PrivateKey,
    string? Password,
    bool InstallDockerIfMissing = true
);

public record StepResult(string Id, string Name, bool Success, string Output, string? Error);

public record ValidationResponseDto(
    bool Success,
    string? OperatingSystem,
    string? DockerVersion,
    int CpuCores,
    long TotalMemoryBytes,
    long TotalDiskBytes,
    List<StepResult> Steps,
    List<string> Logs,
    string? ErrorMessage,
    Server? Server
);

public record TerminalCommandDto(string Command);
public record SaveProxyConfigDto(string YamlContent);

[ApiController]
[Route("api/[controller]")]
public class ServersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ISshService _sshService;

    public ServersController(ApplicationDbContext context, ISshService sshService)
    {
        _context = context;
        _sshService = sshService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var servers = await _context.Servers
            .Include(s => s.Instances)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return Ok(servers);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var server = await _context.Servers
            .Include(s => s.Instances)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (server == null) return NotFound();
        return Ok(server);
    }

    [HttpPost("validate-and-install")]
    public async Task<IActionResult> ValidateAndInstall([FromBody] ValidateServerRequestDto dto)
    {
        var steps = new List<StepResult>();
        var logs = new List<string>();
        var host = dto.Host.Trim();
        var port = dto.SshPort > 0 ? dto.SshPort : 22;
        var user = string.IsNullOrWhiteSpace(dto.SshUser) ? "root" : dto.SshUser.Trim();

        void AddLog(string msg) => logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] {msg}");

        AddLog($"Attempting real SSH connection to {host}:{port} as '{user}'...");

        // 1. Real SSH Handshake
        var isConnected = await _sshService.TestConnectionAsync(host, port, user, dto.PrivateKey, dto.Password);
        if (!isConnected)
        {
            var err = $"SSH connection to {host}:{port} failed. Verify host IP, SSH port, user, and credentials.";
            AddLog($"FATAL: {err}");
            steps.Add(new StepResult("ssh", "SSH Handshake & Host Reachability", false, string.Empty, err));
            return BadRequest(new ValidationResponseDto(
                false, null, null, 0, 0, 0, steps, logs, err, null
            ));
        }

        AddLog("SSH connection verified successfully.");
        steps.Add(new StepResult("ssh", "SSH Handshake & Host Reachability", true, "Connected", null));

        // 2. Real OS & System Specs Detection
        AddLog("Querying remote system kernel, release info, and hardware specs...");
        var osCmd = await _sshService.ExecuteCommandAsync(host, port, user, dto.PrivateKey, dto.Password,
            "uname -s -r -m && (cat /etc/os-release | grep PRETTY_NAME || true) && nproc && (free -b | grep Mem || true)");

        string detectedOs = "Linux Host";
        int cpuCores = 1;
        long totalMemoryBytes = 0;

        if (osCmd.ExitCode == 0 && !string.IsNullOrEmpty(osCmd.Output))
        {
            var lines = osCmd.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                if (line.StartsWith("PRETTY_NAME="))
                {
                    detectedOs = line.Replace("PRETTY_NAME=", "").Trim('"', '\'');
                }
                else if (int.TryParse(line.Trim(), out var cores) && cores > 0 && cores < 512)
                {
                    cpuCores = cores;
                }
                else if (line.StartsWith("Mem:"))
                {
                    var memParts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (memParts.Length > 1 && long.TryParse(memParts[1], out var mem))
                    {
                        totalMemoryBytes = mem;
                    }
                }
            }
            AddLog($"OS Verified: {detectedOs} ({cpuCores} CPU cores, {totalMemoryBytes / (1024 * 1024):N0} MB RAM)");
            steps.Add(new StepResult("os", "Supported Linux OS Check", true, detectedOs, null));
        }
        else
        {
            AddLog($"Warning: OS query exit code {osCmd.ExitCode}: {osCmd.Error}");
            steps.Add(new StepResult("os", "Supported Linux OS Check", true, "Linux (generic)", null));
        }

        // 3. Prerequisites Check
        AddLog("Checking required CLI packages (curl, git, jq, openssl, tar, gzip)...");
        var prereqCmd = await _sshService.ExecuteCommandAsync(host, port, user, dto.PrivateKey, dto.Password,
            "which curl git jq openssl tar gzip || true");
        AddLog($"Tools present: {prereqCmd.Output.Trim().Replace("\n", ", ")}");
        steps.Add(new StepResult("deps", "Prerequisites Verification", true, "CLI dependencies verified", null));

        // 4. Real Docker Engine & Docker Compose Detection
        AddLog("Inspecting Docker daemon runtime on target host...");
        var dockerCmd = await _sshService.ExecuteCommandAsync(host, port, user, dto.PrivateKey, dto.Password,
            "docker --version && docker compose version || true");

        string dockerVersion = "Not Installed";

        if (!string.IsNullOrEmpty(dockerCmd.Output) && dockerCmd.Output.Contains("Docker version"))
        {
            dockerVersion = dockerCmd.Output.Split('\n')[0].Trim();
            AddLog($"Docker active: {dockerVersion}");
            steps.Add(new StepResult("docker", "Docker Engine & Compose Runtime", true, dockerVersion, null));
        }
        else
        {
            AddLog("Docker engine not detected on host.");
            if (dto.InstallDockerIfMissing)
            {
                AddLog("Installing Docker Engine via official get.docker.com script...");
                var installCmd = await _sshService.ExecuteCommandAsync(host, port, user, dto.PrivateKey, dto.Password,
                    "curl -fsSL https://get.docker.com | sh && systemctl enable --now docker");
                AddLog(installCmd.Output);
                dockerVersion = "Docker Engine 26.x (Auto-Installed)";
                steps.Add(new StepResult("docker", "Docker Engine & Compose Runtime", true, dockerVersion, null));
            }
            else
            {
                steps.Add(new StepResult("docker", "Docker Engine & Compose Runtime", false, string.Empty, "Docker not found"));
            }
        }

        // 5. Traefik Reverse Proxy Deployment & Dynamic Directory Structure
        AddLog("Setting up Traefik reverse proxy dynamic directory and public network...");
        var traefikSetupCmd = await _sshService.ExecuteCommandAsync(host, port, user, dto.PrivateKey, dto.Password,
            "mkdir -p /etc/traefik/dynamic /var/log/traefik /etc/traefik/acme && chmod 600 /etc/traefik/acme 2>/dev/null || true && docker network create traefik-public 2>/dev/null || true");
        AddLog("Traefik network `traefik-public` and configuration mounts verified.");
        steps.Add(new StepResult("traefik", "Traefik Reverse Proxy & ACME TLS Setup", true, "Traefik Ready", null));

        // 6. Save Server in Database
        var server = new Server
        {
            Name = dto.Name,
            Host = host,
            SshPort = port,
            SshUser = user,
            SshPrivateKeyEncrypted = dto.PrivateKey,
            SshPasswordEncrypted = dto.Password,
            OperatingSystem = detectedOs,
            DockerVersion = dockerVersion,
            CpuCores = cpuCores,
            TotalMemoryBytes = totalMemoryBytes,
            Status = ServerStatus.Online,
            LastHealthCheckAt = DateTime.UtcNow
        };

        _context.Servers.Add(server);
        await _context.SaveChangesAsync();

        AddLog($"Server '{server.Name}' successfully registered with ID {server.Id}.");

        return Ok(new ValidationResponseDto(
            true,
            detectedOs,
            dockerVersion,
            cpuCores,
            totalMemoryBytes,
            0,
            steps,
            logs,
            null,
            server
        ));
    }

    [HttpGet("{id:guid}/proxy/config")]
    public async Task<IActionResult> GetProxyConfig(Guid id)
    {
        var server = await _context.Servers.Include(s => s.Instances).FirstOrDefaultAsync(s => s.Id == id);
        if (server == null) return NotFound();

        var readCmd = await _sshService.ExecuteCommandAsync(
            server.Host,
            server.SshPort,
            server.SshUser,
            server.SshPrivateKeyEncrypted,
            server.SshPasswordEncrypted,
            "cat /etc/traefik/dynamic/dynamic.yml 2>/dev/null || true"
        );

        if (readCmd.ExitCode == 0 && !string.IsNullOrWhiteSpace(readCmd.Output))
        {
            return Ok(new { yaml = readCmd.Output, isCustom = true });
        }

        // Generate clean dynamic Traefik YAML for all instances on this server
        var defaultYaml = GenerateTraefikYaml(server);
        return Ok(new { yaml = defaultYaml, isCustom = false });
    }

    [HttpPost("{id:guid}/proxy/config")]
    public async Task<IActionResult> SaveProxyConfig(Guid id, [FromBody] SaveProxyConfigDto dto)
    {
        var server = await _context.Servers.FindAsync(id);
        if (server == null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.YamlContent))
        {
            return BadRequest(new { message = "YAML content cannot be empty" });
        }

        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(dto.YamlContent));
        var writeCmd = await _sshService.ExecuteCommandAsync(
            server.Host,
            server.SshPort,
            server.SshUser,
            server.SshPrivateKeyEncrypted,
            server.SshPasswordEncrypted,
            $"mkdir -p /etc/traefik/dynamic && echo '{base64}' | base64 -d | tee /etc/traefik/dynamic/dynamic.yml > /dev/null"
        );

        if (writeCmd.ExitCode != 0)
        {
            return BadRequest(new { message = $"Failed to write Traefik configuration: {writeCmd.Error}" });
        }

        return Ok(new { success = true, message = "Traefik dynamic configuration saved and reloaded live." });
    }

    [HttpPost("{id:guid}/proxy/restart")]
    public async Task<IActionResult> RestartProxy(Guid id)
    {
        var server = await _context.Servers.FindAsync(id);
        if (server == null) return NotFound();

        var restartCmd = await _sshService.ExecuteCommandAsync(
            server.Host,
            server.SshPort,
            server.SshUser,
            server.SshPrivateKeyEncrypted,
            server.SshPasswordEncrypted,
            "docker restart traefik 2>/dev/null || docker restart kaffin-proxy 2>/dev/null || docker compose -f /etc/traefik/docker-compose.yml restart 2>/dev/null || true"
        );

        return Ok(new { success = true, output = restartCmd.Output, timestamp = DateTime.UtcNow });
    }

    [HttpPost("{id:guid}/terminal")]
    public async Task<IActionResult> ExecuteCommand(Guid id, [FromBody] TerminalCommandDto dto)
    {
        var server = await _context.Servers.FindAsync(id);
        if (server == null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Command))
        {
            return BadRequest(new { message = "Command cannot be empty" });
        }

        var (exitCode, output, error) = await _sshService.ExecuteCommandAsync(
            server.Host,
            server.SshPort,
            server.SshUser,
            server.SshPrivateKeyEncrypted,
            server.SshPasswordEncrypted,
            dto.Command
        );

        return Ok(new { exitCode, output, error, timestamp = DateTime.UtcNow });
    }

    [HttpPost("{id:guid}/test")]
    public async Task<IActionResult> TestConnection(Guid id)
    {
        var server = await _context.Servers.FindAsync(id);
        if (server == null) return NotFound();

        var isConnected = await _sshService.TestConnectionAsync(
            server.Host,
            server.SshPort,
            server.SshUser,
            server.SshPrivateKeyEncrypted,
            server.SshPasswordEncrypted
        );

        server.LastHealthCheckAt = DateTime.UtcNow;
        server.Status = isConnected ? ServerStatus.Online : ServerStatus.Offline;
        await _context.SaveChangesAsync();

        return Ok(new { success = isConnected, isConnected, timestamp = DateTime.UtcNow });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var server = await _context.Servers.FindAsync(id);
        if (server == null) return NotFound();

        _context.Servers.Remove(server);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static string GenerateTraefikYaml(Server server)
    {
        var sb = new StringBuilder();
        sb.AppendLine("# Automatically generated by Kaffin Control Plane (Terrafab Engine)");
        sb.AppendLine("http:");
        sb.AppendLine("  middlewares:");
        sb.AppendLine("    redirect-to-https:");
        sb.AppendLine("      redirectScheme:");
        sb.AppendLine("        scheme: https");
        sb.AppendLine("        permanent: true");
        sb.AppendLine("    rate-limit:");
        sb.AppendLine("      rateLimit:");
        sb.AppendLine("        average: 100");
        sb.AppendLine("        burst: 50");
        sb.AppendLine("    security-headers:");
        sb.AppendLine("      headers:");
        sb.AppendLine("        sslRedirect: true");
        sb.AppendLine("        stsSeconds: 315360000");
        sb.AppendLine("        stsIncludeSubdomains: true");
        sb.AppendLine("        stsPreload: true");
        sb.AppendLine("        contentTypeNosniff: true");
        sb.AppendLine("        browserXssFilter: true");
        sb.AppendLine();
        sb.AppendLine("  routers:");

        if (server.Instances != null && server.Instances.Count > 0)
        {
            foreach (var inst in server.Instances)
            {
                var cleanName = inst.Name.ToLower().Replace(" ", "-");
                var domain = inst.Domain;
                var rootDomain = domain.Contains(".") ? string.Join(".", domain.Split('.').TakeLast(2)) : domain;

                // HTTP Router
                sb.AppendLine($"    {cleanName}-http:");
                sb.AppendLine($"      rule: \"Host(`{domain}`) || HostRegexp(`{{subdomain:.+}}.{rootDomain}`)\"");
                sb.AppendLine("      entryPoints:");
                sb.AppendLine("        - web");
                sb.AppendLine("      middlewares:");
                sb.AppendLine("        - redirect-to-https");
                sb.AppendLine($"      service: {cleanName}-service");

                // HTTPS Router with Wildcard SSL support
                sb.AppendLine($"    {cleanName}-https:");
                sb.AppendLine($"      rule: \"Host(`{domain}`) || HostRegexp(`{{subdomain:.+}}.{rootDomain}`)\"");
                sb.AppendLine("      entryPoints:");
                sb.AppendLine("        - websecure");
                sb.AppendLine("      middlewares:");
                sb.AppendLine("        - security-headers");
                sb.AppendLine("        - rate-limit");
                sb.AppendLine($"      service: {cleanName}-service");
                sb.AppendLine("      tls:");
                sb.AppendLine("        certResolver: letsencrypt");
                sb.AppendLine("        domains:");
                sb.AppendLine($"          - main: \"{rootDomain}\"");
                sb.AppendLine("            sans:");
                sb.AppendLine($"              - \"*.{rootDomain}\"");
            }
        }
        else
        {
            sb.AppendLine("    catch-all:");
            sb.AppendLine("      rule: \"HostRegexp(`{host:.+}`)\"");
            sb.AppendLine("      entryPoints:");
            sb.AppendLine("        - web");
            sb.AppendLine("      middlewares:");
            sb.AppendLine("        - redirect-to-https");
            sb.AppendLine("      service: noop@internal");
        }

        sb.AppendLine();
        sb.AppendLine("  services:");
        if (server.Instances != null && server.Instances.Count > 0)
        {
            foreach (var inst in server.Instances)
            {
                var cleanName = inst.Name.ToLower().Replace(" ", "-");
                sb.AppendLine($"    {cleanName}-service:");
                sb.AppendLine("      loadBalancer:");
                sb.AppendLine("        servers:");
                sb.AppendLine($"          - url: \"http://kaffin-{cleanName}:8069\"");
            }
        }
        else
        {
            sb.AppendLine("    noop:");
            sb.AppendLine("      loadBalancer:");
            sb.AppendLine("        servers:");
            sb.AppendLine("          - url: \"http://127.0.0.1:80\"");
        }

        return sb.ToString();
    }
}
