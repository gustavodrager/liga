import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BotaoVoltar } from '../components/BotaoVoltar';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { partidasServico } from '../services/partidasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';

const TIPOS_COMPETICAO = {
  campeonato: 1,
  evento: 2,
  grupo: 3,
  partidasAvulsas: 4
};

const NOME_COMPETICAO_PARTIDAS_AVULSAS = 'Partidas avulsas';

function obterTipoCompeticao(competicao) {
  return Number(competicao?.tipo || 0);
}

function ehCompeticaoPartidasAvulsas(competicao) {
  const tipoCompeticao = obterTipoCompeticao(competicao);
  const nomeCompeticao = (competicao?.nome || '').trim().toLowerCase();

  return tipoCompeticao === TIPOS_COMPETICAO.partidasAvulsas
    || (tipoCompeticao === TIPOS_COMPETICAO.grupo && nomeCompeticao === NOME_COMPETICAO_PARTIDAS_AVULSAS.toLowerCase());
}

function ehCompeticaoComCategoriasDeCampeonato(competicao) {
  const tipoCompeticao = obterTipoCompeticao(competicao);
  return !ehCompeticaoPartidasAvulsas(competicao)
    && (tipoCompeticao === TIPOS_COMPETICAO.campeonato || tipoCompeticao === TIPOS_COMPETICAO.evento);
}

function obterNomeStatus(status, partidaAtiva) {
  if (!partidaAtiva) {
    return 'Aguardando definição';
  }

  switch (status) {
    case 1:
      return 'Agendada';
    case 2:
      return 'Encerrada';
    default:
      return 'Desconhecido';
  }
}

function obterNomeStatusAprovacao(status) {
  switch (status) {
    case 1:
      return 'Pendente de vínculos';
    case 2:
      return 'Pendente de aprovação';
    case 3:
      return 'Aprovada';
    case 4:
      return 'Contestada';
    default:
      return 'Sem status';
  }
}

function obterClasseStatusAprovacao(status) {
  switch (status) {
    case 3:
      return 'tag-status-sucesso';
    case 4:
      return 'tag-status-erro';
    default:
      return 'tag-status-alerta';
  }
}

function extrairNumeroRodada(fase) {
  const correspondencia = (fase || '').match(/rodada\s+(\d+)/i);
  return correspondencia ? Number(correspondencia[1]) : 0;
}

function extrairMetadadosChaveLateral(fase) {
  const faseNormalizada = (fase || '').trim();

  if (!faseNormalizada) {
    return null;
  }

  const correspondenciaChaveLegada = faseNormalizada.match(/^Chave\s+([A-Z])\s*-\s*Rodada\s+(\d+)/i);
  if (correspondenciaChaveLegada) {
    const lado = correspondenciaChaveLegada[1].toUpperCase();
    const rodada = Number(correspondenciaChaveLegada[2]);

    return {
      chave: `legado-${lado}-${rodada}`,
      titulo: `Chave ${lado} · Rodada ${String(rodada).padStart(2, '0')}`,
      ordem: lado.charCodeAt(0) * 100 + rodada
    };
  }

  const correspondenciaVencedores = faseNormalizada.match(/^Chave\s+dos\s+vencedores\s*-\s*Rodada\s+(\d+)/i);
  if (correspondenciaVencedores) {
    const rodada = Number(correspondenciaVencedores[1]);

    return {
      chave: `vencedores-${rodada}`,
      titulo: `Chave dos vencedores · Rodada ${String(rodada).padStart(2, '0')}`,
      ordem: 100 + rodada
    };
  }

  const correspondenciaPerdedores = faseNormalizada.match(/^Chave\s+dos\s+perdedores\s*-\s*Rodada\s+(\d+)/i);
  if (correspondenciaPerdedores) {
    const rodada = Number(correspondenciaPerdedores[1]);

    return {
      chave: `perdedores-${rodada}`,
      titulo: `Chave dos perdedores · Rodada ${String(rodada).padStart(2, '0')}`,
      ordem: 200 + rodada
    };
  }

  return null;
}

function ehTituloFinais(titulo) {
  const tituloNormalizado = (titulo || '').trim().toLowerCase();
  return tituloNormalizado === 'finais'
    || tituloNormalizado === 'final'
    || tituloNormalizado.startsWith('final')
    || tituloNormalizado.includes('disputa de 3');
}

function tituloEhChaveVencedores(titulo) {
  return (titulo || '').trim().toLowerCase().includes('chave dos vencedores');
}

function tituloEhChavePerdedores(titulo) {
  return (titulo || '').trim().toLowerCase().includes('chave dos perdedores');
}

function ordenarColunasComFinaisNoFim(colunas) {
  return [...colunas].sort((a, b) => {
    const aEhFinais = ehTituloFinais(a.titulo);
    const bEhFinais = ehTituloFinais(b.titulo);

    if (aEhFinais && !bEhFinais) {
      return 1;
    }

    if (!aEhFinais && bEhFinais) {
      return -1;
    }

    return (a.ordem || 0) - (b.ordem || 0) || a.titulo.localeCompare(b.titulo, 'pt-BR');
  });
}

function garantirColunaFinaisNoFim(colunas, ordemBase = 9999) {
  const colunasOrdenadas = ordenarColunasComFinaisNoFim(colunas);
  if (colunasOrdenadas.some((coluna) => ehTituloFinais(coluna.titulo))) {
    return colunasOrdenadas;
  }

  return [
    ...colunasOrdenadas,
    {
      titulo: 'Finais',
      ordem: ordemBase,
      partidas: [],
      conectar: false
    }
  ];
}

function obterMetadadosFaseChaveClassica(fase) {
  const faseNormalizada = (fase || '').trim();
  const texto = faseNormalizada.toLowerCase();
  const rodada = extrairNumeroRodada(faseNormalizada);

  if (!faseNormalizada) {
    return {
      titulo: 'Jogos sorteados',
      ordem: 1
    };
  }

  if (texto.startsWith('rodada ') && rodada > 0) {
    return {
      titulo: `Rodada ${String(rodada).padStart(2, '0')}`,
      ordem: 100 + rodada
    };
  }

  if (texto.includes('fase classificatória') && rodada > 0) {
    return {
      titulo: `Fase classificatória · Rodada ${String(rodada).padStart(2, '0')}`,
      ordem: 120 + rodada
    };
  }

  if (texto.includes('fase de grupos') && rodada > 0) {
    return {
      titulo: `Fase de grupos · Rodada ${String(rodada).padStart(2, '0')}`,
      ordem: 140 + rodada
    };
  }

  if (texto.includes('chave principal') || texto.includes('chave dos vencedores')) {
    return {
      titulo: faseNormalizada,
      ordem: 10 + rodada
    };
  }

  if (texto.includes('fase eliminatória')) {
    return {
      titulo: faseNormalizada,
      ordem: 20 + rodada
    };
  }

  if (texto.includes('oitavas de final')) {
    return { titulo: 'Oitavas de final', ordem: 30 };
  }

  if (texto.includes('quartas de final')) {
    return { titulo: 'Quartas de final', ordem: 40 };
  }

  if (texto.includes('semifinal')) {
    return { titulo: 'Semifinal', ordem: 50 };
  }

  if (texto.includes('disputa de 3')) {
    return { titulo: 'Disputa de 3º lugar', ordem: 55 };
  }

  if (texto.includes('final de reset')) {
    return { titulo: 'Final de reset', ordem: 65 };
  }

  if (texto === 'final' || texto.startsWith('final -')) {
    return { titulo: 'Final', ordem: 60 };
  }

  if (texto.includes('chave dos perdedores')) {
    return {
      titulo: faseNormalizada,
      ordem: 40 + rodada
    };
  }

  return null;
}

function compararPartidasChave(a, b) {
  const dataA = a.dataPartida ? new Date(a.dataPartida).getTime() : Number.MAX_SAFE_INTEGER;
  const dataB = b.dataPartida ? new Date(b.dataPartida).getTime() : Number.MAX_SAFE_INTEGER;

  if (dataA !== dataB) {
    return dataA - dataB;
  }

  return (a.faseOrdemInterna || 0) - (b.faseOrdemInterna || 0);
}

export function PaginaPartidasCampeonato() {
  const [params, setParams] = useSearchParams();
  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [dadosChaveamento, setDadosChaveamento] = useState(null);
  const [competicaoId, setCompeticaoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [abaAtiva, setAbaAtiva] = useState(params.get('aba') === 'lista' ? 'lista' : 'chaveamento');
  const [filtroChaveamento, setFiltroChaveamento] = useState('completa');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const competicoesDisponiveis = useMemo(
    () => competicoes.filter((competicao) => ehCompeticaoComCategoriasDeCampeonato(competicao)),
    [competicoes]
  );

  const competicaoSelecionada = competicoesDisponiveis.find((competicao) => competicao.id === competicaoId) || null;
  const categoriaSelecionada = categorias.find((categoria) => categoria.id === categoriaId) || null;

  const colunasEmVisualizacao = useMemo(() => {
    const colunasSequenciais = new Map();
    const colunasPadrao = new Map();
    const partidasAvulsas = [];
    let possuiChavesLateraisExplicitas = false;
    let maiorOrdemLateral = 0;

    partidas.forEach((partida, indice) => {
      const partidaComOrdem = { ...partida, faseOrdemInterna: indice };
      const metadadosLaterais = extrairMetadadosChaveLateral(partida.faseCampeonato);

      if (metadadosLaterais) {
        possuiChavesLateraisExplicitas = true;
        maiorOrdemLateral = Math.max(maiorOrdemLateral, metadadosLaterais.ordem);

        if (!colunasSequenciais.has(metadadosLaterais.chave)) {
          colunasSequenciais.set(metadadosLaterais.chave, {
            titulo: metadadosLaterais.titulo,
            ordem: metadadosLaterais.ordem,
            partidas: [],
            conectar: true
          });
        }

        colunasSequenciais.get(metadadosLaterais.chave).partidas.push(partidaComOrdem);
        return;
      }

      partidasAvulsas.push(partidaComOrdem);
    });

    if (possuiChavesLateraisExplicitas) {
      const colunasOrdenadas = Array.from(colunasSequenciais.values())
        .sort((a, b) => a.ordem - b.ordem)
        .map((coluna) => ({
          ...coluna,
          partidas: [...coluna.partidas].sort(compararPartidasChave)
        }));
      const colunasComplementares = [];
      const partidasFinais = [];

      partidasAvulsas.forEach((partida) => {
        const metadados = obterMetadadosFaseChaveClassica(partida.faseCampeonato);
        if (!metadados) {
          return;
        }

        if (metadados.titulo === 'Final' || metadados.titulo === 'Disputa de 3º lugar' || metadados.titulo === 'Final de reset') {
          partidasFinais.push(partida);
          return;
        }

        colunasComplementares.push({
          titulo: metadados.titulo,
          ordem: 1000 + metadados.ordem,
          partidas: [partida],
          conectar: false
        });
      });

      return garantirColunaFinaisNoFim([
        ...colunasOrdenadas,
        ...colunasComplementares.sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR')),
        ...(partidasFinais.length > 0
          ? [{
              titulo: 'Finais',
              ordem: maiorOrdemLateral + 100,
              partidas: partidasFinais.sort(compararPartidasChave),
              conectar: false
            }]
          : [])
      ], maiorOrdemLateral + 100);
    }

    const partidasFinais = [];

    partidasAvulsas.forEach((partida) => {
      const metadados = obterMetadadosFaseChaveClassica(partida.faseCampeonato);
      if (!metadados) {
        return;
      }

      if (metadados.titulo === 'Final' || metadados.titulo === 'Disputa de 3º lugar' || metadados.titulo === 'Final de reset') {
        partidasFinais.push(partida);
        return;
      }

      if (!colunasPadrao.has(metadados.titulo)) {
        colunasPadrao.set(metadados.titulo, {
          titulo: metadados.titulo,
          ordem: metadados.ordem,
          partidas: []
        });
      }

      colunasPadrao.get(metadados.titulo).partidas.push(partida);
    });

    return garantirColunaFinaisNoFim([
      ...Array.from(colunasPadrao.values()).map((coluna) => ({
        ...coluna,
        partidas: [...coluna.partidas].sort(compararPartidasChave)
      })),
      ...(partidasFinais.length > 0
        ? [{
            titulo: 'Finais',
            ordem: 9998,
            partidas: partidasFinais.sort(compararPartidasChave),
            conectar: false
          }]
        : [])
    ]);
  }, [partidas]);

  const blocosVisualizacaoChave = useMemo(() => {
    const vencedores = [];
    const perdedores = [];
    const finais = [];
    const outros = [];

    colunasEmVisualizacao.forEach((coluna) => {
      if (ehTituloFinais(coluna.titulo)) {
        finais.push(coluna);
        return;
      }

      if (tituloEhChaveVencedores(coluna.titulo)) {
        vencedores.push(coluna);
        return;
      }

      if (tituloEhChavePerdedores(coluna.titulo)) {
        perdedores.push(coluna);
        return;
      }

      outros.push(coluna);
    });

    return [
      vencedores.length > 0 ? { id: 'vencedores', titulo: 'Chave dos vencedores', colunas: vencedores } : null,
      perdedores.length > 0 ? { id: 'perdedores', titulo: 'Chave dos perdedores', colunas: perdedores } : null,
      outros.length > 0 ? { id: 'outros', titulo: null, colunas: outros } : null,
      finais.length > 0 ? { id: 'finais', titulo: 'Finais', colunas: finais } : null
    ].filter(Boolean);
  }, [colunasEmVisualizacao]);

  const blocosChaveamentoFiltrados = useMemo(() => {
    if (filtroChaveamento === 'vencedores') {
      return blocosVisualizacaoChave.filter((bloco) => bloco.id === 'vencedores' || bloco.id === 'finais');
    }

    if (filtroChaveamento === 'perdedores') {
      return blocosVisualizacaoChave.filter((bloco) => bloco.id === 'perdedores' || bloco.id === 'finais');
    }

    return blocosVisualizacaoChave;
  }, [blocosVisualizacaoChave, filtroChaveamento]);

  const resumoTabelaJogos = useMemo(() => {
    const totalJogos = partidas.length;
    const jogosEncerrados = partidas.filter((partida) => partida.status === 2).length;

    return {
      totalJogos,
      jogosEncerrados,
      jogosPendentes: totalJogos - jogosEncerrados
    };
  }, [partidas]);

  const exibirChaveVisual = categoriaId && partidas.length > 0 && colunasEmVisualizacao.length > 0;

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    atualizarParametrosUrl(competicaoId, categoriaId, abaAtiva);
  }, [abaAtiva]);

  useEffect(() => {
    if (competicaoId && !competicoesDisponiveis.some((competicao) => competicao.id === competicaoId)) {
      setCompeticaoId('');
      setCategoriaId('');
      setCategorias([]);
      setPartidas([]);
      setDadosChaveamento(null);
    }
  }, [competicaoId, competicoesDisponiveis]);

  useEffect(() => {
    if (!competicaoId) {
      setCategorias([]);
      setCategoriaId('');
      setPartidas([]);
      setDadosChaveamento(null);
      return;
    }

    carregarCategorias(competicaoId);
  }, [competicaoId]);

  useEffect(() => {
    if (!categoriaId) {
      setPartidas([]);
      setDadosChaveamento(null);
      return;
    }

    carregarCategoria(categoriaId);
  }, [categoriaId]);

  function atualizarParametrosUrl(proximoCompeticaoId, proximaCategoriaId = '', proximaAba = abaAtiva) {
    const parametros = {};

    if (proximoCompeticaoId) {
      parametros.competicaoId = proximoCompeticaoId;
    }

    if (proximaCategoriaId) {
      parametros.categoriaId = proximaCategoriaId;
    }

    if (proximaAba) {
      parametros.aba = proximaAba;
    }

    setParams(parametros);
  }

  async function carregarBase() {
    setErro('');
    setCarregando(true);

    try {
      const listaCompeticoes = await competicoesServico.listar();
      setCompeticoes(listaCompeticoes);

      const categoriaUrl = params.get('categoriaId');
      const competicaoUrl = params.get('competicaoId');
      const abaUrl = params.get('aba');
      setAbaAtiva(abaUrl === 'lista' ? 'lista' : 'chaveamento');

      if (categoriaUrl) {
        const categoria = await categoriasServico.obterPorId(categoriaUrl);
        const competicaoCategoria = listaCompeticoes.find((competicao) => competicao.id === categoria.competicaoId);

        if (!ehCompeticaoComCategoriasDeCampeonato(competicaoCategoria)) {
          setCompeticaoId('');
          setCategoriaId('');
          atualizarParametrosUrl('', '', abaUrl === 'lista' ? 'lista' : 'chaveamento');
          return;
        }

        setCompeticaoId(categoria.competicaoId);
        setCategoriaId(categoria.id);
        atualizarParametrosUrl(categoria.competicaoId, categoria.id, abaUrl === 'lista' ? 'lista' : 'chaveamento');
        return;
      }

      if (competicaoUrl) {
        const competicaoSelecionadaUrl = listaCompeticoes.find((competicao) => competicao.id === competicaoUrl);

        if (!ehCompeticaoComCategoriasDeCampeonato(competicaoSelecionadaUrl)) {
          setCompeticaoId('');
          setCategoriaId('');
          atualizarParametrosUrl('', '', abaUrl === 'lista' ? 'lista' : 'chaveamento');
          return;
        }

        setCompeticaoId(competicaoUrl);
        setCategoriaId('');
        atualizarParametrosUrl(competicaoUrl, '', abaUrl === 'lista' ? 'lista' : 'chaveamento');
        return;
      }

      setCompeticaoId('');
      setCategoriaId('');
      atualizarParametrosUrl('', '', abaUrl === 'lista' ? 'lista' : 'chaveamento');
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  async function carregarCategorias(idCompeticao) {
    setErro('');

    try {
      const lista = await categoriasServico.listarPorCompeticao(idCompeticao);
      setCategorias(lista);

      const categoriaValida = lista.some((categoria) => categoria.id === categoriaId);
      const proximaCategoriaId = categoriaValida ? categoriaId : lista[0]?.id || '';

      setCategoriaId(proximaCategoriaId);
      atualizarParametrosUrl(idCompeticao, proximaCategoriaId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setCategorias([]);
      setCategoriaId('');
    }
  }

  async function carregarCategoria(idCategoria) {
    setErro('');
    setCarregando(true);

    try {
      const [listaPartidas, chaveamento] = await Promise.all([
        partidasServico.listarPorCategoria(idCategoria),
        categoriasServico.obterChaveamento(idCategoria)
      ]);

      setPartidas(listaPartidas);
      setDadosChaveamento(chaveamento);
      atualizarParametrosUrl(competicaoId, idCategoria, abaAtiva);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setPartidas([]);
      setDadosChaveamento(null);
    } finally {
      setCarregando(false);
    }
  }

  function renderizarColunaChave(coluna, indiceColuna, totalColunas, lado, conectar = true) {
    const primeiraColuna = indiceColuna === 0;
    const ultimaColuna = indiceColuna === totalColunas - 1;

    return (
      <section
        key={coluna.titulo}
        className={[
          'chave-coluna',
          `lado-${lado}`,
          conectar ? '' : 'sem-conector',
          primeiraColuna ? 'primeira' : '',
          ultimaColuna ? 'ultima' : ''
        ].filter(Boolean).join(' ')}
      >
        <div className="chave-coluna-cabecalho">
          <h4>{coluna.titulo}</h4>
          <span>{coluna.partidas.length} jogo(s)</span>
        </div>

        <div className="chave-coluna-jogos">
          {coluna.partidas.length === 0 && ehTituloFinais(coluna.titulo) && (
            <div className="chave-jogos-centro-vazio">
              <strong>Próximas fases</strong>
            </div>
          )}

          {coluna.partidas.map((partida, indicePartida) => {
            const duplaAVenceu = partida.duplaVencedoraId === partida.duplaAId;
            const duplaBVenceu = partida.duplaVencedoraId === partida.duplaBId;

            return (
              <article key={partida.id} className="chave-jogo">
                <div className="chave-jogo-cabecalho">
                  <div className="chave-jogo-cabecalho-meta">
                    <span className="chave-jogo-indice">Jogo {indicePartida + 1}</span>
                    <small>{partida.dataPartida ? formatarDataHora(partida.dataPartida) : 'Data a definir'}</small>
                  </div>
                  <span className={`chave-jogo-status status-${partida.status === 2 ? 'encerrada' : 'agendada'}`}>
                    {obterNomeStatus(partida.status, partida.ativa)}
                  </span>
                </div>

                {partida.faseCampeonato && <small>{partida.faseCampeonato}</small>}
                {partida.ehPreliminar && <small>Rodada preliminar</small>}

                <div className={`chave-jogo-linha ${duplaAVenceu ? 'vencedora' : ''}`}>
                  <span className="chave-jogo-pontuacao-texto">{partida.status === 2 ? partida.placarDuplaA : '-'}</span>
                  <strong>{partida.nomeDuplaA}</strong>
                </div>

                <div className={`chave-jogo-linha ${duplaBVenceu ? 'vencedora' : ''}`}>
                  <span className="chave-jogo-pontuacao-texto">{partida.status === 2 ? partida.placarDuplaB : '-'}</span>
                  <strong>{partida.nomeDuplaB}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <div className="acoes-item">
          <BotaoVoltar fallback="/competicoes" />
        </div>
        <h2>Partidas de campeonato</h2>
        <p>Selecione a competição e a categoria para acompanhar o chaveamento e os resultados.</p>
      </div>

      <div className="formulario-grid filtro-partidas">
        <label>
          Competição
          <select
            value={competicaoId}
            onChange={(evento) => {
              setCompeticaoId(evento.target.value);
              setCategoriaId('');
              atualizarParametrosUrl(evento.target.value);
            }}
          >
            <option value="">Selecione</option>
            {competicoesDisponiveis.map((competicao) => (
              <option key={competicao.id} value={competicao.id}>
                {competicao.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Categoria
          <select
            value={categoriaId}
            onChange={(evento) => {
              setCategoriaId(evento.target.value);
              atualizarParametrosUrl(competicaoId, evento.target.value);
            }}
            disabled={!competicaoId || categorias.length === 0}
          >
            <option value="">{competicaoId ? 'Selecione' : 'Escolha a competição'}</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {competicaoSelecionada && categoriaSelecionada && (
        <div className="acoes-item">
          <button
            type="button"
            className={abaAtiva === 'chaveamento' ? 'botao-primario' : 'botao-terciario'}
            onClick={() => setAbaAtiva('chaveamento')}
          >
            Chaveamento
          </button>
          <button
            type="button"
            className={abaAtiva === 'lista' ? 'botao-primario' : 'botao-terciario'}
            onClick={() => setAbaAtiva('lista')}
          >
            Lista de partidas
          </button>
        </div>
      )}

      {erro && <p className="texto-erro">{erro}</p>}

      {!carregando && competicaoId && categorias.length === 0 && (
        <section className="cartao">
          <p>Esta competição ainda não possui categorias cadastradas.</p>
        </section>
      )}

      {abaAtiva === 'chaveamento' && exibirChaveVisual && (
        <section className="cartao grupos-visualizacao">
          <div className="grupos-visualizacao-cabecalho">
            <div>
              <h3>{categoriaSelecionada?.nome || 'Chaveamento'}</h3>
              <p>
                {dadosChaveamento?.possuiFinalReset
                  ? 'A finalíssima permanece pendente e só é ativada se a dupla da chave dos perdedores vencer a final.'
                  : 'Acompanhe a evolução da chave por rodada e lado.'}
              </p>
            </div>
            <div className="acoes-item">
              <button
                type="button"
                className={filtroChaveamento === 'completa' ? 'botao-primario' : 'botao-terciario'}
                onClick={() => setFiltroChaveamento('completa')}
              >
                Chave completa
              </button>
              <button
                type="button"
                className={filtroChaveamento === 'vencedores' ? 'botao-primario' : 'botao-terciario'}
                onClick={() => setFiltroChaveamento('vencedores')}
              >
                Vencedores
              </button>
              <button
                type="button"
                className={filtroChaveamento === 'perdedores' ? 'botao-primario' : 'botao-terciario'}
                onClick={() => setFiltroChaveamento('perdedores')}
              >
                Perdedores
              </button>
            </div>
          </div>

          <div className="acoes-item">
            <span>Total de jogos: {resumoTabelaJogos.totalJogos}</span>
            <span>Encerrados: {resumoTabelaJogos.jogosEncerrados}</span>
            <span>Pendentes: {resumoTabelaJogos.jogosPendentes}</span>
          </div>

          <div className="chave-jogos-wrapper">
            <div className="chave-jogos-blocos">
              {blocosChaveamentoFiltrados.map((bloco) => (
                <section key={bloco.id} className="chave-jogos-bloco">
                  {bloco.titulo && (
                    <div className="chave-jogos-bloco-cabecalho">
                      <div>
                        <strong>{bloco.titulo}</strong>
                        <small>{bloco.colunas.reduce((total, coluna) => total + coluna.partidas.length, 0)} jogo(s)</small>
                      </div>
                    </div>
                  )}

                  <div className="chave-jogos">
                    {bloco.colunas.map((coluna, indice) => renderizarColunaChave(coluna, indice, bloco.colunas.length, indice === 0 ? 'esquerda' : 'direita', coluna.conectar !== false))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      )}

      {abaAtiva === 'chaveamento' && !exibirChaveVisual && !carregando && (
        <section className="cartao">
          <p>{categoriaId ? 'Nenhum chaveamento gerado para esta categoria.' : 'Selecione uma categoria para visualizar o chaveamento.'}</p>
        </section>
      )}

      {carregando ? (
        <p>Carregando partidas...</p>
      ) : abaAtiva === 'lista' ? (
        <section className="partidas-detalhes-secao">
          <div className="cabecalho-pagina cabecalho-secao-partidas">
            <h3>Lista de partidas</h3>
            <p>Veja cada confronto com resultado, atletas envolvidos e status de validação.</p>
          </div>

          <div className="lista-cartoes">
            {partidas.map((partida) => (
              <article key={partida.id} className="cartao-lista partida-lista-card">
                <div className="partida-lista-topo">
                  <h3 className="partida-confronto">
                    <span>{partida.nomeDuplaA}</span>
                    <span className="partida-placar-valor">
                      {partida.status === 2 ? `${partida.placarDuplaA} x ${partida.placarDuplaB}` : 'x'}
                    </span>
                    <span>{partida.nomeDuplaB}</span>
                  </h3>
                  <span className={`tag-status ${partida.status === 2 ? 'tag-status-sucesso' : 'tag-status-alerta'}`}>
                    {obterNomeStatus(partida.status, partida.ativa)}
                  </span>
                </div>

                <div className="partida-lista-detalhes">
                  <p>Competição: {competicaoSelecionada?.nome || '-'}</p>
                  <p>Categoria: {partida.nomeCategoria}</p>
                  <p>Data: {partida.dataPartida ? formatarDataHora(partida.dataPartida) : 'A definir'}</p>
                  <p>Dupla A · Direita: {partida.nomeDuplaAAtleta1}</p>
                  <p>Dupla A · Esquerda: {partida.nomeDuplaAAtleta2}</p>
                  <p>Dupla B · Direita: {partida.nomeDuplaBAtleta1}</p>
                  <p>Dupla B · Esquerda: {partida.nomeDuplaBAtleta2}</p>
                  <p className="partida-status-linha">
                    Validação:
                    <span className={`tag-status ${obterClasseStatusAprovacao(partida.statusAprovacao)}`}>
                      {obterNomeStatusAprovacao(partida.statusAprovacao)}
                    </span>
                  </p>
                  <p>Registrada por: {partida.nomeCriadoPorUsuario || 'Não informado'}</p>
                  {partida.faseCampeonato && <p>Fase: {partida.faseCampeonato}</p>}
                  {partida.status === 2 ? (
                    <p>Vencedora: {partida.nomeDuplaVencedora || '-'}</p>
                  ) : (
                    <p>Resultado: jogo ainda não encerrado</p>
                  )}
                  <p className="campo-largo">Obs: {partida.observacoes || '-'}</p>
                </div>
              </article>
            ))}

            {partidas.length === 0 && (
              <p>{categoriaId ? 'Nenhuma partida cadastrada para esta categoria.' : 'Selecione uma categoria para visualizar as partidas.'}</p>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
