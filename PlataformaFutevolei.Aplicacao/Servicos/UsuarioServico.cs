using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Aplicacao.Utilitarios;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class UsuarioServico(
    IUsuarioRepositorio usuarioRepositorio,
    IAtletaRepositorio atletaRepositorio,
    IUnidadeTrabalho unidadeTrabalho,
    IAutorizacaoUsuarioServico autorizacaoUsuarioServico
) : IUsuarioServico
{
    public async Task<UsuarioLogadoDto> ObterMeuUsuarioAsync(CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        return usuario.ParaDto();
    }

    public async Task<UsuarioLogadoDto> AtualizarMeuUsuarioAsync(
        AtualizarMeuUsuarioDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Nome))
        {
            throw new RegraNegocioException("Nome é obrigatório.");
        }

        var usuarioAtual = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var usuario = await usuarioRepositorio.ObterPorIdParaAtualizacaoAsync(usuarioAtual.Id, cancellationToken)
            ?? throw new EntidadeNaoEncontradaException("Usuário não encontrado.");

        usuario.Nome = dto.Nome.Trim();
        if (usuario.Perfil == PerfilUsuario.Atleta && usuario.Atleta is not null)
        {
            var (nomeAtleta, apelidoAtleta) = NormalizadorNomeAtleta.NormalizarNomeEApelido(usuario.Nome, null);
            usuario.Atleta.Nome = nomeAtleta;
            usuario.Atleta.Apelido = apelidoAtleta;
            usuario.Atleta.Email = usuario.Email;
            usuario.Atleta.AtualizarDataModificacao();
        }

        usuario.AtualizarDataModificacao();

        usuarioRepositorio.Atualizar(usuario);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var atualizado = await usuarioRepositorio.ObterPorIdAsync(usuario.Id, cancellationToken)
            ?? throw new EntidadeNaoEncontradaException("Usuário não encontrado.");
        return atualizado.ParaDto();
    }

    public async Task<UsuarioLogadoDto> VincularMeuAtletaAsync(
        VincularAtletaUsuarioDto dto,
        CancellationToken cancellationToken = default)
    {
        if (dto.AtletaId == Guid.Empty)
        {
            throw new RegraNegocioException("Atleta é obrigatório.");
        }

        var usuarioAtual = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        if (usuarioAtual.Perfil == PerfilUsuario.Atleta)
        {
            throw new RegraNegocioException("Usuário comum só pode criar o próprio atleta pelo Meu Perfil.");
        }

        var usuario = await usuarioRepositorio.ObterPorIdParaAtualizacaoAsync(usuarioAtual.Id, cancellationToken)
            ?? throw new EntidadeNaoEncontradaException("Usuário não encontrado.");
        var atleta = await atletaRepositorio.ObterPorIdAsync(dto.AtletaId, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        var usuarioExistente = await usuarioRepositorio.ObterPorAtletaIdAsync(dto.AtletaId, cancellationToken);
        if (usuarioExistente is not null && usuarioExistente.Id != usuario.Id)
        {
            throw new RegraNegocioException("Este atleta já está vinculado a outro usuário.");
        }

        usuario.AtletaId = atleta.Id;
        atleta.Email = usuario.Email;
        atleta.CadastroPendente = false;
        atleta.AtualizarDataModificacao();

        usuario.AtualizarDataModificacao();
        usuarioRepositorio.Atualizar(usuario);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var atualizado = await usuarioRepositorio.ObterPorIdAsync(usuario.Id, cancellationToken)
            ?? throw new EntidadeNaoEncontradaException("Usuário não encontrado.");
        return atualizado.ParaDto();
    }

    public async Task<IReadOnlyList<UsuarioDto>> ListarAsync(
        string? nome,
        string? email,
        CancellationToken cancellationToken = default)
    {
        await autorizacaoUsuarioServico.GarantirAdministradorAsync(cancellationToken);
        var usuarios = await usuarioRepositorio.ListarAsync(nome, email, cancellationToken);
        return usuarios.Select(x => x.ParaAdminDto()).ToList();
    }

    public async Task<UsuarioDto> AtualizarAsync(
        Guid id,
        AtualizarUsuarioDto dto,
        CancellationToken cancellationToken = default)
    {
        await autorizacaoUsuarioServico.GarantirAdministradorAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(dto.Nome))
        {
            throw new RegraNegocioException("Nome é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new RegraNegocioException("E-mail é obrigatório.");
        }

        if (!Enum.IsDefined(dto.Perfil))
        {
            throw new RegraNegocioException("Perfil inválido.");
        }

        var emailNormalizado = dto.Email.Trim().ToLowerInvariant();
        var usuario = await usuarioRepositorio.ObterPorIdParaAtualizacaoAsync(id, cancellationToken);
        if (usuario is null)
        {
            throw new EntidadeNaoEncontradaException("Usuário não encontrado.");
        }

        var usuarioMesmoEmail = await usuarioRepositorio.ObterPorEmailAsync(emailNormalizado, cancellationToken);
        if (usuarioMesmoEmail is not null && usuarioMesmoEmail.Id != usuario.Id)
        {
            throw new RegraNegocioException("Já existe um usuário cadastrado com este e-mail.");
        }

        if (dto.AtletaId.HasValue)
        {
            var atleta = await atletaRepositorio.ObterPorIdAsync(dto.AtletaId.Value, cancellationToken);
            if (atleta is null)
            {
                throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
            }

            var usuarioComAtleta = await usuarioRepositorio.ObterPorAtletaIdAsync(dto.AtletaId.Value, cancellationToken);
            if (usuarioComAtleta is not null && usuarioComAtleta.Id != usuario.Id)
            {
                throw new RegraNegocioException("Este atleta já está vinculado a outro usuário.");
            }
        }

        usuario.Nome = dto.Nome.Trim();
        usuario.Email = emailNormalizado;
        usuario.Perfil = dto.Perfil;
        usuario.Ativo = dto.Ativo;
        usuario.AtletaId = dto.AtletaId;
        usuario.AtualizarDataModificacao();

        if (dto.AtletaId.HasValue)
        {
            var atleta = await atletaRepositorio.ObterPorIdAsync(dto.AtletaId.Value, cancellationToken)
                ?? throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
            atleta.Email = emailNormalizado;
            atleta.CadastroPendente = false;
            atleta.AtualizarDataModificacao();
        }

        usuarioRepositorio.Atualizar(usuario);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var atualizado = await usuarioRepositorio.ObterPorIdAsync(usuario.Id, cancellationToken)
            ?? throw new EntidadeNaoEncontradaException("Usuário não encontrado.");
        return atualizado.ParaAdminDto();
    }
}
