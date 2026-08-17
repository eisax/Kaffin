using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using Xunit;

namespace OdooDeployer.Domain.Tests;

public class EntityTests
{
    [Fact]
    public void ServerEntity_DefaultInitialization_ShouldHavePendingStatus()
    {
        var server = new Server
        {
            Name = "Production-EU-01",
            Host = "192.168.1.100"
        };

        Assert.Equal(ServerStatus.Pending, server.Status);
        Assert.Equal(22, server.SshPort);
        Assert.NotEqual(Guid.Empty, server.Id);
    }

    [Fact]
    public void OdooInstance_DefaultInitialization_ShouldHavePendingStatus()
    {
        var instance = new OdooInstance
        {
            Name = "Client-Alpha",
            Domain = "alpha.example.com"
        };

        Assert.Equal(InstanceStatus.Pending, instance.Status);
        Assert.Equal("19.0", instance.OdooVersion);
        Assert.NotEqual(Guid.Empty, instance.Id);
    }
}
