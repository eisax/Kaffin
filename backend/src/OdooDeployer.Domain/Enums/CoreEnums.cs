namespace OdooDeployer.Domain.Enums;

public enum ServerStatus
{
    Pending = 0,
    Connecting = 1,
    Online = 2,
    Offline = 3,
    Degraded = 4,
    Error = 5
}

public enum InstanceStatus
{
    Pending = 0,
    Provisioning = 1,
    Running = 2,
    Stopped = 3,
    Restarting = 4,
    Failed = 5,
    Upgrading = 6
}

public enum DeploymentStatus
{
    Pending = 0,
    Queued = 1,
    Preparing = 2,
    PullingImage = 3,
    CreatingDatabase = 4,
    Deploying = 5,
    ConfiguringProxy = 6,
    ConfiguringSsl = 7,
    HealthCheck = 8,
    Completed = 9,
    Failed = 10
}

public enum UserRole
{
    SuperAdmin = 1,
    Admin = 2,
    Operator = 3,
    Viewer = 4,
    CustomerAdmin = 5
}
