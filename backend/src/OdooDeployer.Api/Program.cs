using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OdooDeployer.Application.Interfaces;
using OdooDeployer.Domain.Interfaces;
using OdooDeployer.Infrastructure.Persistence;
using OdooDeployer.Infrastructure.Services;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure JSON & Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// 2. Database Configuration (PostgreSQL in Prod/Docker, SQLite fallback in local Dev if Postgres is absent)
var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var isProduction = builder.Environment.IsProduction();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (isProduction || (!string.IsNullOrEmpty(defaultConnectionString) && defaultConnectionString.Contains("Host=")))
    {
        var pgConn = defaultConnectionString ?? "Host=localhost;Port=5432;Database=odoo_deployer;Username=postgres;Password=postgres";
        options.UseNpgsql(pgConn, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 2, maxRetryDelay: TimeSpan.FromSeconds(3), errorCodesToAdd: null);
            npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        });
    }
    else
    {
        options.UseSqlite("Data Source=odoo_deployer.db", sqliteOptions =>
        {
            sqliteOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        });
    }
});

// 3. Dependency Injection Services
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<ISshService, SshService>();
builder.Services.AddScoped<IOdooDeploymentService, OdooDeploymentEngine>();
builder.Services.AddScoped<IServerService, ServerService>();
builder.Services.AddScoped<IInstanceService, InstanceService>();
builder.Services.AddScoped<IDeploymentService, DeploymentService>();

// 4. JWT Authentication
var secretKey = builder.Configuration["Jwt:SecretKey"] ?? "OdooDeployer_Super_Secret_Key_For_JWT_Authentication_2026_Minimum_32_Chars";
var key = Encoding.UTF8.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

// 5. CORS for Next.js Frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    options.AddPolicy("FrontendCorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 6. Database Migration / Initialization
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await DbInitializer.InitializeAsync(context);
        app.Logger.LogInformation("Database initialized and ready.");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning("Database initialization note: {Message}", ex.Message);
    }
}

// 7. HTTP Request Pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseRouting();
app.UseCors("FrontendCorsPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
