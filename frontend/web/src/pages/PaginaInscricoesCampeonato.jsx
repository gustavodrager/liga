import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { atletasServico } from '../services/atletasServico';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { duplasServico } from '../services/duplasServico';
import { inscricoesCampeonatoServico } from '../services/inscricoesCampeonatoServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';

const estadoInicialFormulario = {
  categoriaId: '',
  atleta1Id: '',
  atleta2Id: '',
  observacao: ''
};

function obterNomeStatus(status) {
  return status === 1 ? 'Ativa' : 'Cancelada';
}

export function PaginaInscricoesCampeonato() {
  const [campeonatos, setCampeonatos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [atletas, setAtletas] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState('');
  const [categoriaFiltroId, setCategoriaFiltroId] = useState('');
  const [formulario, setFormulario] = useState(estadoInicialFormulario);
  const [exibindoFormulario, setExibindoFormulario] = useState(false);
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [carregandoInscricoes, setCarregandoInscricoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [params, setParams] = useSearchParams();

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (!campeonatoId) {
      setCategorias([]);
      setInscricoes([]);
      return;
    }

    carregarCategorias(campeonatoId);
  }, [campeonatoId]);

  useEffect(() => {
    if (!campeonatoId) {
      setInscricoes([]);
      return;
    }

    carregarInscricoes(campeonatoId, categoriaFiltroId);
  }, [campeonatoId, categoriaFiltroId]);

  const campeonatoSelecionado = useMemo(
    () => campeonatos.find((campeonato) => campeonato.id === campeonatoId) || null,
    [campeonatos, campeonatoId]
  );

  const atleta1Opcoes = useMemo(
    () => atletas.filter((atleta) => atleta.id !== formulario.atleta2Id),
    [atletas, formulario.atleta2Id]
  );

  const atleta2Opcoes = useMemo(
    () => atletas.filter((atleta) => atleta.id !== formulario.atleta1Id),
    [atletas, formulario.atleta1Id]
  );

  const duplaJaCadastrada = useMemo(() => {
    if (!formulario.atleta1Id || !formulario.atleta2Id) {
      return true;
    }

    return duplas.some(
      (dupla) =>
        (dupla.atleta1Id === formulario.atleta1Id && dupla.atleta2Id === formulario.atleta2Id) ||
        (dupla.atleta1Id === formulario.atleta2Id && dupla.atleta2Id === formulario.atleta1Id)
    );
  }, [duplas, formulario.atleta1Id, formulario.atleta2Id]);

  async function carregarBase() {
    setCarregandoBase(true);
    setErro('');

    try {
      const [listaCompeticoes, listaAtletas, listaDuplas] = await Promise.all([
        competicoesServico.listar(),
        atletasServico.listar(),
        duplasServico.listar()
      ]);

      const listaCampeonatos = listaCompeticoes.filter((competicao) => competicao.tipo === 1);
      setCampeonatos(listaCampeonatos);
      setAtletas(listaAtletas);
      setDuplas(listaDuplas);

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

  function abrirFormulario() {
    setErro('');
    setMensagem('');
    setExibindoFormulario(true);
    setFormulario({
      ...estadoInicialFormulario,
      categoriaId: categoriaFiltroId || categorias[0]?.id || ''
    });
  }

  function cancelarFormulario() {
    setExibindoFormulario(false);
    setFormulario(estadoInicialFormulario);
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setMensagem('');

    if (!campeonatoId) {
      setErro('Selecione um campeonato.');
      return;
    }

    if (!formulario.categoriaId) {
      setErro('Selecione uma categoria.');
      return;
    }

    if (!formulario.atleta1Id || !formulario.atleta2Id) {
      setErro('Selecione os dois atletas da dupla.');
      return;
    }

    if (formulario.atleta1Id === formulario.atleta2Id) {
      setErro('Os atletas da dupla devem ser diferentes.');
      return;
    }

    if (!duplaJaCadastrada) {
      setErro('Cadastre esta dupla antes de realizar a inscrição.');
      return;
    }

    setSalvando(true);

    try {
      await inscricoesCampeonatoServico.criar(campeonatoId, {
        categoriaId: formulario.categoriaId,
        atleta1Id: formulario.atleta1Id,
        atleta2Id: formulario.atleta2Id,
        observacao: formulario.observacao || null
      });

      setMensagem('Inscrição realizada com sucesso.');
      setCategoriaFiltroId(formulario.categoriaId);
      atualizarParametros(campeonatoId, formulario.categoriaId);
      setFormulario((anterior) => ({
        ...anterior,
        atleta1Id: '',
        atleta2Id: '',
        observacao: ''
      }));
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
          <p>Carregando campeonatos, categorias e atletas...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Inscrições</h2>
        <p>Inscreva duplas já formadas em categorias de campeonatos e acompanhe a lista em tempo real.</p>
      </div>

      <div className="formulario-grid">
        <label>
          Campeonato
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
            disabled={!campeonatoSelecionado?.inscricoesAbertas}
          >
            Nova inscrição
          </button>
        </div>
      </div>

      {!campeonatoSelecionado && <p className="texto-aviso">Nenhum campeonato disponível.</p>}
      {campeonatoSelecionado && !campeonatoSelecionado.inscricoesAbertas && (
        <p className="texto-aviso">Este campeonato não está aceitando inscrições no momento.</p>
      )}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}
      {erro && <p className="texto-erro">{erro}</p>}

      {exibindoFormulario && (
        <form className="formulario-grid" onSubmit={aoSubmeter}>
          <label>
            Categoria
            <select
              value={formulario.categoriaId}
              onChange={(evento) => atualizarCampo('categoriaId', evento.target.value)}
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

          <label>
            Atleta 1
            <select
              value={formulario.atleta1Id}
              onChange={(evento) => atualizarCampo('atleta1Id', evento.target.value)}
              required
            >
              <option value="">Selecione</option>
              {atleta1Opcoes.map((atleta) => (
                <option key={atleta.id} value={atleta.id}>
                  {atleta.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            Atleta 2
            <select
              value={formulario.atleta2Id}
              onChange={(evento) => atualizarCampo('atleta2Id', evento.target.value)}
              required
            >
              <option value="">Selecione</option>
              {atleta2Opcoes.map((atleta) => (
                <option key={atleta.id} value={atleta.id}>
                  {atleta.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="campo-largo">
            Observação
            <textarea
              rows={3}
              value={formulario.observacao}
              onChange={(evento) => atualizarCampo('observacao', evento.target.value)}
            />
          </label>

          {!duplaJaCadastrada && formulario.atleta1Id && formulario.atleta2Id && (
            <p className="texto-aviso campo-largo">A dupla precisa estar cadastrada antes da inscrição.</p>
          )}

          <div className="acoes-formulario">
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar inscrição'}
            </button>
            <button type="button" className="botao-secundario" onClick={cancelarFormulario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {carregandoInscricoes ? (
        <p>Carregando inscrições...</p>
      ) : (
        <div className="lista-cartoes">
          {inscricoes.map((inscricao) => (
            <article key={inscricao.id} className="cartao-lista">
              <div>
                <h3>{inscricao.nomeCategoria}</h3>
                <p>{inscricao.nomeAtleta1} + {inscricao.nomeAtleta2}</p>
                <p>Data da inscrição: {formatarDataHora(inscricao.dataInscricaoUtc)}</p>
                <p>Status: {obterNomeStatus(inscricao.status)}</p>
                <p>Observação: {inscricao.observacao || '-'}</p>
              </div>
            </article>
          ))}

          {campeonatoSelecionado && inscricoes.length === 0 && (
            <p>{categoriaFiltroId ? 'Nenhuma inscrição encontrada para a categoria selecionada.' : 'Ainda não há inscrições para este campeonato.'}</p>
          )}
        </div>
      )}
    </section>
  );
}
