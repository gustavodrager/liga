using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Dominio.Entidades;

namespace PlataformaFutevolei.Aplicacao.Servicos;

public class AtletaServico(
    IAtletaRepositorio atletaRepositorio,
    IUnidadeTrabalho unidadeTrabalho
) : IAtletaServico
{
    public async Task<IReadOnlyList<AtletaDto>> ListarAsync(CancellationToken cancellationToken = default)
    {
        var atletas = await atletaRepositorio.ListarAsync(cancellationToken);
        return atletas.Select(x => x.ParaDto()).ToList();
    }

    public async Task<AtletaDto> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        return atleta.ParaDto();
    }

    public async Task<AtletaDto> CriarAsync(CriarAtletaDto dto, CancellationToken cancellationToken = default)
    {
        Validar(dto.Nome);

        var atleta = new Atleta
        {
            Nome = dto.Nome.Trim(),
            Apelido = dto.Apelido?.Trim(),
            Cidade = dto.Cidade?.Trim()
        };

        await atletaRepositorio.AdicionarAsync(atleta, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        return atleta.ParaDto();
    }

    public async Task<AtletaDto> AtualizarAsync(Guid id, AtualizarAtletaDto dto, CancellationToken cancellationToken = default)
    {
        Validar(dto.Nome);
        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        atleta.Nome = dto.Nome.Trim();
        atleta.Apelido = dto.Apelido?.Trim();
        atleta.Cidade = dto.Cidade?.Trim();
        atleta.AtualizarDataModificacao();

        atletaRepositorio.Atualizar(atleta);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        return atleta.ParaDto();
    }

    public async Task RemoverAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        atletaRepositorio.Remover(atleta);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private static void Validar(string nome)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome do atleta é obrigatório.");
        }
    }
}
