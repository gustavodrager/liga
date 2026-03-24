using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class DuplaServico(
    IDuplaRepositorio duplaRepositorio,
    IAtletaRepositorio atletaRepositorio,
    IUnidadeTrabalho unidadeTrabalho
) : IDuplaServico
{
    public async Task<IReadOnlyList<DuplaDto>> ListarAsync(CancellationToken cancellationToken = default)
    {
        var duplas = await duplaRepositorio.ListarAsync(cancellationToken);
        return duplas.Select(x => x.ParaDto()).ToList();
    }

    public async Task<DuplaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dupla = await duplaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (dupla is null)
        {
            throw new EntidadeNaoEncontradaException("Dupla não encontrada.");
        }

        return dupla.ParaDto();
    }

    public async Task<DuplaDto> CriarAsync(CriarDuplaDto dto, CancellationToken cancellationToken = default)
    {
        var (atletaNormalizado1Id, atletaNormalizado2Id) = NormalizarAtletas(dto.Atleta1Id, dto.Atleta2Id);
        var (atleta1, atleta2) = await ValidarAtletasAsync(atletaNormalizado1Id, atletaNormalizado2Id, cancellationToken);

        var existente = await duplaRepositorio.ObterPorAtletasAsync(atletaNormalizado1Id, atletaNormalizado2Id, cancellationToken);
        if (existente is not null)
        {
            throw new RegraNegocioException("Já existe uma dupla cadastrada com estes atletas.");
        }

        var dupla = new Dupla
        {
            Nome = ObterNomeDupla(dto.Nome, atleta1.Nome, atleta2.Nome),
            Atleta1Id = atletaNormalizado1Id,
            Atleta2Id = atletaNormalizado2Id
        };

        await duplaRepositorio.AdicionarAsync(dupla, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var duplaCriada = await duplaRepositorio.ObterPorIdAsync(dupla.Id, cancellationToken);
        return duplaCriada!.ParaDto();
    }

    public async Task<DuplaDto> AtualizarAsync(Guid id, AtualizarDuplaDto dto, CancellationToken cancellationToken = default)
    {
        var dupla = await duplaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (dupla is null)
        {
            throw new EntidadeNaoEncontradaException("Dupla não encontrada.");
        }

        var (atletaNormalizado1Id, atletaNormalizado2Id) = NormalizarAtletas(dto.Atleta1Id, dto.Atleta2Id);
        var (atleta1, atleta2) = await ValidarAtletasAsync(atletaNormalizado1Id, atletaNormalizado2Id, cancellationToken);

        var existente = await duplaRepositorio.ObterPorAtletasAsync(atletaNormalizado1Id, atletaNormalizado2Id, cancellationToken);
        if (existente is not null && existente.Id != dupla.Id)
        {
            throw new RegraNegocioException("Já existe uma dupla cadastrada com estes atletas.");
        }

        dupla.Atleta1Id = atletaNormalizado1Id;
        dupla.Atleta2Id = atletaNormalizado2Id;
        dupla.Nome = ObterNomeDupla(dto.Nome, atleta1.Nome, atleta2.Nome);
        dupla.AtualizarDataModificacao();

        duplaRepositorio.Atualizar(dupla);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        var duplaAtualizada = await duplaRepositorio.ObterPorIdAsync(id, cancellationToken);
        return duplaAtualizada!.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dupla = await duplaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (dupla is null)
        {
            throw new EntidadeNaoEncontradaException("Dupla não encontrada.");
        }

        duplaRepositorio.Remover(dupla);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task<(Atleta atleta1, Atleta atleta2)> ValidarAtletasAsync(Guid atleta1Id, Guid atleta2Id, CancellationToken cancellationToken)
    {
        if (atleta1Id == Guid.Empty || atleta2Id == Guid.Empty)
        {
            throw new RegraNegocioException("Uma dupla deve possuir exatamente dois atletas válidos.");
        }

        if (atleta1Id == atleta2Id)
        {
            throw new RegraNegocioException("Uma dupla não pode ter o mesmo atleta duas vezes.");
        }

        var atleta1 = await atletaRepositorio.ObterPorIdAsync(atleta1Id, cancellationToken);
        var atleta2 = await atletaRepositorio.ObterPorIdAsync(atleta2Id, cancellationToken);

        if (atleta1 is null || atleta2 is null)
        {
            throw new RegraNegocioException("Os dois atletas da dupla devem existir.");
        }

        return (atleta1, atleta2);
    }

    private static string ObterNomeDupla(string? nome, string nomeAtleta1, string nomeAtleta2)
    {
        if (!string.IsNullOrWhiteSpace(nome))
        {
            return nome.Trim();
        }

        return $"{nomeAtleta1} / {nomeAtleta2}";
    }

    private static (Guid atleta1Id, Guid atleta2Id) NormalizarAtletas(Guid atleta1Id, Guid atleta2Id)
    {
        return atleta1Id.CompareTo(atleta2Id) <= 0
            ? (atleta1Id, atleta2Id)
            : (atleta2Id, atleta1Id);
    }
}
