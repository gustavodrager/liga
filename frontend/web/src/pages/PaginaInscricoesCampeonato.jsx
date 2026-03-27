import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { atletasServico } from '../services/atletasServico';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { duplasServico } from '../services/duplasServico';
import { inscricoesCampeonatoServico } from '../services/inscricoesCampeonatoServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { PERFIS_USUARIO } from '../utils/perfis';

const estadoInicialFormulario = {
  categoriaId: '',
  duplaId: '',
  atleta1Id: '',
  atleta2Id: '',
  nomeAtleta1: '',
  apelidoAtleta1: '',
  nomeAtleta2: '',
  apelidoAtleta2: '',
  observacao: ''
};

const OBSERVACAO_PARCEIRO_PENDENTE = 'Parceiro com cadastro pendente.';

function obterNomeStatus(status) {
  return status === 1 ? 'Ativa' : 'Cancelada';
}

function normalizarNome(valor) {
  return (valor || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

function buscarSugestoesAtleta(atletas, termo, atletaSelecionadoId) {
  if (!termo.trim() || atletaSelecionadoId) {
    return [];
  }

  const termos = normalizarNome(termo).split(' ').filter(Boolean);
  if (termos.length === 0) {
    return [];
  }

  return atletas
    .filter((atleta) => {
      const nome = normalizarNome(atleta.nome);
      const apelido = normalizarNome(atleta.apelido || '');
      return termos.every((parte) => nome.includes(parte) || apelido.includes(parte));
    })
    .slice(0, 6);
}

function inscricaoTemParceiroPendente(inscricao) {
  return (inscricao?.observacao || '').includes(OBSERVACAO_PARCEIRO_PENDENTE);
}

function limparObservacaoParceiroPendente(observacao) {
  const texto = (observacao || '').trim();
  if (!texto) {
    return '';
  }

  return texto
    .split('|')
    .map((parte) => parte.trim())
    .filter((parte) => parte && parte !== OBSERVACAO_PARCEIRO_PENDENTE)
    .join(' | ');
}

function compararPorNome(a, b) {
  return (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR');
}

function compararInscricoesMaisRecentesPrimeiro(a, b) {
  const dataA = a?.dataInscricaoUtc ? new Date(a.dataInscricaoUtc).getTime() : 0;
  const dataB = b?.dataInscricaoUtc ? new Date(b.dataInscricaoUtc).getTime() : 0;

  if (dataA !== dataB) {
    return dataB - dataA;
  }

  return (b?.id || '').localeCompare(a?.id || '', 'pt-BR');
}

function montarOpcoesOrganizador(inscricoes) {
  const mapaDuplas = new Map();
  const mapaAtletas = new Map();

  inscricoes.forEach((inscricao) => {
    if (!mapaDuplas.has(inscricao.duplaId)) {
      mapaDuplas.set(inscricao.duplaId, {
        id: inscricao.duplaId,
        nome: inscricao.nomeDupla,
        atleta1Id: inscricao.atleta1Id,
        nomeAtleta1: inscricao.nomeAtleta1,
        atleta2Id: inscricao.atleta2Id,
        nomeAtleta2: inscricao.nomeAtleta2
      });
    }

    if (!mapaAtletas.has(inscricao.atleta1Id)) {
      mapaAtletas.set(inscricao.atleta1Id, {
        id: inscricao.atleta1Id,
        nome: inscricao.nomeAtleta1,
        apelido: '',
        cadastroPendente: false
      });
    }

    if (!mapaAtletas.has(inscricao.atleta2Id)) {
      mapaAtletas.set(inscricao.atleta2Id, {
        id: inscricao.atleta2Id,
        nome: inscricao.nomeAtleta2,
        apelido: '',
        cadastroPendente: false
      });
    }
  });

  return {
    duplas: Array.from(mapaDuplas.values()).sort(compararPorNome),
    atletas: Array.from(mapaAtletas.values()).sort(compararPorNome)
  };
}

export function PaginaInscricoesCampeonato() {
  const { usuario, recarregarUsuario } = useAutenticacao();
  const atletaLogado = Number(usuario?.perfil) === PERFIS_USUARIO.atleta;
  const organizadorLogado = Number(usuario?.perfil) === PERFIS_USUARIO.organizador;
  const gestorCompeticao = !atletaLogado;
  const meuAtletaId = usuario?.atletaId || '';
  const meuAtletaNome = usuario?.atleta?.nome || '';
  const meuAtletaApelido = usuario?.atleta?.apelido || '';
  const [campeonatos, setCampeonatos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [atletas, setAtletas] = useState([]);
  const [resultadosBuscaParceiro, setResultadosBuscaParceiro] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState('');
  const [categoriaFiltroId, setCategoriaFiltroId] = useState('');
  const [formulario, setFormulario] = useState(estadoInicialFormulario);
  const [inscricaoEmEdicao, setInscricaoEmEdicao] = useState(null);
  const [exibindoFormulario, setExibindoFormulario] = useState(false);
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [carregandoInscricoes, setCarregandoInscricoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscandoParceiro, setBuscandoParceiro] = useState(false);
  const [abrindoFormulario, setAbrindoFormulario] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    carregarBase();
  }, [atletaLogado, organizadorLogado, meuAtletaId, usuario?.id]);

  useEffect(() => {
    if (!campeonatoId) {
      setCategorias([]);
      setInscricoes([]);
      if (organizadorLogado) {
        setDuplas([]);
        setAtletas([]);
      }
      return;
    }

    carregarCategorias(campeonatoId);
  }, [campeonatoId, organizadorLogado]);

  useEffect(() => {
    if (!organizadorLogado) {
      return;
    }

    if (!campeonatoId) {
      setDuplas([]);
      setAtletas([]);
      return;
    }

    carregarOpcoesOrganizador(campeonatoId);
  }, [campeonatoId, organizadorLogado]);

  useEffect(() => {
    if (!campeonatoId) {
      setInscricoes([]);
      return;
    }

    if (atletaLogado && !meuAtletaId) {
      setInscricoes([]);
      return;
    }

    carregarInscricoes(campeonatoId, categoriaFiltroId);
  }, [campeonatoId, categoriaFiltroId, atletaLogado, meuAtletaId]);

  useEffect(() => {
    if (!atletaLogado || !formulario.nomeAtleta2.trim() || formulario.atleta2Id) {
      setResultadosBuscaParceiro([]);
      return;
    }

    const termo = formulario.nomeAtleta2.trim();
    const timeout = setTimeout(async () => {
      setBuscandoParceiro(true);

      try {
        const resultados = await atletasServico.buscar(termo);
        setResultadosBuscaParceiro(resultados.filter((atleta) => atleta.id !== meuAtletaId));
      } catch {
        setResultadosBuscaParceiro([]);
      } finally {
        setBuscandoParceiro(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [atletaLogado, formulario.nomeAtleta2, formulario.atleta2Id, meuAtletaId]);

  const campeonatoSelecionado = useMemo(
    () => campeonatos.find((campeonato) => campeonato.id === campeonatoId) || null,
    [campeonatos, campeonatoId]
  );

  const podeCriarInscricao = Boolean(campeonatoSelecionado?.inscricoesAbertas) && categorias.length > 0;

  const duplaSelecionada = useMemo(
    () => duplas.find((dupla) => dupla.id === formulario.duplaId) || null,
    [duplas, formulario.duplaId]
  );

  const atletaSelecionado1 = useMemo(
    () => atletas.find((atleta) => atleta.id === formulario.atleta1Id) || null,
    [atletas, formulario.atleta1Id]
  );

  const atletaSelecionado2 = useMemo(
    () => {
      if (!formulario.atleta2Id) {
        return null;
      }

      if (atletaLogado) {
        return resultadosBuscaParceiro.find((atleta) => atleta.id === formulario.atleta2Id) || {
          id: formulario.atleta2Id,
          nome: formulario.nomeAtleta2,
          apelido: formulario.apelidoAtleta2,
          cadastroPendente: false
        };
      }

      return atletas.find((atleta) => atleta.id === formulario.atleta2Id) || null;
    },
    [atletaLogado, atletas, resultadosBuscaParceiro, formulario.atleta2Id, formulario.nomeAtleta2, formulario.apelidoAtleta2]
  );

  const atletaExistenteJogador1 = useMemo(() => {
    if (atletaLogado) {
      return null;
    }

    const nome = normalizarNome(formulario.nomeAtleta1 || '');
    if (!nome) {
      return null;
    }

    return atletas.find((atleta) => normalizarNome(atleta.nome || '') === nome) || null;
  }, [atletas, formulario.nomeAtleta1]);

  const atletaExistenteJogador2 = useMemo(() => {
    if (atletaLogado) {
      return null;
    }

    const nome = normalizarNome(formulario.nomeAtleta2 || '');
    if (!nome) {
      return null;
    }

    return atletas.find((atleta) => normalizarNome(atleta.nome || '') === nome) || null;
  }, [atletas, formulario.nomeAtleta2]);

  const sugestoesJogador1 = useMemo(
    () => atletaLogado ? [] : buscarSugestoesAtleta(atletas, formulario.nomeAtleta1 || '', formulario.atleta1Id),
    [atletaLogado, atletas, formulario.nomeAtleta1, formulario.atleta1Id]
  );

  const sugestoesJogador2 = useMemo(
    () => atletaLogado
      ? resultadosBuscaParceiro
      : buscarSugestoesAtleta(atletas, formulario.nomeAtleta2 || '', formulario.atleta2Id),
    [atletaLogado, resultadosBuscaParceiro, atletas, formulario.nomeAtleta2, formulario.atleta2Id]
  );

  const inscricoesOrdenadas = useMemo(
    () => [...inscricoes].sort(compararInscricoesMaisRecentesPrimeiro),
    [inscricoes]
  );

  function criarFormularioAtleta({
    categoriaId,
    atletaId,
    atletaNome,
    atletaApelido,
    parceiroId = '',
    parceiroNome = '',
    parceiroApelido = '',
    observacao = ''
  }) {
    return {
      ...estadoInicialFormulario,
      categoriaId: categoriaId || '',
      atleta1Id: atletaId || '',
      nomeAtleta1: atletaNome || '',
      apelidoAtleta1: atletaApelido || '',
      atleta2Id: parceiroId || '',
      nomeAtleta2: parceiroNome || '',
      apelidoAtleta2: parceiroApelido || '',
      observacao: observacao || ''
    };
  }

  async function carregarBase() {
    setCarregandoBase(true);
    setErro('');

    try {
      if (atletaLogado) {
        let usuarioAtual = usuario;

        try {
          usuarioAtual = await recarregarUsuario();
        } catch {
          usuarioAtual = usuario;
        }

        const listaCompeticoes = await competicoesServico.listar();
        const listaCampeonatos = listaCompeticoes.filter((competicao) => competicao.tipo !== 3 && competicao.inscricoesAbertas);

        setCampeonatos(listaCampeonatos);
        setDuplas([]);
        setAtletas([]);

        const campeonatoUrl = params.get('campeonatoId');
        const campeonatoPadrao = campeonatoUrl && listaCampeonatos.some((item) => item.id === campeonatoUrl)
          ? campeonatoUrl
          : listaCampeonatos[0]?.id || '';

        setCampeonatoId(campeonatoPadrao);
        setCategoriaFiltroId('');
        atualizarParametros(campeonatoPadrao, params.get('categoriaId') || '');
        return;
      }

      const listaCompeticoes = await competicoesServico.listar();
      let listaDuplas = [];
      let listaAtletas = [];

      if (!organizadorLogado) {
        [listaDuplas, listaAtletas] = await Promise.all([
          duplasServico.listar(),
          atletasServico.listar()
        ]);
      }

      const listaCampeonatos = listaCompeticoes.filter(
        (competicao) => competicao.tipo !== 3 && (!organizadorLogado || competicao.usuarioOrganizadorId === usuario?.id)
      );
      setCampeonatos(listaCampeonatos);
      setDuplas(listaDuplas);
      setAtletas(listaAtletas);

      const campeonatoUrl = params.get('campeonatoId');
      const campeonatoPadrao = campeonatoUrl && listaCampeonatos.some((item) => item.id === campeonatoUrl)
        ? campeonatoUrl
        : listaCampeonatos[0]?.id || '';

      setCampeonatoId(campeonatoPadrao);
      setCategoriaFiltroId('');

      atualizarParametros(campeonatoPadrao, params.get('categoriaId') || '');
    } catch (error) {
      setErro('Não foi possível carregar as inscrições.');
      setMensagem('');
    } finally {
      setCarregandoBase(false);
    }
  }

  async function carregarCategorias(idCampeonato) {
    try {
      const lista = await categoriasServico.listarPorCompeticao(idCampeonato);
      setCategorias(lista);

      setCategoriaFiltroId((anterior) => {
        const categoriaValida = lista.some((categoria) => categoria.id === anterior);
        const categoriaUrl = params.get('categoriaId');

        if (categoriaValida) {
          return anterior;
        }

        if (categoriaUrl && lista.some((categoria) => categoria.id === categoriaUrl)) {
          return categoriaUrl;
        }

        return '';
      });

      setFormulario((anterior) => {
        const categoriaValida = lista.some((categoria) => categoria.id === anterior.categoriaId);
        return {
          ...anterior,
          categoriaId: categoriaValida ? anterior.categoriaId : lista[0]?.id || ''
        };
      });
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setMensagem('');
    }
  }

  async function carregarOpcoesOrganizador(idCampeonato) {
    try {
      const lista = await inscricoesCampeonatoServico.listarPorCampeonato(idCampeonato);
      const opcoes = montarOpcoesOrganizador(lista);
      setDuplas(opcoes.duplas);
      setAtletas(opcoes.atletas);
    } catch {
      setDuplas([]);
      setAtletas([]);
    }
  }

  async function carregarInscricoes(idCampeonato, idCategoria) {
    setCarregandoInscricoes(true);

    try {
      const lista = await inscricoesCampeonatoServico.listarPorCampeonato(idCampeonato, idCategoria || undefined);
      setInscricoes(lista);
    } catch (error) {
      setErro('Não foi possível carregar as inscrições.');
      setMensagem('');
      setInscricoes([]);
    } finally {
      setCarregandoInscricoes(false);
    }
  }

  function atualizarParametros(novoCampeonatoId, novaCategoriaId) {
    const proximosParams = {};

    if (novoCampeonatoId) {
      proximosParams.campeonatoId = novoCampeonatoId;
    }

    if (novaCategoriaId) {
      proximosParams.categoriaId = novaCategoriaId;
    }

    setParams(proximosParams);
  }

  function selecionarCampeonato(valor) {
    setCampeonatoId(valor);
    setCategoriaFiltroId('');
    setInscricaoEmEdicao(null);
    setExibindoFormulario(false);
    setMensagem('');
    setErro('');
    setFormulario(estadoInicialFormulario);
    atualizarParametros(valor, '');
  }

  function selecionarCategoriaFiltro(valor) {
    setCategoriaFiltroId(valor);
    setMensagem('');
    atualizarParametros(campeonatoId, valor);
  }

  async function abrirFormulario() {
    setAbrindoFormulario(true);

    let usuarioAtual = usuario;
    if (atletaLogado) {
      try {
        usuarioAtual = await recarregarUsuario();
      } catch {
        usuarioAtual = usuario;
      }
    }

    const atletaAtualId = usuarioAtual?.atletaId || '';
    const atletaAtualNome = usuarioAtual?.atleta?.nome || '';
    const atletaAtualApelido = usuarioAtual?.atleta?.apelido || '';

    if (!campeonatoSelecionado) {
      setErro('Selecione uma competição.');
      setMensagem('');
      setAbrindoFormulario(false);
      return;
    }

    if (atletaLogado && !atletaAtualId) {
      setErro('Crie ou complete o seu atleta no Meu Perfil antes de se inscrever.');
      setMensagem('');
      setAbrindoFormulario(false);
      return;
    }

    if (!campeonatoSelecionado.inscricoesAbertas) {
      setErro('Esta competição não está aceitando inscrições no momento. Abra as inscrições na página de competições.');
      setMensagem('');
      setAbrindoFormulario(false);
      return;
    }

    if (categorias.length === 0) {
      setErro('Cadastre ao menos uma categoria nesta competição antes de criar inscrições.');
      setMensagem('');
      setAbrindoFormulario(false);
      return;
    }

    setErro('');
    setMensagem('');
    setInscricaoEmEdicao(null);
    setExibindoFormulario(true);
    setFormulario(
      atletaLogado
        ? criarFormularioAtleta({
            categoriaId: categoriaFiltroId || categorias[0]?.id || '',
            atletaId: atletaAtualId,
            atletaNome: atletaAtualNome,
            atletaApelido: atletaAtualApelido
          })
        : {
            ...estadoInicialFormulario,
            categoriaId: categoriaFiltroId || categorias[0]?.id || ''
          }
    );
    setAbrindoFormulario(false);
  }

  async function abrirEdicaoInscricao(inscricao) {
    setAbrindoFormulario(true);
    setErro('');
    setMensagem('');

    if (!atletaLogado) {
      setCategoriaFiltroId(inscricao.categoriaId);
      atualizarParametros(campeonatoId, inscricao.categoriaId);
      setInscricaoEmEdicao(inscricao);
      setExibindoFormulario(true);
      setFormulario({
        ...estadoInicialFormulario,
        categoriaId: inscricao.categoriaId,
        duplaId: inscricao.duplaId || '',
        atleta1Id: inscricao.atleta1Id || '',
        atleta2Id: inscricao.atleta2Id || '',
        nomeAtleta1: inscricao.nomeAtleta1 || '',
        nomeAtleta2: inscricao.nomeAtleta2 || '',
        observacao: inscricao.observacao || ''
      });
      setResultadosBuscaParceiro([]);
      setAbrindoFormulario(false);
      return;
    }

    let usuarioAtual = usuario;
    if (atletaLogado) {
      try {
        usuarioAtual = await recarregarUsuario();
      } catch {
        usuarioAtual = usuario;
      }
    }

    const atletaAtualId = usuarioAtual?.atletaId || '';
    const atletaAtualNome = usuarioAtual?.atleta?.nome || meuAtletaNome;
    const atletaAtualApelido = usuarioAtual?.atleta?.apelido || '';

    if (!atletaAtualId) {
      setErro('Crie ou complete o seu atleta no Meu Perfil antes de editar a inscrição.');
      setAbrindoFormulario(false);
      return;
    }

    const parceiroPendente = inscricaoTemParceiroPendente(inscricao);
    const parceiroEhAtleta1 = inscricao.atleta1Id !== atletaAtualId;
    const parceiroId = parceiroPendente ? '' : parceiroEhAtleta1 ? inscricao.atleta1Id : inscricao.atleta2Id;
    const parceiroNome = parceiroPendente ? '' : parceiroEhAtleta1 ? inscricao.nomeAtleta1 : inscricao.nomeAtleta2;

    setCategoriaFiltroId(inscricao.categoriaId);
    atualizarParametros(campeonatoId, inscricao.categoriaId);
    setInscricaoEmEdicao(inscricao);
    setExibindoFormulario(true);
    setFormulario(
      criarFormularioAtleta({
        categoriaId: inscricao.categoriaId,
        atletaId: atletaAtualId,
        atletaNome: atletaAtualNome,
        atletaApelido: atletaAtualApelido,
        parceiroId,
        parceiroNome,
        observacao: limparObservacaoParceiroPendente(inscricao.observacao)
      })
    );
    setResultadosBuscaParceiro([]);
    setAbrindoFormulario(false);
  }

  function cancelarFormulario() {
    setExibindoFormulario(false);
    setInscricaoEmEdicao(null);
    setFormulario(estadoInicialFormulario);
    setResultadosBuscaParceiro([]);
  }

  async function removerInscricao(inscricao) {
    if (!window.confirm('Deseja excluir esta inscrição?')) {
      return;
    }

    setErro('');
    setMensagem('');

    try {
      await inscricoesCampeonatoServico.remover(campeonatoId, inscricao.id);
      setMensagem('Inscrição excluída com sucesso.');

      if (inscricaoEmEdicao?.id === inscricao.id) {
        cancelarFormulario();
      }

      if (organizadorLogado) {
        await carregarOpcoesOrganizador(campeonatoId);
      } else if (!atletaLogado) {
        const [listaDuplas, listaAtletas] = await Promise.all([duplasServico.listar(), atletasServico.listar()]);
        setDuplas(listaDuplas);
        setAtletas(listaAtletas);
      }

      await carregarInscricoes(campeonatoId, categoriaFiltroId);
    } catch (error) {
      setErro(extrairMensagemErro(error) || 'Não foi possível excluir a inscrição.');
    }
  }

  async function removerDuplaInscrita(inscricao) {
    if (!window.confirm('Deseja excluir a dupla desta inscrição? A inscrição atual será removida antes da exclusão da dupla.')) {
      return;
    }

    setErro('');
    setMensagem('');

    try {
      await inscricoesCampeonatoServico.remover(campeonatoId, inscricao.id);

      try {
        await duplasServico.remover(inscricao.duplaId);
        setMensagem('Inscrição e dupla excluídas com sucesso.');
      } catch (errorDupla) {
        setMensagem('A inscrição foi excluída, mas a dupla não pôde ser removida porque ainda está vinculada a outras inscrições ou partidas.');
        setErro(extrairMensagemErro(errorDupla));
      }

      if (inscricaoEmEdicao?.id === inscricao.id) {
        cancelarFormulario();
      }

      if (organizadorLogado) {
        await carregarOpcoesOrganizador(campeonatoId);
      } else if (!atletaLogado) {
        const [listaDuplas, listaAtletas] = await Promise.all([duplasServico.listar(), atletasServico.listar()]);
        setDuplas(listaDuplas);
        setAtletas(listaAtletas);
      }

      await carregarInscricoes(campeonatoId, categoriaFiltroId);
    } catch (error) {
      setErro(extrairMensagemErro(error) || 'Não foi possível excluir a dupla inscrita.');
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function atualizarJogador(indice, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      [`atleta${indice}Id`]: '',
      [`nomeAtleta${indice}`]: valor,
      [`apelidoAtleta${indice}`]: ''
    }));
  }

  function selecionarAtleta(indice, atleta) {
    setFormulario((anterior) => ({
      ...anterior,
      [`atleta${indice}Id`]: atleta.id,
      [`nomeAtleta${indice}`]: atleta.nome,
      [`apelidoAtleta${indice}`]: atleta.apelido || ''
    }));
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setMensagem('');

    if (!campeonatoId) {
      setErro('Selecione uma competição.');
      return;
    }

    if (!formulario.categoriaId) {
      setErro('Selecione uma categoria.');
      return;
    }

    setSalvando(true);

    try {
      const estaEditando = Boolean(inscricaoEmEdicao);
      let dados;

      if (duplaSelecionada) {
        dados = {
          categoriaId: formulario.categoriaId,
          duplaId: duplaSelecionada.id,
          atleta1Id: null,
          atleta2Id: null,
          nomeAtleta1: null,
          apelidoAtleta1: null,
          nomeAtleta2: null,
          apelidoAtleta2: null,
          observacao: formulario.observacao || null
        };
      } else if (atletaLogado) {
        dados = {
          categoriaId: formulario.categoriaId,
          duplaId: null,
          atleta1Id: formulario.atleta1Id || null,
          atleta2Id: formulario.atleta2Id || null,
          nomeAtleta1: formulario.nomeAtleta1.trim() || null,
          apelidoAtleta1: formulario.apelidoAtleta1.trim() || null,
          nomeAtleta2: formulario.nomeAtleta2.trim() || null,
          apelidoAtleta2: formulario.apelidoAtleta2.trim() || null,
          observacao: formulario.observacao || null,
          pago: false,
          atleta1CadastroPendente: false,
          atleta2CadastroPendente: !formulario.atleta2Id && !formulario.nomeAtleta2.trim()
        };
      } else {
        if (!formulario.nomeAtleta1.trim() || !formulario.nomeAtleta2.trim()) {
          setErro('Selecione uma dupla cadastrada ou informe o nome completo dos dois jogadores.');
          setSalvando(false);
          return;
        }

        dados = {
          categoriaId: formulario.categoriaId,
          duplaId: null,
          atleta1Id: formulario.atleta1Id || null,
          atleta2Id: formulario.atleta2Id || null,
          nomeAtleta1: formulario.nomeAtleta1.trim(),
          apelidoAtleta1: formulario.apelidoAtleta1.trim() || null,
          nomeAtleta2: formulario.nomeAtleta2.trim(),
          apelidoAtleta2: formulario.apelidoAtleta2.trim() || null,
          observacao: formulario.observacao || null
        };
      }

      if (estaEditando) {
        await inscricoesCampeonatoServico.atualizar(campeonatoId, inscricaoEmEdicao.id, dados);
      } else {
        await inscricoesCampeonatoServico.criar(campeonatoId, dados);
      }

      const usouCadastroInline = !duplaSelecionada;
      setMensagem(
        estaEditando
          ? atletaLogado && !duplaSelecionada && !formulario.atleta2Id && !formulario.nomeAtleta2.trim()
            ? 'Inscrição atualizada com sucesso. A dupla continua com parceiro pendente.'
            : 'Inscrição atualizada com sucesso.'
          : atletaLogado && !duplaSelecionada && !formulario.atleta2Id && !formulario.nomeAtleta2.trim()
          ? 'Inscrição realizada com sucesso. Um parceiro pendente foi criado para completar sua dupla depois.'
          : usouCadastroInline
          ? 'Inscrição realizada com sucesso. Se algum atleta for novo, complete depois o cadastro dele na página de atletas.'
          : 'Inscrição realizada com sucesso.'
      );
      setCategoriaFiltroId(formulario.categoriaId);
      atualizarParametros(campeonatoId, formulario.categoriaId);
      setInscricaoEmEdicao(null);
      setResultadosBuscaParceiro([]);

      if (estaEditando) {
        setExibindoFormulario(false);
        setFormulario(estadoInicialFormulario);
      } else {
        setFormulario(
          atletaLogado
            ? criarFormularioAtleta({
                categoriaId: formulario.categoriaId,
                atletaId: formulario.atleta1Id,
                atletaNome: formulario.nomeAtleta1,
                atletaApelido: formulario.apelidoAtleta1
              })
            : {
                ...estadoInicialFormulario,
                categoriaId: formulario.categoriaId
              }
        );
      }

      if (atletaLogado) {
        setDuplas([]);
      } else if (organizadorLogado) {
        await carregarOpcoesOrganizador(campeonatoId);
      } else {
        const [listaDuplas, listaAtletas] = await Promise.all([duplasServico.listar(), atletasServico.listar()]);
        setDuplas(listaDuplas);
        setAtletas(listaAtletas);
      }
      await carregarInscricoes(campeonatoId, formulario.categoriaId);
    } catch (error) {
      setErro(extrairMensagemErro(error) || 'Não foi possível realizar a inscrição.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregandoBase) {
    return (
      <section className="pagina">
        <div className="cabecalho-pagina">
          <h2>Inscrições</h2>
          <p>Carregando competições, categorias e duplas...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Inscrições</h2>
        {atletaLogado ? (
          <>
            <p>Selecione a competição, escolha a categoria e faça sua inscrição informando o parceiro da dupla.</p>
            <p>Se você ainda não tiver parceiro, pode se inscrever mesmo assim e completar a dupla depois.</p>
          </>
        ) : (
          <>
            <p>Inscreva uma dupla já cadastrada em uma categoria da competição e acompanhe a lista em tempo real.</p>
            <p>
              {organizadorLogado
                ? 'Para competições criadas por você, a tela só sugere duplas e atletas já inscritos nessa competição. Se precisar de novos nomes, informe manualmente os jogadores.'
                : 'Se a dupla ainda não existir, informe os nomes completos dos jogadores que o sistema cria os cadastros necessários.'}
            </p>
          </>
        )}
      </div>

      <div className="formulario-grid">
        <label>
          Competição
          <select value={campeonatoId} onChange={(evento) => selecionarCampeonato(evento.target.value)} required>
            <option value="">Selecione</option>
            {campeonatos.map((campeonato) => (
              <option key={campeonato.id} value={campeonato.id}>
                {campeonato.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Filtrar por categoria
          <select
            value={categoriaFiltroId}
            onChange={(evento) => selecionarCategoriaFiltro(evento.target.value)}
            disabled={!campeonatoId}
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="acoes-formulario">
          <button
            type="button"
            className="botao-primario"
            onClick={abrirFormulario}
            disabled={!campeonatoSelecionado || abrindoFormulario}
          >
            {abrindoFormulario ? 'Abrindo...' : atletaLogado ? 'Quero me inscrever' : 'Nova inscrição'}
          </button>
        </div>
      </div>

      {!campeonatoSelecionado && <p className="texto-aviso">Nenhuma competição disponível.</p>}
      {atletaLogado && !meuAtletaId && (
        <p className="texto-aviso">Você precisa ter um atleta criado no Meu Perfil para se inscrever.</p>
      )}
      {campeonatoSelecionado && !campeonatoSelecionado.inscricoesAbertas && (
        <p className="texto-aviso">Esta competição não está aceitando inscrições no momento.</p>
      )}
      {campeonatoSelecionado && campeonatoSelecionado.inscricoesAbertas && categorias.length === 0 && (
        <p className="texto-aviso">Cadastre ao menos uma categoria na competição para liberar novas inscrições.</p>
      )}
      {campeonatoSelecionado && podeCriarInscricao && (
        <p className="texto-sucesso">A competição está pronta para receber novas inscrições.</p>
      )}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}
      {erro && <p className="texto-erro">{erro}</p>}

      {exibindoFormulario && (
        <form className="formulario-grid" onSubmit={aoSubmeter}>
          {inscricaoEmEdicao && (
            <p className="campo-largo texto-aviso">
              Você está editando sua inscrição em {inscricaoEmEdicao.nomeCategoria}. Informe o parceiro agora ou deixe em branco para manter a dupla pendente.
            </p>
          )}

          <label>
            Categoria
            <select
              value={formulario.categoriaId}
              onChange={(evento) => atualizarCampo('categoriaId', evento.target.value)}
              disabled={Boolean(inscricaoEmEdicao)}
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

          {atletaLogado ? (
            <>
              <label>
                Meu atleta
                <input type="text" value={meuAtletaNome} readOnly disabled />
              </label>

              <label>
                Parceiro da dupla
                <input
                  type="text"
                  value={formulario.nomeAtleta2}
                  onChange={(evento) => atualizarJogador(2, evento.target.value)}
                  placeholder="Digite o nome completo do parceiro ou deixe em branco"
                />
              </label>

              {buscandoParceiro && (
                <p className="campo-largo">Buscando atletas...</p>
              )}

              {sugestoesJogador2.length > 0 && (
                <div className="campo-largo lista-sugestoes">
                  {sugestoesJogador2.map((atleta) => (
                    <button
                      key={atleta.id}
                      type="button"
                      className="item-sugestao"
                      onClick={() => selecionarAtleta(2, atleta)}
                    >
                      {atleta.nome}
                      {atleta.apelido ? ` (${atleta.apelido})` : ''}
                      {atleta.cadastroPendente ? ' [pendente]' : ''}
                    </button>
                  ))}
                </div>
              )}

              {atletaSelecionado2 && (
                <p className="texto-sucesso campo-largo">
                  Parceiro selecionado: {atletaSelecionado2.nome}{atletaSelecionado2.cadastroPendente ? ' [pendente]' : ''}
                </p>
              )}

              <div className="campo-largo caixa-ajuda">
                <p>Enquanto você digita, o sistema sugere atletas já cadastrados. Se não encontrar, pode seguir com o nome completo digitado ou deixar em branco para completar a dupla depois.</p>
              </div>

              {atletaExistenteJogador2 && (
                <label>
                  Apelido do parceiro
                  <input
                    type="text"
                    value={formulario.apelidoAtleta2}
                    onChange={(evento) => atualizarCampo('apelidoAtleta2', evento.target.value)}
                    placeholder="Use só se for outra pessoa com o mesmo nome"
                  />
                </label>
              )}
            </>
          ) : (
            <>
          <label>
            Dupla
            <select
              value={formulario.duplaId}
              onChange={(evento) => atualizarCampo('duplaId', evento.target.value)}
            >
              <option value="">Vou informar os jogadores</option>
              {duplas.map((dupla) => (
                <option key={dupla.id} value={dupla.id}>
                  {dupla.nome} ({dupla.nomeAtleta1} / {dupla.nomeAtleta2})
                </option>
              ))}
            </select>
          </label>

          <label>
            Jogador 1
            <input
              type="text"
              value={formulario.nomeAtleta1}
              onChange={(evento) => atualizarJogador(1, evento.target.value)}
              disabled={Boolean(formulario.duplaId)}
              placeholder="Apelido, nome ou nome completo"
            />
          </label>

          {!formulario.duplaId && sugestoesJogador1.length > 0 && (
            <div className="campo-largo lista-sugestoes">
              {sugestoesJogador1.map((atleta) => (
                <button
                  key={atleta.id}
                  type="button"
                  className="item-sugestao"
                  onClick={() => selecionarAtleta(1, atleta)}
                >
                  {atleta.nome}
                  {atleta.apelido ? ` (${atleta.apelido})` : ''}
                  {atleta.cadastroPendente ? ' [pendente]' : ''}
                </button>
              ))}
            </div>
          )}

          <label>
            Jogador 2
            <input
              type="text"
              value={formulario.nomeAtleta2}
              onChange={(evento) => atualizarJogador(2, evento.target.value)}
              disabled={Boolean(formulario.duplaId)}
              placeholder="Apelido, nome ou nome completo"
            />
          </label>

          {!formulario.duplaId && sugestoesJogador2.length > 0 && (
            <div className="campo-largo lista-sugestoes">
              {sugestoesJogador2.map((atleta) => (
                <button
                  key={atleta.id}
                  type="button"
                  className="item-sugestao"
                  onClick={() => selecionarAtleta(2, atleta)}
                >
                  {atleta.nome}
                  {atleta.apelido ? ` (${atleta.apelido})` : ''}
                  {atleta.cadastroPendente ? ' [pendente]' : ''}
                </button>
              ))}
            </div>
          )}

          {!formulario.duplaId && atletaSelecionado1 && (
            <p className="texto-sucesso campo-largo">
              Jogador 1 selecionado: {atletaSelecionado1.nome}{atletaSelecionado1.cadastroPendente ? ' [pendente]' : ''}
            </p>
          )}

          {!formulario.duplaId && atletaSelecionado2 && (
            <p className="texto-sucesso campo-largo">
              Jogador 2 selecionado: {atletaSelecionado2.nome}{atletaSelecionado2.cadastroPendente ? ' [pendente]' : ''}
            </p>
          )}

          {!formulario.duplaId && atletaExistenteJogador1 && (
            <>
              <div className="campo-largo caixa-ajuda">
                <p>
                  Já existe um atleta com o nome "{atletaExistenteJogador1.nome}".
                  Se for a mesma pessoa, o cadastro existente será reutilizado.
                  Se for outra pessoa, informe um apelido/complemento.
                </p>
              </div>

              <label>
                Apelido do jogador 1
                <input
                  type="text"
                  value={formulario.apelidoAtleta1}
                  onChange={(evento) => atualizarCampo('apelidoAtleta1', evento.target.value)}
                  placeholder="Use só se for outra pessoa com o mesmo nome"
                />
              </label>
            </>
          )}

          {!formulario.duplaId && atletaExistenteJogador2 && (
            <>
              <div className="campo-largo caixa-ajuda">
                <p>
                  Já existe um atleta com o nome "{atletaExistenteJogador2.nome}".
                  Se for a mesma pessoa, o cadastro existente será reutilizado.
                  Se for outra pessoa, informe um apelido/complemento.
                </p>
              </div>

              <label>
                Apelido do jogador 2
                <input
                  type="text"
                  value={formulario.apelidoAtleta2}
                  onChange={(evento) => atualizarCampo('apelidoAtleta2', evento.target.value)}
                  placeholder="Use só se for outra pessoa com o mesmo nome"
                />
              </label>
            </>
          )}
            </>
          )}

          <label className="campo-largo">
            Observação
            <textarea
              rows={3}
              value={formulario.observacao}
              onChange={(evento) => atualizarCampo('observacao', evento.target.value)}
            />
          </label>

          <div className="acoes-formulario">
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : inscricaoEmEdicao ? 'Salvar alteração' : 'Salvar inscrição'}
            </button>
            <button type="button" className="botao-secundario" onClick={cancelarFormulario}>
              {inscricaoEmEdicao ? 'Cancelar edição' : 'Cancelar'}
            </button>
          </div>
        </form>
      )}

      {carregandoInscricoes ? (
        <p>Carregando inscrições...</p>
      ) : (
        <div className="lista-cartoes">
          {inscricoesOrdenadas.map((inscricao) => (
            <article key={inscricao.id} className="cartao-lista">
              <div>
                <h3>{inscricao.nomeCategoria}</h3>
                <p>Dupla: {inscricao.nomeDupla || `${inscricao.nomeAtleta1} + ${inscricao.nomeAtleta2}`}</p>
                <p>Data da inscrição: {formatarDataHora(inscricao.dataInscricaoUtc)}</p>
                <p>Status: {obterNomeStatus(inscricao.status)}</p>
                <p>Pagamento: {inscricao.pago ? 'Pago' : 'Pendente'}</p>
                <p>Observação: {inscricao.observacao || '-'}</p>
              </div>
              {(atletaLogado || gestorCompeticao) && inscricao.status === 1 && (
                <div className="acoes-formulario">
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => abrirEdicaoInscricao(inscricao)}
                  >
                    Editar inscrição
                  </button>
                  {gestorCompeticao && (
                    <>
                      <button
                        type="button"
                        className="botao-secundario"
                        onClick={() => navegar(`/duplas?duplaId=${inscricao.duplaId}`)}
                      >
                        Editar dupla
                      </button>
                      <button
                        type="button"
                        className="botao-secundario"
                        onClick={() => navegar(`/atletas?atletaId=${inscricao.atleta1Id}`)}
                      >
                        Editar atleta 1
                      </button>
                      <button
                        type="button"
                        className="botao-secundario"
                        onClick={() => navegar(`/atletas?atletaId=${inscricao.atleta2Id}`)}
                      >
                        Editar atleta 2
                      </button>
                      <button
                        type="button"
                        className="botao-perigo"
                        onClick={() => removerDuplaInscrita(inscricao)}
                      >
                        Excluir dupla
                      </button>
                      <button
                        type="button"
                        className="botao-perigo"
                        onClick={() => removerInscricao(inscricao)}
                      >
                        Excluir inscrição
                      </button>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}

          {campeonatoSelecionado && inscricoes.length === 0 && (
            <p>
              {categoriaFiltroId
                ? atletaLogado
                  ? 'Você ainda não possui inscrição na categoria selecionada.'
                  : 'Nenhuma inscrição encontrada para a categoria selecionada.'
                : atletaLogado
                  ? 'Você ainda não possui inscrição nesta competição.'
                  : 'Ainda não há inscrições para esta competição.'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
