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
  duplaId: '',
  atleta1Id: '',
  atleta2Id: '',
  nomeAtleta1: '',
  apelidoAtleta1: '',
  nomeAtleta2: '',
  apelidoAtleta2: '',
  observacao: ''
};

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

export function PaginaInscricoesCampeonato() {
  const [campeonatos, setCampeonatos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [atletas, setAtletas] = useState([]);
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
    () => atletas.find((atleta) => atleta.id === formulario.atleta2Id) || null,
    [atletas, formulario.atleta2Id]
  );

  const atletaExistenteJogador1 = useMemo(() => {
    const nome = normalizarNome(formulario.nomeAtleta1 || '');
    if (!nome) {
      return null;
    }

    return atletas.find((atleta) => normalizarNome(atleta.nome || '') === nome) || null;
  }, [atletas, formulario.nomeAtleta1]);

  const atletaExistenteJogador2 = useMemo(() => {
    const nome = normalizarNome(formulario.nomeAtleta2 || '');
    if (!nome) {
      return null;
    }

    return atletas.find((atleta) => normalizarNome(atleta.nome || '') === nome) || null;
  }, [atletas, formulario.nomeAtleta2]);

  const sugestoesJogador1 = useMemo(
    () => buscarSugestoesAtleta(atletas, formulario.nomeAtleta1 || '', formulario.atleta1Id),
    [atletas, formulario.nomeAtleta1, formulario.atleta1Id]
  );

  const sugestoesJogador2 = useMemo(
    () => buscarSugestoesAtleta(atletas, formulario.nomeAtleta2 || '', formulario.atleta2Id),
    [atletas, formulario.nomeAtleta2, formulario.atleta2Id]
  );

  async function carregarBase() {
    setCarregandoBase(true);
    setErro('');

    try {
      const [listaCompeticoes, listaDuplas, listaAtletas] = await Promise.all([
        competicoesServico.listar(),
        duplasServico.listar(),
        atletasServico.listar()
      ]);

      const listaCampeonatos = listaCompeticoes.filter((competicao) => competicao.tipo === 1);
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
    if (!campeonatoSelecionado) {
      setErro('Selecione um campeonato.');
      setMensagem('');
      return;
    }

    if (!campeonatoSelecionado.inscricoesAbertas) {
      setErro('Este campeonato não está aceitando inscrições no momento. Abra as inscrições na página de competições.');
      setMensagem('');
      return;
    }

    if (categorias.length === 0) {
      setErro('Cadastre ao menos uma categoria neste campeonato antes de criar inscrições.');
      setMensagem('');
      return;
    }

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
      setErro('Selecione um campeonato.');
      return;
    }

    if (!formulario.categoriaId) {
      setErro('Selecione uma categoria.');
      return;
    }

    setSalvando(true);

    try {
      let dados;

      if (duplaSelecionada) {
        dados = {
          categoriaId: formulario.categoriaId,
          atleta1Id: duplaSelecionada.atleta1Id,
          atleta2Id: duplaSelecionada.atleta2Id,
          nomeAtleta1: null,
          apelidoAtleta1: null,
          nomeAtleta2: null,
          apelidoAtleta2: null,
          observacao: formulario.observacao || null
        };
      } else {
        if (!formulario.nomeAtleta1.trim() || !formulario.nomeAtleta2.trim()) {
          setErro('Selecione uma dupla cadastrada ou informe o nome completo dos dois jogadores.');
          setSalvando(false);
          return;
        }

        dados = {
          categoriaId: formulario.categoriaId,
          atleta1Id: formulario.atleta1Id || null,
          atleta2Id: formulario.atleta2Id || null,
          nomeAtleta1: formulario.nomeAtleta1.trim(),
          apelidoAtleta1: formulario.apelidoAtleta1.trim() || null,
          nomeAtleta2: formulario.nomeAtleta2.trim(),
          apelidoAtleta2: formulario.apelidoAtleta2.trim() || null,
          observacao: formulario.observacao || null
        };
      }

      await inscricoesCampeonatoServico.criar(campeonatoId, dados);

      const usouCadastroInline = !duplaSelecionada;
      setMensagem(
        usouCadastroInline
          ? 'Inscrição realizada com sucesso. Se algum atleta for novo, complete depois o cadastro dele na página de atletas.'
          : 'Inscrição realizada com sucesso.'
      );
      setCategoriaFiltroId(formulario.categoriaId);
      atualizarParametros(campeonatoId, formulario.categoriaId);
      setFormulario({
        ...estadoInicialFormulario,
        categoriaId: formulario.categoriaId
      });
      const [listaDuplas, listaAtletas] = await Promise.all([duplasServico.listar(), atletasServico.listar()]);
      setDuplas(listaDuplas);
      setAtletas(listaAtletas);
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
          <p>Carregando campeonatos, categorias e duplas...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Inscrições</h2>
        <p>Inscreva uma dupla já cadastrada em uma categoria do campeonato e acompanhe a lista em tempo real.</p>
        <p>Se a dupla ainda não existir, informe os nomes completos dos jogadores que o sistema cria os cadastros necessários.</p>
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
            disabled={!campeonatoSelecionado}
          >
            Nova inscrição
          </button>
        </div>
      </div>

      {!campeonatoSelecionado && <p className="texto-aviso">Nenhum campeonato disponível.</p>}
      {campeonatoSelecionado && !campeonatoSelecionado.inscricoesAbertas && (
        <p className="texto-aviso">Este campeonato não está aceitando inscrições no momento.</p>
      )}
      {campeonatoSelecionado && campeonatoSelecionado.inscricoesAbertas && categorias.length === 0 && (
        <p className="texto-aviso">Cadastre ao menos uma categoria no campeonato para liberar novas inscrições.</p>
      )}
      {campeonatoSelecionado && podeCriarInscricao && (
        <p className="texto-sucesso">O campeonato está pronto para receber novas inscrições.</p>
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
