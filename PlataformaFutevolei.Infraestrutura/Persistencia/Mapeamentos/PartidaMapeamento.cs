using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Infraestrutura.Persistencia.Mapeamentos;

public class PartidaMapeamento : IEntityTypeConfiguration<Partida>
{
    public void Configure(EntityTypeBuilder<Partida> builder)
    {
        builder.ToTable("partidas", tabela =>
        {
            tabela.HasCheckConstraint("ck_partidas_duplas_diferentes", "\"dupla_a_id\" <> \"dupla_b_id\"");
            tabela.HasCheckConstraint(
                "ck_partidas_vencedora_valida",
                "\"dupla_vencedora_id\" = \"dupla_a_id\" OR \"dupla_vencedora_id\" = \"dupla_b_id\""
            );
            tabela.HasCheckConstraint(
                "ck_partidas_placar_valido",
                "\"placar_dupla_a\" <> \"placar_dupla_b\" AND GREATEST(\"placar_dupla_a\", \"placar_dupla_b\") >= 18 AND ABS(\"placar_dupla_a\" - \"placar_dupla_b\") >= 2"
            );
            tabela.HasCheckConstraint(
                "ck_partidas_vencedora_coerente_placar",
                "((\"placar_dupla_a\" > \"placar_dupla_b\") AND \"dupla_vencedora_id\" = \"dupla_a_id\") OR ((\"placar_dupla_b\" > \"placar_dupla_a\") AND \"dupla_vencedora_id\" = \"dupla_b_id\")"
            );
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.CategoriaCompeticaoId).HasColumnName("categoria_competicao_id").IsRequired();
        builder.Property(x => x.DuplaAId).HasColumnName("dupla_a_id").IsRequired();
        builder.Property(x => x.DuplaBId).HasColumnName("dupla_b_id").IsRequired();
        builder.Property(x => x.PlacarDuplaA).HasColumnName("placar_dupla_a").IsRequired();
        builder.Property(x => x.PlacarDuplaB).HasColumnName("placar_dupla_b").IsRequired();
        builder.Property(x => x.DuplaVencedoraId).HasColumnName("dupla_vencedora_id").IsRequired();
        builder.Property(x => x.DataPartida).HasColumnName("data_partida").IsRequired();
        builder.Property(x => x.Observacoes).HasColumnName("observacoes").HasMaxLength(1000);
        builder.Property(x => x.DataCriacao).HasColumnName("data_criacao").IsRequired();
        builder.Property(x => x.DataAtualizacao).HasColumnName("data_atualizacao").IsRequired();

        builder.HasOne(x => x.CategoriaCompeticao)
            .WithMany(x => x.Partidas)
            .HasForeignKey(x => x.CategoriaCompeticaoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.DuplaA)
            .WithMany(x => x.PartidasComoDuplaA)
            .HasForeignKey(x => x.DuplaAId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.DuplaB)
            .WithMany(x => x.PartidasComoDuplaB)
            .HasForeignKey(x => x.DuplaBId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.DuplaVencedora)
            .WithMany(x => x.PartidasVencidas)
            .HasForeignKey(x => x.DuplaVencedoraId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.CategoriaCompeticaoId);
        builder.HasIndex(x => x.DuplaAId);
        builder.HasIndex(x => x.DuplaBId);
        builder.HasIndex(x => x.DuplaVencedoraId);
        builder.HasIndex(x => new { x.CategoriaCompeticaoId, x.DataPartida });
    }
}
