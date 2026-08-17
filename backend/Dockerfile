# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview-alpine AS build
WORKDIR /app

# Copy solution and project definitions
COPY OdooDeployer.slnx ./
COPY src/OdooDeployer.Domain/*.csproj ./src/OdooDeployer.Domain/
COPY src/OdooDeployer.Application/*.csproj ./src/OdooDeployer.Application/
COPY src/OdooDeployer.Infrastructure/*.csproj ./src/OdooDeployer.Infrastructure/
COPY src/OdooDeployer.Worker/*.csproj ./src/OdooDeployer.Worker/
COPY src/OdooDeployer.Api/*.csproj ./src/OdooDeployer.Api/

# Restore dependencies
RUN dotnet restore OdooDeployer.slnx

# Copy full source and publish
COPY src/ ./src/
WORKDIR /app/src/OdooDeployer.Api
RUN dotnet publish -c Release -o /out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview-alpine AS runtime
WORKDIR /app
COPY --from=build /out ./

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "OdooDeployer.Api.dll"]
