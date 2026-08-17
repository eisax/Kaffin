using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OdooDeployer.Domain.Entities;
using OdooDeployer.Domain.Enums;
using OdooDeployer.Infrastructure.Persistence;
using OdooDeployer.Infrastructure.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace OdooDeployer.Api.Controllers;

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Name, string Email, string Password, string? OrganizationName);
public record AuthResponse(string Token, UserDto User);
public record UserDto(Guid Id, string Name, string Email, string Role, Guid? OrganizationId);

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtTokenService _jwtService;

    public AuthController(ApplicationDbContext context, IJwtTokenService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.Name, user.Email, user.Role.ToString(), user.OrganizationId);

        return Ok(new AuthResponse(token, userDto));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
        {
            return BadRequest(new { message = "Email already registered" });
        }

        var org = await _context.Organizations.OrderBy(o => o.CreatedAt).FirstOrDefaultAsync();
        if (org == null || !string.IsNullOrWhiteSpace(request.OrganizationName))
        {
            org = new Organization
            {
                Name = request.OrganizationName ?? "Default Organization",
                Slug = (request.OrganizationName ?? "default").ToLower().Replace(" ", "-")
            };
            _context.Organizations.Add(org);
            await _context.SaveChangesAsync();
        }

        var isFirstUser = !await _context.Users.AnyAsync();
        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = isFirstUser ? UserRole.SuperAdmin : UserRole.Admin,
            OrganizationId = org.Id
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(user);
        var userDto = new UserDto(user.Id, user.Name, user.Email, user.Role.ToString(), user.OrganizationId);

        return Ok(new AuthResponse(token, userDto));
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);
        if (string.IsNullOrEmpty(email))
        {
            // Fallback for anonymous demo or return default user
            var defaultUser = await _context.Users.OrderBy(u => u.CreatedAt).FirstOrDefaultAsync();
            if (defaultUser != null)
            {
                return Ok(new UserDto(defaultUser.Id, defaultUser.Name, defaultUser.Email, defaultUser.Role.ToString(), defaultUser.OrganizationId));
            }
            return Unauthorized();
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return NotFound();

        return Ok(new UserDto(user.Id, user.Name, user.Email, user.Role.ToString(), user.OrganizationId));
    }
}
