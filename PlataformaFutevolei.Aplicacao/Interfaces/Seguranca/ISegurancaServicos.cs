using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;

public interface ISenhaServico
{
    string GerarHash(string senha);
    bool Verificar(string senha, string hash);
}

public interface ITokenJwtServico
{
    string GerarToken(Usuario usuario);
}

public interface IUsuarioContexto
{
    Guid? UsuarioId { get; }
}
