using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Seguranca;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class CompeticaoServico(
    ICompeticaoRepositorio competicaoRepositorio,
    ICategoriaCompeticaoRepositorio categoriaRepositorio,
    IGrupoAtletaRepositorio grupoAtletaRepositorio,
    ILigaRepositorio ligaRepositorio,
    ILocalRepositorio localRepositorio,
    IRegraCompeticaoRepositorio regraRepositorio,
    IUnidadeTrabalho unidadeTrabalho,
    IAutorizacaoUsuarioServico autorizacaoUsuarioServico
) : ICompeticaoServico
{
    public async Task<IReadOnlyList<CompeticaoDto>> ListarAsync(CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var competicoes = await competicaoRepositorio.ListarAsync(cancellationToken);
        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            competicoes = competicoes
                .Where(x => (AceitaInscricoes(x.Tipo) && x.InscricoesAbertas) || x.Tipo == TipoCompeticao.Grupo)
                .OrderBy(x => x.DataInicio)
                .ThenBy(x => x.Nome)
                .ToList();

            return competicoes.Select(x => x.ParaDto()).ToList();
        }

        if (usuario.Perfil == PerfilUsuario.Organizador)
        {
            competicoes = competicoes.Where(x => x.UsuarioOrganizadorId == usuario.Id).ToList();
        }

        return competicoes.Select(x => x.ParaDto()).ToList();
    }

    public async Task<CompeticaoDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var competicao = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (competicao is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            if (competicao.Tipo == TipoCompeticao.Grupo)
            {
                return competicao.ParaDto();
            }

            if (!AceitaInscricoes(competicao.Tipo) || !competicao.InscricoesAbertas)
            {
                throw new RegraNegocioException("Atletas só podem visualizar grupos e competições com inscrições abertas.");
            }

            return competicao.ParaDto();
        }

        if (usuario.Perfil == PerfilUsuario.Organizador && competicao.UsuarioOrganizadorId != usuario.Id)
        {
            throw new RegraNegocioException("O organizador só pode acessar competições vinculadas ao próprio usuário.");
        }

        return competicao.ParaDto();
    }

    public async Task<CompeticaoDto> CriarAsync(CriarCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            if (dto.Tipo != TipoCompeticao.Grupo)
            {
                throw new RegraNegocioException("Usuário com perfil atleta só pode criar grupos.");
            }
        }
        else if (usuario.Perfil is not PerfilUsuario.Administrador and not PerfilUsuario.Organizador)
        {
            throw new RegraNegocioException("Apenas administradores, organizadores ou atletas para grupos podem criar competições.");
        }

        var dataInicioUtc = NormalizarParaUtc(dto.DataInicio);
        var dataFimUtc = dto.DataFim.HasValue ? (DateTime?)NormalizarParaUtc(dto.DataFim.Value) : null;

        Validar(dto.Nome, dataInicioUtc, dataFimUtc);
        await ValidarLigaAsync(dto.LigaId, cancellationToken);
        await ValidarLocalAsync(dto.LocalId, cancellationToken);
        await ValidarRegraAsync(dto.RegraCompeticaoId, cancellationToken);

        var competicao = new Competicao
        {
            Nome = dto.Nome.Trim(),
            Tipo = dto.Tipo,
            Descricao = dto.Descricao?.Trim(),
            DataInicio = dataInicioUtc,
            DataFim = dataFimUtc,
            LigaId = dto.LigaId,
            LocalId = dto.LocalId,
            RegraCompeticaoId = dto.RegraCompeticaoId,
            UsuarioOrganizadorId = usuario.Perfil is PerfilUsuario.Organizador or PerfilUsuario.Atleta ? usuario.Id : null,
            ContaRankingLiga = dto.LigaId.HasValue,
            InscricoesAbertas = ObterInscricoesAbertasParaCriacao(dto.Tipo, dto.InscricoesAbertas)
        };

        await competicaoRepositorio.AdicionarAsync(competicao, cancellationToken);

        if (dto.Tipo == TipoCompeticao.Grupo)
        {
            await categoriaRepositorio.AdicionarAsync(new CategoriaCompeticao
            {
                CompeticaoId = competicao.Id,
                Nome = "Geral",
                Genero = GeneroCategoria.Misto,
                Nivel = NivelCategoria.Livre,
                PesoRanking = 1m
            }, cancellationToken);

            if (usuario.AtletaId.HasValue && await grupoAtletaRepositorio.ObterPorCompeticaoEAtletaAsync(competicao.Id, usuario.AtletaId.Value, cancellationToken) is null)
            {
                await grupoAtletaRepositorio.AdicionarAsync(new GrupoAtleta
                {
                    CompeticaoId = competicao.Id,
                    AtletaId = usuario.AtletaId.Value
                }, cancellationToken);
            }
        }

        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var competicaoCriada = await competicaoRepositorio.ObterPorIdAsync(competicao.Id, cancellationToken);
        return competicaoCriada!.ParaDto();
    }

    public async Task<CompeticaoDto> AtualizarAsync(Guid id, AtualizarCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(id, cancellationToken);
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        if (usuario.Perfil == PerfilUsuario.Atleta && dto.Tipo != TipoCompeticao.Grupo)
        {
            throw new RegraNegocioException("Usuário com perfil atleta só pode manter competições do tipo grupo.");
        }

        var dataInicioUtc = NormalizarParaUtc(dto.DataInicio);
        var dataFimUtc = dto.DataFim.HasValue ? (DateTime?)NormalizarParaUtc(dto.DataFim.Value) : null;

        Validar(dto.Nome, dataInicioUtc, dataFimUtc);
        await ValidarLigaAsync(dto.LigaId, cancellationToken);
        await ValidarLocalAsync(dto.LocalId, cancellationToken);
        await ValidarRegraAsync(dto.RegraCompeticaoId, cancellationToken);

        var competicao = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (competicao is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        competicao.Nome = dto.Nome.Trim();
        competicao.Tipo = dto.Tipo;
        competicao.Descricao = dto.Descricao?.Trim();
        competicao.DataInicio = dataInicioUtc;
        competicao.DataFim = dataFimUtc;
        competicao.LigaId = dto.LigaId;
        competicao.LocalId = dto.LocalId;
        competicao.RegraCompeticaoId = dto.RegraCompeticaoId;
        competicao.ContaRankingLiga = dto.LigaId.HasValue;
        competicao.InscricoesAbertas = ObterInscricoesAbertasParaAtualizacao(
            dto.Tipo,
            dto.InscricoesAbertas,
            competicao.InscricoesAbertas);
        competicao.AtualizarDataModificacao();

        competicaoRepositorio.Atualizar(competicao);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var competicaoAtualizada = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        return competicaoAtualizada!.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(id, cancellationToken);
        var competicao = await competicaoRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (competicao is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        competicaoRepositorio.Remover(competicao);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task ValidarLigaAsync(Guid? ligaId, CancellationToken cancellationToken)
    {
        if (!ligaId.HasValue)
        {
            return;
        }

        var liga = await ligaRepositorio.ObterPorIdAsync(ligaId.Value, cancellationToken);
        if (liga is null)
        {
            throw new RegraNegocioException("A liga informada para a competição não foi encontrada.");
        }
    }

    private async Task ValidarLocalAsync(Guid? localId, CancellationToken cancellationToken)
    {
        if (!localId.HasValue)
        {
            return;
        }

        var local = await localRepositorio.ObterPorIdAsync(localId.Value, cancellationToken);
        if (local is null)
        {
            throw new RegraNegocioException("O local informado para a competição não foi encontrado.");
        }
    }

    private async Task ValidarRegraAsync(Guid? regraCompeticaoId, CancellationToken cancellationToken)
    {
        if (!regraCompeticaoId.HasValue)
        {
            return;
        }

        var regra = await regraRepositorio.ObterPorIdAsync(regraCompeticaoId.Value, cancellationToken);
        if (regra is null)
        {
            throw new RegraNegocioException("A regra informada para a competição não foi encontrada.");
        }
    }

    private static DateTime NormalizarParaUtc(DateTime data)
    {
        return data.Kind switch
        {
            DateTimeKind.Utc => data,
            DateTimeKind.Local => data.ToUniversalTime(),
            _ => DateTime.SpecifyKind(data, DateTimeKind.Utc)
        };
    }

    private static bool ObterInscricoesAbertasParaCriacao(TipoCompeticao tipo, bool? inscricoesAbertas)
    {
        if (!AceitaInscricoes(tipo))
        {
            if (inscricoesAbertas is true)
            {
                throw new RegraNegocioException("Apenas campeonatos e eventos podem ter inscrições abertas.");
            }

            return false;
        }

        return inscricoesAbertas ?? true;
    }

    private static bool ObterInscricoesAbertasParaAtualizacao(
        TipoCompeticao tipo,
        bool? inscricoesAbertas,
        bool valorAtual)
    {
        if (!AceitaInscricoes(tipo))
        {
            if (inscricoesAbertas is true)
            {
                throw new RegraNegocioException("Apenas campeonatos e eventos podem ter inscrições abertas.");
            }

            return false;
        }

        return inscricoesAbertas ?? valorAtual;
    }

    private static bool AceitaInscricoes(TipoCompeticao tipo)
    {
        return tipo is TipoCompeticao.Campeonato or TipoCompeticao.Evento;
    }

    private static void Validar(
        string nome,
        DateTime dataInicio,
        DateTime? dataFim)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome da competição é obrigatório.");
        }

        if (dataInicio == default)
        {
            throw new RegraNegocioException("Data de início da competição é obrigatória.");
        }

        if (dataFim.HasValue && dataFim.Value < dataInicio)
        {
            throw new RegraNegocioException("A data fim não pode ser menor que a data de início.");
        }
    }
}
