using PlataformaFutevolei.Dominio.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Infraestrutura.Persistencia.Mapeamentos;

public class AtletaMapeamento : IEntityTypeConfiguration<Atleta>
{
    public void Configure(EntityTypeBuilder<Atleta> builder)
    {
        builder.ToTable("atletas");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Nome).HasColumnName("nome").HasMaxLength(150).IsRequired();
        builder.Property(x => x.Apelido).HasColumnName("apelido").HasMaxLength(100);
        builder.Property(x => x.CadastroPendente).HasColumnName("cadastro_pendente").HasDefaultValue(false).IsRequired();
        builder.Property(x => x.Lado).HasColumnName("lado").HasConversion<int>().HasDefaultValue(LadoAtleta.Ambos).IsRequired();
        builder.Property(x => x.DataNascimento).HasColumnName("data_nascimento").HasColumnType("date");
        builder.Property(x => x.DataCriacao).HasColumnName("data_criacao").IsRequired();
        builder.Property(x => x.DataAtualizacao).HasColumnName("data_atualizacao").IsRequired();
    }
}
