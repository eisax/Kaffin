using Microsoft.EntityFrameworkCore;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;

namespace OdooDeployer.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task InitializeAsync(ApplicationDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        // 0. Auto-migrate newly added columns cleanly for SQLite / PostgreSQL
        try
        {
            var conn = context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            var existingCols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "PRAGMA table_info(Instances);";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    existingCols.Add(reader.GetString(1));
                }
            }

            var columnsToAdd = new[]
            {
                ("AdminMasterPassword", "TEXT DEFAULT 'admin'"),
                ("AdminEmail", "TEXT DEFAULT 'admin@havano.pro'"),
                ("AdminPassword", "TEXT DEFAULT 'Admin123!'"),
                ("AdminPhone", "TEXT NULL"),
                ("Language", "TEXT DEFAULT 'en_US'"),
                ("CountryCode", "TEXT DEFAULT 'us'"),
                ("DemoData", "INTEGER DEFAULT 0")
            };

            foreach (var (col, def) in columnsToAdd)
            {
                if (!existingCols.Contains(col))
                {
                    using var alterCmd = conn.CreateCommand();
                    alterCmd.CommandText = $"ALTER TABLE Instances ADD COLUMN {col} {def};";
                    await alterCmd.ExecuteNonQueryAsync();
                }
            }
            // Check Domains table columns
            var existingDomainCols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "PRAGMA table_info(Domains);";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    existingDomainCols.Add(reader.GetString(1));
                }
            }

            if (!existingDomainCols.Contains("ServerId"))
            {
                using var alterCmd = conn.CreateCommand();
                alterCmd.CommandText = "ALTER TABLE Domains ADD COLUMN ServerId TEXT NULL;";
                await alterCmd.ExecuteNonQueryAsync();
            }
        }
        catch
        {
            // Ignore if already configured
        }

        // 1. Seed Default Organization if not existing
        var defaultOrg = await context.Organizations.OrderBy(o => o.CreatedAt).FirstOrDefaultAsync();
        if (defaultOrg == null)
        {
            defaultOrg = new Organization
            {
                Name = "Default Organization",
                Slug = "default-org",
                Description = "Primary system organization"
            };
            context.Organizations.Add(defaultOrg);
            await context.SaveChangesAsync();
        }

        // 2. Seed Super Admin User if not existing
        if (!await context.Users.AnyAsync(u => u.Email == "admin@odoo-deployer.local"))
        {
            var adminUser = new User
            {
                Name = "Super Admin",
                Email = "admin@odoo-deployer.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Role = UserRole.SuperAdmin,
                IsActive = true,
                OrganizationId = defaultOrg.Id
            };
            context.Users.Add(adminUser);
        }

        // 3. Seed Default System Settings
        if (!await context.SystemSettings.AnyAsync())
        {
            context.SystemSettings.AddRange(
                new SystemSetting { Key = "DEFAULT_ODOO_VERSION", Value = "19.0", Description = "Default version for new instances" },
                new SystemSetting { Key = "TRAEFIK_NETWORK", Value = "traefik_public", Description = "Docker public network for reverse proxying" },
                new SystemSetting { Key = "ACME_EMAIL", Value = "admin@example.com", Description = "Let's Encrypt notification email" }
            );
        }

        await context.SaveChangesAsync();
    }
}
