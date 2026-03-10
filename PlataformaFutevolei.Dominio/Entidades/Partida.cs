namespace PlataformaFutevolei.Dominio.Entidades;

public class Partida : EntidadeBase
{
    public Guid CategoriaCompeticaoId { get; set; }
    public Guid DuplaAId { get; set; }
    public Guid DuplaBId { get; set; }
    public int PlacarDuplaA { get; set; }
    public int PlacarDuplaB { get; set; }
    public Guid DuplaVencedoraId { get; set; }
    public DateTime DataPartida { get; set; }
    public string? Observacoes { get; set; }

    public CategoriaCompeticao CategoriaCompeticao { get; set; } = default!;
    public Dupla DuplaA { get; set; } = default!;
    public Dupla DuplaB { get; set; } = default!;
    public Dupla DuplaVencedora { get; set; } = default!;
}
