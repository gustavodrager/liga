import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { duplasServico } from '../services/duplasServico';
import { inscricoesCampeonatoServico } from '../services/inscricoesCampeonatoServico';
import { partidasServico } from '../services/partidasServico';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora, paraInputDataHora } from '../utils/formatacao';
import { rolarParaElemento } from '../utils/rolagem';

const estadoInicial = {
  categoriaCompeticaoId: '',
  duplaAId: '',
  duplaBId: '',
  faseCampeonato: '',
  status: '1',
  placarDuplaA: '',
  placarDuplaB: '',
  dataPartida: '',
  observacoes: ''
};

const opcoesStatusPartida = [
  { valor: '1', rotulo: 'Agendada' },
  { valor: '2', rotulo: 'Encerrada' }
];

const opcoesFaseCampeonato = [
  'Fase classificatória',
  'Fase de grupos',
  'Oitavas de final',
  'Quartas de final',
  'Semifinal',
  'Final',
  'Disputa de 3º lugar',
  'Chave principal',
  'Chave dos perdedores'
];

function paraIsoUtc(dataLocal) {
  if (!dataLocal) {
    return null;
  }

  return new Date(dataLocal).toISOString();
}

function formatarNomeDupla(dupla) {
  return `${dupla.nome} (${dupla.nomeAtleta1} / ${dupla.nomeAtleta2})`;
}

function obterNomeStatus(status) {
  return opcoesStatusPartida.find((opcao) => Number(opcao.valor) === status)?.rotulo || 'Desconhecido';
}

export function PaginaPartidas() {
  const { usuario } = useAutenticacao();
  const ehAdministrador = usuario?.perfil === 1;

  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [inscricoesCategoria, setInscricoesCategoria] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [competicaoId, setCompeticaoId] = useState('');
  const [formulario, setFormulario] = useState(estadoInicial);
  const [partidaEdicaoId, setPartidaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoTabela, setGerandoTabela] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const formularioRef = useRef(null);

  const [params, setParams] = useSearchParams();
  const competicaoSelecionada = competicoes.find((competicao) => competicao.id === competicaoId) || null;
  const categoriaSelecionada = categorias.find((categoria) => categoria.id === formulario.categoriaCompeticaoId) || null;
  const usaFormatoCampeonato = competicaoSelecionada?.tipo === 1 && Boolean(categoriaSelecionada?.formatoCampeonatoId);
  const statusEncerrada = Number(formulario.status) === 2;

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (!competicaoId) {
      setCategorias([]);
      return;
    }

    carregarCategorias(competicaoId);
  }, [competicaoId]);

  useEffect(() => {
    if (!formulario.categoriaCompeticaoId) {
      setPartidas([]);
      return;
    }

    carregarPartidas(formulario.categoriaCompeticaoId);
  }, [formulario.categoriaCompeticaoId]);

  useEffect(() => {
    if (!competicaoSelecionada || competicaoSelecionada.tipo !== 1 || !formulario.categoriaCompeticaoId) {
      setInscricoesCategoria([]);
      return;
    }

    carregarInscricoesCategoria(competicaoSelecionada.id, formulario.categoriaCompeticaoId);
  }, [competicaoSelecionada, formulario.categoriaCompeticaoId]);

  const duplasDisponiveis = useMemo(() => {
    if (!competicaoSelecionada || competicaoSelecionada.tipo !== 1) {
      return duplas;
    }

    return duplas.filter((dupla) =>
      inscricoesCategoria.some(
        (inscricao) =>
          inscricao.categoriaId === formulario.categoriaCompeticaoId &&
          ((dupla.atleta1Id === inscricao.atleta1Id && dupla.atleta2Id === inscricao.atleta2Id) ||
            (dupla.atleta1Id === inscricao.atleta2Id && dupla.atleta2Id === inscricao.atleta1Id))
      )
    );
  }, [competicaoSelecionada, duplas, formulario.categoriaCompeticaoId, inscricoesCategoria]);

  const opcoesDuplaA = useMemo(
    () => duplasDisponiveis.filter((dupla) => dupla.id !== formulario.duplaBId),
    [duplasDisponiveis, formulario.duplaBId]
  );

  const opcoesDuplaB = useMemo(
    () => duplasDisponiveis.filter((dupla) => dupla.id !== formulario.duplaAId),
    [duplasDisponiveis, formulario.duplaAId]
  );

  useEffect(() => {
    setFormulario((anterior) => ({
      ...anterior,
      duplaAId: duplasDisponiveis.some((dupla) => dupla.id === anterior.duplaAId) ? anterior.duplaAId : '',
      duplaBId: duplasDisponiveis.some((dupla) => dupla.id === anterior.duplaBId) ? anterior.duplaBId : ''
    }));
  }, [duplasDisponiveis]);

  async function carregarBase() {
    setErro('');
    setCarregando(true);

    try {
      const [listaCompeticoes, listaDuplas] = await Promise.all([
        competicoesServico.listar(),
        duplasServico.listar()
      ]);

      setCompeticoes(listaCompeticoes);
      setDuplas(listaDuplas);

      const categoriaUrl = params.get('categoriaId');
      if (categoriaUrl) {
        const categoria = await categoriasServico.obterPorId(categoriaUrl);
        setCompeticaoId(categoria.competicaoId);
        setFormulario((anterior) => ({
          ...anterior,
          categoriaCompeticaoId: categoria.id
        }));
        setParams({ categoriaId: categoria.id });
        return;
      }

      if (listaCompeticoes[0]) {
        setCompeticaoId(listaCompeticoes[0].id);
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  async function carregarCategorias(idCompeticao) {
    try {
      const lista = await categoriasServico.listarPorCompeticao(idCompeticao);
      setCategorias(lista);

      setFormulario((anterior) => {
        const categoriaValida = lista.some((categoria) => categoria.id === anterior.categoriaCompeticaoId);
        return {
          ...anterior,
          categoriaCompeticaoId: categoriaValida ? anterior.categoriaCompeticaoId : lista[0]?.id || ''
        };
      });
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  async function carregarInscricoesCategoria(idCampeonato, categoriaId) {
    try {
      const lista = await inscricoesCampeonatoServico.listarPorCampeonato(idCampeonato, categoriaId);
      setInscricoesCategoria(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setInscricoesCategoria([]);
    }
  }

  async function carregarPartidas(categoriaId) {
    try {
      const lista = await partidasServico.listarPorCategoria(categoriaId);
      setPartidas(lista);
      setParams({ categoriaId });
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => {
      const proximo = { ...anterior, [campo]: valor };

      if (campo === 'categoriaCompeticaoId') {
        proximo.duplaAId = '';
        proximo.duplaBId = '';
      }

      if (campo === 'status' && Number(valor) === 1) {
        proximo.placarDuplaA = '';
        proximo.placarDuplaB = '';
      }

      return proximo;
    });

    if (campo === 'categoriaCompeticaoId' && valor) {
      setParams({ categoriaId: valor });
    }
  }

  function iniciarEdicao(partida) {
    if (!ehAdministrador) {
      return;
    }

    const categoria = categorias.find((item) => item.id === partida.categoriaCompeticaoId);
    if (categoria) {
      setCompeticaoId(categoria.competicaoId);
    }

    setPartidaEdicaoId(partida.id);
    setMensagem('');
    setFormulario({
      categoriaCompeticaoId: partida.categoriaCompeticaoId,
      duplaAId: partida.duplaAId,
      duplaBId: partida.duplaBId,
      faseCampeonato: partida.faseCampeonato || '',
      status: String(partida.status),
      placarDuplaA: partida.status === 2 ? String(partida.placarDuplaA) : '',
      placarDuplaB: partida.status === 2 ? String(partida.placarDuplaB) : '',
      dataPartida: paraInputDataHora(partida.dataPartida),
      observacoes: partida.observacoes || ''
    });
    rolarParaElemento(formularioRef.current);
  }

  function cancelarEdicao() {
    setPartidaEdicaoId(null);
    setFormulario((anterior) => ({
      ...estadoInicial,
      categoriaCompeticaoId: anterior.categoriaCompeticaoId
    }));
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    setSalvando(true);

    const dados = {
      categoriaCompeticaoId: formulario.categoriaCompeticaoId,
      duplaAId: formulario.duplaAId,
      duplaBId: formulario.duplaBId,
      faseCampeonato: competicaoSelecionada?.tipo === 1 ? formulario.faseCampeonato || null : null,
      status: Number(formulario.status),
      placarDuplaA: statusEncerrada ? Number(formulario.placarDuplaA) : null,
      placarDuplaB: statusEncerrada ? Number(formulario.placarDuplaB) : null,
      dataPartida: paraIsoUtc(formulario.dataPartida),
      observacoes: formulario.observacoes || null
    };

    try {
      if (partidaEdicaoId) {
        await partidasServico.atualizar(partidaEdicaoId, dados);
      } else {
        await partidasServico.criar(dados);
      }

      cancelarEdicao();
      setMensagem(partidaEdicaoId ? 'Partida atualizada com sucesso.' : 'Partida registrada com sucesso.');
      await carregarPartidas(formulario.categoriaCompeticaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function gerarTabela(substituirTabelaExistente = false) {
    if (!categoriaSelecionada) {
      setErro('Selecione uma categoria para gerar a tabela.');
      setMensagem('');
      return;
    }

    setErro('');
    setMensagem('');
    setGerandoTabela(true);

    try {
      const resultado = await categoriasServico.gerarTabelaPartidas(categoriaSelecionada.id, {
        substituirTabelaExistente
      });

      setMensagem(resultado.resumo);
      await carregarPartidas(categoriaSelecionada.id);
    } catch (error) {
      const mensagemErro = extrairMensagemErro(error);

      if (
        partidas.length > 0 &&
        !substituirTabelaExistente &&
        mensagemErro.toLowerCase().includes('substituição')
      ) {
        const confirmar = window.confirm(
          'Esta categoria já possui uma tabela de jogos gerada. Deseja substituir os confrontos agendados?'
        );

        if (confirmar) {
          await gerarTabela(true);
          return;
        }
      }

      setErro(mensagemErro);
    } finally {
      setGerandoTabela(false);
    }
  }

  async function removerPartida(id) {
    if (!window.confirm('Deseja remover esta partida?')) {
      return;
    }

    try {
      await partidasServico.remover(id);
      setMensagem('Partida removida com sucesso.');
      await carregarPartidas(formulario.categoriaCompeticaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Partidas</h2>
        <p>
          {ehAdministrador
            ? 'Gere a tabela de jogos, acompanhe os confrontos sorteados e registre os resultados por categoria.'
            : 'Acompanhe os jogos sorteados e os resultados de cada categoria.'}
        </p>
        {competicaoSelecionada && (
          <p>
            Regra atual: mínimo {competicaoSelecionada.pontosMinimosPartidaEfetivo} pontos, diferença mínima{' '}
            {competicaoSelecionada.diferencaMinimaPartidaEfetiva} e{' '}
            {competicaoSelecionada.permiteEmpateEfetivo ? 'empate permitido' : 'sem empate'}.
            Pontuação: vitória {competicaoSelecionada.pontosVitoriaEfetivo} e derrota{' '}
            {competicaoSelecionada.pontosDerrotaEfetivo}. Participação: {competicaoSelecionada.pontosParticipacaoEfetivo}.
          </p>
        )}
        {categoriaSelecionada?.nomeFormatoCampeonato && (
          <p>Formato da categoria: {categoriaSelecionada.nomeFormatoCampeonato}.</p>
        )}
        {competicaoSelecionada?.tipo === 1 && (
          <p>Para campeonatos, a tabela automática usa as duplas inscritas da categoria selecionada.</p>
        )}
      </div>

      <div className="formulario-grid">
        <label>
          Competição
          <select
            value={competicaoId}
            onChange={(evento) => setCompeticaoId(evento.target.value)}
            required
          >
            <option value="">Selecione</option>
            {competicoes.map((competicao) => (
              <option key={competicao.id} value={competicao.id}>
                {competicao.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Categoria
          <select
            value={formulario.categoriaCompeticaoId}
            onChange={(evento) => atualizarCampo('categoriaCompeticaoId', evento.target.value)}
            required
          >
            <option value="">Selecione</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </label>

        {ehAdministrador && usaFormatoCampeonato && (
          <div className="acoes-item">
            <button
              type="button"
              className="botao-primario"
              onClick={() => gerarTabela(false)}
              disabled={gerandoTabela || !categoriaSelecionada}
            >
              {gerandoTabela ? 'Gerando tabela...' : 'Gerar tabela de jogos'}
            </button>
          </div>
        )}
      </div>

      {ehAdministrador && (
        <form ref={formularioRef} className="formulario-grid" onSubmit={aoSubmeter}>
          <label>
            Dupla A
            <select
              value={formulario.duplaAId}
              onChange={(evento) => atualizarCampo('duplaAId', evento.target.value)}
              disabled={!formulario.categoriaCompeticaoId}
              required
            >
              <option value="">Selecione</option>
              {opcoesDuplaA.map((dupla) => (
                <option key={dupla.id} value={dupla.id}>
                  {formatarNomeDupla(dupla)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dupla B
            <select
              value={formulario.duplaBId}
              onChange={(evento) => atualizarCampo('duplaBId', evento.target.value)}
              disabled={!formulario.categoriaCompeticaoId}
              required
            >
              <option value="">Selecione</option>
              {opcoesDuplaB.map((dupla) => (
                <option key={dupla.id} value={dupla.id}>
                  {formatarNomeDupla(dupla)}
                </option>
              ))}
            </select>
          </label>

          {competicaoSelecionada?.tipo === 1 && (
            <label>
              Fase da partida
              <input
                type="text"
                value={formulario.faseCampeonato}
                onChange={(evento) => atualizarCampo('faseCampeonato', evento.target.value)}
                list="fases-campeonato"
                required
              />
              <datalist id="fases-campeonato">
                {opcoesFaseCampeonato.map((fase) => (
                  <option key={fase} value={fase} />
                ))}
              </datalist>
            </label>
          )}

          <label>
            Status
            <select
              value={formulario.status}
              onChange={(evento) => atualizarCampo('status', evento.target.value)}
              required
            >
              {opcoesStatusPartida.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </label>

          {statusEncerrada && (
            <label>
              Placar Dupla A
              <input
                type="number"
                min={0}
                value={formulario.placarDuplaA}
                onChange={(evento) => atualizarCampo('placarDuplaA', evento.target.value)}
                required
              />
            </label>
          )}

          {statusEncerrada && (
            <label>
              Placar Dupla B
              <input
                type="number"
                min={0}
                value={formulario.placarDuplaB}
                onChange={(evento) => atualizarCampo('placarDuplaB', evento.target.value)}
                required
              />
            </label>
          )}

          <label>
            Data da partida
            <input
              type="datetime-local"
              value={formulario.dataPartida}
              onChange={(evento) => atualizarCampo('dataPartida', evento.target.value)}
            />
          </label>

          <label className="campo-largo">
            Observações
            <textarea
              rows={3}
              value={formulario.observacoes}
              onChange={(evento) => atualizarCampo('observacoes', evento.target.value)}
            />
          </label>

          <div className="acoes-formulario">
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : partidaEdicaoId ? 'Atualizar partida' : 'Registrar partida'}
            </button>

            {partidaEdicaoId && (
              <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      {competicaoSelecionada?.tipo === 1 && formulario.categoriaCompeticaoId && duplasDisponiveis.length === 0 && (
        <p>Nenhuma dupla inscrita nesta categoria do campeonato.</p>
      )}

      {!ehAdministrador && partidas.length > 0 && (
        <p>Somente administradores podem alterar a tabela. Aqui você acompanha os jogos sorteados e os resultados.</p>
      )}

      {carregando ? (
        <p>Carregando partidas...</p>
      ) : (
        <div className="lista-cartoes">
          {partidas.map((partida) => (
            <article key={partida.id} className="cartao-lista">
              <div>
                <h3>
                  {partida.status === 2
                    ? `${partida.nomeDuplaA} ${partida.placarDuplaA} x ${partida.placarDuplaB} ${partida.nomeDuplaB}`
                    : `${partida.nomeDuplaA} x ${partida.nomeDuplaB}`}
                </h3>
                <p>Categoria: {partida.nomeCategoria}</p>
                <p>Status: {obterNomeStatus(partida.status)}</p>
                {partida.faseCampeonato && <p>Fase: {partida.faseCampeonato}</p>}
                {partida.status === 2 ? (
                  <p>Vencedora: {partida.nomeDuplaVencedora || 'Empate'}</p>
                ) : (
                  <p>Resultado: jogo ainda não encerrado</p>
                )}
                <p>Data: {partida.dataPartida ? formatarDataHora(partida.dataPartida) : 'A definir'}</p>
                <p>Obs: {partida.observacoes || '-'}</p>
              </div>

              {ehAdministrador && (
                <div className="acoes-item">
                  <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(partida)}>
                    Editar
                  </button>
                  <button type="button" className="botao-perigo" onClick={() => removerPartida(partida.id)}>
                    Excluir
                  </button>
                </div>
              )}
            </article>
          ))}

          {partidas.length === 0 && <p>Nenhuma partida cadastrada para esta categoria.</p>}
        </div>
      )}
    </section>
  );
}
