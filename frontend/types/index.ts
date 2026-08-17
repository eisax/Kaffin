export type ServerStatus =
  | "Pending"
  | "Connecting"
  | "Online"
  | "Offline"
  | "Degraded"
  | "Error";

export type InstanceStatus =
  | "Pending"
  | "Provisioning"
  | "Running"
  | "Stopped"
  | "Restarting"
  | "Failed"
  | "Upgrading";

export type DeploymentStatus =
  | "Pending"
  | "Queued"
  | "Preparing"
  | "PullingImage"
  | "CreatingDatabase"
  | "Deploying"
  | "ConfiguringProxy"
  | "ConfiguringSsl"
  | "HealthCheck"
  | "Completed"
  | "Failed";

export interface Server {
  id: string;
  name: string;
  host: string;
  sshPort: number;
  sshUser: string;
  operatingSystem?: string;
  dockerVersion?: string;
  cpuCores?: number;
  totalMemoryBytes?: number;
  totalDiskBytes?: number;
  status: ServerStatus;
  lastHealthCheckAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OdooInstance {
  id: string;
  serverId: string;
  server?: Server;
  name: string;
  odooVersion: string;
  imageTag: string;
  databaseName: string;
  databaseUser: string;
  adminMasterPassword?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminPhone?: string;
  language?: string;
  countryCode?: string;
  demoData?: boolean;
  domain: string;
  status: InstanceStatus;
  containerId?: string;
  dbContainerId?: string;
  cpuLimit?: string;
  memoryLimit?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Deployment {
  id: string;
  instanceId: string;
  instance?: OdooInstance;
  status: DeploymentStatus;
  commitHash?: string;
  triggeredBy?: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface DeploymentLog {
  id: string;
  deploymentId: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
}
