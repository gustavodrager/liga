import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { competicoesServico } from '../services/competicoesServico';
import { categoriasServico } from '../services/categoriasServico';
import { partidasServico } from '../services/partidasServico';
import { useAutenticacao } from '../hooks/useAutenticacao';
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

function ehCompeticaoGrupo(competicao) {
  return obterTipoCompeticao(competicao) === TIPOS_COMPETICAO.grupo && !ehCompeticaoPartidasAvulsas(competicao);
}

function ehCompeticaoComInscricoes(competicao) {
  const tipoCompeticao = obterTipoCompeticao(competicao);
  return tipoCompeticao === TIPOS_COMPETICAO.campeonato || tipoCompeticao === TIPOS_COMPETICAO.evento;
}

function obterNomeStatus(status) {
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

export function PaginaConsultaPartidas() {
  const { usuario } = useAutenticacao();
  const usuarioAtleta = Boolean(usuario) && Number(usuario?.perfil) === 3;
  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [estruturaRodadas, setEstruturaRodadas] = useState([]);
  const [competicaoId, setCompeticaoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [params, setParams] = useSearchParams();

  const competicoesDisponiveis = useMemo(
    () => competicoes.filter((competicao) => !ehCompeticaoPartidasAvulsas(competicao)),
    [competicoes]
  );

  const competicaoSelecionada = competicoesDisponiveis.find((competicao) => competicao.id === competicaoId) || null;
  const categoriaSelecionada = categorias.find((categoria) => categoria.id === categoriaId) || null;
  const grupoSelecionado = ehCompeticaoGrupo(competicaoSelecionada);
  const competicaoComInscricoes = ehCompeticaoComInscricoes(competicaoSelecionada);

  const partidasPorId = useMemo(
    () => new Map(partidas.map((partida) => [partida.id, partida])),
    [partidas]
  );

  const estruturaTabelaJogos = useMemo(() => {
    const colunasPadrao = new Map();
    const colunasSequenciais = new Map();
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
      const jogosEliminatorios = [];

      rodada.jogos.forEach((jogo) => {
        const metadadosGrupo = extrairMetadadosGrupoFase(jogo.nomeFase);
        if (!metadadosGrupo) {
          jogosEliminatorios.push(jogo);
          return;
        }

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
        rodadas: Array.from(grupo.rodadas.values()).sort((a, b) => a.numeroRodada - b.numeroRodada),
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
  const exibirVisaoGrupo = podeVisualizarGrupo;
  const exibirChaveVisual = competicaoComInscricoes && partidas.length > 0 && colunasEmVisualizacao.length > 0;
  const exibirListaDetalhada = true;

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

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (competicaoId && !competicoesDisponiveis.some((competicao) => competicao.id === competicaoId)) {
      setCompeticaoId('');
      setCategoriaId('');
    }
  }, [competicaoId, competicoesDisponiveis]);

  useEffect(() => {
    if (!competicaoId) {
      setCategorias([]);
      setCategoriaId('');
      setPartidas([]);
      setEstruturaRodadas([]);
      return;
    }

    carregarCategorias(competicaoId);
  }, [competicaoId]);

  useEffect(() => {
    if (!competicaoSelecionada) {
      setPartidas([]);
      setEstruturaRodadas([]);
      return;
    }

    if (categoriaId) {
      carregarPartidasPorCategoria(categoriaId);
      return;
    }

    if (grupoSelecionado) {
      carregarPartidasPorCompeticao(competicaoSelecionada.id);
      return;
    }

    setPartidas([]);
    setEstruturaRodadas([]);
  }, [competicaoSelecionada, categoriaId, grupoSelecionado]);

  function atualizarParametrosUrl(proximoCompeticaoId, proximaCategoriaId = '') {
    const parametros = {};

    if (proximoCompeticaoId) {
      parametros.competicaoId = proximoCompeticaoId;
    }

    if (proximaCategoriaId) {
      parametros.categoriaId = proximaCategoriaId;
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

      if (categoriaUrl) {
        const categoria = await categoriasServico.obterPorId(categoriaUrl);
        const competicaoCategoria = listaCompeticoes.find((competicao) => competicao.id === categoria.competicaoId);

        if (ehCompeticaoPartidasAvulsas(competicaoCategoria) || categoria.nomeCompeticao === NOME_COMPETICAO_PARTIDAS_AVULSAS) {
          setCompeticaoId('');
          setCategoriaId('');
          atualizarParametrosUrl('');
          return;
        }

        setCompeticaoId(categoria.competicaoId);
        setCategoriaId(categoria.id);
        atualizarParametrosUrl(categoria.competicaoId, categoria.id);
        return;
      }

      if (competicaoUrl) {
        const competicaoSelecionadaUrl = listaCompeticoes.find((competicao) => competicao.id === competicaoUrl);

        if (ehCompeticaoPartidasAvulsas(competicaoSelecionadaUrl)) {
          setCompeticaoId('');
          setCategoriaId('');
          atualizarParametrosUrl('');
          return;
        }

        setCompeticaoId(competicaoUrl);
        setCategoriaId('');
        atualizarParametrosUrl(competicaoUrl);
        return;
      }

      setCompeticaoId('');
      setCategoriaId('');
      atualizarParametrosUrl('');
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

      const ehGrupo = ehCompeticaoGrupo(competicoes.find((competicao) => competicao.id === idCompeticao));
      const categoriaValida = lista.some((categoria) => categoria.id === categoriaId);
      const proximaCategoriaId = categoriaValida
        ? categoriaId
        : ehGrupo
          ? ''
          : lista[0]?.id || '';

      setCategoriaId(proximaCategoriaId);
      atualizarParametrosUrl(idCompeticao, proximaCategoriaId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setCategorias([]);
      setCategoriaId('');
    }
  }

  async function carregarPartidasPorCategoria(idCategoria) {
    try {
      const [lista, estrutura] = await Promise.all([
        partidasServico.listarPorCategoria(idCategoria),
        categoriasServico.listarEstrutura(idCategoria)
      ]);
      setPartidas(lista);
      setEstruturaRodadas(estrutura);
      atualizarParametrosUrl(competicaoId, idCategoria);
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
                    {obterNomeStatus(partida.status)}
                  </span>
                </div>

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

          {jogo.nomeFase && <p className="jogo-grupo-fase">{jogo.nomeFase}</p>}

          <div className={`jogo-grupo-time ${duplaAVenceu ? 'vencedora' : ''}`}>
            <strong>{jogo.nomeDuplaA}</strong>
            <span>{jogo.status === 2 ? jogo.placarDuplaA : '-'}</span>
          </div>

          <div className={`jogo-grupo-time ${duplaBVenceu ? 'vencedora' : ''}`}>
            <strong>{jogo.nomeDuplaB}</strong>
            <span>{jogo.status === 2 ? jogo.placarDuplaB : '-'}</span>
          </div>

          {partida?.faseCampeonato && <p className="jogo-grupo-fase">{partida.faseCampeonato}</p>}
        </article>
      );
    }

    const exibirFormatoCopa = estruturaGrupoCopa.grupos.length > 0;

    return (
      <section className="cartao grupos-visualizacao">
        
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
        <h2>Consultar Partidas</h2>
        <p>Filtre a competição e acompanhe tabela, grupos e resultados.</p>
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

        {competicaoId && categorias.length > 0 && (
          <label>
            Categoria
            <select
              value={categoriaId}
              onChange={(evento) => {
                setCategoriaId(evento.target.value);
                atualizarParametrosUrl(competicaoId, evento.target.value);
              }}
              required={!grupoSelecionado}
            >
              <option value="">{grupoSelecionado ? 'Sem categoria' : 'Selecione'}</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </label>
        )}        
      </div>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando partidas...</p>
      ) : exibirListaDetalhada ? (
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
                  {obterNomeStatus(partida.status)}
                </span>
              </div>

              <div className="partida-lista-detalhes">
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
                  <p>Vencedora: {partida.nomeDuplaVencedora || 'Empate'}</p>
                ) : (
                  <p>Resultado: jogo ainda não encerrado</p>
                )}
                <p className="campo-largo">Obs: {partida.observacoes || '-'}</p>
              </div>
            </article>
          ))}

          {partidas.length === 0 && (
            <p>{grupoSelecionado && !categoriaId ? 'Nenhuma partida cadastrada para este grupo.' : 'Nenhuma partida cadastrada para esta categoria.'}</p>
          )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
