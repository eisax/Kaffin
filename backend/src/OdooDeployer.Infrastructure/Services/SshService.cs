using OdooDeployer.Domain.Interfaces;
using Renci.SshNet;
using System.Text;

namespace OdooDeployer.Infrastructure.Services;

public class SshService : ISshService
{
    public Task<bool> TestConnectionAsync(string host, int port, string user, string? privateKey, string? password, CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = CreateSshClient(host, port, user, privateKey, password);
            client.Connect();
            var isConnected = client.IsConnected;
            client.Disconnect();
            return Task.FromResult(isConnected);
        }
        catch
        {
            return Task.FromResult(false);
        }
    }

    public Task<(int ExitCode, string Output, string Error)> ExecuteCommandAsync(string host, int port, string user, string? privateKey, string? password, string command, CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = CreateSshClient(host, port, user, privateKey, password);
            client.Connect();
            using var cmd = client.CreateCommand(command);
            var result = cmd.Execute();
            var exitStatus = cmd.ExitStatus ?? 0;
            var error = cmd.Error;
            client.Disconnect();
            return Task.FromResult((exitStatus, result, error));
        }
        catch (Exception ex)
        {
            return Task.FromResult((-1, string.Empty, ex.Message));
        }
    }

    private static SshClient CreateSshClient(string host, int port, string user, string? privateKey, string? password)
    {
        if (!string.IsNullOrWhiteSpace(privateKey))
        {
            using var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(privateKey));
            var privateKeyFile = new PrivateKeyFile(memoryStream);
            return new SshClient(host, port, user, privateKeyFile);
        }

        return new SshClient(host, port, user, password ?? string.Empty);
    }
}
