import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { formatosCampeonatoServico } from '../services/formatosCampeonatoServico';
import { grupoAtletasServico } from '../services/grupoAtletasServico';
import { inscricoesCampeonatoServico } from '../services/inscricoesCampeonatoServico';
import { ligasServico } from '../services/ligasServico';
import { locaisServico } from '../services/locaisServico';
import { regrasCompeticaoServico } from '../services/regrasCompeticaoServico';
import { ESTADOS_ACESSO } from '../utils/acesso';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData, paraInputData } from '../utils/formatacao';
import { abrirLinkExterno, obterLinkHttp } from '../utils/links';
import { ehAtleta, ehGestorCompeticao, PERFIS_USUARIO } from '../utils/perfis';
import { rolarParaElemento, rolarParaTopo } from '../utils/rolagem';

function obterDataAtualInput() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function criarEstadoInicialCompeticao(usuarioAtleta = false) {
  return {
    nome: '',
    tipo: usuarioAtleta ? '3' : '1',
    descricao: '',
    link: '',
    dataInicio: usuarioAtleta ? obterDataAtualInput() : '',
    dataFim: '',
    ligaId: '',
    localId: '',
    formatoCampeonatoId: '',
    regraCompeticaoId: '',
    inscricoesAbertas: !usuarioAtleta,
    possuiFinalReset: !usuarioAtleta
  };
}

const tiposCompeticao = [
  { valor: 1, rotulo: 'Campeonato' },
  { valor: 2, rotulo: 'Evento' },
  { valor: 3, rotulo: 'Grupo' }
];

const TIPOS_COMPETICAO = {
  campeonato: 1,
  evento: 2,
  grupo: 3,
  partidasAvulsas: 4
};

const NOME_COMPETICAO_PARTIDAS_AVULSAS = 'Partidas avulsas';

function ehCompeticaoPartidasAvulsas(competicao) {
  const tipoCompeticao = Number(competicao?.tipo || 0);
  const nomeCompeticao = (competicao?.nome || '').trim().toLowerCase();

  return tipoCompeticao === TIPOS_COMPETICAO.partidasAvulsas
    || (tipoCompeticao === TIPOS_COMPETICAO.grupo && nomeCompeticao === NOME_COMPETICAO_PARTIDAS_AVULSAS.toLowerCase());
}

const tiposCompeticaoFormulario = [
  { valor: 1, rotulo: 'Campeonato' },
  { valor: 3, rotulo: 'Grupo' }
];

function normalizarTipoCompeticaoFormulario(tipo) {
  return Number(tipo) === 3 ? '3' : '1';
}

const estadoInicialGrupoAtleta = {
  nomeAtleta: '',
  apelidoAtleta: ''
};

const opcoesGenero = [
  { valor: 1, rotulo: 'Masculino' },
  { valor: 2, rotulo: 'Feminino' },
  { valor: 3, rotulo: 'Misto' }
];

const opcoesNivel = [
  { valor: 1, rotulo: 'Estreante' },
  { valor: 2, rotulo: 'Iniciante' },
  { valor: 3, rotulo: 'Intermediário' },
  { valor: 4, rotulo: 'Amador' },
  { valor: 5, rotulo: 'Profissional' },
  { valor: 6, rotulo: 'Livre' }
];

const filtrosIniciais = {
  termo: '',
  tipo: '',
  competicaoId: '',
  categoria: ''
};

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterRotuloTipoCompeticao(tipo) {
  return tiposCompeticao.find((item) => item.valor === Number(tipo))?.rotulo || '';
}

function obterRotuloGenero(genero) {
  return opcoesGenero.find((item) => item.valor === Number(genero))?.rotulo || '';
}

function obterRotuloNivel(nivel) {
  return opcoesNivel.find((item) => item.valor === Number(nivel))?.rotulo || '';
}

function competicaoCorrespondeAoFiltro(competicao, termo) {
  return [
    competicao.nome,
    competicao.descricao,
    competicao.nomeLocal,
    competicao.nomeLiga,
    competicao.nomeUsuarioOrganizador,
    obterRotuloTipoCompeticao(competicao.tipo)
  ].some((valor) => normalizarTexto(valor).includes(termo));
}

function categoriaCorrespondeAoFiltro(categoria, termo) {
  return [
    categoria.id,
    categoria.nome,
    obterRotuloGenero(categoria.genero),
    obterRotuloNivel(categoria.nivel)
  ].some((valor) => normalizarTexto(valor).includes(termo));
}

export function PaginaCompeticoes() {
  const { token, usuario, estadoAcesso, atualizarUsuarioLocal } = useAutenticacao();
  const visitante = !token;
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const usuarioAtleta = ehAtleta(usuario);
  const usuarioAdministrador = Number(usuario?.perfil) === PERFIS_USUARIO.administrador;
  const usuarioAtivo = estadoAcesso === ESTADOS_ACESSO.ativo;
  const podeCriarCompeticao = usuarioAtivo && (gestorCompeticao || usuarioAtleta);
  const [competicoes, setCompeticoes] = useState([]);
  const [ligas, setLigas] = useState([]);
  const [locais, setLocais] = useState([]);
  const [formatosCampeonato, setFormatosCampeonato] = useState([]);
  const [regras, setRegras] = useState([]);
  const [regrasDisponiveis, setRegrasDisponiveis] = useState(true);
  const [formulario, setFormulario] = useState(() => criarEstadoInicialCompeticao(usuarioAtleta));
  const [formularioCompeticaoAberto, setFormularioCompeticaoAberto] = useState(true);
  const [deveRolarParaFormularioCompeticao, setDeveRolarParaFormularioCompeticao] = useState(false);
  const [competicaoEdicaoId, setCompeticaoEdicaoId] = useState(null);
  const [categoriasFormulario, setCategoriasFormulario] = useState([]);
  const [carregandoCategoriasFormulario, setCarregandoCategoriasFormulario] = useState(false);
  const [categoriasPorCompeticao, setCategoriasPorCompeticao] = useState({});
  const [carregandoCategoriasCompeticoes, setCarregandoCategoriasCompeticoes] = useState(false);
  const [quantidadeInscricoesPorCategoria, setQuantidadeInscricoesPorCategoria] = useState({});
  const [categoriaInscricoesAbertaId, setCategoriaInscricoesAbertaId] = useState(null);
  const [inscricoesCategoria, setInscricoesCategoria] = useState([]);
  const [competicaoGrupoAtletasId, setCompeticaoGrupoAtletasId] = useState(null);
  const [grupoAtletas, setGrupoAtletas] = useState([]);
  const [formularioGrupoAtleta, setFormularioGrupoAtleta] = useState(estadoInicialGrupoAtleta);
  const [grupoAtletaSelecionadoId, setGrupoAtletaSelecionadoId] = useState('');
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [carregandoInscricoesCategoria, setCarregandoInscricoesCategoria] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoGrupoAtleta, setSalvandoGrupoAtleta] = useState(false);
  const [sorteandoCategoriaId, setSorteandoCategoriaId] = useState(null);
  const [assumindoNomeGrupo, setAssumindoNomeGrupo] = useState(false);
  const formularioCompeticaoRef = useRef(null);
  const navegar = useNavigate();
  const tipoGrupoSelecionado = usuarioAtleta || Number(formulario.tipo) === 3;
  const totalCompeticoes = competicoes.length;
  const totalComInscricoesAbertas = competicoes.filter((competicao) => (
    competicao.tipo !== 3 && competicao.inscricoesAbertas
  )).length;
  const totalGrupos = competicoes.filter((competicao) => competicao.tipo === 3).length;
  const filtroAtivo = Boolean(filtros.termo || filtros.tipo || filtros.competicaoId || filtros.categoria);
  const tiposFiltroDisponiveis = visitante
    ? tiposCompeticao.filter((tipo) => tipo.valor !== TIPOS_COMPETICAO.grupo)
    : tiposCompeticao;
  const competicoesDoTipoSelecionado = useMemo(() => {
    const tipo = filtros.tipo ? Number(filtros.tipo) : null;

    if (!tipo) {
      return [];
    }

    return competicoes.filter((competicao) => Number(competicao.tipo) === tipo);
  }, [competicoes, filtros.tipo]);
  const categoriasDaCompeticaoSelecionada = filtros.competicaoId
    ? categoriasPorCompeticao[filtros.competicaoId] || []
    : [];
  const categoriasFiltradasPorCompeticao = useMemo(() => {
    const termoCategoria = normalizarTexto(filtros.categoria);

    return Object.fromEntries(
      Object.entries(categoriasPorCompeticao).map(([competicaoId, categorias]) => [
        competicaoId,
        termoCategoria
          ? categorias.filter((categoria) => categoriaCorrespondeAoFiltro(categoria, termoCategoria))
          : categorias
      ])
    );
  }, [categoriasPorCompeticao, filtros.categoria]);

  const competicoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(filtros.termo);
    const tipo = filtros.tipo ? Number(filtros.tipo) : null;
    const competicaoId = filtros.competicaoId;
    const termoCategoria = normalizarTexto(filtros.categoria);

    return competicoes.filter((competicao) => {
      const categoriasFiltradas = categoriasFiltradasPorCompeticao[competicao.id] || [];
      const correspondeAoTermo = !termo || competicaoCorrespondeAoFiltro(competicao, termo);
      const correspondeAoTipo = !tipo || Number(competicao.tipo) === tipo;
      const correspondeACompeticao = !competicaoId || competicao.id === competicaoId;
      const correspondeACategoria = !termoCategoria || (
        Number(competicao.tipo) !== TIPOS_COMPETICAO.grupo &&
        categoriasFiltradas.length > 0
      );

      return correspondeAoTermo && correspondeAoTipo && correspondeACompeticao && correspondeACategoria;
    });
  }, [categoriasFiltradasPorCompeticao, competicoes, filtros.categoria, filtros.competicaoId, filtros.termo, filtros.tipo]);

  useEffect(() => {
    carregarCompeticoes();
  }, [gestorCompeticao, usuarioAtleta, usuarioAtivo]);

  useEffect(() => {
    if (!carregando && totalCompeticoes === 0) {
      setFormularioCompeticaoAberto(true);
    }
  }, [carregando, totalCompeticoes]);

  useEffect(() => {
    if (!competicaoEdicaoId || Number(formulario.tipo) === 3) {
      setCategoriasFormulario([]);
      setCarregandoCategoriasFormulario(false);
      return;
    }

    carregarCategoriasFormulario(competicaoEdicaoId);
  }, [competicaoEdicaoId, formulario.tipo]);

  useEffect(() => {
    if (!deveRolarParaFormularioCompeticao || !formularioCompeticaoAberto) {
      return;
    }

    rolarParaElemento(formularioCompeticaoRef.current);
    setDeveRolarParaFormularioCompeticao(false);
  }, [deveRolarParaFormularioCompeticao, formularioCompeticaoAberto]);

  function obterFormatosDisponiveisParaTipo(tipo) {
    const tipoCompeticao = Number(tipo);
    return formatosCampeonato.filter((formato) => (
      formato.ativo &&
      (tipoCompeticao !== 3 || formato.tipoFormato === 1)
    ));
  }

  function formatoEfetivoDaCompeticaoEhChaveDuplaEliminacao(tipo, formatoCampeonatoId) {
    if (Number(tipo) === 3) {
      return false;
    }

    if (!formatoCampeonatoId) {
      return true;
    }

    const formatoSelecionado = formatosCampeonato.find((formato) => formato.id === formatoCampeonatoId);
    return Boolean(
      formatoSelecionado &&
      formatoSelecionado.tipoFormato === 3 &&
      Number(formatoSelecionado.quantidadeDerrotasParaEliminacao) === 2
    );
  }

  function podeGerenciarCompeticao(competicao) {
    if (!usuarioAtivo) {
      return false;
    }

    if (usuarioAdministrador) {
      return true;
    }

    if (Number(usuario?.perfil) === PERFIS_USUARIO.organizador) {
      return competicao.usuarioOrganizadorId === usuario?.id;
    }

    return usuarioAtleta && competicao.tipo === 3 && competicao.usuarioOrganizadorId === usuario?.id;
  }

  function podeSortearJogosCompeticao(competicao) {
    return usuarioAtivo && competicao.tipo !== 3 && (
      Number(usuario?.perfil) === PERFIS_USUARIO.administrador ||
      (Number(usuario?.perfil) === PERFIS_USUARIO.organizador && competicao.usuarioOrganizadorId === usuario?.id)
    );
  }

  function categoriaEhChaveDuplaEliminacao(categoria) {
    const formatoEfetivoId = categoria.formatoCampeonatoEfetivoId || categoria.formatoCampeonatoId || '';
    const formato = formatosCampeonato.find((item) => item.id === formatoEfetivoId);

    return Boolean(
      formato &&
      Number(formato.tipoFormato) === 3 &&
      Number(formato.quantidadeDerrotasParaEliminacao) === 2
    );
  }

  function inscricoesFechadasParaGerarChaveamento(competicao, categoria) {
    return Boolean(categoria.inscricoesEncerradas || !competicao.inscricoesAbertas);
  }

  function atualizarFiltro(campo, valor) {
    setFiltros((anteriores) => {
      const proximos = { ...anteriores, [campo]: valor };

      if (campo === 'tipo') {
        proximos.competicaoId = '';
        proximos.categoria = '';
      }

      if (campo === 'competicaoId') {
        proximos.categoria = '';
      }

      return proximos;
    });
  }

  function limparFiltros() {
    setFiltros(filtrosIniciais);
  }

  async function carregarCompeticoes() {
    setCarregando(true);
    setErro('');
    setAviso('');

    try {
      const avisos = [];
      const listaCompeticoes = await competicoesServico.listarVisiveis();
      const competicoesVisiveis = listaCompeticoes.filter((competicao) => !ehCompeticaoPartidasAvulsas(competicao));
      setCompeticoes(competicoesVisiveis);
      await carregarCategoriasCompeticoes(competicoesVisiveis);

      if (gestorCompeticao && usuarioAtivo) {
        try {
          const listaFormatos = await formatosCampeonatoServico.listar();
          setFormatosCampeonato(listaFormatos.filter((formato) => formato.ativo));
        } catch (error) {
          setFormatosCampeonato([]);
          avisos.push(`Não foi possível carregar os formatos de competição: ${extrairMensagemErro(error)}`);
        }
      } else {
        setFormatosCampeonato([]);
      }

      if (!gestorCompeticao || !usuarioAtivo) {
        setLigas([]);
        setLocais([]);
        setRegras([]);
        setRegrasDisponiveis(false);
        setAviso(avisos.join(' '));
        return;
      }

      const [listaLigas, listaLocais] = await Promise.all([
        ligasServico.listar(),
        locaisServico.listar()
      ]);

      setLigas(listaLigas);
      setLocais(listaLocais);

      try {
        const listaRegras = await regrasCompeticaoServico.listar();
        setRegras(listaRegras);
        setRegrasDisponiveis(true);
      } catch (error) {
        setRegras([]);
        setRegrasDisponiveis(false);

        if (error?.response?.status === 404) {
          avisos.push('O cadastro de regras não está disponível nesta API. As competições continuam usando a regra padrão.');
        } else {
          avisos.push(`Não foi possível carregar as regras de competição: ${extrairMensagemErro(error)}`);
        }
      }

      setAviso(avisos.join(' '));
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  async function carregarCategoriasCompeticoes(listaCompeticoes) {
    const competicoesComCategorias = listaCompeticoes.filter((competicao) => competicao.tipo !== 3);

    if (competicoesComCategorias.length === 0) {
      setCategoriasPorCompeticao({});
      setQuantidadeInscricoesPorCategoria({});
      setCarregandoCategoriasCompeticoes(false);
      return;
    }

    setCarregandoCategoriasCompeticoes(true);

    try {
      const categoriasCarregadas = await Promise.all(
        competicoesComCategorias.map(async (competicao) => {
          const categorias = await categoriasServico.listarPorCompeticao(competicao.id);
          return [competicao.id, categorias];
        })
      );

      const categoriasMap = Object.fromEntries(categoriasCarregadas);
      setCategoriasPorCompeticao(categoriasMap);

      const contagensInscricoes = await Promise.all(
        competicoesComCategorias.flatMap((competicao) => (
          (categoriasMap[competicao.id] || []).map(async (categoria) => {
            const inscricoes = await inscricoesCampeonatoServico.listarPorCampeonato(competicao.id, categoria.id);
            return [categoria.id, inscricoes.length];
          })
        ))
      );

      setQuantidadeInscricoesPorCategoria(Object.fromEntries(contagensInscricoes));
    } catch (error) {
      setCategoriasPorCompeticao({});
      setQuantidadeInscricoesPorCategoria({});
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregandoCategoriasCompeticoes(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => {
      const proximo = { ...anterior, [campo]: valor };

      if (campo === 'tipo' && Number(valor) === 3) {
        proximo.dataInicio = proximo.dataInicio || obterDataAtualInput();
        proximo.dataFim = '';
        proximo.inscricoesAbertas = false;
        proximo.possuiFinalReset = false;
      }

      if (campo === 'tipo') {
        const formatosDisponiveis = obterFormatosDisponiveisParaTipo(valor);
        if (
          proximo.formatoCampeonatoId &&
          formatosDisponiveis.every((formato) => formato.id !== proximo.formatoCampeonatoId)
        ) {
          proximo.formatoCampeonatoId = '';
        }
      }

      if (
        (campo === 'tipo' || campo === 'formatoCampeonatoId') &&
        !formatoEfetivoDaCompeticaoEhChaveDuplaEliminacao(
          campo === 'tipo' ? valor : proximo.tipo,
          campo === 'formatoCampeonatoId' ? valor : proximo.formatoCampeonatoId
        )
      ) {
        proximo.possuiFinalReset = false;
      }

      return proximo;
    });
  }

  async function carregarCategoriasFormulario(competicaoId) {
    setCarregandoCategoriasFormulario(true);

    try {
      const lista = await categoriasServico.listarPorCompeticao(competicaoId);
      setCategoriasFormulario(lista);
    } catch (error) {
      setCategoriasFormulario([]);
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregandoCategoriasFormulario(false);
    }
  }

  function iniciarEdicao(competicao) {
    setFormularioCompeticaoAberto(true);
    setDeveRolarParaFormularioCompeticao(true);
    setCompeticaoEdicaoId(competicao.id);
    setFormulario({
      nome: competicao.nome,
      tipo: normalizarTipoCompeticaoFormulario(competicao.tipo),
      descricao: competicao.descricao || '',
      link: competicao.link || '',
      dataInicio: paraInputData(competicao.dataInicio),
      dataFim: paraInputData(competicao.dataFim),
      ligaId: competicao.ligaId || '',
      localId: competicao.localId || '',
      formatoCampeonatoId: competicao.formatoCampeonatoId || '',
      regraCompeticaoId: competicao.regraCompeticaoId || '',
      inscricoesAbertas: Boolean(competicao.inscricoesAbertas),
      possuiFinalReset: Boolean(competicao.possuiFinalReset)
    });
  }

  function cancelarEdicao() {
    setFormularioCompeticaoAberto(totalCompeticoes === 0);
    setDeveRolarParaFormularioCompeticao(false);
    setCompeticaoEdicaoId(null);
    setCategoriasFormulario([]);
    setCarregandoCategoriasFormulario(false);
    setFormulario(criarEstadoInicialCompeticao(usuarioAtleta));
  }

  function abrirFormularioCompeticao() {
    setCompeticaoEdicaoId(null);
    setCategoriasFormulario([]);
    setCarregandoCategoriasFormulario(false);
    setFormulario(criarEstadoInicialCompeticao(usuarioAtleta));
    setFormularioCompeticaoAberto(true);
    setDeveRolarParaFormularioCompeticao(true);
  }

  async function alternarInscricoesCategoria(competicaoId, categoriaId) {
    if (categoriaInscricoesAbertaId === categoriaId) {
      setCategoriaInscricoesAbertaId(null);
      setInscricoesCategoria([]);
      return;
    }

    setErro('');
    setCarregandoInscricoesCategoria(true);

    try {
      const lista = await inscricoesCampeonatoServico.listarPorCampeonato(competicaoId, categoriaId);
      setCategoriaInscricoesAbertaId(categoriaId);
      setInscricoesCategoria(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setCategoriaInscricoesAbertaId(null);
      setInscricoesCategoria([]);
    } finally {
      setCarregandoInscricoesCategoria(false);
    }
  }

  async function abrirGrupoAtletas(competicaoId) {
    setGrupoAtletaSelecionadoId('');
    setFormularioGrupoAtleta(estadoInicialGrupoAtleta);

    if (competicaoGrupoAtletasId === competicaoId) {
      setCompeticaoGrupoAtletasId(null);
      setGrupoAtletas([]);
      return;
    }

    setCompeticaoGrupoAtletasId(competicaoId);

    try {
      const lista = await grupoAtletasServico.listarPorCompeticao(competicaoId);
      setGrupoAtletas(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setGrupoAtletas([]);
    }
  }

  function atualizarCampoGrupoAtleta(campo, valor) {
    setFormularioGrupoAtleta((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function aoSubmeterGrupoAtleta(evento, competicaoId) {
    evento.preventDefault();
    setErro('');
    setAviso('');
    setSalvandoGrupoAtleta(true);

    try {
      await grupoAtletasServico.criar(competicaoId, {
        nomeAtleta: formularioGrupoAtleta.nomeAtleta,
        apelidoAtleta: formularioGrupoAtleta.apelidoAtleta || null
      });

      setFormularioGrupoAtleta(estadoInicialGrupoAtleta);
      const lista = await grupoAtletasServico.listarPorCompeticao(competicaoId);
      setGrupoAtletas(lista);
      rolarParaTopo();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvandoGrupoAtleta(false);
    }
  }

  async function removerCategoria(id) {
    if (!window.confirm('Deseja remover esta categoria?')) {
      return;
    }

    try {
      await categoriasServico.remover(id);
      await carregarCategoriasCompeticoes(competicoes);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  async function sortearJogosCategoria(competicao, categoria, substituirTabelaExistente = false) {
    setErro('');
    setAviso('');
    setSorteandoCategoriaId(categoria.id);

    try {
      const resultado = await categoriasServico.gerarTabelaPartidas(categoria.id, {
        substituirTabelaExistente
      });

      setAviso(resultado.resumo);
      navegar(`/partidas/campeonato?competicaoId=${competicao.id}&categoriaId=${categoria.id}&aba=chaveamento`);
    } catch (error) {
      const mensagemErro = extrairMensagemErro(error);

      if (!substituirTabelaExistente && mensagemErro.toLowerCase().includes('substituição')) {
        const confirmar = window.confirm(
          'Esta categoria já possui uma tabela de jogos gerada. Deseja substituir os confrontos agendados?'
        );

        if (confirmar) {
          await sortearJogosCategoria(competicao, categoria, true);
          return;
        }
      }

      setErro(mensagemErro);
    } finally {
      setSorteandoCategoriaId(null);
    }
  }

  async function removerGrupoAtleta(competicaoId, id) {
    if (!window.confirm('Deseja remover este atleta do grupo?')) {
      return;
    }

    try {
      await grupoAtletasServico.remover(competicaoId, id);
      const lista = await grupoAtletasServico.listarPorCompeticao(competicaoId);
      setGrupoAtletas(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  async function assumirMeuNomeNoGrupo(competicaoId) {
    if (!grupoAtletaSelecionadoId) {
      setErro('Selecione o seu nome na lista do grupo.');
      return;
    }

    setErro('');
    setAviso('');
    setAssumindoNomeGrupo(true);

    try {
      const usuarioAtualizado = await grupoAtletasServico.assumirMeuNome(competicaoId, grupoAtletaSelecionadoId);
      atualizarUsuarioLocal(usuarioAtualizado);
      setAviso('Seu usuário foi vinculado ao nome selecionado neste grupo.');
      const lista = await grupoAtletasServico.listarPorCompeticao(competicaoId);
      setGrupoAtletas(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setAssumindoNomeGrupo(false);
    }
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const tipo = usuarioAtleta ? 3 : Number(formulario.tipo);
    const dados = {
      nome: formulario.nome,
      tipo,
      descricao: formulario.descricao || null,
      link: tipo !== 3 ? formulario.link || null : null,
      dataInicio: tipo === 3 ? (formulario.dataInicio || obterDataAtualInput()) : formulario.dataInicio,
      dataFim: tipo === 3 ? null : formulario.dataFim || null,
      ligaId: usuarioAtleta ? null : formulario.ligaId || null,
      localId: usuarioAtleta ? null : formulario.localId || null,
      formatoCampeonatoId: formulario.formatoCampeonatoId || null,
      regraCompeticaoId: usuarioAtleta ? null : formulario.regraCompeticaoId || null,
      inscricoesAbertas: tipo !== 3 ? formulario.inscricoesAbertas : false,
      possuiFinalReset: tipo !== 3 ? formulario.possuiFinalReset : false
    };

    try {
      if (competicaoEdicaoId) {
        await competicoesServico.atualizar(competicaoEdicaoId, dados);
      } else {
        await competicoesServico.criar(dados);
      }

      cancelarEdicao();
      await carregarCompeticoes();
      setFormularioCompeticaoAberto(false);
      rolarParaTopo();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  function abrirInscricao(competicao, categoria) {
    if (abrirLinkExterno(competicao.link)) {
      return;
    }

    navegar(`/inscricoes?campeonatoId=${competicao.id}&categoriaId=${categoria.id}`);
  }

  async function removerCompeticao(id) {
    if (!window.confirm('Deseja remover esta competição?')) {
      return;
    }

    try {
      await competicoesServico.remover(id);
      await carregarCompeticoes();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      {podeCriarCompeticao && !carregando && totalCompeticoes > 0 && (
        <div className="acoes-item campo-largo">
          {!formularioCompeticaoAberto ? (
            <button type="button" className="botao-primario" onClick={abrirFormularioCompeticao}>
              {usuarioAtleta ? 'Novo grupo' : 'Nova competição'}
            </button>
          ) : !competicaoEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Fechar formulário
            </button>
          )}
        </div>
      )}

      {podeCriarCompeticao && formularioCompeticaoAberto && (
        <form ref={formularioCompeticaoRef} className="formulario-grid formulario-competicao" onSubmit={aoSubmeter}>
          <div className="formulario-competicao-cabecalho campo-largo">
            <h3>
              {competicaoEdicaoId
                ? usuarioAtleta ? 'Editar grupo' : 'Editar competição'
                : usuarioAtleta ? 'Novo grupo' : 'Nova competição'}
            </h3>
            <p>
              {usuarioAtleta
                ? 'Crie um grupo simples para organizar e lançar jogos rapidamente.'
                : 'Defina o básico agora e ajuste categorias, inscrições e jogos depois.'}
            </p>
          </div>

          <label>
            Nome
            <input
              type="text"
              value={formulario.nome}
              onChange={(evento) => atualizarCampo('nome', evento.target.value)}
              required
            />
          </label>

          {!usuarioAtleta && (
            <label>
              Tipo
              <select
                value={formulario.tipo}
                onChange={(evento) => atualizarCampo('tipo', evento.target.value)}
                required
              >
                {tiposCompeticaoFormulario.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!tipoGrupoSelecionado && (
            <>
              <label>
                Data de início
                <input
                  type="date"
                  value={formulario.dataInicio}
                  onChange={(evento) => atualizarCampo('dataInicio', evento.target.value)}
                  required
                />
              </label>

              <label>
                Data de fim
                <input
                  type="date"
                  value={formulario.dataFim}
                  onChange={(evento) => atualizarCampo('dataFim', evento.target.value)}
                />
              </label>

              <label className="campo-largo">
                Link de inscrição
                <input
                  type="url"
                  value={formulario.link}
                  onChange={(evento) => atualizarCampo('link', evento.target.value)}
                  placeholder="https://site-da-inscricao.com"
                />
              </label>
            </>
          )}

          {usuarioAdministrador && (
            <label>
              Forma de competição
              <select
                value={formulario.formatoCampeonatoId}
                onChange={(evento) => atualizarCampo('formatoCampeonatoId', evento.target.value)}
              >
                <option value="">Usar padrão do tipo</option>
                {obterFormatosDisponiveisParaTipo(usuarioAtleta ? 3 : formulario.tipo).map((formato) => (
                  <option key={formato.id} value={formato.id}>
                    {formato.nome}
                  </option>
                ))}
              </select>
            </label>
          )}          

          {usuarioAdministrador && (
            <label>
              Liga
              <select
                value={formulario.ligaId}
                onChange={(evento) => atualizarCampo('ligaId', evento.target.value)}
              >
                <option value="">Sem liga</option>
                {ligas.map((liga) => (
                  <option key={liga.id} value={liga.id}>
                    {liga.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {usuarioAdministrador && (
            <label>
              Local
              <select
                value={formulario.localId}
                onChange={(evento) => atualizarCampo('localId', evento.target.value)}
              >
                <option value="">Sem local</option>
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {usuarioAdministrador && regrasDisponiveis && (
            <label>
              Regra
              <select
                value={formulario.regraCompeticaoId}
                onChange={(evento) => atualizarCampo('regraCompeticaoId', evento.target.value)}
              >
                <option value="">Usar padrão</option>
                {regras.map((regra) => (
                  <option key={regra.id} value={regra.id}>
                    {regra.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!usuarioAtleta && Number(formulario.tipo) === 1 && (
            <div className="campo-largo">
              <strong>Categorias</strong>
              {!competicaoEdicaoId ? (
                <p>Um campeonato pode ter várias categorias. Salve a competição para cadastrar e organizar as categorias.</p>
              ) : (
                <>
                  <p>As categorias deste campeonato são gerenciadas separadamente e ficam vinculadas à competição salva.</p>

                  {carregandoCategoriasFormulario ? (
                    <p>Carregando categorias...</p>
                  ) : categoriasFormulario.length === 0 ? (
                    <p> </p>
                  ) : (
                    <div className="lista-cartoes">
                      {categoriasFormulario.map((categoria) => (
                        <article key={categoria.id} className="cartao-lista">
                          <div>
                            <h4>{categoria.nome}</h4>
                            <p>Gênero: {opcoesGenero.find((item) => item.valor === categoria.genero)?.rotulo}</p>
                            <p>Nível: {opcoesNivel.find((item) => item.valor === categoria.nivel)?.rotulo}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div className="acoes-item">
                    <button
                      type="button"
                      className="botao-terciario"
                      onClick={() => navegar(`/categorias?competicaoId=${competicaoEdicaoId}`)}
                    >
                      Gerenciar categorias
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {!usuarioAtleta && Number(formulario.tipo) !== 3 && (
            <label className="campo-checkbox campo-largo">
              <input
                type="checkbox"
                checked={formulario.inscricoesAbertas}
                onChange={(evento) => atualizarCampo('inscricoesAbertas', evento.target.checked)}
              />
              <span>Campeonato aceitando inscrições</span>
            </label>
          )}

          {usuarioAtleta && (
            <p className="campo-largo">
              O grupo criado por atleta permite lançar jogos sem categoria e também organizar partidas por categoria quando você quiser.
            </p>
          )}

          <div className="acoes-formulario">
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando
                ? 'Salvando...'
                : competicaoEdicaoId
                  ? usuarioAtleta ? 'Atualizar grupo' : 'Atualizar competição'
                  : usuarioAtleta ? 'Criar grupo' : 'Cadastrar competição'}
            </button>

            {competicaoEdicaoId && (
              <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {erro && <p className="texto-erro">{erro}</p>}
      {aviso && <p>{aviso}</p>}

      {carregando ? (
        <p>Carregando competições...</p>
      ) : (
        <>
          <section className="formulario-grid filtro-competicoes barra-selecao-fixa">
            <div className="partidas-filtro-cabecalho campo-largo">
              <div>
                <strong>Filtrar competições</strong>
              </div>
            </div>

            <label>
              Tipo
              <select
                value={filtros.tipo}
                onChange={(evento) => atualizarFiltro('tipo', evento.target.value)}
              >
                <option value="">Todos</option>
                {tiposFiltroDisponiveis.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </select>
            </label>

            {visitante ? (
              <>
                {filtros.tipo && (
                  <label>
                    {Number(filtros.tipo) === TIPOS_COMPETICAO.evento ? 'Evento' : 'Campeonato'}
                    <select
                      value={filtros.competicaoId}
                      onChange={(evento) => atualizarFiltro('competicaoId', evento.target.value)}
                    >
                      <option value="">Todos</option>
                      {competicoesDoTipoSelecionado.map((competicao) => (
                        <option key={competicao.id} value={competicao.id}>
                          {competicao.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {filtros.competicaoId && categoriasDaCompeticaoSelecionada.length > 0 && (
                  <label>
                    Categoria
                    <select
                      value={filtros.categoria}
                      onChange={(evento) => atualizarFiltro('categoria', evento.target.value)}
                    >
                      <option value="">Todas</option>
                      {categoriasDaCompeticaoSelecionada.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <>
                <label>
                  Competição
                  <input
                    type="search"
                    value={filtros.termo}
                    onChange={(evento) => atualizarFiltro('termo', evento.target.value)}
                    placeholder="Nome, local ou responsável"
                  />
                </label>

                <label>
                  Categoria
                  <input
                    type="search"
                    value={filtros.categoria}
                    onChange={(evento) => atualizarFiltro('categoria', evento.target.value)}
                    placeholder="Nome, gênero ou nível"
                  />
                </label>
              </>
            )}
          </section>

          <div className="lista-cartoes">
            {competicoesFiltradas.map((competicao) => {
              const gerenciavel = podeGerenciarCompeticao(competicao);
              const grupoAberto = competicaoGrupoAtletasId === competicao.id;
              const categoriasCompeticao = categoriasFiltradasPorCompeticao[competicao.id] || [];
              const usuarioJaNoGrupo = grupoAberto && grupoAtletas.some((item) => item.atletaId === usuario?.atletaId);
              const nomesDisponiveisParaAssumir = grupoAberto
                ? grupoAtletas.filter((item) => !item.vinculadoAUsuario || item.atletaId === usuario?.atletaId)
                : [];

              return (
                <article
                  key={competicao.id}
                  className={`cartao-lista competicao-card ${competicao.tipo === 3 ? 'competicao-card-grupo' : ''}`}
                >
                <div className="competicao-card-conteudo">
                  <div className="competicao-card-cabecalho">
                    <div className="competicao-card-titulo">
                      <span className="competicao-card-tipo">
                        {tiposCompeticao.find((tipo) => tipo.valor === competicao.tipo)?.rotulo || '-'}
                      </span>
                      <h3>{competicao.nome}</h3>
                    </div>

                    {competicao.tipo === 1 ? (
                        <span
                          className={`tag-status ${
                            competicao.inscricoesAbertas ? 'tag-status-sucesso' : 'tag-status-alerta'
                          } competicao-card-status`}
                        >
                          {competicao.inscricoesAbertas ? 'Inscrições abertas' : 'Inscrições fechadas'}
                        </span>
                      ) : null}
                  </div>

                  <div className="competicao-card-detalhes">
                    <p>Início: {formatarData(competicao.dataInicio)}</p>
                    <p>Fim: {formatarData(competicao.dataFim)}</p>
                    {usuarioAdministrador && <p>Liga: {competicao.nomeLiga || '-'}</p>}
                    {usuarioAdministrador && <p>Forma de competição: {competicao.nomeFormatoCampeonato || 'Padrão do tipo'}</p>}
                    {usuarioAdministrador && competicao.tipo !== 3 && (
                      <p>Final reset: {competicao.possuiFinalReset ? 'Habilitada' : 'Desabilitada'}</p>
                    )}
                    {usuarioAdministrador && <p>Regra: {competicao.nomeRegraCompeticao || 'Padrão'}</p>}
                    {usuarioAdministrador && <p>Ranking da liga: {competicao.ligaId ? 'Conta automaticamente' : 'Sem liga vinculada'}</p>}
                    {usuarioAdministrador && obterLinkHttp(competicao.link) && (
                      <p>
                        Link de inscrição:{' '}
                        <a href={obterLinkHttp(competicao.link)} target="_blank" rel="noopener noreferrer">
                          Abrir
                        </a>
                      </p>
                    )}
                    {competicao.tipo === 3 && (
                      <p>Responsável: {competicao.nomeUsuarioOrganizador || 'Não informado'}</p>
                    )}                  
                  </div>
                </div>

                <div className="acoes-item competicao-card-acoes">
                  {competicao.tipo === 3 && (
                    <button
                      type="button"
                      className="botao-terciario"
                      onClick={() => abrirGrupoAtletas(competicao.id)}
                    >
                      {grupoAberto ? 'Fechar grupo' : 'Atletas do grupo'}
                    </button>
                  )}

                  {competicao.tipo === 3 && gerenciavel && (
                    <button
                      type="button"
                      className="botao-terciario"
                      onClick={() => navegar(`/partidas/consulta?competicaoId=${competicao.id}`)}
                    >
                      Jogos
                    </button>
                  )}

                  {gerenciavel && (
                    <>
                      <button type="button" className="botao-secundario botao-editar" onClick={() => iniciarEdicao(competicao)}>
                        Editar
                      </button>
                      <button type="button" className="botao-perigo" onClick={() => removerCompeticao(competicao.id)}>
                        Excluir
                      </button>
                    </>
                  )}
                </div>

                {competicao.tipo !== 3 && (
                  <div className="campo-largo">
                    <h3>Categorias</h3>
                    {carregandoCategoriasCompeticoes ? (
                      <p>Carregando categorias...</p>
                    ) : (
                    <div className="lista-cartoes">
                      {categoriasCompeticao.map((categoria) => {
                        const ehChaveDuplaEliminacao = categoriaEhChaveDuplaEliminacao(categoria);
                        const quantidadeInscritas = quantidadeInscricoesPorCategoria[categoria.id] ?? 0;
                        const inscricoesFechadas = inscricoesFechadasParaGerarChaveamento(competicao, categoria);

                        return (
                        <article key={categoria.id} className="cartao-lista">
                          <div>
                            <h3>{categoria.nome}</h3>
                            <p>Gênero: {opcoesGenero.find((item) => item.valor === categoria.genero)?.rotulo}</p>
                            <p>Nível: {opcoesNivel.find((item) => item.valor === categoria.nivel)?.rotulo}</p>
                            {competicao.tipo !== 3 && (
                              <p>Duplas inscritas: {quantidadeInscritas}</p>
                            )}
                            {competicao.tipo !== 3 && (
                              <p>Inscrições da categoria: {categoria.inscricoesEncerradas ? 'Encerradas' : 'Abertas'}</p>
                            )}
                          </div>

                          {gestorCompeticao && competicao.tipo !== 3 && (
                            <div className="acoes-item">
                              <button
                                type="button"
                                className="botao-terciario"
                                onClick={() => alternarInscricoesCategoria(competicao.id, categoria.id)}
                              >
                                {categoriaInscricoesAbertaId === categoria.id ? 'Ocultar duplas inscritas' : 'Ver duplas inscritas'}
                              </button>
                            </div>
                          )}

                          {(gestorCompeticao || (usuarioAtleta && competicao.tipo !== 3 && competicao.inscricoesAbertas)) && (
                            <div className="acoes-item">
                              {usuarioAtleta && competicao.tipo !== 3 && competicao.inscricoesAbertas && (
                                <button
                                  type="button"
                                  className="botao-primario"
                                  onClick={() => abrirInscricao(competicao, categoria)}
                                >
                                  Inscrever-se
                                </button>
                              )}

                              {podeSortearJogosCompeticao(competicao) &&
                                quantidadeInscritas >= 4 && (
                                  <button
                                    type="button"
                                    className="botao-primario"
                                    onClick={() => sortearJogosCategoria(competicao, categoria)}
                                    disabled={sorteandoCategoriaId === categoria.id || !inscricoesFechadas}
                                    title={!inscricoesFechadas ? 'Feche as inscrições da competição ou encerre a categoria antes de gerar o chaveamento.' : undefined}
                                  >
                                    {sorteandoCategoriaId === categoria.id
                                      ? 'Gerando...'
                                      : ehChaveDuplaEliminacao
                                        ? 'Gerar chaveamento'
                                        : 'Sortear jogos'}
                                  </button>
                                )}

                              {gestorCompeticao && (
                                <>
                                  <button
                                    type="button"
                                    className="botao-terciario"
                                    onClick={() => navegar(`/partidas/campeonato?competicaoId=${competicao.id}&categoriaId=${categoria.id}&aba=chaveamento`)}
                                  >
                                    {ehChaveDuplaEliminacao ? 'Chaveamento' : 'Ver tabela de jogos'}
                                  </button>
                                  <button
                                    type="button"
                                    className="botao-secundario botao-editar"
                                    onClick={() => navegar(`/categorias?competicaoId=${categoria.competicaoId}&categoriaId=${categoria.id}`)}
                                  >
                                    Editar
                                  </button>
                                  <button type="button" className="botao-perigo" onClick={() => removerCategoria(categoria.id)}>
                                    Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {competicao.tipo !== 3 && categoriaInscricoesAbertaId === categoria.id && (
                            <div className="campo-largo">
                              <h4>Duplas inscritas</h4>

                              {carregandoInscricoesCategoria ? (
                                <p>Carregando duplas inscritas...</p>
                              ) : inscricoesCategoria.length === 0 ? (
                                <p></p>
                              ) : (
                                <div className="lista-cartoes">
                                  {inscricoesCategoria.map((inscricao) => (
                                    <article key={inscricao.id} className="cartao-lista">
                                      <div>
                                        <h4>{inscricao.nomeDupla}</h4>
                                        <p>Atletas: {inscricao.nomeAtleta1} e {inscricao.nomeAtleta2}</p>
                                        <p>Pagamento: {inscricao.pago ? 'Pago' : 'Pendente'}</p>
                                        {inscricao.observacao && <p>Observação: {inscricao.observacao}</p>}
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                        );
                      })}
                      {categoriasCompeticao.length === 0 && (
                        <p>
                          {filtros.categoria
                            ? 'Nenhuma categoria corresponde ao filtro informado.'
                            : 'Nenhuma categoria cadastrada para esta competição.'}
                        </p>
                      )}
                    </div>
                    )}
                  </div>
                )}

                {grupoAberto && (
                  <div className="campo-largo">
                    <h3>Atletas do grupo</h3>
                    <p>
                      Os jogos deste grupo só podem ser registrados com atletas listados aqui. Você pode lançar nomes mesmo que a pessoa ainda não tenha usuário no sistema.
                    </p>

                    {gerenciavel && (
                      <form className="formulario-grid" onSubmit={(evento) => aoSubmeterGrupoAtleta(evento, competicao.id)}>
                        <label>
                          Nome completo do atleta
                          <input
                            type="text"
                            value={formularioGrupoAtleta.nomeAtleta}
                            onChange={(evento) => atualizarCampoGrupoAtleta('nomeAtleta', evento.target.value)}
                            required
                          />
                        </label>

                        <label>
                          Apelido ou complemento
                          <input
                            type="text"
                            value={formularioGrupoAtleta.apelidoAtleta}
                            onChange={(evento) => atualizarCampoGrupoAtleta('apelidoAtleta', evento.target.value)}
                          />
                        </label>

                        <div className="acoes-formulario">
                          <button type="submit" className="botao-primario" disabled={salvandoGrupoAtleta}>
                            {salvandoGrupoAtleta ? 'Salvando...' : 'Adicionar atleta ao grupo'}
                          </button>
                        </div>
                      </form>
                    )}

                    {usuarioAtleta && !gerenciavel && !usuarioJaNoGrupo && (
                      <div className="formulario-grid">
                        <p className="campo-largo">
                          Seu nome já foi lançado neste grupo? Selecione abaixo para vincular este usuário ao nome existente.
                        </p>

                        <label>
                          Meu nome no grupo
                          <select
                            value={grupoAtletaSelecionadoId}
                            onChange={(evento) => setGrupoAtletaSelecionadoId(evento.target.value)}
                          >
                            <option value="">Selecione</option>
                            {nomesDisponiveisParaAssumir.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.nomeAtleta}{item.apelidoAtleta ? ` (${item.apelidoAtleta})` : ''}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="acoes-formulario">
                          <button
                            type="button"
                            className="botao-primario"
                            onClick={() => assumirMeuNomeNoGrupo(competicao.id)}
                            disabled={assumindoNomeGrupo || nomesDisponiveisParaAssumir.length === 0}
                          >
                            {assumindoNomeGrupo ? 'Vinculando...' : 'Este nome sou eu'}
                          </button>
                        </div>
                      </div>
                    )}

                    {usuarioAtleta && !gerenciavel && usuarioJaNoGrupo && (
                      <p className="texto-sucesso">Seu atleta já está vinculado a este grupo.</p>
                    )}

                    <div className="lista-cartoes">
                      {grupoAtletas.map((item) => {
                        const atletaEhUsuarioAtual = Boolean(usuario?.atletaId && item.atletaId === usuario.atletaId);

                        return (
                          <article key={item.id} className="cartao-lista">
                            <div>
                              <h3>{item.nomeAtleta}</h3>
                              <p>Apelido/complemento: {item.apelidoAtleta || '-'}</p>
                              <p>Cadastro no sistema: {item.cadastroPendente ? 'Pendente' : 'Completo'}</p>
                              <p>Usuário vinculado: {item.vinculadoAUsuario ? 'Sim' : 'Não'}</p>
                            </div>

                            {gerenciavel && (
                              <div className="acoes-item">
                                {atletaEhUsuarioAtual ? (
                                  <span className="texto-aviso">Você não pode remover seu próprio atleta do grupo.</span>
                                ) : (
                                  <button
                                    type="button"
                                    className="botao-perigo"
                                    onClick={() => removerGrupoAtleta(competicao.id, item.id)}
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}                     
                    </div>
                  </div>
                )}
              </article>
              );
            })}
            {competicoesFiltradas.length === 0 && (
              <p>
                {filtroAtivo
                  ? 'Nenhuma competição corresponde aos filtros informados.'
                  : 'Nenhuma competição encontrada.'}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
