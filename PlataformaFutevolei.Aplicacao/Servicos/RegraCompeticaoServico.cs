using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class RegraCompeticaoServico(
    IRegraCompeticaoRepositorio regraRepositorio,
    IUnidadeTrabalho unidadeTrabalho
) : IRegraCompeticaoServico
{
    public async Task<IReadOnlyList<RegraCompeticaoDto>> ListarAsync(CancellationToken cancellationToken = default)
    {
        var regras = await regraRepositorio.ListarAsync(cancellationToken);
        return regras.Select(x => x.ParaDto()).ToList();
    }

    public async Task<RegraCompeticaoDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var regra = await regraRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (regra is null)
        {
            throw new EntidadeNaoEncontradaException("Regra não encontrada.");
        }

        return regra.ParaDto();
    }

    public async Task<RegraCompeticaoDto> CriarAsync(CriarRegraCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        var nome = await ValidarAsync(
            dto.Nome,
            dto.PontosMinimosPartida,
            dto.DiferencaMinimaPartida,
            dto.PontosVitoria,
            dto.PontosDerrota,
            dto.PontosParticipacao,
            dto.PontosPrimeiroLugar,
            dto.PontosSegundoLugar,
            dto.PontosTerceiroLugar,
            null,
            cancellationToken);

        var regra = new RegraCompeticao
        {
            Nome = nome,
            Descricao = dto.Descricao?.Trim(),
            PontosMinimosPartida = dto.PontosMinimosPartida,
            DiferencaMinimaPartida = dto.DiferencaMinimaPartida,
            PermiteEmpate = dto.PermiteEmpate,
            PontosVitoria = dto.PontosVitoria,
            PontosDerrota = dto.PontosDerrota,
            PontosParticipacao = dto.PontosParticipacao,
            PontosPrimeiroLugar = dto.PontosPrimeiroLugar,
            PontosSegundoLugar = dto.PontosSegundoLugar,
            PontosTerceiroLugar = dto.PontosTerceiroLugar
        };

        await regraRepositorio.AdicionarAsync(regra, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        return regra.ParaDto();
    }

    public async Task<RegraCompeticaoDto> AtualizarAsync(Guid id, AtualizarRegraCompeticaoDto dto, CancellationToken cancellationToken = default)
    {
        var regra = await regraRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (regra is null)
        {
            throw new EntidadeNaoEncontradaException("Regra não encontrada.");
        }

        regra.Nome = await ValidarAsync(
            dto.Nome,
            dto.PontosMinimosPartida,
            dto.DiferencaMinimaPartida,
            dto.PontosVitoria,
            dto.PontosDerrota,
            dto.PontosParticipacao,
            dto.PontosPrimeiroLugar,
            dto.PontosSegundoLugar,
            dto.PontosTerceiroLugar,
            id,
            cancellationToken);
        regra.Descricao = dto.Descricao?.Trim();
        regra.PontosMinimosPartida = dto.PontosMinimosPartida;
        regra.DiferencaMinimaPartida = dto.DiferencaMinimaPartida;
        regra.PermiteEmpate = dto.PermiteEmpate;
        regra.PontosVitoria = dto.PontosVitoria;
        regra.PontosDerrota = dto.PontosDerrota;
        regra.PontosParticipacao = dto.PontosParticipacao;
        regra.PontosPrimeiroLugar = dto.PontosPrimeiroLugar;
        regra.PontosSegundoLugar = dto.PontosSegundoLugar;
        regra.PontosTerceiroLugar = dto.PontosTerceiroLugar;
        regra.AtualizarDataModificacao();

        regraRepositorio.Atualizar(regra);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        return regra.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var regra = await regraRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (regra is null)
        {
            throw new EntidadeNaoEncontradaException("Regra não encontrada.");
        }

        regraRepositorio.Remover(regra);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task<string> ValidarAsync(
        string nome,
        int pontosMinimosPartida,
        int diferencaMinimaPartida,
        decimal pontosVitoria,
        decimal pontosDerrota,
        decimal pontosParticipacao,
        decimal pontosPrimeiroLugar,
        decimal pontosSegundoLugar,
        decimal pontosTerceiroLugar,
        Guid? idAtual,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome da regra é obrigatório.");
        }

        if (pontosMinimosPartida <= 0)
        {
            throw new RegraNegocioException("Pontos mínimos da partida devem ser maiores que zero.");
        }

        if (diferencaMinimaPartida <= 0)
        {
            throw new RegraNegocioException("Diferença mínima da partida deve ser maior que zero.");
        }

        if (pontosVitoria < 0)
        {
            throw new RegraNegocioException("Pontuação por vitória não pode ser negativa.");
        }

        if (pontosDerrota < 0)
        {
            throw new RegraNegocioException("Pontuação por derrota não pode ser negativa.");
        }

        if (pontosParticipacao < 0)
        {
            throw new RegraNegocioException("Pontuação por participação não pode ser negativa.");
        }

        if (pontosPrimeiroLugar < 0 || pontosSegundoLugar < 0 || pontosTerceiroLugar < 0)
        {
            throw new RegraNegocioException("Pontuação por colocação não pode ser negativa.");
        }

        if (pontosPrimeiroLugar < pontosSegundoLugar)
        {
            throw new RegraNegocioException("A pontuação de 1º lugar não pode ser menor que a de 2º lugar.");
        }

        if (pontosSegundoLugar < pontosTerceiroLugar)
        {
            throw new RegraNegocioException("A pontuação de 2º lugar não pode ser menor que a de 3º lugar.");
        }

        var nomeNormalizado = nome.Trim();
        var existente = await regraRepositorio.ObterPorNomeAsync(nomeNormalizado, cancellationToken);
        if (existente is not null && existente.Id != idAtual)
        {
            throw new RegraNegocioException("Já existe uma regra cadastrada com este nome.");
        }

        return nomeNormalizado;
    }
}
