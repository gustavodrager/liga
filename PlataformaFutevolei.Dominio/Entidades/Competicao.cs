using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Dominio.Entidades;

public class Competicao : EntidadeBase
{
    public string Nome { get; set; } = string.Empty;
    public TipoCompeticao Tipo { get; set; }
    public string? Descricao { get; set; }
    public DateTime DataInicio { get; set; }
    public DateTime? DataFim { get; set; }

    public ICollection<CategoriaCompeticao> Categorias { get; set; } = new List<CategoriaCompeticao>();
}
