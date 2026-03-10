using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Dominio.Entidades;

public class CategoriaCompeticao : EntidadeBase
{
    public Guid CompeticaoId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public GeneroCategoria Genero { get; set; }
    public NivelCategoria Nivel { get; set; }

    public Competicao Competicao { get; set; } = default!;
    public ICollection<Partida> Partidas { get; set; } = new List<Partida>();
}
