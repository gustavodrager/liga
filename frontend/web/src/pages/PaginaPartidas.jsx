import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { duplasServico } from '../services/duplasServico';
import { grupoAtletasServico } from '../services/grupoAtletasServico';
import { inscricoesCampeonatoServico } from '../services/inscricoesCampeonatoServico';
import { partidasServico } from '../services/partidasServico';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora, paraInputDataHora } from '../utils/formatacao';
import { rolarParaElemento } from '../utils/rolagem';
import { ehAtleta, ehGestorCompeticao, PERFIS_USUARIO } from '../utils/perfis';

const estadoInicial = {
  categoriaCompeticaoId: '',
  duplaAId: '',
  duplaBId: '',
  duplaAAtleta1Id: '',
  duplaAAtleta2Id: '',
  duplaBAtleta1Id: '',
  duplaBAtleta2Id: '',
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

function extrairNumeroRodada(fase) {
  const correspondencia = (fase || '').match(/rodada\s+(\d+)/i);
  return correspondencia ? Number(correspondencia[1]) : 0;
}

function extrairMetadadosChaveLateral(fase) {
  const correspondencia = (fase || '').trim().match(/^Chave\s+([A-Z])\s*-\s*Rodada\s+(\d+)/i);
  if (!correspondencia) {
    return null;
  }

  return {
    lado: correspondencia[1].toUpperCase(),
    rodada: Number(correspondencia[2])
  };
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

  const correspondenciaGrupo = faseNormalizada.match(/^Grupo\s+([A-Z])\s*-\s*Rodada\s+(\d+)/i);
  if (correspondenciaGrupo) {
    const letraGrupo = correspondenciaGrupo[1].toUpperCase();
    const numeroGrupo = letraGrupo.charCodeAt(0) - 64;
    const numeroRodada = Number(correspondenciaGrupo[2]);

    return {
      titulo: `Grupo ${letraGrupo} · Rodada ${String(numeroRodada).padStart(2, '0')}`,
      ordem: 100 + (numeroGrupo * 100) + numeroRodada
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

  if (texto.includes('chave principal')) {
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
    return {
      titulo: 'Oitavas de final',
      ordem: 30
    };
  }

  if (texto.includes('quartas de final')) {
    return {
      titulo: 'Quartas de final',
      ordem: 40
    };
  }

  if (texto.includes('semifinal')) {
    return {
      titulo: 'Semifinal',
      ordem: 50
    };
  }

  if (texto.includes('disputa de 3')) {
    return {
      titulo: 'Disputa de 3º lugar',
      ordem: 55
    };
  }

  if (texto === 'final' || texto.startsWith('final -')) {
    return {
      titulo: 'Final',
      ordem: 60
    };
  }

  if (texto.includes('chave dos perdedores')) {
    return {
      titulo: faseNormalizada,
      ordem: 70 + rodada
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

export function PaginaPartidas() {
  const { usuario } = useAutenticacao();
  const usuarioAtleta = ehAtleta(usuario);

  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [grupoAtletas, setGrupoAtletas] = useState([]);
  const [inscricoesCategoria, setInscricoesCategoria] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [competicaoId, setCompeticaoId] = useState('');
  const [formulario, setFormulario] = useState(estadoInicial);
  const [partidaEdicaoId, setPartidaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoTabela, setGerandoTabela] = useState(false);
  const [aprovandoTabela, setAprovandoTabela] = useState(false);
  const [removendoTabela, setRemovendoTabela] = useState(false);
  const [placaresRapidos, setPlacaresRapidos] = useState({});
  const [salvandoResultadoIds, setSalvandoResultadoIds] = useState({});
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const formularioRef = useRef(null);
  const tabelaJogosRef = useRef(null);

  const [params, setParams] = useSearchParams();
  const visualizacaoTabela = params.get('visualizacao') === 'tabela';

  const competicoesDisponiveis = useMemo(() => {
    if (!usuarioAtleta) {
      return competicoes;
    }

    return competicoes.filter(
      (competicao) => competicao.tipo === 3 && competicao.usuarioOrganizadorId === usuario?.id
    );
  }, [competicoes, usuarioAtleta, usuario?.id]);

  const competicaoSelecionada = competicoesDisponiveis.find((competicao) => competicao.id === competicaoId) || null;
  const categoriaSelecionada = categorias.find((categoria) => categoria.id === formulario.categoriaCompeticaoId) || null;
  const grupoSelecionado = competicaoSelecionada?.tipo === 3;
  const competicaoComInscricoes = Boolean(competicaoSelecionada && competicaoSelecionada.tipo !== 3);
  const gerenciaGrupoSelecionado =
    usuarioAtleta &&
    competicaoSelecionada?.tipo === 3 &&
    competicaoSelecionada?.usuarioOrganizadorId === usuario?.id;
  const administradorLogado = Number(usuario?.perfil) === PERFIS_USUARIO.administrador;
  const organizadorDaCompeticaoSelecionada =
    Number(usuario?.perfil) === PERFIS_USUARIO.organizador &&
    competicaoSelecionada?.usuarioOrganizadorId === usuario?.id;
  const tabelaJogosAprovada = Boolean(categoriaSelecionada?.tabelaJogosAprovada);
  const aguardandoAprovacaoSorteio = competicaoComInscricoes && partidas.length > 0 && !tabelaJogosAprovada;
  const podeEditarPartidas = grupoSelecionado
    ? ehGestorCompeticao(usuario) || gerenciaGrupoSelecionado
    : administradorLogado || organizadorDaCompeticaoSelecionada;
  const podeSortearPartidas = competicaoComInscricoes && (administradorLogado || organizadorDaCompeticaoSelecionada);
  const podeAprovarSorteio = podeSortearPartidas && aguardandoAprovacaoSorteio;
  const podeRegistrarManual = grupoSelecionado;
  const podeExibirFormulario = podeEditarPartidas && (podeRegistrarManual || Boolean(partidaEdicaoId));
  const podeLancarResultado = grupoSelecionado || !competicaoComInscricoes || tabelaJogosAprovada;
  const podeLancarResultadoDireto = competicaoComInscricoes && tabelaJogosAprovada && podeEditarPartidas;
  const statusEncerrada = Number(formulario.status) === 2;
  const rotuloPlacarDuplaA = grupoSelecionado ? 'Pontos da Dupla A' : 'Placar Dupla A';
  const rotuloPlacarDuplaB = grupoSelecionado ? 'Pontos da Dupla B' : 'Placar Dupla B';
  const colunasChave = useMemo(() => {
    const colunas = new Map();
    const rodadasChaveB = partidas
      .map((partida) => extrairMetadadosChaveLateral(partida.faseCampeonato))
      .filter((item) => item?.lado === 'B')
      .map((item) => item.rodada);
    const maiorRodadaChaveB = rodadasChaveB.length > 0 ? Math.max(...rodadasChaveB) : 0;

    partidas.forEach((partida, indice) => {
      const metadadosLaterais = extrairMetadadosChaveLateral(partida.faseCampeonato);
      const metadados = metadadosLaterais
        ? {
            titulo: `Chave ${metadadosLaterais.lado} · Rodada ${String(metadadosLaterais.rodada).padStart(2, '0')}`,
            ordem: metadadosLaterais.lado === 'A'
              ? 100 + metadadosLaterais.rodada
              : 700 + (maiorRodadaChaveB - metadadosLaterais.rodada)
          }
        : obterMetadadosFaseChaveClassica(partida.faseCampeonato);
      if (!metadados) {
        return;
      }

      if (!colunas.has(metadados.titulo)) {
        colunas.set(metadados.titulo, {
          titulo: metadados.titulo,
          ordem: metadados.ordem,
          partidas: []
        });
      }

      colunas.get(metadados.titulo).partidas.push({
        ...partida,
        faseOrdemInterna: indice
      });
    });

    return Array.from(colunas.values())
      .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR'))
      .map((coluna) => ({
        ...coluna,
        partidas: [...coluna.partidas].sort(compararPartidasChave)
      }));
  }, [partidas]);
  const estruturaTabelaJogos = useMemo(() => {
    const colunasEsquerda = [];
    const colunasCentro = [];
    const colunasDireita = [];
    const possuiChavesLateraisExplicitas = colunasChave.some(
      (coluna) => coluna.titulo.startsWith('Chave A') || coluna.titulo.startsWith('Chave B')
    );

    if (!possuiChavesLateraisExplicitas) {
      return {
        esquerda: colunasChave.length > 0 ? [colunasChave[0]] : [],
        centro: [],
        direita: colunasChave.slice(1)
      };
    }

    colunasChave.forEach((coluna) => {
      if (coluna.titulo.startsWith('Chave A')) {
        colunasEsquerda.push(coluna);
        return;
      }

      if (coluna.titulo.startsWith('Chave B')) {
        colunasDireita.push(coluna);
        return;
      }

      colunasCentro.push(coluna);
    });

    return {
      esquerda: colunasEsquerda,
      centro: colunasCentro,
      direita: colunasDireita
    };
  }, [colunasChave]);
  const exibirChaveVisual = competicaoComInscricoes && partidas.length > 0 && colunasChave.length > 0;
  const exibirListaDetalhada = !exibirChaveVisual || !visualizacaoTabela;
  const possuiChavesLaterais = estruturaTabelaJogos.esquerda.length > 0 || estruturaTabelaJogos.direita.length > 0;

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (!competicoesDisponiveis.some((competicao) => competicao.id === competicaoId)) {
      setCompeticaoId(competicoesDisponiveis[0]?.id || '');
    }
  }, [competicaoId, competicoesDisponiveis]);

  useEffect(() => {
    if (!competicaoId) {
      setCategorias([]);
      setGrupoAtletas([]);
      return;
    }

    carregarCategorias(competicaoId);
  }, [competicaoId]);

  useEffect(() => {
    if (!competicaoSelecionada || competicaoSelecionada.tipo !== 3) {
      setGrupoAtletas([]);
      return;
    }

    carregarGrupoAtletas(competicaoSelecionada.id);
  }, [competicaoSelecionada]);

  useEffect(() => {
    if (!grupoSelecionado || partidaEdicaoId) {
      return;
    }

    setFormulario((anterior) => (
      anterior.status === '2'
        ? anterior
        : { ...anterior, status: '2' }
    ));
  }, [grupoSelecionado, partidaEdicaoId]);

  useEffect(() => {
    if (!competicaoComInscricoes || tabelaJogosAprovada || formulario.status !== '2') {
      return;
    }

    setFormulario((anterior) => ({
      ...anterior,
      status: '1',
      placarDuplaA: '',
      placarDuplaB: ''
    }));
  }, [competicaoComInscricoes, formulario.status, tabelaJogosAprovada]);

  useEffect(() => {
    setPlacaresRapidos((anterior) => {
      const proximo = {};

      partidas.forEach((partida) => {
        proximo[partida.id] = {
          placarDuplaA: anterior[partida.id]?.placarDuplaA ?? (partida.status === 2 ? String(partida.placarDuplaA) : ''),
          placarDuplaB: anterior[partida.id]?.placarDuplaB ?? (partida.status === 2 ? String(partida.placarDuplaB) : '')
        };
      });

      return proximo;
    });
  }, [partidas]);

  useEffect(() => {
    if (!formulario.categoriaCompeticaoId) {
      setPartidas([]);
      return;
    }

    carregarPartidas(formulario.categoriaCompeticaoId);
  }, [formulario.categoriaCompeticaoId]);

  useEffect(() => {
    if (visualizacaoTabela && exibirChaveVisual) {
      rolarParaElemento(tabelaJogosRef.current);
    }
  }, [exibirChaveVisual, visualizacaoTabela]);

  useEffect(() => {
    if (!competicaoComInscricoes || !formulario.categoriaCompeticaoId) {
      setInscricoesCategoria([]);
      return;
    }

    carregarInscricoesCategoria(competicaoSelecionada.id, formulario.categoriaCompeticaoId);
  }, [competicaoComInscricoes, competicaoSelecionada, formulario.categoriaCompeticaoId]);

  const duplasDisponiveis = useMemo(() => {
    if (!competicaoComInscricoes) {
      return duplas;
    }

    return duplas.filter((dupla) =>
      inscricoesCategoria.some(
        (inscricao) =>
          inscricao.categoriaId === formulario.categoriaCompeticaoId &&
          dupla.id === inscricao.duplaId
      )
    );
  }, [competicaoComInscricoes, duplas, formulario.categoriaCompeticaoId, inscricoesCategoria]);

  const opcoesDuplaA = useMemo(
    () => duplasDisponiveis.filter((dupla) => dupla.id !== formulario.duplaBId),
    [duplasDisponiveis, formulario.duplaBId]
  );

  const opcoesDuplaB = useMemo(
    () => duplasDisponiveis.filter((dupla) => dupla.id !== formulario.duplaAId),
    [duplasDisponiveis, formulario.duplaAId]
  );

  const opcoesDuplaAAtleta1 = grupoAtletas;
  const opcoesDuplaAAtleta2 = grupoAtletas.filter((item) => item.atletaId !== formulario.duplaAAtleta1Id);
  const opcoesDuplaBAtleta1 = grupoAtletas.filter(
    (item) => ![formulario.duplaAAtleta1Id, formulario.duplaAAtleta2Id].includes(item.atletaId)
  );
  const opcoesDuplaBAtleta2 = grupoAtletas.filter(
    (item) => ![
      formulario.duplaAAtleta1Id,
      formulario.duplaAAtleta2Id,
      formulario.duplaBAtleta1Id
    ].includes(item.atletaId)
  );

  useEffect(() => {
    setFormulario((anterior) => ({
      ...anterior,
      duplaAId: duplasDisponiveis.some((dupla) => dupla.id === anterior.duplaAId) ? anterior.duplaAId : '',
      duplaBId: duplasDisponiveis.some((dupla) => dupla.id === anterior.duplaBId) ? anterior.duplaBId : ''
    }));
  }, [duplasDisponiveis]);

  useEffect(() => {
    setFormulario((anterior) => ({
      ...anterior,
      duplaAAtleta1Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaAAtleta1Id) ? anterior.duplaAAtleta1Id : '',
      duplaAAtleta2Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaAAtleta2Id) ? anterior.duplaAAtleta2Id : '',
      duplaBAtleta1Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaBAtleta1Id) ? anterior.duplaBAtleta1Id : '',
      duplaBAtleta2Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaBAtleta2Id) ? anterior.duplaBAtleta2Id : ''
    }));
  }, [grupoAtletas]);

  function atualizarParametrosUrl(proximoCompeticaoId, proximaCategoriaId = '', destacarTabela = visualizacaoTabela) {
    const parametros = {};

    if (proximoCompeticaoId) {
      parametros.competicaoId = proximoCompeticaoId;
    }

    if (proximaCategoriaId) {
      parametros.categoriaId = proximaCategoriaId;
    }

    if (destacarTabela) {
      parametros.visualizacao = 'tabela';
    }

    setParams(parametros);
  }

  async function carregarBase() {
    setErro('');
    setCarregando(true);

    try {
      const listaCompeticoes = await competicoesServico.listar();
      setCompeticoes(listaCompeticoes);

      if (!usuarioAtleta) {
        const listaDuplas = await duplasServico.listar({
          somenteInscritasMinhasCompeticoes: Number(usuario?.perfil) === PERFIS_USUARIO.organizador
        });
        setDuplas(listaDuplas);
      } else {
        setDuplas([]);
      }

      const categoriaUrl = params.get('categoriaId');
      const competicaoUrl = params.get('competicaoId');

      if (categoriaUrl) {
        const categoria = await categoriasServico.obterPorId(categoriaUrl);
        setCompeticaoId(categoria.competicaoId);
        setFormulario((anterior) => ({
          ...anterior,
          categoriaCompeticaoId: categoria.id
        }));
        atualizarParametrosUrl(categoria.competicaoId, categoria.id);
        return;
      }

      if (competicaoUrl) {
        setCompeticaoId(competicaoUrl);
        atualizarParametrosUrl(competicaoUrl);
        return;
      }

      const listaInicial = usuarioAtleta
        ? listaCompeticoes.filter(
            (competicao) => competicao.tipo === 3 && competicao.usuarioOrganizadorId === usuario?.id
          )
        : listaCompeticoes;

      if (listaInicial[0]) {
        setCompeticaoId(listaInicial[0].id);
        atualizarParametrosUrl(listaInicial[0].id);
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
        const categoriaCompeticaoId = categoriaValida ? anterior.categoriaCompeticaoId : lista[0]?.id || '';

        atualizarParametrosUrl(idCompeticao, categoriaCompeticaoId);

        return {
          ...anterior,
          categoriaCompeticaoId,
          duplaAId: '',
          duplaBId: '',
          duplaAAtleta1Id: '',
          duplaAAtleta2Id: '',
          duplaBAtleta1Id: '',
          duplaBAtleta2Id: ''
        };
      });
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  async function carregarGrupoAtletas(idCompeticao) {
    try {
      const lista = await grupoAtletasServico.listarPorCompeticao(idCompeticao);
      setGrupoAtletas(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setGrupoAtletas([]);
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
      atualizarParametrosUrl(competicaoId, categoriaId);
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
        proximo.duplaAAtleta1Id = '';
        proximo.duplaAAtleta2Id = '';
        proximo.duplaBAtleta1Id = '';
        proximo.duplaBAtleta2Id = '';
      }

      if (campo === 'status' && Number(valor) === 1) {
        proximo.placarDuplaA = '';
        proximo.placarDuplaB = '';
      }

      return proximo;
    });

    if (campo === 'categoriaCompeticaoId') {
      atualizarParametrosUrl(competicaoId, valor);
    }
  }

  function iniciarEdicao(partida) {
    if (!podeEditarPartidas) {
      return;
    }

    const categoria = categorias.find((item) => item.id === partida.categoriaCompeticaoId);
    const categoriaAprovada = Boolean(categoria?.tabelaJogosAprovada);
    if (categoria) {
      setCompeticaoId(categoria.competicaoId);
    }

    setPartidaEdicaoId(partida.id);
    setMensagem('');
    setFormulario({
      categoriaCompeticaoId: partida.categoriaCompeticaoId,
      duplaAId: grupoSelecionado ? '' : partida.duplaAId,
      duplaBId: grupoSelecionado ? '' : partida.duplaBId,
      duplaAAtleta1Id: partida.duplaAAtleta1Id || '',
      duplaAAtleta2Id: partida.duplaAAtleta2Id || '',
      duplaBAtleta1Id: partida.duplaBAtleta1Id || '',
      duplaBAtleta2Id: partida.duplaBAtleta2Id || '',
      faseCampeonato: partida.faseCampeonato || '',
      status: grupoSelecionado || categoriaAprovada ? String(partida.status) : '1',
      placarDuplaA: (grupoSelecionado || categoriaAprovada) && partida.status === 2 ? String(partida.placarDuplaA) : '',
      placarDuplaB: (grupoSelecionado || categoriaAprovada) && partida.status === 2 ? String(partida.placarDuplaB) : '',
      dataPartida: paraInputDataHora(partida.dataPartida),
      observacoes: partida.observacoes || ''
    });
    rolarParaElemento(formularioRef.current);
  }

  function cancelarEdicao() {
    setPartidaEdicaoId(null);
    setFormulario((anterior) => ({
      ...estadoInicial,
      categoriaCompeticaoId: anterior.categoriaCompeticaoId,
      status: grupoSelecionado ? '2' : '1'
    }));
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    setSalvando(true);

    const dados = {
      categoriaCompeticaoId: formulario.categoriaCompeticaoId,
      duplaAId: grupoSelecionado ? null : formulario.duplaAId,
      duplaBId: grupoSelecionado ? null : formulario.duplaBId,
      duplaAAtleta1Id: grupoSelecionado ? formulario.duplaAAtleta1Id || null : null,
      duplaAAtleta2Id: grupoSelecionado ? formulario.duplaAAtleta2Id || null : null,
      duplaBAtleta1Id: grupoSelecionado ? formulario.duplaBAtleta1Id || null : null,
      duplaBAtleta2Id: grupoSelecionado ? formulario.duplaBAtleta2Id || null : null,
      faseCampeonato: competicaoSelecionada?.tipo === 1 ? formulario.faseCampeonato || null : null,
      status: competicaoComInscricoes && !tabelaJogosAprovada ? 1 : Number(formulario.status),
      placarDuplaA: statusEncerrada && podeLancarResultado ? Number(formulario.placarDuplaA) : null,
      placarDuplaB: statusEncerrada && podeLancarResultado ? Number(formulario.placarDuplaB) : null,
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
      setMensagem(
        partidaEdicaoId
          ? competicaoComInscricoes && !tabelaJogosAprovada
            ? 'Confronto atualizado com sucesso. Aprove o sorteio para liberar os resultados.'
            : 'Partida atualizada com sucesso.'
          : 'Partida registrada com sucesso.'
      );
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

    if (substituirTabelaExistente) {
      const confirmar = window.confirm(
        'Deseja excluir os jogos agendados desta categoria e sortear a tabela novamente?'
      );

      if (!confirmar) {
        return;
      }
    }

    setErro('');
    setMensagem('');
    setGerandoTabela(true);

    try {
      const resultado = await categoriasServico.gerarTabelaPartidas(categoriaSelecionada.id, {
        substituirTabelaExistente
      });

      setMensagem(resultado.resumo);
      await carregarCategorias(competicaoId);
      await carregarPartidas(categoriaSelecionada.id);
      atualizarParametrosUrl(competicaoId, categoriaSelecionada.id, true);
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

  async function excluirTabelaCategoria() {
    if (!categoriaSelecionada) {
      setErro('Selecione uma categoria para excluir os jogos.');
      setMensagem('');
      return;
    }

    const confirmar = window.confirm(
      'Deseja excluir todos os jogos agendados desta categoria? Esta ação remove a tabela atual.'
    );

    if (!confirmar) {
      return;
    }

    setErro('');
    setMensagem('');
    setRemovendoTabela(true);

    try {
      const resultado = await categoriasServico.removerTabelaPartidas(categoriaSelecionada.id);
      cancelarEdicao();
      setPartidas([]);
      setMensagem(resultado.resumo);
      await carregarCategorias(competicaoId);
      await carregarPartidas(categoriaSelecionada.id);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setRemovendoTabela(false);
    }
  }

  async function aprovarSorteioCategoria() {
    if (!categoriaSelecionada) {
      setErro('Selecione uma categoria para aprovar o sorteio.');
      setMensagem('');
      return;
    }

    const confirmar = window.confirm(
      'Deseja aprovar o sorteio desta categoria? Depois disso, o lançamento dos resultados ficará liberado.'
    );

    if (!confirmar) {
      return;
    }

    setErro('');
    setMensagem('');
    setAprovandoTabela(true);

    try {
      await categoriasServico.aprovarTabelaPartidas(categoriaSelecionada.id);
      await carregarCategorias(competicaoId);
      await carregarPartidas(categoriaSelecionada.id);
      setMensagem('Sorteio aprovado. O lançamento dos resultados foi liberado para esta categoria.');
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setAprovandoTabela(false);
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

  function obterPlacaresRapidos(partida) {
    return placaresRapidos[partida.id] || {
      placarDuplaA: partida.status === 2 ? String(partida.placarDuplaA) : '',
      placarDuplaB: partida.status === 2 ? String(partida.placarDuplaB) : ''
    };
  }

  function atualizarPlacarRapido(partidaId, campo, valor) {
    if (!/^\d*$/.test(valor)) {
      return;
    }

    setPlacaresRapidos((anterior) => ({
      ...anterior,
      [partidaId]: {
        ...(anterior[partidaId] || {}),
        [campo]: valor
      }
    }));
  }

  async function salvarResultadoRapido(partida) {
    const placares = obterPlacaresRapidos(partida);
    if (placares.placarDuplaA === '' || placares.placarDuplaB === '') {
      setErro('Informe os pontos das duas duplas antes de salvar o resultado.');
      setMensagem('');
      return;
    }

    setErro('');
    setMensagem('');
    setSalvandoResultadoIds((anterior) => ({ ...anterior, [partida.id]: true }));

    try {
      await partidasServico.atualizar(partida.id, {
        categoriaCompeticaoId: partida.categoriaCompeticaoId,
        duplaAId: partida.duplaAId,
        duplaBId: partida.duplaBId,
        duplaAAtleta1Id: null,
        duplaAAtleta2Id: null,
        duplaBAtleta1Id: null,
        duplaBAtleta2Id: null,
        faseCampeonato: competicaoSelecionada?.tipo === 1 ? partida.faseCampeonato || null : null,
        status: 2,
        placarDuplaA: Number(placares.placarDuplaA),
        placarDuplaB: Number(placares.placarDuplaB),
        dataPartida: partida.dataPartida || null,
        observacoes: partida.observacoes || null
      });

      setMensagem(`Resultado salvo para ${partida.nomeDuplaA} x ${partida.nomeDuplaB}.`);
      await carregarPartidas(partida.categoriaCompeticaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvandoResultadoIds((anterior) => ({ ...anterior, [partida.id]: false }));
    }
  }

  function renderizarLancamentoResultado(partida, modo = 'lista') {
    if (!podeLancarResultadoDireto) {
      return null;
    }

    const placares = obterPlacaresRapidos(partida);
    const salvandoResultado = Boolean(salvandoResultadoIds[partida.id]);

    return (
      <div className={`lancamento-resultado lancamento-resultado-${modo}`}>
        <label>
          <span>{partida.nomeDuplaA}</span>
          <input
            type="number"
            min={0}
            value={placares.placarDuplaA}
            onChange={(evento) => atualizarPlacarRapido(partida.id, 'placarDuplaA', evento.target.value)}
            disabled={salvandoResultado}
          />
        </label>

        <label>
          <span>{partida.nomeDuplaB}</span>
          <input
            type="number"
            min={0}
            value={placares.placarDuplaB}
            onChange={(evento) => atualizarPlacarRapido(partida.id, 'placarDuplaB', evento.target.value)}
            disabled={salvandoResultado}
          />
        </label>

        <button
          type="button"
          className="botao-primario"
          onClick={() => salvarResultadoRapido(partida)}
          disabled={salvandoResultado}
        >
          {salvandoResultado ? 'Salvando...' : 'Salvar resultado'}
        </button>
      </div>
    );
  }

  function renderizarColunaChave(coluna, indiceColuna, totalColunas, lado) {
    const primeiraColuna = indiceColuna === 0;
    const ultimaColuna = indiceColuna === totalColunas - 1;

    return (
      <section
        key={coluna.titulo}
        className={[
          'chave-coluna',
          `lado-${lado}`,
          primeiraColuna ? 'primeira' : '',
          ultimaColuna ? 'ultima' : ''
        ].filter(Boolean).join(' ')}
      >
        <div className="chave-coluna-cabecalho">
          <h4>{coluna.titulo}</h4>
          <span>{coluna.partidas.length} jogo(s)</span>
        </div>

        <div className="chave-coluna-jogos">
          {coluna.partidas.map((partida, indicePartida) => {
            const duplaAVenceu = partida.duplaVencedoraId === partida.duplaAId;
            const duplaBVenceu = partida.duplaVencedoraId === partida.duplaBId;

            return (
              <article
                key={partida.id}
                className={`chave-jogo ${podeEditarPartidas ? 'interativo' : ''}`}
              >
                <div className="chave-jogo-cabecalho">
                  <span className="chave-jogo-indice">Jogo {indicePartida + 1}</span>
                  <span className={`chave-jogo-status status-${partida.status === 2 ? 'encerrada' : 'agendada'}`}>
                    {obterNomeStatus(partida.status)}
                  </span>
                </div>

                <div className={`chave-jogo-linha ${duplaAVenceu ? 'vencedora' : ''}`}>
                  <strong>{partida.nomeDuplaA}</strong>
                  <span>{partida.status === 2 ? partida.placarDuplaA : '-'}</span>
                </div>

                <div className={`chave-jogo-linha ${duplaBVenceu ? 'vencedora' : ''}`}>
                  <strong>{partida.nomeDuplaB}</strong>
                  <span>{partida.status === 2 ? partida.placarDuplaB : '-'}</span>
                </div>

                <div className="chave-jogo-rodape">
                  <small>{partida.dataPartida ? formatarDataHora(partida.dataPartida) : 'Data a definir'}</small>
                  {podeEditarPartidas && (
                    <button type="button" className="botao-terciario" onClick={() => iniciarEdicao(partida)}>
                      {tabelaJogosAprovada ? 'Editar confronto' : 'Ajustar confronto'}
                    </button>
                  )}
                </div>

                {renderizarLancamentoResultado(partida, 'chave')}
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
        <h2>Partidas</h2>
        <p>
          {podeEditarPartidas
            ? usuarioAtleta
              ? 'Escolha um grupo criado por você, selecione os quatro atletas do grupo e registre os jogos.'
              : 'Gere a tabela de jogos, acompanhe os confrontos sorteados e registre os resultados por categoria.'
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
        {competicaoComInscricoes && (
          <p>Para campeonatos e eventos, o sorteio usa as duplas inscritas da categoria selecionada.</p>
        )}
        {grupoSelecionado && (
          <p>Para grupos, as duplas são montadas automaticamente a partir dos quatro atletas selecionados.</p>
        )}
        {competicaoComInscricoes && categoriaSelecionada && partidas.length > 0 && (
          <p>
            {tabelaJogosAprovada
              ? `Sorteio aprovado em ${formatarDataHora(categoriaSelecionada.tabelaJogosAprovadaEmUtc)}.`
              : 'A categoria já possui tabela sorteada, mas os resultados só podem ser lançados após a aprovação do sorteio.'}
          </p>
        )}
      </div>

      <div className="formulario-grid">
        <label>
          Competição
          <select
            value={competicaoId}
            onChange={(evento) => {
              setCompeticaoId(evento.target.value);
              atualizarParametrosUrl(evento.target.value);
            }}
            required
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

        {podeSortearPartidas && (
          <div className="acoes-item">
            <button
              type="button"
              className="botao-primario"
              onClick={() => gerarTabela(partidas.length > 0)}
              disabled={gerandoTabela || !categoriaSelecionada || duplasDisponiveis.length < 4}
            >
              {gerandoTabela
                ? 'Sorteando jogos...'
                : partidas.length > 0
                  ? 'Sortear novamente'
                  : 'Sortear jogos'}
            </button>

            {partidas.length > 0 && (
              <button
                type="button"
                className="botao-secundario"
                onClick={aprovarSorteioCategoria}
                disabled={!podeAprovarSorteio || aprovandoTabela}
              >
                {aprovandoTabela ? 'Aprovando sorteio...' : 'Aprovar sorteio'}
              </button>
            )}

            {partidas.length > 0 && (
              <button
                type="button"
                className="botao-perigo"
                onClick={excluirTabelaCategoria}
                disabled={removendoTabela}
              >
                {removendoTabela ? 'Excluindo jogos...' : 'Excluir jogos'}
              </button>
            )}
          </div>
        )}
      </div>

      {competicaoComInscricoes && partidas.length > 0 && (
        <div className="cartao barra-visualizacao-partidas">
          <div>
            <strong>Modo de visualização</strong>
            <p>
              {exibirChaveVisual
                ? 'Use a tabela em chave para acompanhar o avanço dos confrontos ou volte para a lista detalhada.'
                : 'Esta categoria ainda não está em fase de chave. A lista detalhada segue como leitura principal.'}
            </p>
          </div>

          <div className="acoes-item">
            <button
              type="button"
              className={visualizacaoTabela ? 'botao-primario' : 'botao-terciario'}
              onClick={() => atualizarParametrosUrl(competicaoId, formulario.categoriaCompeticaoId, true)}
              disabled={!exibirChaveVisual}
            >
              Ver tabela de jogos
            </button>
            <button
              type="button"
              className={!visualizacaoTabela ? 'botao-secundario' : 'botao-terciario'}
              onClick={() => atualizarParametrosUrl(competicaoId, formulario.categoriaCompeticaoId, false)}
            >
              Ver lista detalhada
            </button>
          </div>
        </div>
      )}

      {usuarioAtleta && competicoesDisponiveis.length === 0 && !carregando && (
        <p>Você ainda não criou nenhum grupo. Vá em Competições para criar um grupo e começar a lançar os jogos.</p>
      )}

      {podeExibirFormulario && (
        <form ref={formularioRef} className="formulario-grid" onSubmit={aoSubmeter}>
          {grupoSelecionado && (
            <p className="campo-largo">
              Informe os pontos das duas duplas para registrar o resultado da partida do grupo.
            </p>
          )}
          {competicaoComInscricoes && partidaEdicaoId && (
            <p className="campo-largo">
              {tabelaJogosAprovada
                ? 'Ajuste as duplas do confronto quando necessário e preencha o resultado da partida sorteada.'
                : 'Ajuste as duplas e a data do confronto quando necessário. O resultado só pode ser lançado depois da aprovação do sorteio.'}
            </p>
          )}

          {grupoSelecionado ? (
            <>
              <label>
                Dupla A · Atleta 1
                <select
                  value={formulario.duplaAAtleta1Id}
                  onChange={(evento) => atualizarCampo('duplaAAtleta1Id', evento.target.value)}
                  disabled={!formulario.categoriaCompeticaoId}
                  required
                >
                  <option value="">Selecione</option>
                  {opcoesDuplaAAtleta1.map((item) => (
                    <option key={item.id} value={item.atletaId}>
                      {item.nomeAtleta}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Dupla A · Atleta 2
                <select
                  value={formulario.duplaAAtleta2Id}
                  onChange={(evento) => atualizarCampo('duplaAAtleta2Id', evento.target.value)}
                  disabled={!formulario.categoriaCompeticaoId}
                  required
                >
                  <option value="">Selecione</option>
                  {opcoesDuplaAAtleta2.map((item) => (
                    <option key={item.id} value={item.atletaId}>
                      {item.nomeAtleta}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Dupla B · Atleta 1
                <select
                  value={formulario.duplaBAtleta1Id}
                  onChange={(evento) => atualizarCampo('duplaBAtleta1Id', evento.target.value)}
                  disabled={!formulario.categoriaCompeticaoId}
                  required
                >
                  <option value="">Selecione</option>
                  {opcoesDuplaBAtleta1.map((item) => (
                    <option key={item.id} value={item.atletaId}>
                      {item.nomeAtleta}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Dupla B · Atleta 2
                <select
                  value={formulario.duplaBAtleta2Id}
                  onChange={(evento) => atualizarCampo('duplaBAtleta2Id', evento.target.value)}
                  disabled={!formulario.categoriaCompeticaoId}
                  required
                >
                  <option value="">Selecione</option>
                  {opcoesDuplaBAtleta2.map((item) => (
                    <option key={item.id} value={item.atletaId}>
                      {item.nomeAtleta}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
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
            </>
          )}

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

          {competicaoComInscricoes && !tabelaJogosAprovada ? (
            <label>
              Status
              <input type="text" value="Agendada" disabled />
            </label>
          ) : (
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
          )}

          {statusEncerrada && podeLancarResultado && (
            <label>
              {rotuloPlacarDuplaA}
              <input
                type="number"
                min={0}
                value={formulario.placarDuplaA}
                onChange={(evento) => atualizarCampo('placarDuplaA', evento.target.value)}
                required
              />
            </label>
          )}

          {statusEncerrada && podeLancarResultado && (
            <label>
              {rotuloPlacarDuplaB}
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
              {salvando
                ? 'Salvando...'
                : partidaEdicaoId
                  ? tabelaJogosAprovada || grupoSelecionado
                    ? 'Atualizar partida'
                    : 'Salvar confronto'
                  : 'Registrar partida'}
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

      {competicaoComInscricoes && formulario.categoriaCompeticaoId && duplasDisponiveis.length === 0 && (
        <p>Nenhuma dupla inscrita nesta categoria da competição.</p>
      )}

      {competicaoComInscricoes &&
        formulario.categoriaCompeticaoId &&
        duplasDisponiveis.length > 0 &&
        duplasDisponiveis.length < 4 && (
          <p>Cadastre ao menos quatro duplas inscritas nesta categoria para liberar o sorteio dos jogos.</p>
        )}

      {competicaoComInscricoes && podeEditarPartidas && !partidaEdicaoId && (
        <p>
          {tabelaJogosAprovada
            ? 'Os jogos de campeonato e evento são gerados por sorteio. Com o sorteio aprovado, você pode editar o confronto e preencher o resultado.'
            : 'Os jogos de campeonato e evento são gerados por sorteio. Antes da aprovação, você pode ajustar os confrontos; depois da aprovação, o resultado fica liberado.'}
        </p>
      )}

      {grupoSelecionado && formulario.categoriaCompeticaoId && grupoAtletas.length < 4 && podeEditarPartidas && (
        <p>Cadastre pelo menos quatro atletas no grupo para registrar uma partida.</p>
      )}

      {!podeEditarPartidas && partidas.length > 0 && competicaoComInscricoes && (
        <p>Somente administradores ou o organizador da competição podem preencher resultados ou ajustar os confrontos. Aqui você acompanha os jogos e os resultados.</p>
      )}

      {!podeEditarPartidas && partidas.length > 0 && grupoSelecionado && (
        <p>Somente administradores, organizadores e responsáveis pelo grupo podem alterar a tabela. Aqui você acompanha os jogos e os resultados.</p>
      )}

      {exibirChaveVisual && visualizacaoTabela && (
        <section ref={tabelaJogosRef} className="cartao chave-visualizacao">
          <div className="chave-visualizacao-cabecalho">
            <div>
              <h3>Tabela de jogos</h3>
              <p>As duas chaves avançam até a final conforme os resultados lançados. A lista detalhada continua abaixo para consulta e edição.</p>
            </div>
            <p>{colunasChave.length} fase(s) em visualização</p>
          </div>

          <div className="chave-jogos-wrapper">
            <div className="chave-jogos-grade">
              <div className="chave-jogos-lado esquerda">
                <div className="chave-jogos-setor-cabecalho">
                  <span>Chave A</span>
                  <small>{possuiChavesLaterais ? 'Primeiros confrontos' : 'Jogos sorteados e rodada inicial'}</small>
                </div>
                <div className="chave-jogos">
                  {estruturaTabelaJogos.esquerda.map((coluna, indiceColuna) =>
                    renderizarColunaChave(coluna, indiceColuna, estruturaTabelaJogos.esquerda.length, 'esquerda')
                  )}
                </div>
              </div>

              <div className="chave-jogos-centro">
                <div className="chave-jogos-setor-cabecalho centro">
                  <span>{possuiChavesLaterais ? 'Finais' : 'Rodadas'}</span>
                  <small>{possuiChavesLaterais ? 'Jogos decisivos' : 'Jogos sorteados da categoria'}</small>
                </div>
                {estruturaTabelaJogos.centro.length > 0 ? (
                  <div className="chave-jogos">
                    {estruturaTabelaJogos.centro.map((coluna, indiceColuna) =>
                      renderizarColunaChave(coluna, indiceColuna, estruturaTabelaJogos.centro.length, 'centro')
                    )}
                  </div>
                ) : (
                  <div className="chave-jogos-centro-vazio">
                    <strong>Próximas fases</strong>
                    <p>Final e demais jogos decisivos aparecem aqui conforme os vencedores avançam nas duas chaves.</p>
                  </div>
                )}
              </div>

              <div className="chave-jogos-lado direita">
                <div className="chave-jogos-setor-cabecalho">
                  <span>Chave B</span>
                  <small>{possuiChavesLaterais ? 'Primeiros confrontos' : 'Vencedores e próximas rodadas'}</small>
                </div>
                <div className="chave-jogos">
                  {estruturaTabelaJogos.direita.map((coluna, indiceColuna) =>
                    renderizarColunaChave(coluna, indiceColuna, estruturaTabelaJogos.direita.length, 'direita')
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {carregando ? (
        <p>Carregando partidas...</p>
      ) : exibirListaDetalhada ? (
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
                <p>Dupla A: {partida.nomeDuplaAAtleta1} / {partida.nomeDuplaAAtleta2}</p>
                <p>Dupla B: {partida.nomeDuplaBAtleta1} / {partida.nomeDuplaBAtleta2}</p>
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

              {renderizarLancamentoResultado(partida, 'lista')}

              {podeEditarPartidas && (
                <div className="acoes-item">
                  <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(partida)}>
                    {tabelaJogosAprovada || grupoSelecionado ? 'Editar' : 'Ajustar confronto'}
                  </button>
                  {grupoSelecionado && (
                    <button type="button" className="botao-perigo" onClick={() => removerPartida(partida.id)}>
                      Excluir
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}

          {partidas.length === 0 && <p>Nenhuma partida cadastrada para esta categoria.</p>}
        </div>
      ) : (
        <p>Use "Ver lista detalhada" para consultar todos os dados dos jogos em formato de lista.</p>
      )}
    </section>
  );
}
