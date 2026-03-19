using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class PartidaServico(
    IPartidaRepositorio partidaRepositorio,
    ICategoriaCompeticaoRepositorio categoriaRepositorio,
    IDuplaRepositorio duplaRepositorio,
    IUnidadeTrabalho unidadeTrabalho
) : IPartidaServico
{
    public async Task<IReadOnlyList<PartidaDto>> ListarPorCategoriaAsync(Guid categoriaId, CancellationToken cancellationToken = default)
    {
        var partidas = await partidaRepositorio.ListarPorCategoriaAsync(categoriaId, cancellationToken);
        return partidas.Select(x => x.ParaDto()).ToList();
    }

    public async Task<PartidaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var partida = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (partida is null)
        {
            throw new EntidadeNaoEncontradaException("Partida não encontrada.");
        }

        return partida.ParaDto();
    }

    public async Task<PartidaDto> CriarAsync(CriarPartidaDto dto, CancellationToken cancellationToken = default)
    {
        var categoria = await ValidarRelacionamentosAsync(
            dto.CategoriaCompeticaoId,
            dto.DuplaAId,
            dto.DuplaBId,
            dto.DuplaVencedoraId,
            cancellationToken
        );

        var partida = new Partida
        {
            CategoriaCompeticaoId = dto.CategoriaCompeticaoId,
            DuplaAId = dto.DuplaAId,
            DuplaBId = dto.DuplaBId,
            PlacarDuplaA = dto.PlacarDuplaA,
            PlacarDuplaB = dto.PlacarDuplaB,
            DuplaVencedoraId = dto.DuplaVencedoraId,
            DataPartida = dto.DataPartida == default ? DateTime.UtcNow : dto.DataPartida,
            Observacoes = dto.Observacoes?.Trim(),
            CategoriaCompeticao = categoria
        };

        ValidarResultadoPartida(partida);

        await partidaRepositorio.AdicionarAsync(partida, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var partidaCriada = await partidaRepositorio.ObterPorIdAsync(partida.Id, cancellationToken);
        return partidaCriada!.ParaDto();
    }

    public async Task<PartidaDto> AtualizarAsync(Guid id, AtualizarPartidaDto dto, CancellationToken cancellationToken = default)
    {
        var partida = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (partida is null)
        {
            throw new EntidadeNaoEncontradaException("Partida não encontrada.");
        }

        var categoria = await ValidarRelacionamentosAsync(
            dto.CategoriaCompeticaoId,
            dto.DuplaAId,
            dto.DuplaBId,
            dto.DuplaVencedoraId,
            cancellationToken
        );

        partida.CategoriaCompeticaoId = dto.CategoriaCompeticaoId;
        partida.DuplaAId = dto.DuplaAId;
        partida.DuplaBId = dto.DuplaBId;
        partida.PlacarDuplaA = dto.PlacarDuplaA;
        partida.PlacarDuplaB = dto.PlacarDuplaB;
        partida.DuplaVencedoraId = dto.DuplaVencedoraId;
        partida.DataPartida = dto.DataPartida == default ? partida.DataPartida : dto.DataPartida;
        partida.Observacoes = dto.Observacoes?.Trim();
        partida.CategoriaCompeticao = categoria;
        ValidarResultadoPartida(partida);
        partida.AtualizarDataModificacao();

        partidaRepositorio.Atualizar(partida);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var partidaAtualizada = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        return partidaAtualizada!.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var partida = await partidaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (partida is null)
        {
            throw new EntidadeNaoEncontradaException("Partida não encontrada.");
        }

        partidaRepositorio.Remover(partida);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task<CategoriaCompeticao> ValidarRelacionamentosAsync(
        Guid categoriaCompeticaoId,
        Guid duplaAId,
        Guid duplaBId,
        Guid duplaVencedoraId,
        CancellationToken cancellationToken
    )
    {
        if (duplaAId == duplaBId)
        {
            throw new RegraNegocioException("Uma partida não pode ter a mesma dupla em ambos os lados.");
        }

        if (duplaVencedoraId != duplaAId && duplaVencedoraId != duplaBId)
        {
            throw new RegraNegocioException("A dupla vencedora deve ser uma das duplas participantes.");
        }

        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaCompeticaoId, cancellationToken);
        if (categoria is null)
        {
            throw new RegraNegocioException("Toda partida deve pertencer a uma categoria.");
        }

        var duplaA = await duplaRepositorio.ObterPorIdAsync(duplaAId, cancellationToken);
        var duplaB = await duplaRepositorio.ObterPorIdAsync(duplaBId, cancellationToken);
        if (duplaA is null || duplaB is null)
        {
            throw new RegraNegocioException("As duplas da partida devem estar cadastradas.");
        }

        return categoria;
    }

    private static void ValidarResultadoPartida(Partida partida)
    {
        if (partida.PlacarDuplaA < 0 || partida.PlacarDuplaB < 0)
        {
            throw new RegraNegocioException("Placar não pode ser negativo.");
        }

        if (partida.PlacarDuplaA == partida.PlacarDuplaB)
        {
            throw new RegraNegocioException("Uma partida não pode terminar empatada.");
        }

        if (partida.ObterMaiorPlacar() < 18)
        {
            throw new RegraNegocioException("A dupla vencedora deve alcançar no mínimo 18 pontos.");
        }

        if (partida.ObterDiferencaPlacar() < 2)
        {
            throw new RegraNegocioException("A partida deve terminar com diferença mínima de 2 pontos.");
        }

        if (partida.ObterDuplaVencedoraPorPlacar() != partida.DuplaVencedoraId)
        {
            throw new RegraNegocioException("A dupla vencedora deve ser coerente com o placar informado.");
        }
    }
}
