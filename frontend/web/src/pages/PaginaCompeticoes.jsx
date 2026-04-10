import { useEffect, useRef, useState } from 'react';
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
import { extrairMensagemErro } from '../utils/erros';
import { formatarData, paraInputData } from '../utils/formatacao';
import { ehAtleta, ehGestorCompeticao, PERFIS_USUARIO } from '../utils/perfis';
import { rolarParaElemento } from '../utils/rolagem';

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

export function PaginaCompeticoes() {
  const { usuario, atualizarUsuarioLocal } = useAutenticacao();
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const usuarioAtleta = ehAtleta(usuario);
  const usuarioAdministrador = Number(usuario?.perfil) === PERFIS_USUARIO.administrador;
  const podeCriarCompeticao = gestorCompeticao || usuarioAtleta;
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
  const [competicaoCategoriasId, setCompeticaoCategoriasId] = useState(null);
  const [categoriasCompeticao, setCategoriasCompeticao] = useState([]);
  const [quantidadeInscricoesPorCategoria, setQuantidadeInscricoesPorCategoria] = useState({});
  const [categoriaInscricoesAbertaId, setCategoriaInscricoesAbertaId] = useState(null);
  const [inscricoesCategoria, setInscricoesCategoria] = useState([]);
  const [competicaoGrupoAtletasId, setCompeticaoGrupoAtletasId] = useState(null);
  const [grupoAtletas, setGrupoAtletas] = useState([]);
  const [formularioGrupoAtleta, setFormularioGrupoAtleta] = useState(estadoInicialGrupoAtleta);
  const [grupoAtletaSelecionadoId, setGrupoAtletaSelecionadoId] = useState('');
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

  useEffect(() => {
    carregarCompeticoes();
  }, [gestorCompeticao, usuarioAtleta]);

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
    if (gestorCompeticao) {
      return true;
    }

    return usuarioAtleta && competicao.tipo === 3 && competicao.usuarioOrganizadorId === usuario?.id;
  }

  function podeSortearJogosCompeticao(competicao) {
    return competicao.tipo !== 3 && (
      Number(usuario?.perfil) === PERFIS_USUARIO.administrador ||
      (Number(usuario?.perfil) === PERFIS_USUARIO.organizador && competicao.usuarioOrganizadorId === usuario?.id)
    );
  }

  async function carregarCompeticoes() {
    setCarregando(true);
    setErro('');
    setAviso('');

    try {
      const avisos = [];
      const listaCompeticoes = await competicoesServico.listar();
      setCompeticoes(listaCompeticoes);

      if (podeCriarCompeticao) {
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

      if (!gestorCompeticao) {
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

  async function abrirCategorias(competicaoId) {
    setCompeticaoCategoriasId((anterior) => (anterior === competicaoId ? null : competicaoId));
    setCategoriaInscricoesAbertaId(null);
    setInscricoesCategoria([]);
    setQuantidadeInscricoesPorCategoria({});

    if (competicaoCategoriasId === competicaoId) {
      setCategoriasCompeticao([]);
      return;
    }

    try {
      const lista = await categoriasServico.listarPorCompeticao(competicaoId);
      setCategoriasCompeticao(lista);

      const competicao = competicoes.find((item) => item.id === competicaoId);
      if (competicao?.tipo !== 3 && lista.length > 0) {
        const contagens = await Promise.all(
          lista.map(async (categoria) => {
            const inscricoes = await inscricoesCampeonatoServico.listarPorCampeonato(competicaoId, categoria.id);
            return [categoria.id, inscricoes.length];
          })
        );

        setQuantidadeInscricoesPorCategoria(Object.fromEntries(contagens));
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setCategoriasCompeticao([]);
      setQuantidadeInscricoesPorCategoria({});
    }
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
      if (competicaoCategoriasId) {
        const lista = await categoriasServico.listarPorCompeticao(competicaoCategoriasId);
        setCategoriasCompeticao(lista);
      }
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
      navegar(`/partidas/consulta?competicaoId=${competicao.id}&categoriaId=${categoria.id}&visualizacao=tabela`);
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
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
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

          {usuarioAdministrador && Number(formulario.tipo) !== 3 && formatoEfetivoDaCompeticaoEhChaveDuplaEliminacao(formulario.tipo, formulario.formatoCampeonatoId) && (
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={Boolean(formulario.possuiFinalReset)}
                onChange={(evento) => atualizarCampo('possuiFinalReset', evento.target.checked)}
              />
              <span>Permitir final reset na chave com dupla eliminação</span>
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
                    <p>Nenhuma categoria cadastrada para este campeonato.</p>
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
        <div className="lista-cartoes">
          {competicoes.map((competicao) => {
            const gerenciavel = podeGerenciarCompeticao(competicao);
            const grupoAberto = competicaoGrupoAtletasId === competicao.id;
            const categoriasAbertas = competicaoCategoriasId === competicao.id;
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
                    {competicao.tipo === 3 && (
                      <p>Responsável: {competicao.nomeUsuarioOrganizador || 'Não informado'}</p>
                    )}                  
                  </div>
                </div>

                <div className="acoes-item competicao-card-acoes">
                  <button
                    type="button"
                    className="botao-terciario"
                    onClick={() => abrirCategorias(competicao.id)}
                  >
                    {categoriasAbertas ? 'Fechar categorias' : 'Categorias'}
                  </button>

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
                      onClick={() => navegar(`/partidas/registrar?competicaoId=${competicao.id}`)}
                    >
                      Jogos
                    </button>
                  )}

                  {gestorCompeticao && competicao.tipo !== 3 && (
                    <button
                      type="button"
                      className="botao-terciario"
                      onClick={() => navegar(`/inscricoes?campeonatoId=${competicao.id}`)}
                    >
                      Inscrições
                    </button>
                  )}

                  {gerenciavel && (
                    <>
                      <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(competicao)}>
                        Editar
                      </button>
                      <button type="button" className="botao-perigo" onClick={() => removerCompeticao(competicao.id)}>
                        Excluir
                      </button>
                    </>
                  )}
                </div>

                {categoriasAbertas && (
                  <div className="campo-largo">
                    {!gestorCompeticao && competicao.tipo === 3 && (
                      <p>Neste grupo, as categorias são opcionais. Você pode lançar jogos sem categoria ou separar os confrontos por categoria.</p>
                    )}
                    

                    <div className="lista-cartoes">
                      {categoriasCompeticao.map((categoria) => (
                        <article key={categoria.id} className="cartao-lista">
                          <div>
                            <h3>{categoria.nome}</h3>
                            <p>Gênero: {opcoesGenero.find((item) => item.valor === categoria.genero)?.rotulo}</p>
                            <p>Nível: {opcoesNivel.find((item) => item.valor === categoria.nivel)?.rotulo}</p>
                            {competicao.tipo !== 3 && (
                              <p>Duplas inscritas: {quantidadeInscricoesPorCategoria[categoria.id] ?? 0}</p>
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
                                  onClick={() => navegar(`/inscricoes?campeonatoId=${competicao.id}&categoriaId=${categoria.id}`)}
                                >
                                  Inscrever-se
                                </button>
                              )}

                              {podeSortearJogosCompeticao(competicao) &&
                                (quantidadeInscricoesPorCategoria[categoria.id] ?? 0) >= 4 && (
                                  <button
                                    type="button"
                                    className="botao-primario"
                                    onClick={() => sortearJogosCategoria(competicao, categoria)}
                                    disabled={sorteandoCategoriaId === categoria.id}
                                  >
                                    {sorteandoCategoriaId === categoria.id ? 'Sorteando...' : 'Sortear jogos'}
                                  </button>
                                )}

                              {gestorCompeticao && (
                                <>
                                  <button
                                    type="button"
                                    className="botao-terciario"
                                    onClick={() => navegar(`/partidas/consulta?competicaoId=${competicao.id}&categoriaId=${categoria.id}&visualizacao=tabela`)}
                                  >
                                    Ver tabela de jogos
                                  </button>
                                  <button
                                    type="button"
                                    className="botao-secundario"
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
                                <p>Nenhuma dupla inscrita nesta categoria.</p>
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
                      ))}

                      {categoriasCompeticao.length === 0 && <p>Nenhuma categoria cadastrada para esta competição.</p>}
                    </div>
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
                      {grupoAtletas.map((item) => (
                        <article key={item.id} className="cartao-lista">
                          <div>
                            <h3>{item.nomeAtleta}</h3>
                            <p>Apelido/complemento: {item.apelidoAtleta || '-'}</p>
                            <p>Cadastro no sistema: {item.cadastroPendente ? 'Pendente' : 'Completo'}</p>
                            <p>Usuário vinculado: {item.vinculadoAUsuario ? 'Sim' : 'Não'}</p>
                          </div>

                          {gerenciavel && (
                            <div className="acoes-item">
                              <button
                                type="button"
                                className="botao-perigo"
                                onClick={() => removerGrupoAtleta(competicao.id, item.id)}
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </article>
                      ))}

                      {grupoAtletas.length === 0 && <p>Nenhum atleta lançado neste grupo ainda.</p>}
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {competicoes.length === 0 && <p>Nenhuma competição encontrada.</p>}
        </div>
      )}
    </section>
  );
}
