using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Infrastructure.Persistence;

namespace OdooDeployer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public UsersController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _context.Users
            .Include(u => u.Organization)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                Role = u.Role.ToString(),
                u.IsActive,
                u.LastLoginAt,
                u.CreatedAt,
                Organization = u.Organization != null ? u.Organization.Name : null
            })
            .ToListAsync();

        return Ok(users);
    }
}

[ApiController]
[Route("api/[controller]")]
public class OrganizationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public OrganizationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orgs = await _context.Organizations
            .Include(o => o.Users)
            .Include(o => o.Instances)
            .ToListAsync();

        var result = orgs.Select(o => new
        {
            o.Id,
            o.Name,
            o.Slug,
            o.Description,
            InstancesCount = o.Instances.Count,
            UsersCount = o.Users.Count,
            o.CreatedAt
        });

        return Ok(result);
    }
}
