using Microsoft.EntityFrameworkCore;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Infraestrutura.Persistencia;

public class PlataformaFutevoleiDbContext(DbContextOptions<PlataformaFutevoleiDbContext> options)
    : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Atleta> Atletas => Set<Atleta>();
    public DbSet<Dupla> Duplas => Set<Dupla>();
    public DbSet<Liga> Ligas => Set<Liga>();
    public DbSet<Local> Locais => Set<Local>();
    public DbSet<FormatoCampeonato> FormatosCampeonato => Set<FormatoCampeonato>();
    public DbSet<RegraCompeticao> RegrasCompeticao => Set<RegraCompeticao>();
    public DbSet<Competicao> Competicoes => Set<Competicao>();
    public DbSet<CategoriaCompeticao> CategoriasCompeticao => Set<CategoriaCompeticao>();
    public DbSet<InscricaoCampeonato> InscricoesCampeonato => Set<InscricaoCampeonato>();
    public DbSet<Partida> Partidas => Set<Partida>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PlataformaFutevoleiDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
