using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace PlataformaFutevolei.Infraestrutura.Persistencia;

public class PlataformaFutevoleiDbContextFactory : IDesignTimeDbContextFactory<PlataformaFutevoleiDbContext>
{
    public PlataformaFutevoleiDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__Padrao")
            ?? "Host=localhost;Port=5432;Database=plataforma_futevolei;Username=postgres;Password=postgres";

        var connectionStringBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        if (!connectionString.Contains("Ssl Mode", StringComparison.OrdinalIgnoreCase))
        {
            connectionStringBuilder.SslMode = SslMode.Require;
        }

        var optionsBuilder = new DbContextOptionsBuilder<PlataformaFutevoleiDbContext>();
        optionsBuilder.UseNpgsql(connectionStringBuilder.ConnectionString);

        return new PlataformaFutevoleiDbContext(optionsBuilder.Options);
    }
}
