using PlataformaFutevolei.Aplicacao.DTOs;
using PlataformaFutevolei.Aplicacao.Excecoes;
using PlataformaFutevolei.Aplicacao.Interfaces.Repositorios;
using PlataformaFutevolei.Aplicacao.Interfaces.Servicos;
using PlataformaFutevolei.Aplicacao.Mapeadores;
using PlataformaFutevolei.Aplicacao.Utilitarios;
using PlataformaFutevolei.Dominio.Entidades;
using PlataformaFutevolei.Dominio.Enums;

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
        var (nome, apelido) = NormalizadorNomeAtleta.NormalizarNomeEApelido(dto.Nome, dto.Apelido);
        var dataNascimento = Validar(nome, dto.Lado, dto.DataNascimento);

        var atleta = new Atleta
        {
            Nome = nome,
            Apelido = apelido,
            CadastroPendente = dto.CadastroPendente,
            Lado = dto.Lado,
            DataNascimento = dataNascimento
        };

        await atletaRepositorio.AdicionarAsync(atleta, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
        return atleta.ParaDto();
    }

    public async Task<AtletaDto> AtualizarAsync(Guid id, AtualizarAtletaDto dto, CancellationToken cancellationToken = default)
    {
        var (nome, apelido) = NormalizadorNomeAtleta.NormalizarNomeEApelido(dto.Nome, dto.Apelido);
        var dataNascimento = Validar(nome, dto.Lado, dto.DataNascimento);
        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        atleta.Nome = nome;
        atleta.Apelido = apelido;
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
        var atleta = await atletaRepositorio.ObterPorIdAsync(id, cancellationToken);
        if (atleta is null)
        {
            throw new EntidadeNaoEncontradaException("Atleta não encontrado.");
        }

        atletaRepositorio.Remover(atleta);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private static DateTime? Validar(string nome, LadoAtleta lado, DateTime? dataNascimento)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new RegraNegocioException("Nome do atleta é obrigatório.");
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
