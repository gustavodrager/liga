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

public class InscricaoCampeonatoServico(
    IInscricaoCampeonatoRepositorio inscricaoRepositorio,
    ICompeticaoRepositorio competicaoRepositorio,
    ICategoriaCompeticaoRepositorio categoriaRepositorio,
    IAtletaRepositorio atletaRepositorio,
    IDuplaRepositorio duplaRepositorio,
    IUnidadeTrabalho unidadeTrabalho,
    IAutorizacaoUsuarioServico autorizacaoUsuarioServico
) : IInscricaoCampeonatoServico
{
    public async Task<IReadOnlyList<InscricaoCampeonatoDto>> ListarPorCampeonatoAsync(
        Guid campeonatoId,
        Guid? categoriaId,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        await ObterCompeticaoComInscricaoValidaAsync(campeonatoId, cancellationToken);

        if (categoriaId.HasValue)
        {
            await ObterCategoriaValidaAsync(campeonatoId, categoriaId.Value, cancellationToken);
        }

        var inscricoes = await inscricaoRepositorio.ListarPorCampeonatoAsync(campeonatoId, categoriaId, cancellationToken);
        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            var atletaId = ObterAtletaUsuarioIdObrigatorio(usuario);
            inscricoes = inscricoes
                .Where(x => DuplaContemAtleta(x.Dupla, atletaId))
                .ToList();
        }
        else
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(campeonatoId, cancellationToken);
        }

        return inscricoes.Select(x => x.ParaDto()).ToList();
    }

    public async Task<InscricaoCampeonatoDto> ObterPorIdAsync(
        Guid campeonatoId,
        Guid inscricaoId,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        await ObterCompeticaoComInscricaoValidaAsync(campeonatoId, cancellationToken);

        var inscricao = await inscricaoRepositorio.ObterPorIdAsync(inscricaoId, cancellationToken);
        if (inscricao is null || inscricao.CompeticaoId != campeonatoId)
        {
            throw new EntidadeNaoEncontradaException("Inscrição não encontrada para o campeonato informado.");
        }

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            var atletaId = ObterAtletaUsuarioIdObrigatorio(usuario);
            if (!DuplaContemAtleta(inscricao.Dupla, atletaId))
            {
                throw new RegraNegocioException("Você só pode acessar as suas próprias inscrições.");
            }
        }
        else
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(campeonatoId, cancellationToken);
        }

        return inscricao.ParaDto();
    }

    public async Task<InscricaoCampeonatoDto> CriarAsync(
        Guid campeonatoId,
        CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        var campeonato = await ObterCompeticaoComInscricaoValidaAsync(campeonatoId, cancellationToken, exigirInscricoesAbertas: true);
        var categoria = await ObterCategoriaValidaAsync(campeonatoId, dto.CategoriaId, cancellationToken);
        Dupla dupla;
        var parceiroCadastroPendente = false;

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            (dupla, parceiroCadastroPendente) = await ResolverDuplaAutoInscricaoAsync(usuario, dto, cancellationToken);
        }
        else
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(campeonatoId, cancellationToken);
            dupla = await ResolverDuplaAsync(dto, cancellationToken);
        }

        var inscricaoDuplicada = await inscricaoRepositorio.ObterDuplicadaAsync(dto.CategoriaId, dupla.Id, cancellationToken);
        if (inscricaoDuplicada is not null)
        {
            throw new RegraNegocioException("Esta dupla já está inscrita nesta categoria do campeonato.");
        }

        var inscricao = new InscricaoCampeonato
        {
            CompeticaoId = campeonato.Id,
            CategoriaCompeticaoId = categoria.Id,
            DuplaId = dupla.Id,
            Pago = usuario.Perfil == PerfilUsuario.Atleta ? false : dto.Pago,
            DataInscricaoUtc = DateTime.UtcNow,
            Status = StatusInscricaoCampeonato.Ativa,
            Observacao = MontarObservacaoInscricao(dto.Observacao, parceiroCadastroPendente),
            Competicao = campeonato,
            CategoriaCompeticao = categoria,
            Dupla = dupla
        };

        await inscricaoRepositorio.AdicionarAsync(inscricao, cancellationToken);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var inscricaoCriada = await inscricaoRepositorio.ObterPorIdAsync(inscricao.Id, cancellationToken);
        return inscricaoCriada!.ParaDto();
    }

    public async Task<InscricaoCampeonatoDto> AtualizarAsync(
        Guid campeonatoId,
        Guid inscricaoId,
        CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        await ObterCompeticaoComInscricaoValidaAsync(campeonatoId, cancellationToken, exigirInscricoesAbertas: true);

        var inscricao = await inscricaoRepositorio.ObterPorIdAsync(inscricaoId, cancellationToken);
        if (inscricao is null || inscricao.CompeticaoId != campeonatoId)
        {
            throw new EntidadeNaoEncontradaException("Inscrição não encontrada para o campeonato informado.");
        }

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            var atletaId = ObterAtletaUsuarioIdObrigatorio(usuario);
            if (!DuplaContemAtleta(inscricao.Dupla, atletaId))
            {
                throw new RegraNegocioException("Você só pode editar as suas próprias inscrições.");
            }
        }
        else
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(campeonatoId, cancellationToken);
        }

        var categoria = await ObterCategoriaValidaAsync(campeonatoId, dto.CategoriaId, cancellationToken);
        Dupla dupla;
        var parceiroCadastroPendente = false;

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            (dupla, parceiroCadastroPendente) = await ResolverDuplaAutoInscricaoAsync(usuario, dto, cancellationToken);
        }
        else
        {
            dupla = await ResolverDuplaAsync(dto, cancellationToken);
        }

        var inscricaoDuplicada = await inscricaoRepositorio.ObterDuplicadaAsync(dto.CategoriaId, dupla.Id, cancellationToken);
        if (inscricaoDuplicada is not null && inscricaoDuplicada.Id != inscricao.Id)
        {
            throw new RegraNegocioException("Esta dupla já está inscrita nesta categoria do campeonato.");
        }

        inscricao.CategoriaCompeticaoId = categoria.Id;
        inscricao.DuplaId = dupla.Id;
        inscricao.Observacao = MontarObservacaoInscricao(dto.Observacao, parceiroCadastroPendente);

        if (usuario.Perfil != PerfilUsuario.Atleta)
        {
            inscricao.Pago = dto.Pago;
        }

        inscricao.AtualizarDataModificacao();
        inscricaoRepositorio.Atualizar(inscricao);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);

        var inscricaoAtualizada = await inscricaoRepositorio.ObterPorIdAsync(inscricao.Id, cancellationToken);
        return inscricaoAtualizada!.ParaDto();
    }

    public async Task RemoverAsync(
        Guid campeonatoId,
        Guid inscricaoId,
        CancellationToken cancellationToken = default)
    {
        var usuario = await autorizacaoUsuarioServico.ObterUsuarioAtualObrigatorioAsync(cancellationToken);
        await ObterCompeticaoComInscricaoValidaAsync(campeonatoId, cancellationToken);

        var inscricao = await inscricaoRepositorio.ObterPorIdAsync(inscricaoId, cancellationToken);
        if (inscricao is null || inscricao.CompeticaoId != campeonatoId)
        {
            throw new EntidadeNaoEncontradaException("Inscrição não encontrada para o campeonato informado.");
        }

        if (usuario.Perfil == PerfilUsuario.Atleta)
        {
            var atletaId = ObterAtletaUsuarioIdObrigatorio(usuario);
            if (!DuplaContemAtleta(inscricao.Dupla, atletaId))
            {
                throw new RegraNegocioException("Você só pode excluir as suas próprias inscrições.");
            }
        }
        else
        {
            await autorizacaoUsuarioServico.GarantirGestaoCompeticaoAsync(campeonatoId, cancellationToken);
        }

        inscricaoRepositorio.Remover(inscricao);
        await unidadeTrabalho.SalvarAlteracoesAsync(cancellationToken);
    }

    private async Task<(Dupla dupla, bool parceiroCadastroPendente)> ResolverDuplaAutoInscricaoAsync(
        Usuario usuario,
        CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken)
    {
        var atletaUsuarioId = ObterAtletaUsuarioIdObrigatorio(usuario);
        var atletaUsuario = await ObterAtletaExistenteAsync(atletaUsuarioId, cancellationToken);

        if (dto.DuplaId.HasValue)
        {
            var duplaExistente = await duplaRepositorio.ObterPorIdAsync(dto.DuplaId.Value, cancellationToken);
            if (duplaExistente is null)
            {
                throw new EntidadeNaoEncontradaException("Dupla não encontrada.");
            }

            if (!DuplaContemAtleta(duplaExistente, atletaUsuario.Id))
            {
                throw new RegraNegocioException("Você só pode se inscrever com uma dupla que contenha o seu atleta vinculado.");
            }

            return (duplaExistente, false);
        }

        var (parceiro, parceiroCadastroPendente) = await ResolverParceiroAutoInscricaoAsync(atletaUsuario, dto, cancellationToken);
        var dupla = await ObterOuCriarDuplaAsync(atletaUsuario, parceiro, cancellationToken);
        return (dupla, parceiroCadastroPendente);
    }

    private async Task<Competicao> ObterCompeticaoComInscricaoValidaAsync(
        Guid campeonatoId,
        CancellationToken cancellationToken,
        bool exigirInscricoesAbertas = false)
    {
        var campeonato = await competicaoRepositorio.ObterPorIdAsync(campeonatoId, cancellationToken);
        if (campeonato is null)
        {
            throw new EntidadeNaoEncontradaException("Competição não encontrada.");
        }

        if (campeonato.Tipo is not TipoCompeticao.Campeonato and not TipoCompeticao.Evento)
        {
            throw new RegraNegocioException("A competição informada não aceita inscrições.");
        }

        if (exigirInscricoesAbertas && !campeonato.InscricoesAbertas)
        {
            throw new RegraNegocioException("A competição não está apta para receber inscrições.");
        }

        return campeonato;
    }

    private async Task<CategoriaCompeticao> ObterCategoriaValidaAsync(
        Guid campeonatoId,
        Guid categoriaId,
        CancellationToken cancellationToken)
    {
        var categoria = await categoriaRepositorio.ObterPorIdAsync(categoriaId, cancellationToken);
        if (categoria is null)
        {
            throw new EntidadeNaoEncontradaException("Categoria não encontrada.");
        }

        if (categoria.CompeticaoId != campeonatoId)
        {
            throw new RegraNegocioException("A categoria informada não pertence à competição.");
        }

        return categoria;
    }

    private async Task<Dupla> ResolverDuplaAsync(
        CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken)
    {
        if (dto.DuplaId.HasValue)
        {
            var duplaExistente = await duplaRepositorio.ObterPorIdAsync(dto.DuplaId.Value, cancellationToken);
            if (duplaExistente is null)
            {
                throw new EntidadeNaoEncontradaException("Dupla não encontrada.");
            }

            return duplaExistente;
        }

        var atleta1 = dto.Atleta1Id.HasValue
            ? await ObterAtletaExistenteAsync(dto.Atleta1Id.Value, cancellationToken)
            : await ObterOuCriarAtletaAsync(dto.NomeAtleta1, dto.ApelidoAtleta1, dto.Atleta1CadastroPendente, cancellationToken);

        var atleta2 = dto.Atleta2Id.HasValue
            ? await ObterAtletaExistenteAsync(dto.Atleta2Id.Value, cancellationToken)
            : await ObterOuCriarAtletaAsync(dto.NomeAtleta2, dto.ApelidoAtleta2, dto.Atleta2CadastroPendente, cancellationToken);

        if (atleta1.Id == atleta2.Id)
        {
            throw new RegraNegocioException("Um atleta não pode formar dupla com ele mesmo.");
        }

        return await ObterOuCriarDuplaAsync(atleta1, atleta2, cancellationToken);
    }

    private async Task<Atleta> ObterAtletaExistenteAsync(Guid atletaId, CancellationToken cancellationToken)
    {
        if (atletaId == Guid.Empty)
        {
            throw new RegraNegocioException("A inscrição deve informar dois atletas válidos.");
        }

        var atleta = await atletaRepositorio.ObterPorIdAsync(atletaId, cancellationToken);
        if (atleta is null)
        {
            throw new RegraNegocioException("Os atletas informados para a inscrição não foram encontrados.");
        }

        return atleta;
    }

    private async Task<Atleta> ObterOuCriarAtletaAsync(
        string? nomeInformado,
        string? apelidoInformado,
        bool cadastroPendente,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(nomeInformado))
        {
            throw new RegraNegocioException("Informe o nome completo dos dois jogadores quando a dupla não estiver cadastrada.");
        }

        var nomeBase = NormalizadorNomeAtleta.NormalizarTexto(nomeInformado);
        var complemento = NormalizadorNomeAtleta.NormalizarTexto(apelidoInformado);

        if (string.IsNullOrWhiteSpace(nomeBase))
        {
            throw new RegraNegocioException("Informe um nome válido para o atleta.");
        }

        if (string.IsNullOrWhiteSpace(complemento))
        {
            var atletaExistente = await atletaRepositorio.ObterPorNomeAsync(nomeBase, cancellationToken);
            if (atletaExistente is not null)
            {
                return atletaExistente;
            }
        }

        var (nomeFinal, apelidoFinal) = NormalizadorNomeAtleta.NormalizarNomeEApelido(nomeBase, complemento);
        var atletaComNomeFinal = await atletaRepositorio.ObterPorNomeAsync(nomeFinal, cancellationToken);
        if (atletaComNomeFinal is not null)
        {
            return atletaComNomeFinal;
        }

        var atleta = new Atleta
        {
            Nome = nomeFinal,
            Apelido = apelidoFinal,
            CadastroPendente = cadastroPendente,
            Lado = LadoAtleta.Ambos
        };

        await atletaRepositorio.AdicionarAsync(atleta, cancellationToken);
        return atleta;
    }

    private async Task<(Atleta atleta, bool cadastroPendente)> ResolverParceiroAutoInscricaoAsync(
        Atleta atletaUsuario,
        CriarInscricaoCampeonatoDto dto,
        CancellationToken cancellationToken)
    {
        if (dto.Atleta2Id.HasValue)
        {
            var atleta = await ObterAtletaExistenteAsync(dto.Atleta2Id.Value, cancellationToken);
            if (atleta.Id == atletaUsuario.Id)
            {
                throw new RegraNegocioException("Um atleta não pode formar dupla com ele mesmo.");
            }

            return (atleta, false);
        }

        if (!string.IsNullOrWhiteSpace(dto.NomeAtleta2))
        {
            var atleta = await ObterOuCriarAtletaAsync(
                dto.NomeAtleta2,
                dto.ApelidoAtleta2,
                dto.Atleta2CadastroPendente,
                cancellationToken);

            if (atleta.Id == atletaUsuario.Id)
            {
                throw new RegraNegocioException("Um atleta não pode formar dupla com ele mesmo.");
            }

            return (atleta, dto.Atleta2CadastroPendente);
        }

        var nomeParceiroPendente = CriarNomeAtletaPendente(atletaUsuario.Nome);
        var atletaPendente = await ObterOuCriarAtletaAsync(nomeParceiroPendente, null, true, cancellationToken);
        if (atletaPendente.Id == atletaUsuario.Id)
        {
            throw new RegraNegocioException("Um atleta não pode formar dupla com ele mesmo.");
        }

        return (atletaPendente, true);
    }

    private async Task<Dupla> ObterOuCriarDuplaAsync(Atleta atleta1, Atleta atleta2, CancellationToken cancellationToken)
    {
        var dupla = await duplaRepositorio.ObterPorAtletasAsync(atleta1.Id, atleta2.Id, cancellationToken);
        if (dupla is not null)
        {
            return dupla;
        }

        var (atletaNormalizado1Id, atletaNormalizado2Id) = NormalizarAtletas(atleta1.Id, atleta2.Id);
        var atletaNormalizado1 = atleta1.Id == atletaNormalizado1Id ? atleta1 : atleta2;
        var atletaNormalizado2 = atleta2.Id == atletaNormalizado2Id ? atleta2 : atleta1;

        var novaDupla = new Dupla
        {
            Nome = $"{atletaNormalizado1.Nome} / {atletaNormalizado2.Nome}",
            Atleta1Id = atletaNormalizado1Id,
            Atleta2Id = atletaNormalizado2Id
        };

        await duplaRepositorio.AdicionarAsync(novaDupla, cancellationToken);
        return novaDupla;
    }

    private static (Guid atleta1Id, Guid atleta2Id) NormalizarAtletas(Guid atleta1Id, Guid atleta2Id)
    {
        return atleta1Id.CompareTo(atleta2Id) <= 0
            ? (atleta1Id, atleta2Id)
            : (atleta2Id, atleta1Id);
    }

    private static Guid ObterAtletaUsuarioIdObrigatorio(Usuario usuario)
    {
        if (!usuario.AtletaId.HasValue)
        {
            throw new RegraNegocioException("Você precisa ter um atleta vinculado para se inscrever.");
        }

        return usuario.AtletaId.Value;
    }

    private static bool DuplaContemAtleta(Dupla? dupla, Guid atletaId)
    {
        return dupla is not null && (dupla.Atleta1Id == atletaId || dupla.Atleta2Id == atletaId);
    }

    private static string CriarNomeAtletaPendente(string nomeAtleta)
    {
        return $"Dupla da {NormalizadorNomeAtleta.NormalizarTexto(nomeAtleta)}";
    }

    private static string? MontarObservacaoInscricao(string? observacaoAtual, bool parceiroCadastroPendente)
    {
        var observacao = NormalizadorNomeAtleta.NormalizarTexto(observacaoAtual);
        if (!parceiroCadastroPendente)
        {
            return string.IsNullOrWhiteSpace(observacao) ? null : observacao;
        }

        return string.IsNullOrWhiteSpace(observacao)
            ? "Parceiro com cadastro pendente."
            : $"{observacao} | Parceiro com cadastro pendente.";
    }
}
