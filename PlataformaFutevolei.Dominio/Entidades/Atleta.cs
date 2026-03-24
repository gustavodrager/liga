using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Dominio.Entidades;

public class Atleta : EntidadeBase
{
    public string Nome { get; set; } = string.Empty;
    public string? Apelido { get; set; }
    public bool CadastroPendente { get; set; }
    public LadoAtleta Lado { get; set; } = LadoAtleta.Ambos;
    public DateTime? DataNascimento { get; set; }

    public ICollection<Dupla> DuplasComoAtleta1 { get; set; } = new List<Dupla>();
    public ICollection<Dupla> DuplasComoAtleta2 { get; set; } = new List<Dupla>();
    public ICollection<InscricaoCampeonato> InscricoesComoAtleta1 { get; set; } = new List<InscricaoCampeonato>();
    public ICollection<InscricaoCampeonato> InscricoesComoAtleta2 { get; set; } = new List<InscricaoCampeonato>();
}
