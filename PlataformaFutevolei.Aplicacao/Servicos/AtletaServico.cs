using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Aplicacao.Utilitarios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class AtletaServico(
    IAtletaRepositorio atletaRepositorio,
    IUsuarioRepositorio usuarioRepositorio,
    IUnidadeTrabalho unidadeTrabalho,
    IAutorizacaoUsuarioServico autorizacaoUsuarioServico
) : IAtletaServico
{
    public async Task<IReadOnlyList<AtletaDto>> ListarAsync(
        bool somenteInscritosMinhasCompeticoes = false,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        if (usuario.Perfil is not PerfilUsuario.Administrador and not PerfilUsuario.Organizador)
        {
            throw new RegraNegocioException("Apenas administradores ou organizadores podem executar esta operação.");
        }

        var atletas = somenteInscritosMinhasCompeticoes && usuario.Perfil == PerfilUsuario.Organizador
            ? await atletaRepositorio.ListarInscritosPorOrganizadorAsync(usuario.Id, cancellationToken)
            : await atletaRepositorio.ListarAsync(cancellationToken);

        return atletas.Select(x => x.ParaDto()).ToList();
    }

    public async Task<IReadOnlyList<AtletaResumoDto>> BuscarAsync(string? termo, CancellationToken cancellationToken = default)
    {
        await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var atletas = await atletaRepositorio.BuscarAsync(termo, cancellationToken);
        return atletas.Select(x => x.ParaResumoDto()).ToList();
    }

    public async Task<AtletaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            await autorizacaoUsuarioServico.GarantirAcessoAtletaAsync(id, cancellationToken);
        }
        else if (usuario.Perfil == PerfilUsuario.Organizador)
        {
            await GarantirAcessoOrganizadorAsync(id, usuario.Id, cancellationToken);
        }

        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        return atleta.ParaDto();
    }

    public async Task<AtletaDto> CriarAsync(CriarAtletaDto dto, CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var usuarioComum = usuario.Perfil == PerfilUsuario.Atleta;
        if (usuarioComum && usuario.AtletaId.HasValue)
        {
            var atletaExistente = await atletaRepositorio.ObterPorIdAsync(usuario.AtletaId.Value, cancellationToken);
            if (atletaExistente is not null)
            {
                throw new RegraNegocioException("Este usuário já possui um atleta vinculado.");
            }

            usuario.AtletaId = null;
        }

        var dados = usuarioComum
            ? Normalizar(usuario.Nome, dto.Apelido, dto.Telefone, usuario.Email, dto.Instagram, dto.Cpf)
            : Normalizar(dto.Nome, dto.Apelido, dto.Telefone, dto.Email, dto.Instagram, dto.Cpf);
        var dataNascimento = Validar(dados.Nome, dados.Cpf, dto.Lado, dto.DataNascimento, dto.CadastroPendente, dados.PossuiIdentificador);

        var atleta = new Atleta
        {
            Nome = dados.Nome,
            Apelido = dados.Apelido,
            Telefone = dados.Telefone,
            Email = dados.Email,
            Instagram = dados.Instagram,
            Cpf = dados.Cpf,
            CadastroPendente = dto.CadastroPendente,
            Lado = dto.Lado,
            DataNascimento = dataNascimento
        };

        await atletaRepositorio.AdicionarAsync(atleta, cancellationToken);
        if (usuarioComum)
        {
            usuario.AtletaId = atleta.Id;
            usuario.AtualizarDataModificacao();
            usuarioRepositorio.Atualizar(usuario);
        }

        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        return atleta.ParaDto();
    }

    public async Task<AtletaDto> AtualizarAsync(Guid id, AtualizarAtletaDto dto, CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var usuarioComum = usuario.Perfil == PerfilUsuario.Atleta;
        if (usuarioComum)
        {
            await autorizacaoUsuarioServico.GarantirAcessoAtletaAsync(id, cancellationToken);
        }
        else if (usuario.Perfil == PerfilUsuario.Organizador)
        {
            await GarantirAcessoOrganizadorAsync(id, usuario.Id, cancellationToken);
        }

        var dados = usuarioComum
            ? Normalizar(usuario.Nome, dto.Apelido, dto.Telefone, usuario.Email, dto.Instagram, dto.Cpf)
            : Normalizar(dto.Nome, dto.Apelido, dto.Telefone, dto.Email, dto.Instagram, dto.Cpf);
        var dataNascimento = Validar(dados.Nome, dados.Cpf, dto.Lado, dto.DataNascimento, dto.CadastroPendente, dados.PossuiIdentificador);
        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        atleta.Nome = dados.Nome;
        atleta.Apelido = dados.Apelido;
        atleta.Telefone = dados.Telefone;
        atleta.Email = dados.Email;
        atleta.Instagram = dados.Instagram;
        atleta.Cpf = dados.Cpf;
        atleta.CadastroPendente = dto.CadastroPendente;
        atleta.Lado = dto.Lado;
        atleta.DataNascimento = dataNascimento;
        atleta.AtualizarDataModificacao();

        atletaRepositorio.Atualizar(atleta);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        return atleta.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await autorizacaoUsuarioServico.GarantirAdministradorAsync(cancellationToken);
        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        atletaRepositorio.Remover(atleta);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task GarantirAcessoOrganizadorAsync(
        Guid atletaId,
        Guid usuarioOrganizadorId,
        CancellationToken cancellationToken)
    {
        var pertenceAoOrganizador = await atletaRepositorio.PertenceAoOrganizadorAsync(atletaId, usuarioOrganizadorId, cancellationToken);
        if (!pertenceAoOrganizador)
        {
            throw new RegraNegocioException("O organizador só pode alterar atletas inscritos em competições vinculadas ao próprio usuário.");
        }
    }

    private static (
        string Nome,
        string Apelido,
        string? Telefone,
        string? Email,
        string? Instagram,
        string? Cpf,
        bool PossuiIdentificador
    ) Normalizar(
        string nome,
        string? apelido,
        string? telefone,
        string? email,
        string? instagram,
        string? cpf)
    {
        var (nomeNormalizado, apelidoNormalizado) = NormalizadorNomeAtleta.NormalizarNomeEApelido(nome, apelido);
        var telefoneNormalizado = NormalizadorNomeAtleta.NormalizarTexto(telefone);
        var emailNormalizado = NormalizadorNomeAtleta.NormalizarTexto(email).ToLowerInvariant();
        var instagramNormalizado = NormalizadorNomeAtleta.NormalizarTexto(instagram);
        var cpfNormalizado = ValidadorCpf.Normalizar(cpf);

        return (
            nomeNormalizado,
            apelidoNormalizado,
            string.IsNullOrWhiteSpace(telefoneNormalizado) ? null : telefoneNormalizado,
            string.IsNullOrWhiteSpace(emailNormalizado) ? null : emailNormalizado,
            string.IsNullOrWhiteSpace(instagramNormalizado) ? null : instagramNormalizado,
            string.IsNullOrWhiteSpace(cpfNormalizado) ? null : cpfNormalizado,
            !string.IsNullOrWhiteSpace(telefoneNormalizado)
                || !string.IsNullOrWhiteSpace(emailNormalizado)
                || !string.IsNullOrWhiteSpace(instagramNormalizado)
                || !string.IsNullOrWhiteSpace(cpfNormalizado)
        );
    }

    private static DateTime? Validar(
        string nome,
        string? cpf,
        LadoAtleta lado,
        DateTime? dataNascimento,
        bool cadastroPendente,
        bool possuiIdentificador)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome do atleta é obrigatório.");
        }

        if (!cadastroPendente && !possuiIdentificador)
        {
            throw new RegraNegocioException("Informe ao menos um identificador do atleta: telefone, e-mail, Instagram ou CPF.");
        }

        if (!string.IsNullOrWhiteSpace(cpf) && !ValidadorCpf.EhValido(cpf))
        {
            throw new RegraNegocioException("CPF inválido.");
        }

        if (!Enum.IsDefined(lado))
        {
            throw new RegraNegocioException("Lado do atleta inválido.");
        }

        if (!dataNascimento.HasValue)
        {
            return null;
        }

        var dataNormalizada = dataNascimento.Value.Date;
        if (dataNormalizada > DateTime.UtcNow.Date)
        {
            throw new RegraNegocioException("Data de nascimento não pode ser futura.");
        }

        return dataNormalizada;
    }
}
