import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { duplasServico } from '../services/duplasServico';
import { partidasServico } from '../services/partidasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora, paraInputDataHora } from '../utils/formatacao';

const estadoInicial = {
  categoriaCompeticaoId: '',
  duplaAId: '',
  duplaBId: '',
  placarDuplaA: 0,
  placarDuplaB: 0,
  duplaVencedoraId: '',
  dataPartida: '',
  observacoes: ''
};

function paraIsoUtc(dataLocal) {
  if (!dataLocal) {
    return dataLocal;
  }

  return new Date(dataLocal).toISOString();
}

export function PaginaPartidas() {
  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [competicaoId, setCompeticaoId] = useState('');
  const [formulario, setFormulario] = useState({
    ...estadoInicial,
    dataPartida: paraInputDataHora(new Date())
  });
  const [partidaEdicaoId, setPartidaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [params, setParams] = useSearchParams();

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

  const opcoesVencedora = useMemo(
    () =>
      duplas.filter(
        (dupla) => dupla.id === formulario.duplaAId || dupla.id === formulario.duplaBId
      ),
    [duplas, formulario.duplaAId, formulario.duplaBId]
  );

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
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));

    if (campo === 'categoriaCompeticaoId' && valor) {
      setParams({ categoriaId: valor });
    }

    if (campo === 'duplaAId' || campo === 'duplaBId') {
      setFormulario((anterior) => ({ ...anterior, duplaVencedoraId: '' }));
    }
  }

  function iniciarEdicao(partida) {
    setPartidaEdicaoId(partida.id);
    const categoria = categorias.find((item) => item.id === partida.categoriaCompeticaoId);
    if (categoria) {
      setCompeticaoId(categoria.competicaoId);
    }

    setFormulario({
      categoriaCompeticaoId: partida.categoriaCompeticaoId,
      duplaAId: partida.duplaAId,
      duplaBId: partida.duplaBId,
      placarDuplaA: partida.placarDuplaA,
      placarDuplaB: partida.placarDuplaB,
      duplaVencedoraId: partida.duplaVencedoraId,
      dataPartida: paraInputDataHora(partida.dataPartida),
      observacoes: partida.observacoes || ''
    });
  }

  function cancelarEdicao() {
    setPartidaEdicaoId(null);
    setFormulario((anterior) => ({
      ...estadoInicial,
      categoriaCompeticaoId: anterior.categoriaCompeticaoId,
      dataPartida: paraInputDataHora(new Date())
    }));
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      categoriaCompeticaoId: formulario.categoriaCompeticaoId,
      duplaAId: formulario.duplaAId,
      duplaBId: formulario.duplaBId,
      placarDuplaA: Number(formulario.placarDuplaA),
      placarDuplaB: Number(formulario.placarDuplaB),
      duplaVencedoraId: formulario.duplaVencedoraId,
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
      await carregarPartidas(formulario.categoriaCompeticaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerPartida(id) {
    if (!window.confirm('Deseja remover esta partida?')) {
      return;
    }

    try {
      await partidasServico.remover(id);
      await carregarPartidas(formulario.categoriaCompeticaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Partidas</h2>
        <p>Registre jogos por categoria, com placar e dupla vencedora.</p>
      </div>

      <form className="formulario-grid" onSubmit={aoSubmeter}>
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

        <label>
          Dupla A
          <select
            value={formulario.duplaAId}
            onChange={(evento) => atualizarCampo('duplaAId', evento.target.value)}
            required
          >
            <option value="">Selecione</option>
            {duplas.map((dupla) => (
              <option key={dupla.id} value={dupla.id}>
                {dupla.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Dupla B
          <select
            value={formulario.duplaBId}
            onChange={(evento) => atualizarCampo('duplaBId', evento.target.value)}
            required
          >
            <option value="">Selecione</option>
            {duplas.map((dupla) => (
              <option key={dupla.id} value={dupla.id}>
                {dupla.nome}
              </option>
            ))}
          </select>
        </label>

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

        <label>
          Dupla vencedora
          <select
            value={formulario.duplaVencedoraId}
            onChange={(evento) => atualizarCampo('duplaVencedoraId', evento.target.value)}
            required
          >
            <option value="">Selecione</option>
            {opcoesVencedora.map((dupla) => (
              <option key={dupla.id} value={dupla.id}>
                {dupla.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Data da partida
          <input
            type="datetime-local"
            value={formulario.dataPartida}
            onChange={(evento) => atualizarCampo('dataPartida', evento.target.value)}
            required
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

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando partidas...</p>
      ) : (
        <div className="lista-cartoes">
          {partidas.map((partida) => (
            <article key={partida.id} className="cartao-lista">
              <div>
                <h3>{partida.nomeDuplaA} {partida.placarDuplaA} x {partida.placarDuplaB} {partida.nomeDuplaB}</h3>
                <p>Categoria: {partida.nomeCategoria}</p>
                <p>Vencedora: {partida.nomeDuplaVencedora}</p>
                <p>Data: {formatarDataHora(partida.dataPartida)}</p>
                <p>Obs: {partida.observacoes || '-'}</p>
              </div>

              <div className="acoes-item">
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(partida)}>
                  Editar
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerPartida(partida.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          {partidas.length === 0 && <p>Nenhuma partida registrada para esta categoria.</p>}
        </div>
      )}
    </section>
  );
}
