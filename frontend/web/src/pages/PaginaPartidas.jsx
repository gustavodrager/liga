import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConteudoBotao, IconeAcao } from '../components/ConteudoBotao';
import { atletasServico } from '../services/atletasServico';
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

function obterDataHoraAtualInput() {
  const agora = new Date();
  const timezoneOffset = agora.getTimezoneOffset() * 60000;
  return new Date(agora.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function criarEstadoInicial() {
  return {
    categoriaCompeticaoId: '',
    duplaAId: '',
    duplaBId: '',
    duplaAAtleta1Id: '',
    duplaAAtleta1Nome: '',
    duplaAAtleta2Id: '',
    duplaAAtleta2Nome: '',
    duplaBAtleta1Id: '',
    duplaBAtleta1Nome: '',
    duplaBAtleta2Id: '',
    duplaBAtleta2Nome: '',
    faseCampeonato: '',
    status: '1',
    placarDuplaA: '',
    placarDuplaB: '',
    dataPartida: obterDataHoraAtualInput(),
    observacoes: ''
  };
}

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
  'Final de reset',
  'Disputa de 3º lugar',
  'Chave dos vencedores',
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

function extrairMetadadosGrupoFase(fase) {
  const correspondencia = (fase || '').trim().match(/^(Grupo\s+[A-Z])\s*-\s*Rodada\s+(\d+)/i);
  if (!correspondencia) {
    return null;
  }

  return {
    nomeGrupo: correspondencia[1],
    numeroRodada: Number(correspondencia[2])
  };
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
      rodada,
      ordem: lado.charCodeAt(0) * 100 + rodada
    };
  }

  const correspondenciaVencedores = faseNormalizada.match(/^Chave\s+dos\s+vencedores\s*-\s*Rodada\s+(\d+)/i);
  if (correspondenciaVencedores) {
    const rodada = Number(correspondenciaVencedores[1]);

    return {
      chave: `vencedores-${rodada}`,
      titulo: `Chave dos vencedores · Rodada ${String(rodada).padStart(2, '0')}`,
      rodada,
      ordem: 100 + rodada
    };
  }

  const correspondenciaPerdedores = faseNormalizada.match(/^Chave\s+dos\s+perdedores\s*-\s*Rodada\s+(\d+)/i);
  if (correspondenciaPerdedores) {
    const rodada = Number(correspondenciaPerdedores[1]);

    return {
      chave: `perdedores-${rodada}`,
      titulo: `Chave dos perdedores · Rodada ${String(rodada).padStart(2, '0')}`,
      rodada,
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

  if (texto.includes('chave dos vencedores')) {
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

  if (texto.includes('final de reset')) {
    return {
      titulo: 'Final de reset',
      ordem: 65
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

function compararInscricoesMaisRecentesPrimeiro(a, b) {
  const dataA = a?.dataInscricaoUtc ? new Date(a.dataInscricaoUtc).getTime() : 0;
  const dataB = b?.dataInscricaoUtc ? new Date(b.dataInscricaoUtc).getTime() : 0;

  if (dataA !== dataB) {
    return dataB - dataA;
  }

  return (b?.id || '').localeCompare(a?.id || '', 'pt-BR');
}

function normalizarNome(valor) {
  return (valor || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

function buscarSugestoesAtleta(atletas, termo, atletaSelecionadoId, idsBloqueados = []) {
  if (!termo.trim() || atletaSelecionadoId) {
    return [];
  }

  const termos = normalizarNome(termo).split(' ').filter(Boolean);
  if (termos.length === 0) {
    return [];
  }

  const idsBloqueadosSet = new Set(idsBloqueados.filter(Boolean));

  return atletas
    .filter((atleta) => !idsBloqueadosSet.has(atleta.id))
    .filter((atleta) => {
      const nome = normalizarNome(atleta.nome);
      const apelido = normalizarNome(atleta.apelido || '');
      return termos.every((parte) => nome.includes(parte) || apelido.includes(parte));
    })
    .slice(0, 6);
}

export function PaginaPartidas() {
  const { usuario } = useAutenticacao();
  const usuarioAtleta = ehAtleta(usuario);
  const atletaUsuarioId = usuario?.atletaId || '';
  const atletaUsuarioNome = usuario?.atleta?.nome || usuario?.nome || '';
  const atletaUsuarioSemVinculo = usuarioAtleta && !atletaUsuarioId;

  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [grupoAtletas, setGrupoAtletas] = useState([]);
  const [inscricoesCategoria, setInscricoesCategoria] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [estruturaRodadas, setEstruturaRodadas] = useState([]);
  const [competicaoId, setCompeticaoId] = useState('');
  const [formulario, setFormulario] = useState(() => criarEstadoInicial());
  const [partidaEdicaoId, setPartidaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerandoTabela, setGerandoTabela] = useState(false);
  const [aprovandoTabela, setAprovandoTabela] = useState(false);
  const [removendoTabela, setRemovendoTabela] = useState(false);
  const [placaresRapidos, setPlacaresRapidos] = useState({});
  const [salvandoResultadoIds, setSalvandoResultadoIds] = useState({});
  const [sugestoesAtletasGrupo, setSugestoesAtletasGrupo] = useState({
    duplaAAtleta1: [],
    duplaAAtleta2: [],
    duplaBAtleta1: [],
    duplaBAtleta2: []
  });
  const [modoCadastroPartida, setModoCadastroPartida] = useState('duplas');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const formularioRef = useRef(null);
  const tabelaJogosRef = useRef(null);

  const [params, setParams] = useSearchParams();
  const modoVisualizacao = params.get('visualizacao') || '';
  const visualizacaoTabela = modoVisualizacao === 'tabela';
  const visualizacaoGrupo = modoVisualizacao === 'grupo';

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
  const partidasPorId = useMemo(
    () => new Map(partidas.map((partida) => [partida.id, partida])),
    [partidas]
  );
  const grupoSelecionado = competicaoSelecionada?.tipo === 3;
  const competicaoComInscricoes = Boolean(competicaoSelecionada && competicaoSelecionada.tipo !== 3);
  const gerenciaGrupoSelecionado =
    usuarioAtleta &&
    competicaoSelecionada?.tipo === 3 &&
    competicaoSelecionada?.usuarioOrganizadorId === usuario?.id;
  const administradorLogado = Number(usuario?.perfil) === PERFIS_USUARIO.administrador;
  const usuarioPodeGerenciarPagina = ehGestorCompeticao(usuario) || usuarioAtleta;
  const organizadorDaCompeticaoSelecionada =
    Number(usuario?.perfil) === PERFIS_USUARIO.organizador &&
    competicaoSelecionada?.usuarioOrganizadorId === usuario?.id;
  const tabelaJogosAprovada = Boolean(categoriaSelecionada?.tabelaJogosAprovada);
  const aguardandoAprovacaoSorteio = competicaoComInscricoes && partidas.length > 0 && !tabelaJogosAprovada;
  const podeEditarPartidas = competicaoSelecionada
    ? grupoSelecionado
      ? ehGestorCompeticao(usuario) || gerenciaGrupoSelecionado
      : administradorLogado || organizadorDaCompeticaoSelecionada
    : usuarioPodeGerenciarPagina;
  const podeSortearPartidas = competicaoComInscricoes && (administradorLogado || organizadorDaCompeticaoSelecionada);
  const podeAprovarSorteio = podeSortearPartidas && aguardandoAprovacaoSorteio;
  const usandoCadastroPorAtletas = !competicaoSelecionada || grupoSelecionado || modoCadastroPartida === 'atletas';
  const podeRegistrarManual = usuarioPodeGerenciarPagina;
  const podeExibirFormulario = podeEditarPartidas && (podeRegistrarManual || Boolean(partidaEdicaoId));
  const faltandoContextoMinimo = !competicaoId || (!grupoSelecionado && !formulario.categoriaCompeticaoId);
  const podeSalvarFormulario = !salvando && !(grupoSelecionado && atletaUsuarioSemVinculo);
  const podeLancarResultado = grupoSelecionado || !competicaoComInscricoes || tabelaJogosAprovada;
  const podeLancarResultadoDireto = competicaoComInscricoes && tabelaJogosAprovada && podeEditarPartidas;
  const placaresFormularioPreenchidos = formulario.placarDuplaA !== '' && formulario.placarDuplaB !== '';
  const placaresFormularioParciais = (formulario.placarDuplaA !== '' || formulario.placarDuplaB !== '') && !placaresFormularioPreenchidos;
  const statusFormularioEfetivo = competicaoComInscricoes && !tabelaJogosAprovada
    ? 1
    : grupoSelecionado
      ? 2
      : podeLancarResultado && placaresFormularioPreenchidos
        ? 2
        : Number(formulario.status);
  const exibirCamposPlacarFormulario = grupoSelecionado || (podeLancarResultado && (Boolean(partidaEdicaoId) || competicaoComInscricoes));
  const rotuloPlacarDuplaA = grupoSelecionado ? 'Pontos da Dupla A' : 'Placar Dupla A';
  const rotuloPlacarDuplaB = grupoSelecionado ? 'Pontos da Dupla B' : 'Placar Dupla B';
  const estruturaTabelaJogos = useMemo(() => {
    const colunasPadrao = new Map();
    const colunasSequenciais = new Map();
    const partidasAvulsas = [];
    let possuiChavesLateraisExplicitas = false;
    let maiorOrdemLateral = 0;

    partidas.forEach((partida, indice) => {
      const partidaComOrdem = {
        ...partida,
        faseOrdemInterna: indice
      };
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

        if (metadados.titulo === 'Final' || metadados.titulo === 'Disputa de 3º lugar') {
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

      return {
        modo: 'sequencial',
        colunas: garantirColunaFinaisNoFim([
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
        ], maiorOrdemLateral + 100)
      };
    }

    const partidasFinais = [];

    partidasAvulsas.forEach((partida) => {
      const metadados = obterMetadadosFaseChaveClassica(partida.faseCampeonato);
      if (!metadados) {
        return;
      }

      if (metadados.titulo === 'Final' || metadados.titulo === 'Disputa de 3º lugar') {
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

    const colunasOrdenadas = garantirColunaFinaisNoFim([
      ...Array.from(colunasPadrao.values()),
      ...(partidasFinais.length > 0
        ? [{
            titulo: 'Finais',
            ordem: 9998,
            partidas: partidasFinais.sort(compararPartidasChave),
            conectar: false
          }]
        : [])
    ]).map((coluna) => ({
      ...coluna,
      partidas: [...coluna.partidas].sort(compararPartidasChave)
    }));

    return {
      modo: 'setores',
      esquerda: colunasOrdenadas,
      centro: [],
      direita: []
    };
  }, [partidas]);
  const colunasEmVisualizacao = estruturaTabelaJogos.modo === 'sequencial'
    ? estruturaTabelaJogos.colunas
    : [
        ...estruturaTabelaJogos.esquerda,
        ...estruturaTabelaJogos.centro,
        ...estruturaTabelaJogos.direita
      ];
  const formatoComFaseDeGrupos = useMemo(
    () => estruturaRodadas.some((rodada) => rodada.jogos.some((jogo) => jogo.tipoJogo === 'Fase de grupos')),
    [estruturaRodadas]
  );
  const possuiJogosNomeadosPorGrupo = useMemo(
    () => partidas.some((partida) => Boolean(extrairMetadadosGrupoFase(partida.faseCampeonato))),
    [partidas]
  );
  const rodadasGrupoExibicao = useMemo(() => {
    if (estruturaRodadas.length > 0) {
      return estruturaRodadas;
    }

    if (partidas.length === 0) {
      return [];
    }

    const rodadasMap = new Map();

    partidas.forEach((partida, indice) => {
      const numeroRodada = extrairNumeroRodada(partida.faseCampeonato) || 1;
      if (!rodadasMap.has(numeroRodada)) {
        rodadasMap.set(numeroRodada, {
          numeroRodada,
          nomeRodada: `Rodada ${String(numeroRodada).padStart(2, '0')}`,
          jogos: []
        });
      }

      rodadasMap.get(numeroRodada).jogos.push({
        partidaId: partida.id,
        ordemJogo: indice + 1,
        tipoJogo: grupoSelecionado ? 'Grupo' : 'Fase de grupos',
        nomeFase: partida.faseCampeonato,
        status: partida.status,
        duplaAId: partida.duplaAId,
        nomeDuplaA: partida.nomeDuplaA,
        duplaBId: partida.duplaBId,
        nomeDuplaB: partida.nomeDuplaB,
        placarDuplaA: partida.placarDuplaA,
        placarDuplaB: partida.placarDuplaB,
        duplaVencedoraId: partida.duplaVencedoraId,
        nomeDuplaVencedora: partida.nomeDuplaVencedora,
        dataPartida: partida.dataPartida
      });
    });

    return Array.from(rodadasMap.values()).sort((a, b) => a.numeroRodada - b.numeroRodada);
  }, [estruturaRodadas, partidas, grupoSelecionado]);
  const estruturaGrupoCopa = useMemo(() => {
    const gruposMap = new Map();
    const rodadasEliminatorias = [];
    const pontosVitoria = Number(competicaoSelecionada?.pontosVitoria ?? 3);
    const pontosDerrota = Number(competicaoSelecionada?.pontosDerrota ?? 0);

    rodadasGrupoExibicao.forEach((rodada) => {
      const jogosGrupo = [];
      const jogosEliminatorios = [];

      rodada.jogos.forEach((jogo) => {
        const metadadosGrupo = extrairMetadadosGrupoFase(jogo.nomeFase);
        if (!metadadosGrupo) {
          jogosEliminatorios.push(jogo);
          return;
        }

        jogosGrupo.push({ jogo, metadadosGrupo });

        if (!gruposMap.has(metadadosGrupo.nomeGrupo)) {
          gruposMap.set(metadadosGrupo.nomeGrupo, {
            nomeGrupo: metadadosGrupo.nomeGrupo,
            rodadas: new Map(),
            classificacao: new Map(),
            totalJogos: 0
          });
        }

        const grupo = gruposMap.get(metadadosGrupo.nomeGrupo);
        if (!grupo.rodadas.has(metadadosGrupo.numeroRodada)) {
          grupo.rodadas.set(metadadosGrupo.numeroRodada, {
            numeroRodada: metadadosGrupo.numeroRodada,
            nomeRodada: `Rodada ${String(metadadosGrupo.numeroRodada).padStart(2, '0')}`,
            jogos: []
          });
        }

        grupo.rodadas.get(metadadosGrupo.numeroRodada).jogos.push(jogo);
        grupo.totalJogos += 1;

        const garantirLinha = (duplaId, nomeDupla) => {
          if (!grupo.classificacao.has(duplaId)) {
            grupo.classificacao.set(duplaId, {
              duplaId,
              nomeDupla,
              jogos: 0,
              vitorias: 0,
              pontos: 0,
              pontosMarcados: 0,
              pontosSofridos: 0
            });
          }

          return grupo.classificacao.get(duplaId);
        };

        const linhaA = garantirLinha(jogo.duplaAId, jogo.nomeDuplaA);
        const linhaB = garantirLinha(jogo.duplaBId, jogo.nomeDuplaB);

        if (jogo.status === 2) {
          linhaA.jogos += 1;
          linhaB.jogos += 1;
          linhaA.pontosMarcados += jogo.placarDuplaA;
          linhaA.pontosSofridos += jogo.placarDuplaB;
          linhaB.pontosMarcados += jogo.placarDuplaB;
          linhaB.pontosSofridos += jogo.placarDuplaA;

          if (jogo.duplaVencedoraId === jogo.duplaAId) {
            linhaA.vitorias += 1;
            linhaA.pontos += pontosVitoria;
            linhaB.pontos += pontosDerrota;
          } else if (jogo.duplaVencedoraId === jogo.duplaBId) {
            linhaB.vitorias += 1;
            linhaB.pontos += pontosVitoria;
            linhaA.pontos += pontosDerrota;
          }
        }
      });

      if (jogosEliminatorios.length > 0) {
        rodadasEliminatorias.push({
          ...rodada,
          jogos: jogosEliminatorios
        });
      }
    });

    const grupos = Array.from(gruposMap.values())
      .sort((a, b) => a.nomeGrupo.localeCompare(b.nomeGrupo, 'pt-BR'))
      .map((grupo) => ({
        nomeGrupo: grupo.nomeGrupo,
        totalJogos: grupo.totalJogos,
        rodadas: Array.from(grupo.rodadas.values())
          .sort((a, b) => a.numeroRodada - b.numeroRodada),
        classificacao: Array.from(grupo.classificacao.values())
          .sort((a, b) => (
            b.pontos - a.pontos
            || b.vitorias - a.vitorias
            || (b.pontosMarcados - b.pontosSofridos) - (a.pontosMarcados - a.pontosSofridos)
            || b.pontosMarcados - a.pontosMarcados
            || a.nomeDupla.localeCompare(b.nomeDupla, 'pt-BR')
          ))
          .map((linha, indice) => ({
            ...linha,
            saldo: linha.pontosMarcados - linha.pontosSofridos,
            posicao: indice + 1
          }))
      }));

    return {
      grupos,
      rodadasEliminatorias
    };
  }, [competicaoSelecionada?.pontosDerrota, competicaoSelecionada?.pontosVitoria, rodadasGrupoExibicao]);
  const podeVisualizarGrupo = partidas.length > 0 && (grupoSelecionado || formatoComFaseDeGrupos || possuiJogosNomeadosPorGrupo);
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
      vencedores.length > 0
        ? { id: 'vencedores', titulo: 'Chave dos vencedores', colunas: vencedores }
        : null,
      perdedores.length > 0
        ? { id: 'perdedores', titulo: 'Chave dos perdedores', colunas: perdedores }
        : null,
      outros.length > 0
        ? { id: 'outros', titulo: null, colunas: outros }
        : null,
      finais.length > 0
        ? { id: 'finais', titulo: 'Finais', colunas: finais }
        : null
    ].filter(Boolean);
  }, [colunasEmVisualizacao]);
  const resumoTabelaJogos = useMemo(() => {
    const totalJogos = partidas.length;
    const jogosEncerrados = partidas.filter((partida) => partida.status === 2).length;
    const jogosPendentes = totalJogos - jogosEncerrados;

    return {
      totalJogos,
      jogosEncerrados,
      jogosPendentes,
      totalFases: colunasEmVisualizacao.length
    };
  }, [colunasEmVisualizacao.length, partidas]);
  const exibirVisaoGrupo = visualizacaoGrupo && podeVisualizarGrupo;
  const exibirChaveVisual = !exibirVisaoGrupo && competicaoComInscricoes && partidas.length > 0 && colunasEmVisualizacao.length > 0;
  const exibirListaDetalhada = (!exibirChaveVisual && !exibirVisaoGrupo) || (!visualizacaoTabela && !visualizacaoGrupo);
  const possuiChavesLaterais = estruturaTabelaJogos.modo === 'sequencial'
    || estruturaTabelaJogos.esquerda.length > 0
    || estruturaTabelaJogos.direita.length > 0;

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
    if (!competicaoSelecionada) {
      setPartidas([]);
      setEstruturaRodadas([]);
      return;
    }

    if (formulario.categoriaCompeticaoId) {
      carregarPartidasPorCategoria(formulario.categoriaCompeticaoId);
      return;
    }

    if (grupoSelecionado) {
      carregarPartidasPorCompeticao(competicaoSelecionada.id);
      return;
    }

    setPartidas([]);
    setEstruturaRodadas([]);
  }, [competicaoSelecionada, formulario.categoriaCompeticaoId, grupoSelecionado]);

  useEffect(() => {
    if ((visualizacaoTabela && exibirChaveVisual) || (visualizacaoGrupo && exibirVisaoGrupo)) {
      rolarParaElemento(tabelaJogosRef.current);
    }
  }, [exibirChaveVisual, exibirVisaoGrupo, visualizacaoGrupo, visualizacaoTabela]);

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
  const inscricoesCategoriaOrdenadas = useMemo(
    () => [...inscricoesCategoria].sort(compararInscricoesMaisRecentesPrimeiro),
    [inscricoesCategoria]
  );
  const atletasBaseCadastroAssistido = useMemo(() => {
    if (grupoSelecionado) {
      return grupoAtletas.map((item) => ({
        id: item.atletaId,
        nome: item.nomeAtleta,
        apelido: item.apelidoAtleta,
        cadastroPendente: item.cadastroPendente
      }));
    }

    const mapa = new Map();
    inscricoesCategoria.forEach((inscricao) => {
      if (!mapa.has(inscricao.atleta1Id)) {
        mapa.set(inscricao.atleta1Id, {
          id: inscricao.atleta1Id,
          nome: inscricao.nomeAtleta1,
          apelido: '',
          cadastroPendente: false
        });
      }

      if (!mapa.has(inscricao.atleta2Id)) {
        mapa.set(inscricao.atleta2Id, {
          id: inscricao.atleta2Id,
          nome: inscricao.nomeAtleta2,
          apelido: '',
          cadastroPendente: false
        });
      }
    });

    return Array.from(mapa.values());
  }, [grupoAtletas, grupoSelecionado, inscricoesCategoria]);

  useEffect(() => {
    if (grupoSelecionado) {
      setModoCadastroPartida('atletas');
      return;
    }

    if (!competicaoComInscricoes) {
      setModoCadastroPartida('duplas');
      return;
    }

    setModoCadastroPartida((anterior) => {
      if (anterior === 'atletas') {
        return 'atletas';
      }

      return duplasDisponiveis.length === 0 ? 'atletas' : 'duplas';
    });
  }, [competicaoComInscricoes, duplasDisponiveis.length, grupoSelecionado]);

  useEffect(() => {
    setFormulario((anterior) => ({
      ...anterior,
      duplaAId: duplasDisponiveis.some((dupla) => dupla.id === anterior.duplaAId) ? anterior.duplaAId : '',
      duplaBId: duplasDisponiveis.some((dupla) => dupla.id === anterior.duplaBId) ? anterior.duplaBId : ''
    }));
  }, [duplasDisponiveis]);

  useEffect(() => {
    if (!grupoSelecionado) {
      return;
    }

    setFormulario((anterior) => ({
      ...anterior,
      duplaAAtleta1Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaAAtleta1Id) ? anterior.duplaAAtleta1Id : '',
      duplaAAtleta2Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaAAtleta2Id) ? anterior.duplaAAtleta2Id : '',
      duplaBAtleta1Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaBAtleta1Id) ? anterior.duplaBAtleta1Id : '',
      duplaBAtleta2Id: grupoAtletas.some((item) => item.atletaId === anterior.duplaBAtleta2Id) ? anterior.duplaBAtleta2Id : ''
    }));
  }, [grupoAtletas, grupoSelecionado]);

  useEffect(() => {
    if (!grupoSelecionado || !usuarioAtleta || partidaEdicaoId) {
      return;
    }

    setFormulario((anterior) => ({
      ...anterior,
      duplaAAtleta1Id: atletaUsuarioId,
      duplaAAtleta1Nome: atletaUsuarioNome
    }));
  }, [atletaUsuarioId, atletaUsuarioNome, grupoSelecionado, partidaEdicaoId, usuarioAtleta]);

  useEffect(() => {
    if (!usandoCadastroPorAtletas) {
      setSugestoesAtletasGrupo({
        duplaAAtleta1: [],
        duplaAAtleta2: [],
        duplaBAtleta1: [],
        duplaBAtleta2: []
      });
      return;
    }

    const campos = [
      {
        chave: 'duplaAAtleta1',
        id: formulario.duplaAAtleta1Id,
        nome: formulario.duplaAAtleta1Nome,
        idsBloqueados: [formulario.duplaAAtleta2Id, formulario.duplaBAtleta1Id, formulario.duplaBAtleta2Id],
        bloqueado: usuarioAtleta
      },
      {
        chave: 'duplaAAtleta2',
        id: formulario.duplaAAtleta2Id,
        nome: formulario.duplaAAtleta2Nome,
        idsBloqueados: [formulario.duplaAAtleta1Id, formulario.duplaBAtleta1Id, formulario.duplaBAtleta2Id]
      },
      {
        chave: 'duplaBAtleta1',
        id: formulario.duplaBAtleta1Id,
        nome: formulario.duplaBAtleta1Nome,
        idsBloqueados: [formulario.duplaAAtleta1Id, formulario.duplaAAtleta2Id, formulario.duplaBAtleta2Id]
      },
      {
        chave: 'duplaBAtleta2',
        id: formulario.duplaBAtleta2Id,
        nome: formulario.duplaBAtleta2Nome,
        idsBloqueados: [formulario.duplaAAtleta1Id, formulario.duplaAAtleta2Id, formulario.duplaBAtleta1Id]
      }
    ];

    const timeout = setTimeout(async () => {
      const proximasSugestoes = {
        duplaAAtleta1: [],
        duplaAAtleta2: [],
        duplaBAtleta1: [],
        duplaBAtleta2: []
      };

      await Promise.all(campos.map(async (campo) => {
        if (campo.bloqueado) {
          return;
        }

        const sugestoesLocais = buscarSugestoesAtleta(
          atletasBaseCadastroAssistido,
          campo.nome || '',
          campo.id,
          campo.idsBloqueados
        );

        let sugestoesRemotas = [];
        if ((campo.nome || '').trim() && !campo.id) {
          try {
            sugestoesRemotas = await atletasServico.buscar(campo.nome.trim());
          } catch {
            sugestoesRemotas = [];
          }
        }

        const mapa = new Map();
        [...sugestoesLocais, ...sugestoesRemotas]
          .filter((atleta) => !campo.idsBloqueados.includes(atleta.id))
          .forEach((atleta) => {
            if (!mapa.has(atleta.id)) {
              mapa.set(atleta.id, atleta);
            }
          });

        proximasSugestoes[campo.chave] = Array.from(mapa.values()).slice(0, 6);
      }));

      setSugestoesAtletasGrupo(proximasSugestoes);
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    formulario.duplaAAtleta1Id,
    formulario.duplaAAtleta1Nome,
    formulario.duplaAAtleta2Id,
    formulario.duplaAAtleta2Nome,
    formulario.duplaBAtleta1Id,
    formulario.duplaBAtleta1Nome,
    formulario.duplaBAtleta2Id,
    formulario.duplaBAtleta2Nome,
    atletasBaseCadastroAssistido,
    usandoCadastroPorAtletas,
    usuarioAtleta
  ]);

  function atualizarParametrosUrl(proximoCompeticaoId, proximaCategoriaId = '', proximaVisualizacao = modoVisualizacao) {
    const parametros = {};

    if (proximoCompeticaoId) {
      parametros.competicaoId = proximoCompeticaoId;
    }

    if (proximaCategoriaId) {
      parametros.categoriaId = proximaCategoriaId;
    }

    if (proximaVisualizacao === 'tabela' || proximaVisualizacao === 'grupo') {
      parametros.visualizacao = proximaVisualizacao;
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
      const ehGrupo = competicoes.find((competicao) => competicao.id === idCompeticao)?.tipo === 3;

      setFormulario((anterior) => {
        const categoriaValida = lista.some((categoria) => categoria.id === anterior.categoriaCompeticaoId);
        const categoriaCompeticaoId = categoriaValida
          ? anterior.categoriaCompeticaoId
          : ehGrupo
            ? ''
            : lista[0]?.id || '';

        atualizarParametrosUrl(idCompeticao, categoriaCompeticaoId);

        return {
          ...anterior,
          categoriaCompeticaoId,
          duplaAId: '',
          duplaBId: '',
          duplaAAtleta1Id: ehGrupo && usuarioAtleta ? atletaUsuarioId : '',
          duplaAAtleta1Nome: ehGrupo && usuarioAtleta ? atletaUsuarioNome : '',
          duplaAAtleta2Id: '',
          duplaAAtleta2Nome: '',
          duplaBAtleta1Id: '',
          duplaBAtleta1Nome: '',
          duplaBAtleta2Id: '',
          duplaBAtleta2Nome: ''
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
    await carregarPartidasPorCategoria(categoriaId);
  }

  async function carregarPartidasPorCategoria(categoriaId) {
    try {
      const [lista, estrutura] = await Promise.all([
        partidasServico.listarPorCategoria(categoriaId),
        categoriasServico.listarEstrutura(categoriaId)
      ]);
      setPartidas(lista);
      setEstruturaRodadas(estrutura);
      atualizarParametrosUrl(competicaoId, categoriaId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setPartidas([]);
      setEstruturaRodadas([]);
    }
  }

  async function carregarPartidasPorCompeticao(idCompeticao) {
    try {
      const [lista, estrutura] = await Promise.all([
        partidasServico.listarPorCompeticao(idCompeticao),
        partidasServico.listarEstrutura({ competicaoId: idCompeticao })
      ]);
      setPartidas(lista);
      setEstruturaRodadas(estrutura);
      atualizarParametrosUrl(idCompeticao);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setPartidas([]);
      setEstruturaRodadas([]);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => {
      const proximo = { ...anterior, [campo]: valor };

      if (campo === 'categoriaCompeticaoId') {
        proximo.duplaAId = '';
        proximo.duplaBId = '';
        proximo.duplaAAtleta1Id = grupoSelecionado && usuarioAtleta ? atletaUsuarioId : '';
        proximo.duplaAAtleta1Nome = grupoSelecionado && usuarioAtleta ? atletaUsuarioNome : '';
        proximo.duplaAAtleta2Id = '';
        proximo.duplaAAtleta2Nome = '';
        proximo.duplaBAtleta1Id = '';
        proximo.duplaBAtleta1Nome = '';
        proximo.duplaBAtleta2Id = '';
        proximo.duplaBAtleta2Nome = '';
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

  function atualizarAtletaGrupo(campoBase, valor) {
    const campoId = `${campoBase}Id`;
    const campoNome = `${campoBase}Nome`;

    setFormulario((anterior) => ({
      ...anterior,
      [campoId]: '',
      [campoNome]: valor
    }));
  }

  function selecionarAtletaGrupo(campoBase, atleta) {
    const campoId = `${campoBase}Id`;
    const campoNome = `${campoBase}Nome`;

    setFormulario((anterior) => ({
      ...anterior,
      [campoId]: atleta.id,
      [campoNome]: atleta.nome
    }));
  }

  function renderizarResumoSelecaoAtletaGrupo(campoBase, textoQuandoVinculado = 'Atleta existente selecionado. A API vai reaproveitar esse cadastro neste lançamento.') {
    const campoId = `${campoBase}Id`;
    const campoNome = `${campoBase}Nome`;

    if (!formulario[campoId]) {
      return null;
    }

    return (
      <p className="campo-largo">
        <strong>{formulario[campoNome]}</strong>. {textoQuandoVinculado}
      </p>
    );
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
    if (!grupoSelecionado) {
      setModoCadastroPartida('duplas');
    }
    setFormulario({
      categoriaCompeticaoId: partida.categoriaCompeticaoId,
      duplaAId: grupoSelecionado ? '' : partida.duplaAId,
      duplaBId: grupoSelecionado ? '' : partida.duplaBId,
      duplaAAtleta1Id: partida.duplaAAtleta1Id || '',
      duplaAAtleta1Nome: partida.nomeDuplaAAtleta1 || '',
      duplaAAtleta2Id: partida.duplaAAtleta2Id || '',
      duplaAAtleta2Nome: partida.nomeDuplaAAtleta2 || '',
      duplaBAtleta1Id: partida.duplaBAtleta1Id || '',
      duplaBAtleta1Nome: partida.nomeDuplaBAtleta1 || '',
      duplaBAtleta2Id: partida.duplaBAtleta2Id || '',
      duplaBAtleta2Nome: partida.nomeDuplaBAtleta2 || '',
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
      ...criarEstadoInicial(),
      categoriaCompeticaoId: anterior.categoriaCompeticaoId,
      duplaAAtleta1Id: grupoSelecionado && usuarioAtleta ? atletaUsuarioId : '',
      duplaAAtleta1Nome: grupoSelecionado && usuarioAtleta ? atletaUsuarioNome : '',
      status: grupoSelecionado ? '2' : '1'
    }));
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setMensagem('');

    if (competicaoId && !grupoSelecionado && !formulario.categoriaCompeticaoId) {
      setErro('Selecione a categoria antes de salvar a partida.');
      return;
    }

    if (placaresFormularioParciais) {
      setErro('Informe os pontos das duas duplas para encerrar a partida.');
      return;
    }

    setSalvando(true);

    const dados = {
      competicaoId: competicaoSelecionada?.id || null,
      categoriaCompeticaoId: formulario.categoriaCompeticaoId || null,
      duplaAId: usandoCadastroPorAtletas ? null : formulario.duplaAId,
      duplaBId: usandoCadastroPorAtletas ? null : formulario.duplaBId,
      duplaAAtleta1Id: usandoCadastroPorAtletas ? formulario.duplaAAtleta1Id || null : null,
      duplaAAtleta1Nome: usandoCadastroPorAtletas ? formulario.duplaAAtleta1Nome.trim() || null : null,
      duplaAAtleta2Id: usandoCadastroPorAtletas ? formulario.duplaAAtleta2Id || null : null,
      duplaAAtleta2Nome: usandoCadastroPorAtletas ? formulario.duplaAAtleta2Nome.trim() || null : null,
      duplaBAtleta1Id: usandoCadastroPorAtletas ? formulario.duplaBAtleta1Id || null : null,
      duplaBAtleta1Nome: usandoCadastroPorAtletas ? formulario.duplaBAtleta1Nome.trim() || null : null,
      duplaBAtleta2Id: usandoCadastroPorAtletas ? formulario.duplaBAtleta2Id || null : null,
      duplaBAtleta2Nome: usandoCadastroPorAtletas ? formulario.duplaBAtleta2Nome.trim() || null : null,
      faseCampeonato: competicaoSelecionada?.tipo === 1 ? formulario.faseCampeonato || null : null,
      status: statusFormularioEfetivo,
      placarDuplaA: statusFormularioEfetivo === 2 && podeLancarResultado ? Number(formulario.placarDuplaA) : null,
      placarDuplaB: statusFormularioEfetivo === 2 && podeLancarResultado ? Number(formulario.placarDuplaB) : null,
      dataPartida: paraIsoUtc(formulario.dataPartida),
      observacoes: formulario.observacoes || null
    };

    try {
      let partidaSalva;
      if (partidaEdicaoId) {
        partidaSalva = await partidasServico.atualizar(partidaEdicaoId, dados);
      } else {
        partidaSalva = await partidasServico.criar(dados);
      }

      cancelarEdicao();
      setMensagem(
        partidaEdicaoId
          ? competicaoComInscricoes && !tabelaJogosAprovada
            ? 'Confronto atualizado com sucesso. Aprove o sorteio para liberar os resultados.'
            : 'Partida atualizada com sucesso.'
          : 'Partida registrada com sucesso.'
      );

      if (!competicaoId && partidaSalva?.categoriaCompeticaoId) {
        const categoriaSalva = await categoriasServico.obterPorId(partidaSalva.categoriaCompeticaoId);
        setCompeticaoId(categoriaSalva.competicaoId);
        setFormulario((anterior) => ({
          ...anterior,
          categoriaCompeticaoId: categoriaSalva.id
        }));
        await carregarCategorias(categoriaSalva.competicaoId);
        await carregarPartidasPorCategoria(categoriaSalva.id);
        return;
      }

      if (grupoSelecionado && !formulario.categoriaCompeticaoId && competicaoSelecionada?.id) {
        await carregarCategorias(competicaoSelecionada.id);
      }
      if (grupoSelecionado && competicaoSelecionada?.id) {
        await carregarGrupoAtletas(competicaoSelecionada.id);
      }
      if (formulario.categoriaCompeticaoId) {
        await carregarPartidasPorCategoria(formulario.categoriaCompeticaoId);
      } else if (grupoSelecionado && competicaoSelecionada?.id) {
        await carregarPartidasPorCompeticao(competicaoSelecionada.id);
      }
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
      atualizarParametrosUrl(competicaoId, categoriaSelecionada.id, 'tabela');
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
      if (formulario.categoriaCompeticaoId) {
        await carregarPartidasPorCategoria(formulario.categoriaCompeticaoId);
      } else if (grupoSelecionado && competicaoSelecionada?.id) {
        await carregarPartidasPorCompeticao(competicaoSelecionada.id);
      }
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
        competicaoId: competicaoSelecionada?.id || null,
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
      if (formulario.categoriaCompeticaoId) {
        await carregarPartidasPorCategoria(formulario.categoriaCompeticaoId);
      } else if (grupoSelecionado && competicaoSelecionada?.id) {
        await carregarPartidasPorCompeticao(competicaoSelecionada.id);
      }
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

    const salvandoResultado = Boolean(salvandoResultadoIds[partida.id]);

    if (modo === 'chave') {
      return (
        <div className="lancamento-resultado lancamento-resultado-chave">
          <div className="lancamento-resultado-acoes">
            <button
              type="button"
              className="botao-primario botao-compacto botao-icone"
              onClick={() => salvarResultadoRapido(partida)}
              disabled={salvandoResultado}
              aria-label={salvandoResultado ? 'Salvando resultado' : 'Salvar resultado'}
              title={salvandoResultado ? 'Salvando resultado' : 'Salvar resultado'}
            >
              <IconeAcao nome="salvar" />
            </button>

            {podeEditarPartidas && (
              <button
                type="button"
                className="botao-terciario botao-compacto botao-icone"
                onClick={() => iniciarEdicao(partida)}
                aria-label={tabelaJogosAprovada ? 'Editar confronto' : 'Ajustar confronto'}
                title={tabelaJogosAprovada ? 'Editar confronto' : 'Ajustar confronto'}
              >
                <IconeAcao nome="editar" />
              </button>
            )}
          </div>
        </div>
      );
    }

    const placares = obterPlacaresRapidos(partida);

    return (
      <div className={`lancamento-resultado lancamento-resultado-${modo}`}>
        <div className="lancamento-resultado-linha">
          <input
            type="number"
            min={0}
            value={placares.placarDuplaA}
            onChange={(evento) => atualizarPlacarRapido(partida.id, 'placarDuplaA', evento.target.value)}
            disabled={salvandoResultado}
            aria-label={`Pontos de ${partida.nomeDuplaA}`}
          />
          <span>{partida.nomeDuplaA}</span>
        </div>

        <div className="lancamento-resultado-linha">
          <input
            type="number"
            min={0}
            value={placares.placarDuplaB}
            onChange={(evento) => atualizarPlacarRapido(partida.id, 'placarDuplaB', evento.target.value)}
            disabled={salvandoResultado}
            aria-label={`Pontos de ${partida.nomeDuplaB}`}
          />
          <span>{partida.nomeDuplaB}</span>
        </div>

        <button
          type="button"
          className="botao-primario botao-compacto"
          onClick={() => salvarResultadoRapido(partida)}
          disabled={salvandoResultado}
        >
          {salvandoResultado ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    );
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
              <p>Final e demais jogos decisivos aparecem aqui conforme os vencedores avançam nas rodadas anteriores.</p>
            </div>
          )}
          {coluna.partidas.map((partida, indicePartida) => {
            const duplaAVenceu = partida.duplaVencedoraId === partida.duplaAId;
            const duplaBVenceu = partida.duplaVencedoraId === partida.duplaBId;
            const placares = obterPlacaresRapidos(partida);
            const salvandoResultado = Boolean(salvandoResultadoIds[partida.id]);

            return (
              <article
                key={partida.id}
                className={`chave-jogo ${podeEditarPartidas ? 'interativo' : ''}`}
              >
                <div className="chave-jogo-cabecalho">
                  <div className="chave-jogo-cabecalho-meta">
                    <span className="chave-jogo-indice">Jogo {indicePartida + 1}</span>
                    <small>{partida.dataPartida ? formatarDataHora(partida.dataPartida) : 'Data a definir'}</small>
                  </div>
                  <span className={`chave-jogo-status status-${partida.status === 2 ? 'encerrada' : 'agendada'}`}>
                    {obterNomeStatus(partida.status)}
                  </span>
                </div>

                <div className={`chave-jogo-linha ${duplaAVenceu ? 'vencedora' : ''}`}>
                  {podeLancarResultadoDireto ? (
                    <input
                      type="number"
                      min={0}
                      value={placares.placarDuplaA}
                      onChange={(evento) => atualizarPlacarRapido(partida.id, 'placarDuplaA', evento.target.value)}
                      disabled={salvandoResultado}
                      className="chave-jogo-pontuacao"
                      aria-label={`Pontos de ${partida.nomeDuplaA}`}
                    />
                  ) : (
                    <span className="chave-jogo-pontuacao-texto">{partida.status === 2 ? partida.placarDuplaA : '-'}</span>
                  )}
                  <strong>{partida.nomeDuplaA}</strong>
                </div>

                <div className={`chave-jogo-linha ${duplaBVenceu ? 'vencedora' : ''}`}>
                  {podeLancarResultadoDireto ? (
                    <input
                      type="number"
                      min={0}
                      value={placares.placarDuplaB}
                      onChange={(evento) => atualizarPlacarRapido(partida.id, 'placarDuplaB', evento.target.value)}
                      disabled={salvandoResultado}
                      className="chave-jogo-pontuacao"
                      aria-label={`Pontos de ${partida.nomeDuplaB}`}
                    />
                  ) : (
                    <span className="chave-jogo-pontuacao-texto">{partida.status === 2 ? partida.placarDuplaB : '-'}</span>
                  )}
                  <strong>{partida.nomeDuplaB}</strong>
                </div>

                {renderizarLancamentoResultado(partida, 'chave')}

                {!(podeLancarResultadoDireto && podeEditarPartidas) && (
                  <div className="chave-jogo-rodape">
                    {podeEditarPartidas && (
                      <button
                        type="button"
                        className="botao-terciario botao-compacto botao-icone"
                        onClick={() => iniciarEdicao(partida)}
                        aria-label={tabelaJogosAprovada ? 'Editar confronto' : 'Ajustar confronto'}
                        title={tabelaJogosAprovada ? 'Editar confronto' : 'Ajustar confronto'}
                      >
                        <IconeAcao nome="editar" />
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderizarVisaoGrupo() {
    function renderizarCartaoJogoGrupo(jogo) {
      const partida = partidasPorId.get(jogo.partidaId);
      const duplaAVenceu = jogo.duplaVencedoraId === jogo.duplaAId;
      const duplaBVenceu = jogo.duplaVencedoraId === jogo.duplaBId;

      return (
        <article key={jogo.partidaId} className="jogo-grupo-card">
          <div className="jogo-grupo-topo">
            <div className="jogo-grupo-topo-meta">
              <span>Jogo {jogo.ordemJogo}</span>
              <small>{jogo.dataPartida ? formatarDataHora(jogo.dataPartida) : 'Data a definir'}</small>
            </div>
            <span className={`chave-jogo-status status-${jogo.status === 2 ? 'encerrada' : 'agendada'}`}>
              {obterNomeStatus(jogo.status)}
            </span>
          </div>

          {jogo.nomeFase && (
            <p className="jogo-grupo-fase">{jogo.nomeFase}</p>
          )}

          <div className={`jogo-grupo-time ${duplaAVenceu ? 'vencedora' : ''}`}>
            <strong>{jogo.nomeDuplaA}</strong>
            <span>{jogo.status === 2 ? jogo.placarDuplaA : '-'}</span>
          </div>

          <div className={`jogo-grupo-time ${duplaBVenceu ? 'vencedora' : ''}`}>
            <strong>{jogo.nomeDuplaB}</strong>
            <span>{jogo.status === 2 ? jogo.placarDuplaB : '-'}</span>
          </div>

          {partida && renderizarLancamentoResultado(partida, 'lista')}

          {partida && podeEditarPartidas && (
            <div className="acoes-item acoes-item-compactas">
              <button type="button" className="botao-secundario botao-compacto" onClick={() => iniciarEdicao(partida)}>
                <ConteudoBotao icone="editar" texto={tabelaJogosAprovada || grupoSelecionado ? 'Editar' : 'Ajustar'} />
              </button>
              {grupoSelecionado && (
                <button type="button" className="botao-perigo botao-compacto" onClick={() => removerPartida(partida.id)}>
                  <ConteudoBotao icone="excluir" texto="Excluir" />
                </button>
              )}
            </div>
          )}
        </article>
      );
    }

    const exibirFormatoCopa = estruturaGrupoCopa.grupos.length > 0;

    return (
      <section ref={tabelaJogosRef} className="cartao grupos-visualizacao">
        <div className="grupos-visualizacao-cabecalho">
          <div>
            <h3>{exibirFormatoCopa ? 'Fase de grupos' : 'Jogos por rodada'}</h3>
            <p>
              {exibirFormatoCopa
                ? 'Os jogos aparecem separados por grupo e, quando houver classificação, a fase eliminatória fica organizada logo abaixo.'
                : 'Os confrontos do grupo aparecem organizados por rodada para facilitar a leitura do andamento da competição.'}
            </p>
          </div>
          <div className="chave-visualizacao-resumo">
            <div className="chave-resumo-item">
              <span>{exibirFormatoCopa ? 'Grupos' : 'Rodadas'}</span>
              <strong>{exibirFormatoCopa ? estruturaGrupoCopa.grupos.length : rodadasGrupoExibicao.length}</strong>
            </div>
            <div className="chave-resumo-item">
              <span>Jogos</span>
              <strong>{partidas.length}</strong>
            </div>
            {exibirFormatoCopa && (
              <div className="chave-resumo-item">
                <span>Mata-mata</span>
                <strong>{estruturaGrupoCopa.rodadasEliminatorias.length}</strong>
              </div>
            )}
          </div>
        </div>

        {exibirFormatoCopa ? (
          <div className="grupos-copa-secoes">
            <div className="grupos-copa-grid">
              {estruturaGrupoCopa.grupos.map((grupo) => (
                <section key={grupo.nomeGrupo} className="grupo-copa-card">
                  <div className="grupo-copa-cabecalho">
                    <div>
                      <strong>{grupo.nomeGrupo}</strong>
                      <small>{grupo.classificacao.length} dupla(s) · {grupo.totalJogos} jogo(s)</small>
                    </div>
                  </div>

                  <div className="grupo-copa-classificacao">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Dupla</th>
                          <th>Pts</th>
                          <th>V</th>
                          <th>SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.classificacao.map((linha) => (
                          <tr key={linha.duplaId}>
                            <td>{linha.posicao}</td>
                            <td>{linha.nomeDupla}</td>
                            <td>{linha.pontos}</td>
                            <td>{linha.vitorias}</td>
                            <td>{linha.saldo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grupo-copa-rodadas">
                    {grupo.rodadas.map((rodada) => (
                      <section key={`${grupo.nomeGrupo}-${rodada.numeroRodada}`} className="rodada-grupo-card rodada-grupo-card-interna">
                        <div className="rodada-grupo-cabecalho">
                          <div>
                            <strong>{rodada.nomeRodada}</strong>
                            <small>{rodada.jogos.length} jogo(s)</small>
                          </div>
                        </div>

                        <div className="rodada-grupo-jogos">
                          {rodada.jogos.map(renderizarCartaoJogoGrupo)}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {estruturaGrupoCopa.rodadasEliminatorias.length > 0 && (
              <section className="fase-eliminatoria-grupos">
                <div className="grupo-copa-cabecalho">
                  <div>
                    <strong>Fase eliminatória</strong>
                    <small>{estruturaGrupoCopa.rodadasEliminatorias.length} rodada(s)</small>
                  </div>
                </div>

                <div className="grupos-rodadas">
                  {estruturaGrupoCopa.rodadasEliminatorias.map((rodada) => (
                    <section key={`eliminatoria-${rodada.numeroRodada}-${rodada.nomeRodada}`} className="rodada-grupo-card">
                      <div className="rodada-grupo-cabecalho">
                        <div>
                          <strong>{rodada.nomeRodada}</strong>
                          <small>{rodada.jogos.length} jogo(s)</small>
                        </div>
                      </div>

                      <div className="rodada-grupo-jogos">
                        {rodada.jogos.map(renderizarCartaoJogoGrupo)}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="grupos-rodadas">
            {rodadasGrupoExibicao.map((rodada) => (
              <section key={`${rodada.numeroRodada}-${rodada.nomeRodada}`} className="rodada-grupo-card">
                <div className="rodada-grupo-cabecalho">
                  <div>
                    <strong>{rodada.nomeRodada}</strong>
                    <small>{rodada.jogos.length} jogo(s)</small>
                  </div>
                </div>

                <div className="rodada-grupo-jogos">
                  {rodada.jogos.map(renderizarCartaoJogoGrupo)}
                </div>
              </section>
            ))}
          </div>
        )}
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
              ? 'Escolha um grupo criado por você, informe parceiro e adversários na própria tela e registre a partida sem cadastros prévios.'
              : grupoSelecionado
                ? 'Informe ou selecione os atletas na própria tela. O sistema reaproveita ou cria atletas e duplas no mesmo fluxo.'
                : 'Você pode usar duplas inscritas ou informar os atletas na própria tela. O sistema reaproveita ou cria a dupla no fluxo e valida a inscrição da categoria no backend.'
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
        {categoriaSelecionada?.nomeFormatoCampeonatoEfetivo && (
          <p>Formato da categoria: {categoriaSelecionada.nomeFormatoCampeonatoEfetivo}.</p>
        )}
        {categoriaSelecionada?.nomeFormatoCampeonatoEfetivo?.toLowerCase().includes('dupla') && competicaoSelecionada?.tipo !== 3 && (
          <p>Final reset: {competicaoSelecionada?.possuiFinalReset ? 'habilitada' : 'desabilitada'}.</p>
        )}
        {competicaoComInscricoes && (
          <p>Para campeonatos e eventos, você pode usar as duplas inscritas da categoria ou informar os atletas na própria tela. A dupla precisa estar inscrita na categoria para a partida ser salva.</p>
        )}
        {grupoSelecionado && (
          <p>Para grupos, a categoria é opcional. Se você não escolher nenhuma, o jogo será lançado sem categoria informada.</p>
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
            {grupoSelecionado ? 'Categoria opcional' : 'Categoria'}
            <select
              value={formulario.categoriaCompeticaoId}
              onChange={(evento) => atualizarCampo('categoriaCompeticaoId', evento.target.value)}
            required={!grupoSelecionado}
          >
            <option value="">{grupoSelecionado ? 'Todas / sem categoria' : 'Selecione'}</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
              ))}
            </select>
          </label>

          {grupoSelecionado && (
            <p className="campo-largo">
              Você pode registrar a partida sem cadastro prévio. Deixe a categoria em branco se quiser lançar o jogo direto no grupo.
            </p>
          )}

        {podeSortearPartidas && (
          <div className="acoes-item acoes-item-compactas">
            <button
              type="button"
              className="botao-primario botao-compacto"
              onClick={() => gerarTabela(partidas.length > 0)}
              disabled={gerandoTabela || !categoriaSelecionada || duplasDisponiveis.length < 4}
            >
              <ConteudoBotao
                icone="sortear"
                texto={gerandoTabela
                  ? 'Sorteando...'
                  : partidas.length > 0
                    ? 'Sortear de novo'
                    : 'Sortear jogos'}
              />
            </button>

            {partidas.length > 0 && (
              <button
                type="button"
                className="botao-secundario botao-compacto"
                onClick={aprovarSorteioCategoria}
                disabled={!podeAprovarSorteio || aprovandoTabela}
              >
                <ConteudoBotao icone="aprovar" texto={aprovandoTabela ? 'Aprovando...' : 'Aprovar sorteio'} />
              </button>
            )}

            {partidas.length > 0 && (
              <button
                type="button"
                className="botao-perigo botao-compacto"
                onClick={excluirTabelaCategoria}
                disabled={removendoTabela}
              >
                <ConteudoBotao icone="excluir" texto={removendoTabela ? 'Excluindo...' : 'Excluir jogos'} />
              </button>
            )}
          </div>
        )}
      </div>

      {(competicaoComInscricoes || grupoSelecionado || podeVisualizarGrupo) && partidas.length > 0 && (
        <div className="cartao barra-visualizacao-partidas">
          <div>
            <strong>Modo de visualização</strong>
            <p>
              {podeVisualizarGrupo
                ? 'Use a visão de grupo para acompanhar os jogos por rodada ou volte para a lista detalhada.'
                : exibirChaveVisual
                  ? 'Use a tabela em chave para acompanhar o avanço dos confrontos ou volte para a lista detalhada.'
                  : categoriaSelecionada?.nomeFormatoCampeonatoEfetivo
                    ? `Esta categoria está no formato ${categoriaSelecionada.nomeFormatoCampeonatoEfetivo}. A visão de grupo só aparece quando o formato efetivo é Fase de grupos.`
                    : 'Esta categoria ainda não está em fase de chave. A lista detalhada segue como leitura principal.'}
            </p>
          </div>

          <div className="acoes-item acoes-item-compactas">
            {exibirChaveVisual && (
              <button
                type="button"
                className={`${visualizacaoTabela ? 'botao-primario' : 'botao-terciario'} botao-compacto`}
                onClick={() => atualizarParametrosUrl(competicaoId, formulario.categoriaCompeticaoId, 'tabela')}
              >
                <ConteudoBotao icone="tabela" texto="Ver tabela" />
              </button>
            )}
            {podeVisualizarGrupo && (
              <button
                type="button"
                className={`${visualizacaoGrupo ? 'botao-primario' : 'botao-terciario'} botao-compacto`}
                onClick={() => atualizarParametrosUrl(competicaoId, formulario.categoriaCompeticaoId, 'grupo')}
              >
                <ConteudoBotao icone="grupo" texto="Ver grupo" />
              </button>
            )}
            <button
              type="button"
              className={`${!visualizacaoTabela && !visualizacaoGrupo ? 'botao-secundario' : 'botao-terciario'} botao-compacto`}
              onClick={() => atualizarParametrosUrl(competicaoId, formulario.categoriaCompeticaoId, '')}
            >
              <ConteudoBotao icone="lista" texto="Ver lista" />
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
              Digite nomes completos ou escolha atletas já existentes nas sugestões. Ao salvar, a API reaproveita ou cria atletas, monta as duplas e registra a partida no mesmo fluxo.
            </p>
          )}
          {!competicaoId && (
            <p className="campo-largo">
              Você já pode preencher os atletas e o placar. Selecione a competição antes de salvar a partida.
            </p>
          )}
          {!grupoSelecionado && competicaoId && !formulario.categoriaCompeticaoId && (
            <p className="campo-largo">
              Você já pode preencher os dados da partida. Selecione a categoria antes de salvar.
            </p>
          )}
          {competicaoComInscricoes && partidaEdicaoId && (
            <p className="campo-largo">
              {tabelaJogosAprovada
                ? 'Ajuste as duplas do confronto quando necessário e preencha o resultado da partida sorteada.'
                : 'Ajuste as duplas e a data do confronto quando necessário. O resultado só pode ser lançado depois da aprovação do sorteio.'}
            </p>
          )}

          {competicaoComInscricoes && !partidaEdicaoId && (
            <div className="campo-largo acoes-item acoes-item-compactas">
              <button
                type="button"
                className={`${modoCadastroPartida === 'duplas' ? 'botao-primario' : 'botao-terciario'} botao-compacto`}
                onClick={() => setModoCadastroPartida('duplas')}
              >
                Usar duplas inscritas
              </button>
              <button
                type="button"
                className={`${modoCadastroPartida === 'atletas' ? 'botao-primario' : 'botao-terciario'} botao-compacto`}
                onClick={() => setModoCadastroPartida('atletas')}
              >
                Informar atletas
              </button>
            </div>
          )}

          {usandoCadastroPorAtletas ? (
            <>
              {competicaoComInscricoes && !grupoSelecionado && (
                <p className="campo-largo">
                  Você pode informar os atletas sem ter a dupla pré-cadastrada. A API reaproveita ou cria a dupla no fluxo, mas a dupla ainda precisa estar inscrita na categoria para a partida ser salva.
                </p>
              )}

              <label>
                {usuarioAtleta ? 'Seu atleta' : 'Dupla A · Jogador 1'}
                <input
                  type="text"
                  value={formulario.duplaAAtleta1Nome}
                  onChange={(evento) => atualizarAtletaGrupo('duplaAAtleta1', evento.target.value)}
                  disabled={grupoSelecionado && usuarioAtleta}
                  readOnly={grupoSelecionado && usuarioAtleta}
                  placeholder="Nome completo"
                  required
                />
              </label>

              {renderizarResumoSelecaoAtletaGrupo(
                'duplaAAtleta1',
                usuarioAtleta
                  ? 'Este é o atleta vinculado ao seu usuário e ele será a base da sua dupla.'
                  : 'Atleta existente selecionado. A API vai reaproveitar esse cadastro neste lançamento.'
              )}

              {!(grupoSelecionado && usuarioAtleta) && sugestoesAtletasGrupo.duplaAAtleta1.length > 0 && (
                <div className="campo-largo lista-sugestoes">
                  {sugestoesAtletasGrupo.duplaAAtleta1.map((atleta) => (
                    <button
                      key={atleta.id}
                      type="button"
                      className="item-sugestao"
                      onClick={() => selecionarAtletaGrupo('duplaAAtleta1', atleta)}
                    >
                      {atleta.nome}
                      {atleta.apelido ? ` (${atleta.apelido})` : ''}
                      {atleta.cadastroPendente ? ' [pendente]' : ''}
                    </button>
                  ))}
                </div>
              )}

              <label>
                {usuarioAtleta ? 'Parceiro' : 'Dupla A · Jogador 2'}
                <input
                  type="text"
                  value={formulario.duplaAAtleta2Nome}
                  onChange={(evento) => atualizarAtletaGrupo('duplaAAtleta2', evento.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </label>

              {renderizarResumoSelecaoAtletaGrupo('duplaAAtleta2')}

              {sugestoesAtletasGrupo.duplaAAtleta2.length > 0 && (
                <div className="campo-largo lista-sugestoes">
                  {sugestoesAtletasGrupo.duplaAAtleta2.map((atleta) => (
                    <button
                      key={atleta.id}
                      type="button"
                      className="item-sugestao"
                      onClick={() => selecionarAtletaGrupo('duplaAAtleta2', atleta)}
                    >
                      {atleta.nome}
                      {atleta.apelido ? ` (${atleta.apelido})` : ''}
                      {atleta.cadastroPendente ? ' [pendente]' : ''}
                    </button>
                  ))}
                </div>
              )}

              {exibirCamposPlacarFormulario && (
                <label>
                  {rotuloPlacarDuplaA}
                  <input
                    type="number"
                    min={0}
                    value={formulario.placarDuplaA}
                    onChange={(evento) => atualizarCampo('placarDuplaA', evento.target.value)}
                  />
                </label>
              )}

              <label>
                Adversário 1
                <input
                  type="text"
                  value={formulario.duplaBAtleta1Nome}
                  onChange={(evento) => atualizarAtletaGrupo('duplaBAtleta1', evento.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </label>

              {renderizarResumoSelecaoAtletaGrupo('duplaBAtleta1')}

              {sugestoesAtletasGrupo.duplaBAtleta1.length > 0 && (
                <div className="campo-largo lista-sugestoes">
                  {sugestoesAtletasGrupo.duplaBAtleta1.map((atleta) => (
                    <button
                      key={atleta.id}
                      type="button"
                      className="item-sugestao"
                      onClick={() => selecionarAtletaGrupo('duplaBAtleta1', atleta)}
                    >
                      {atleta.nome}
                      {atleta.apelido ? ` (${atleta.apelido})` : ''}
                      {atleta.cadastroPendente ? ' [pendente]' : ''}
                    </button>
                  ))}
                </div>
              )}

              <label>
                Adversário 2
                <input
                  type="text"
                  value={formulario.duplaBAtleta2Nome}
                  onChange={(evento) => atualizarAtletaGrupo('duplaBAtleta2', evento.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </label>

              {renderizarResumoSelecaoAtletaGrupo('duplaBAtleta2')}

              {sugestoesAtletasGrupo.duplaBAtleta2.length > 0 && (
                <div className="campo-largo lista-sugestoes">
                  {sugestoesAtletasGrupo.duplaBAtleta2.map((atleta) => (
                    <button
                      key={atleta.id}
                      type="button"
                      className="item-sugestao"
                      onClick={() => selecionarAtletaGrupo('duplaBAtleta2', atleta)}
                    >
                      {atleta.nome}
                      {atleta.apelido ? ` (${atleta.apelido})` : ''}
                      {atleta.cadastroPendente ? ' [pendente]' : ''}
                    </button>
                  ))}
                </div>
              )}

              {exibirCamposPlacarFormulario && (
                <label>
                  {rotuloPlacarDuplaB}
                  <input
                    type="number"
                    min={0}
                    value={formulario.placarDuplaB}
                    onChange={(evento) => atualizarCampo('placarDuplaB', evento.target.value)}
                  />
                </label>
              )}
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

          {!grupoSelecionado && exibirCamposPlacarFormulario && (
            <label>
              {rotuloPlacarDuplaA}
              <input
                type="number"
                min={0}
                value={formulario.placarDuplaA}
                onChange={(evento) => atualizarCampo('placarDuplaA', evento.target.value)}
              />
            </label>
          )}

          {!grupoSelecionado && exibirCamposPlacarFormulario && (
            <label>
              {rotuloPlacarDuplaB}
              <input
                type="number"
                min={0}
                value={formulario.placarDuplaB}
                onChange={(evento) => atualizarCampo('placarDuplaB', evento.target.value)}
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
            <button type="submit" className="botao-primario botao-compacto" disabled={!podeSalvarFormulario}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>

            {partidaEdicaoId && (
              <button type="button" className="botao-secundario botao-compacto" onClick={cancelarEdicao}>
                <ConteudoBotao icone="cancelar" texto="Cancelar" />
              </button>
            )}
          </div>
        </form>
      )}

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      {competicaoComInscricoes && formulario.categoriaCompeticaoId && duplasDisponiveis.length === 0 && (
        <p>Nenhuma dupla inscrita nesta categoria da competição. Você ainda pode informar os atletas na própria tela para reaproveitar ou montar a dupla no fluxo.</p>
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

      {grupoSelecionado && podeEditarPartidas && (
        <p>Você pode informar nomes novos ou selecionar atletas já existentes. O sistema vincula ao grupo, reaproveita as duplas e registra a partida no mesmo fluxo.</p>
      )}

      {grupoSelecionado && grupoAtletas.length === 0 && podeEditarPartidas && (
        <p>Ainda não há atletas vinculados a este grupo, mas isso não bloqueia o lançamento. Você pode digitar os nomes na própria tela e o sistema cria ou reaproveita os atletas ao salvar.</p>
      )}

      {grupoSelecionado && atletaUsuarioSemVinculo && (
        <p className="texto-aviso">
          Vincule um atleta ao seu usuário antes de registrar partidas no grupo. O primeiro atleta da sua dupla precisa ser o atleta vinculado ao seu perfil.
        </p>
      )}

      {!podeEditarPartidas && partidas.length > 0 && competicaoComInscricoes && (
        <p>Somente administradores ou o organizador da competição podem preencher resultados ou ajustar os confrontos. Aqui você acompanha os jogos e os resultados.</p>
      )}

      {!podeEditarPartidas && partidas.length > 0 && grupoSelecionado && (
        <p>Somente administradores, organizadores e responsáveis pelo grupo podem alterar a tabela. Aqui você acompanha os jogos e os resultados.</p>
      )}

      {exibirVisaoGrupo && renderizarVisaoGrupo()}

      {exibirChaveVisual && visualizacaoTabela && (
        <section ref={tabelaJogosRef} className="cartao chave-visualizacao">
          <div className="chave-visualizacao-cabecalho">
            <div className="chave-visualizacao-introducao">
              <h3>Tabela de jogos</h3>
              <p>Os vencedores avançam de uma coluna para a seguinte conforme os resultados lançados. A lista detalhada continua abaixo para consulta e edição.</p>
            </div>
            <div className="chave-visualizacao-resumo">
              <div className="chave-resumo-item">
                <span>Fases</span>
                <strong>{resumoTabelaJogos.totalFases}</strong>
              </div>
              <div className="chave-resumo-item">
                <span>Jogos</span>
                <strong>{resumoTabelaJogos.totalJogos}</strong>
              </div>
              <div className="chave-resumo-item">
                <span>Encerrados</span>
                <strong>{resumoTabelaJogos.jogosEncerrados}</strong>
              </div>
              <div className="chave-resumo-item">
                <span>Pendentes</span>
                <strong>{resumoTabelaJogos.jogosPendentes}</strong>
              </div>
            </div>
          </div>

          <div className="chave-jogos-wrapper">
            <div className="chave-jogos-blocos">
              {blocosVisualizacaoChave.map((bloco) => {
                const totalJogosBloco = bloco.colunas.reduce(
                  (total, coluna) => total + coluna.partidas.length,
                  0
                );

                return (
                <section key={bloco.id} className="chave-jogos-bloco">
                  {bloco.titulo && (
                    <div className="chave-jogos-bloco-cabecalho">
                      <div>
                        <strong>{bloco.titulo}</strong>
                        <small>{totalJogosBloco} jogo(s) neste bloco</small>
                      </div>
                      <span>{bloco.colunas.length} fase(s)</span>
                    </div>
                  )}

                  <div className="chave-jogos">
                    {bloco.colunas.map((coluna, indiceColuna) =>
                      renderizarColunaChave(
                        coluna,
                        indiceColuna,
                        bloco.colunas.length,
                        'esquerda',
                        coluna.conectar !== false && !ehTituloFinais(coluna.titulo)
                      )
                    )}
                  </div>
                </section>
                );
              })}
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
                <p>Dupla A · Direita: {partida.nomeDuplaAAtleta1}</p>
                <p>Dupla A · Esquerda: {partida.nomeDuplaAAtleta2}</p>
                <p>Dupla B · Direita: {partida.nomeDuplaBAtleta1}</p>
                <p>Dupla B · Esquerda: {partida.nomeDuplaBAtleta2}</p>
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
                  <button type="button" className="botao-secundario botao-compacto" onClick={() => iniciarEdicao(partida)}>
                    <ConteudoBotao icone="editar" texto={tabelaJogosAprovada || grupoSelecionado ? 'Editar' : 'Ajustar'} />
                  </button>
                  {grupoSelecionado && (
                    <button type="button" className="botao-perigo botao-compacto" onClick={() => removerPartida(partida.id)}>
                      <ConteudoBotao icone="excluir" texto="Excluir" />
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}

          {partidas.length === 0 && competicaoComInscricoes && categoriaSelecionada && inscricoesCategoriaOrdenadas.length > 0 && (
            <>
              <p>Esta categoria ainda não possui jogos cadastrados. As duplas inscritas aparecem abaixo para conferência antes do sorteio.</p>
              {inscricoesCategoriaOrdenadas.map((inscricao) => (
                <article key={inscricao.id} className="cartao-lista">
                  <div>
                    <h3>{inscricao.nomeDupla}</h3>
                    <p>Categoria: {inscricao.nomeCategoria}</p>
                    <p>Atletas: {inscricao.nomeAtleta1} / {inscricao.nomeAtleta2}</p>
                    <p>Pagamento: {inscricao.pago ? 'Pago' : 'Pendente'}</p>
                    <p>Data da inscrição: {formatarDataHora(inscricao.dataInscricaoUtc)}</p>
                    <p>Observação: {inscricao.observacao || '-'}</p>
                  </div>
                </article>
              ))}
            </>
          )}

          {partidas.length === 0 && !(competicaoComInscricoes && categoriaSelecionada && inscricoesCategoriaOrdenadas.length > 0) && (
            <p>{grupoSelecionado && !formulario.categoriaCompeticaoId ? 'Nenhuma partida cadastrada para este grupo.' : 'Nenhuma partida cadastrada para esta categoria.'}</p>
          )}
        </div>
      ) : (
        <p>Use "Ver lista detalhada" para consultar todos os dados dos jogos em formato de lista.</p>
      )}
    </section>
  );
}
