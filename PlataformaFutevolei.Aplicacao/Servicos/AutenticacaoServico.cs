using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Aplicacao.Utilitarios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;
using System.Security.Cryptography;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class AutenticacaoServico(
    IUsuarioRepositorio usuarioRepositorio,
    IConviteCadastroRepositorio conviteCadastroRepositorio,
    IUnidadeTrabalho unidadeTrabalho,
    ISenhaServico senhaServico,
    ITokenJwtServico tokenJwtServico,
    IUsuarioContexto usuarioContexto
) : IAutenticacaoServico
{
    public async Task<RespostaAutenticacaoDto> RegistrarAsync(RegistrarUsuarioRequisicaoDto dto, CancellationToken cancellationToken = default)
    {
        ValidarRegistro(dto);
        var emailNormalizado = dto.Email.Trim().ToLowerInvariant();
        var usuarioExistente = await usuarioRepositorio.ObterPorEmailAsync(emailNormalizado, cancellationToken);
        if (usuarioExistente is not null)
        {
            throw new RegraNegocioException("Já existe um usuário cadastrado com este e-mail.");
        }

        var tokenConvite = dto.TokenConvite.Trim();
        var conviteCadastro = await conviteCadastroRepositorio.ObterPorTokenParaAtualizacaoAsync(tokenConvite, cancellationToken);
        if (conviteCadastro is null)
        {
            throw new EntidadeNaoEncontradaException("Convite de cadastro não encontrado.");
        }

        ValidarConviteParaRegistro(conviteCadastro, emailNormalizado);

        var usuario = new Usuario
        {
            Nome = dto.Nome.Trim(),
            Email = emailNormalizado,
            SenhaHash = senhaServico.GerarHash(dto.Senha),
            Perfil = conviteCadastro.PerfilDestino,
            Ativo = true
        };

        VincularAtletaPendenteSeNecessario(usuario);
        conviteCadastro.MarcarComoUtilizado(DateTime.UtcNow);

        await usuarioRepositorio.AdicionarAsync(usuario, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var token = tokenJwtServico.GerarToken(usuario);
        return new RespostaAutenticacaoDto(token, usuario.ParaDto());
    }

    public async Task<RespostaAutenticacaoDto> LoginAsync(LoginRequisicaoDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Senha))
        {
            throw new RegraNegocioException("E-mail e senha são obrigatórios.");
        }

        var emailNormalizado = dto.Email.Trim().ToLowerInvariant();
        var usuario = await usuarioRepositorio.ObterPorEmailAsync(emailNormalizado, cancellationToken);
        if (usuario is null || !usuario.Ativo || !senhaServico.Verificar(dto.Senha, usuario.SenhaHash))
        {
            throw new RegraNegocioException("Credenciais inválidas.");
        }

        var token = tokenJwtServico.GerarToken(usuario);
        return new RespostaAutenticacaoDto(token, usuario.ParaDto());
    }

    public async Task<SolicitarRedefinicaoSenhaRespostaDto> SolicitarRedefinicaoSenhaAsync(
        EsqueciSenhaRequisicaoDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new RegraNegocioException("E-mail é obrigatório.");
        }

        var emailNormalizado = dto.Email.Trim().ToLowerInvariant();
        var usuario = await usuarioRepositorio.ObterPorEmailParaAtualizacaoAsync(emailNormalizado, cancellationToken);
        var mensagemPadrao = "Se o e-mail estiver cadastrado, um código de redefinição foi gerado.";

        if (usuario is null || !usuario.Ativo)
        {
            return new SolicitarRedefinicaoSenhaRespostaDto(mensagemPadrao, null);
        }

        var codigo = GerarCodigoRedefinicao();
        usuario.CodigoRedefinicaoSenhaHash = senhaServico.GerarHash(codigo);
        usuario.CodigoRedefinicaoSenhaExpiraEmUtc = DateTime.UtcNow.AddMinutes(15);
        usuario.AtualizarDataModificacao();
        usuarioRepositorio.Atualizar(usuario);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        return new SolicitarRedefinicaoSenhaRespostaDto(mensagemPadrao, codigo);
    }

    public async Task RedefinirSenhaAsync(RedefinirSenhaRequisicaoDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new RegraNegocioException("E-mail é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.Codigo))
        {
            throw new RegraNegocioException("Código de redefinição é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.NovaSenha) || dto.NovaSenha.Length < 6)
        {
            throw new RegraNegocioException("A nova senha deve ter no mínimo 6 caracteres.");
        }

        var emailNormalizado = dto.Email.Trim().ToLowerInvariant();
        var usuario = await usuarioRepositorio.ObterPorEmailParaAtualizacaoAsync(emailNormalizado, cancellationToken);
        var codigoValido = usuario is not null
            && usuario.Ativo
            && !string.IsNullOrWhiteSpace(usuario.CodigoRedefinicaoSenhaHash)
            && usuario.CodigoRedefinicaoSenhaExpiraEmUtc is not null
            && usuario.CodigoRedefinicaoSenhaExpiraEmUtc.Value >= DateTime.UtcNow
            && senhaServico.Verificar(dto.Codigo.Trim(), usuario.CodigoRedefinicaoSenhaHash);

        if (!codigoValido)
        {
            throw new RegraNegocioException("Código de redefinição inválido ou expirado.");
        }

        usuario!.SenhaHash = senhaServico.GerarHash(dto.NovaSenha);
        usuario.CodigoRedefinicaoSenhaHash = null;
        usuario.CodigoRedefinicaoSenhaExpiraEmUtc = null;
        usuario.AtualizarDataModificacao();
        usuarioRepositorio.Atualizar(usuario);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    public async Task<UsuarioLogadoDto> ObterUsuarioAtualAsync(CancellationToken cancellationToken = default)
    {
        if (usuarioContexto.UsuarioId is null)
        {
            throw new RegraNegocioException("Usuário não autenticado.");
        }

        var usuario = await usuarioRepositorio.ObterPorIdAsync(usuarioContexto.UsuarioId.Value, cancellationToken);
        if (usuario is null || !usuario.Ativo)
        {
            throw new EntidadeNaoEncontradaException("Usuário não encontrado.");
        }

        return usuario.ParaDto();
    }

    private static void ValidarRegistro(RegistrarUsuarioRequisicaoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.TokenConvite))
        {
            throw new RegraNegocioException("Token do convite é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.Nome))
        {
            throw new RegraNegocioException("Nome é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new RegraNegocioException("E-mail é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.Senha) || dto.Senha.Length < 6)
        {
            throw new RegraNegocioException("A senha deve ter no mínimo 6 caracteres.");
        }
    }

    private static void ValidarConviteParaRegistro(ConviteCadastro conviteCadastro, string emailNormalizado)
    {
        if (!conviteCadastro.Ativo)
        {
            throw new RegraNegocioException("Este convite está cancelado.");
        }

        if (conviteCadastro.FoiUtilizado())
        {
            throw new RegraNegocioException("Este convite já foi utilizado.");
        }

        if (conviteCadastro.EstaExpirado(DateTime.UtcNow))
        {
            throw new RegraNegocioException("Este convite está expirado.");
        }

        if (!string.Equals(conviteCadastro.Email, emailNormalizado, StringComparison.OrdinalIgnoreCase))
        {
            throw new RegraNegocioException("O e-mail informado deve ser o mesmo do convite.");
        }
    }

    private static void VincularAtletaPendenteSeNecessario(Usuario usuario)
    {
        if (usuario.Perfil != PerfilUsuario.Atleta)
        {
            return;
        }

        var (nomeAtleta, apelidoAtleta) = NormalizadorNomeAtleta.NormalizarNomeEApelido(usuario.Nome, null);
        var atleta = new Atleta
        {
            Nome = nomeAtleta,
            Apelido = apelidoAtleta,
            Email = usuario.Email,
            CadastroPendente = true,
            Lado = LadoAtleta.Ambos
        };

        usuario.AtletaId = atleta.Id;
        usuario.Atleta = atleta;
    }

    private static string GerarCodigoRedefinicao()
    {
        var numero = RandomNumberGenerator.GetInt32(100000, 1000000);
        return numero.ToString();
    }
}
