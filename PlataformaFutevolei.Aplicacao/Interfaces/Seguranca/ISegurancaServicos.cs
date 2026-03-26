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

public interface IAutorizacaoUsuarioServico
{
    Task<Usuario> ObterUsuarioAtualObrigatorioAsync(CancellationToken cancellationToken = default);
    Task GarantirAdministradorAsync(CancellationToken cancellationToken = default);
    Task GarantirAdminOuOrganizadorAsync(CancellationToken cancellationToken = default);
    Task GarantirAcessoAtletaAsync(Guid atletaId, CancellationToken cancellationToken = default);
    Task GarantirGestaoCompeticaoAsync(Guid competicaoId, CancellationToken cancellationToken = default);
}
