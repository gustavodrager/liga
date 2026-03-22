using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Infraestrutura.Persistencia.Mapeamentos;

public class InscricaoCampeonatoMapeamento : IEntityTypeConfiguration<InscricaoCampeonato>
{
    public void Configure(EntityTypeBuilder<InscricaoCampeonato> builder)
    {
        builder.ToTable("inscricoes_campeonato", tabela =>
        {
            tabela.HasCheckConstraint("ck_inscricoes_campeonato_atletas_diferentes", "\"atleta1_id\" <> \"atleta2_id\"");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.CompeticaoId).HasColumnName("competicao_id").IsRequired();
        builder.Property(x => x.CategoriaCompeticaoId).HasColumnName("categoria_competicao_id").IsRequired();
        builder.Property(x => x.Atleta1Id).HasColumnName("atleta1_id").IsRequired();
        builder.Property(x => x.Atleta2Id).HasColumnName("atleta2_id").IsRequired();
        builder.Property(x => x.DataInscricaoUtc).HasColumnName("data_inscricao_utc").IsRequired();
        builder.Property(x => x.Status).HasColumnName("status").IsRequired();
        builder.Property(x => x.Observacao).HasColumnName("observacao").HasMaxLength(1000);
        builder.Property(x => x.DataCriacao).HasColumnName("data_criacao").IsRequired();
        builder.Property(x => x.DataAtualizacao).HasColumnName("data_atualizacao").IsRequired();

        builder.HasOne(x => x.Competicao)
            .WithMany(x => x.Inscricoes)
            .HasForeignKey(x => x.CompeticaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.CategoriaCompeticao)
            .WithMany(x => x.Inscricoes)
            .HasForeignKey(x => x.CategoriaCompeticaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Atleta1)
            .WithMany(x => x.InscricoesComoAtleta1)
            .HasForeignKey(x => x.Atleta1Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Atleta2)
            .WithMany(x => x.InscricoesComoAtleta2)
            .HasForeignKey(x => x.Atleta2Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.CompeticaoId);
        builder.HasIndex(x => x.CategoriaCompeticaoId);
        builder.HasIndex(x => x.Atleta1Id);
        builder.HasIndex(x => x.Atleta2Id);
        builder.HasIndex(x => new { x.CategoriaCompeticaoId, x.Atleta1Id, x.Atleta2Id }).IsUnique();
    }
}
