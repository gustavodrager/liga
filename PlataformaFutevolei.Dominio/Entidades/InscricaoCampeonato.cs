using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Dominio.Entidades;

public class InscricaoCampeonato : EntidadeBase
{
    public Guid CompeticaoId { get; set; }
    public Guid CategoriaCompeticaoId { get; set; }
    public Guid Atleta1Id { get; set; }
    public Guid Atleta2Id { get; set; }
    public DateTime DataInscricaoUtc { get; set; } = DateTime.UtcNow;
    public StatusInscricaoCampeonato Status { get; set; } = StatusInscricaoCampeonato.Ativa;
    public string? Observacao { get; set; }

    public Competicao Competicao { get; set; } = default!;
    public CategoriaCompeticao CategoriaCompeticao { get; set; } = default!;
    public Atleta Atleta1 { get; set; } = default!;
    public Atleta Atleta2 { get; set; } = default!;
}
