import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { formatosCampeonatoServico } from '../services/formatosCampeonatoServico';
import { extrairMensagemErro } from '../utils/erros';
import { rolarParaElemento, rolarParaTopo } from '../utils/rolagem';

const estadoInicial = {
  competicaoId: '',
  formatoCampeonatoId: '',
  nome: '',
  genero: '',
  nivel: '',
  pesoRanking: '',
  quantidadeMaximaDuplas: '',
  inscricoesEncerradas: false
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

export function PaginaCategorias() {
  const exibirCampoFormatoCompeticao = false;
  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [formatosCampeonato, setFormatosCampeonato] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [categoriaEdicaoId, setCategoriaEdicaoId] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const formularioRef = useRef(null);

  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const competicaoSelecionada = competicoes.find((competicao) => competicao.id === formulario.competicaoId) || null;
  const competicaoAceitaInscricoes = Boolean(competicaoSelecionada && competicaoSelecionada.tipo !== 3);

  useEffect(() => {
    carregarCompeticoes();
  }, []);

  function obterFormatosDisponiveis() {
    const tipoCompeticao = Number(competicaoSelecionada?.tipo);

    return formatosCampeonato.filter((formato) => (
      formato.ativo &&
      (tipoCompeticao !== 3 || formato.tipoFormato === 1)
    ));
  }

  useEffect(() => {
    if (!formulario.competicaoId) {
      setCategorias([]);
      return;
    }

    carregarCategorias(formulario.competicaoId);
  }, [formulario.competicaoId]);

  useEffect(() => {
    const categoriaId = params.get('categoriaId');
    if (!categoriaId || categorias.length === 0) {
      return;
    }

    const categoria = categorias.find((item) => item.id === categoriaId);
    if (categoria && categoriaEdicaoId !== categoria.id) {
      iniciarEdicao(categoria);
    }
  }, [categorias, categoriaEdicaoId, params]);

  async function carregarCompeticoes() {
    setErro('');
    setCarregando(true);

    try {
      const [listaCompeticoes, listaFormatos] = await Promise.all([
        competicoesServico.listar(),
        formatosCampeonatoServico.listar()
      ]);

      setCompeticoes(listaCompeticoes);
      setFormatosCampeonato(listaFormatos.filter((formato) => formato.ativo));

      const competicaoUrl = params.get('competicaoId');
      const competicaoPadrao = competicaoUrl || listaCompeticoes[0]?.id || '';

      setFormulario((anterior) => ({ ...anterior, competicaoId: competicaoPadrao }));
      if (competicaoPadrao) {
        atualizarParametros(competicaoPadrao, params.get('categoriaId') || '');
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  async function carregarCategorias(competicaoId) {
    try {
      const lista = await categoriasServico.listarPorCompeticao(competicaoId);
      setCategorias(lista);
      setFormularioAberto(false);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => {
      const proximo = { ...anterior, [campo]: valor };

      if (campo === 'competicaoId') {
        const competicao = competicoes.find((item) => item.id === valor);
        const formatosDisponiveis = formatosCampeonato.filter((formato) => (
          formato.ativo &&
          (Number(competicao?.tipo) !== 3 || formato.tipoFormato === 1)
        ));

        if (
          proximo.formatoCampeonatoId &&
          formatosDisponiveis.every((formato) => formato.id !== proximo.formatoCampeonatoId)
        ) {
          proximo.formatoCampeonatoId = '';
        }
      }

      return proximo;
    });

    if (campo === 'competicaoId') {
      setFormularioAberto(false);
      setCategoriaEdicaoId(null);
      setFormulario((anterior) => ({
        ...estadoInicial,
        competicaoId: valor
      }));
      atualizarParametros(valor, '');
    }
  }

  function atualizarParametros(competicaoId, categoriaId = '') {
    const proximosParams = {};

    if (competicaoId) {
      proximosParams.competicaoId = competicaoId;
    }

    if (categoriaId) {
      proximosParams.categoriaId = categoriaId;
    }

    setParams(proximosParams);
  }

  function iniciarEdicao(categoria) {
    setFormularioAberto(true);
    setCategoriaEdicaoId(categoria.id);
    setFormulario({
      competicaoId: categoria.competicaoId,
      formatoCampeonatoId: categoria.formatoCampeonatoId || '',
      nome: categoria.nome,
      genero: String(categoria.genero),
      nivel: String(categoria.nivel),
      pesoRanking: String(categoria.pesoRanking),
      quantidadeMaximaDuplas: categoria.quantidadeMaximaDuplas ? String(categoria.quantidadeMaximaDuplas) : '',
      inscricoesEncerradas: Boolean(categoria.inscricoesEncerradas)
    });
    atualizarParametros(categoria.competicaoId, categoria.id);
    setTimeout(() => rolarParaElemento(formularioRef.current), 0);
  }

  function cancelarEdicao() {
    setFormularioAberto(false);
    setCategoriaEdicaoId(null);
    setFormulario((anterior) => ({
      ...estadoInicial,
      competicaoId: anterior.competicaoId || ''
    }));
    atualizarParametros(formulario.competicaoId, '');
  }

  function abrirFormularioCategoria() {
    setFormularioAberto(true);
    setCategoriaEdicaoId(null);
    setFormulario((anterior) => ({
      ...estadoInicial,
      competicaoId: anterior.competicaoId || ''
    }));
    atualizarParametros(formulario.competicaoId, '');
    setTimeout(() => rolarParaElemento(formularioRef.current), 0);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      if (!formulario.competicaoId) {
        throw new Error('Selecione uma competição para cadastrar a categoria.');
      }

      if (categoriaEdicaoId) {
        await categoriasServico.atualizar(categoriaEdicaoId, {
          formatoCampeonatoId: formulario.formatoCampeonatoId || null,
          nome: formulario.nome,
          genero: Number(formulario.genero),
          nivel: Number(formulario.nivel),
          pesoRanking: formulario.pesoRanking === '' ? null : Number(formulario.pesoRanking),
          quantidadeMaximaDuplas: formulario.quantidadeMaximaDuplas === '' ? null : Number(formulario.quantidadeMaximaDuplas),
          inscricoesEncerradas: competicaoAceitaInscricoes ? Boolean(formulario.inscricoesEncerradas) : false
        });
      } else {
        await categoriasServico.criar({
          competicaoId: formulario.competicaoId,
          formatoCampeonatoId: formulario.formatoCampeonatoId || null,
          nome: formulario.nome,
          genero: Number(formulario.genero),
          nivel: Number(formulario.nivel),
          pesoRanking: formulario.pesoRanking === '' ? null : Number(formulario.pesoRanking),
          quantidadeMaximaDuplas: formulario.quantidadeMaximaDuplas === '' ? null : Number(formulario.quantidadeMaximaDuplas),
          inscricoesEncerradas: competicaoAceitaInscricoes ? Boolean(formulario.inscricoesEncerradas) : false
        });
      }

      cancelarEdicao();
      await carregarCategorias(formulario.competicaoId);
      setFormularioAberto(false);
      rolarParaTopo();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerCategoria(id) {
    if (!window.confirm('Deseja remover esta categoria?')) {
      return;
    }

    try {
      await categoriasServico.remover(id);
      await carregarCategorias(formulario.competicaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  async function alternarEncerramentoInscricoes(categoria) {
    const proximoEncerramento = !categoria.inscricoesEncerradas;
    const mensagemConfirmacao = proximoEncerramento
      ? 'Deseja encerrar as inscrições desta categoria?'
      : 'Deseja reabrir as inscrições desta categoria?';

    if (!window.confirm(mensagemConfirmacao)) {
      return;
    }

    setErro('');

    try {
      await categoriasServico.atualizar(categoria.id, {
        formatoCampeonatoId: categoria.formatoCampeonatoId,
        nome: categoria.nome,
        genero: Number(categoria.genero),
        nivel: Number(categoria.nivel),
        pesoRanking: categoria.pesoRanking,
        quantidadeMaximaDuplas: categoria.quantidadeMaximaDuplas,
        inscricoesEncerradas: proximoEncerramento
      });

      await carregarCategorias(categoria.competicaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Categorias</h2>
        <p>Cada categoria pertence a uma competição e define gênero e nível técnico.</p>
      </div>

      {!carregando && formulario.competicaoId && (
        <div className="acoes-item campo-largo">
          {!formularioAberto ? (
            <button type="button" className="botao-primario" onClick={abrirFormularioCategoria}>
              Nova categoria
            </button>
          ) : !categoriaEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Fechar formulário
            </button>
          )}
        </div>
      )}

      {formularioAberto && (
        <form ref={formularioRef} className="formulario-grid" onSubmit={aoSubmeter}>
          <label>
            Competição
            <select
              value={formulario.competicaoId}
              onChange={(evento) => atualizarCampo('competicaoId', evento.target.value)}
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

          {exibirCampoFormatoCompeticao && (
            <label>
              Forma de competição
              <select
                value={formulario.formatoCampeonatoId}
                onChange={(evento) => atualizarCampo('formatoCampeonatoId', evento.target.value)}
              >
                <option value="">Seguir formato da competição</option>
                {obterFormatosDisponiveis().map((formato) => (
                  <option key={formato.id} value={formato.id}>
                    {formato.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {exibirCampoFormatoCompeticao && competicaoSelecionada?.nomeFormatoCampeonato && (
            <p className="campo-largo">
              Formato definido na competição: {competicaoSelecionada.nomeFormatoCampeonato}.
            </p>
          )}

          <label>
            Nome da categoria
            <input
              type="text"
              value={formulario.nome}
              onChange={(evento) => atualizarCampo('nome', evento.target.value)}
              placeholder="Opcional, exceto se já existir mesma combinação"
            />
          </label>

          <label>
            Gênero
            <select
              value={formulario.genero}
              onChange={(evento) => atualizarCampo('genero', evento.target.value)}
              required
            >
              <option value="">Selecione</option>
              {opcoesGenero.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nível técnico
            <select
              value={formulario.nivel}
              onChange={(evento) => atualizarCampo('nivel', evento.target.value)}
              required
            >
              <option value="">Selecione</option>
              {opcoesNivel.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </label>

          {competicaoAceitaInscricoes && (
            <label>
              Quantidade de duplas
              <input
                type="number"
                min={1}
                step={1}
                value={formulario.quantidadeMaximaDuplas}
                onChange={(evento) => atualizarCampo('quantidadeMaximaDuplas', evento.target.value)}
                placeholder="Em branco = até encerrar as inscrições"
              />
            </label>
          )}

          {competicaoAceitaInscricoes && categoriaEdicaoId && (
            <label>
              <input
                type="checkbox"
                checked={Boolean(formulario.inscricoesEncerradas)}
                onChange={(evento) => atualizarCampo('inscricoesEncerradas', evento.target.checked)}
              />
              <span>Inscrições encerradas nesta categoria</span>
            </label>
          )}

          <div className="acoes-formulario">
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>

            {categoriaEdicaoId && (
              <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando categorias...</p>
      ) : (
        <div className="lista-cartoes">
          {categorias.map((categoria) => (
            <article key={categoria.id} className="cartao-lista">
              <div>
                <h3>{categoria.nome}</h3>
                <p>Gênero: {opcoesGenero.find((item) => item.valor === categoria.genero)?.rotulo}</p>
                <p>Nível: {opcoesNivel.find((item) => item.valor === categoria.nivel)?.rotulo}</p>
                {competicoes.find((competicao) => competicao.id === categoria.competicaoId)?.tipo !== 3 && (
                  <p>
                    Formato: {categoria.nomeFormatoCampeonatoEfetivo || 'Sem formato vinculado'}
                    {categoria.usaFormatoCampeonatoDaCompeticao ? ' (seguindo a competição)' : ''}
                  </p>
                )}
                {competicoes.find((competicao) => competicao.id === categoria.competicaoId)?.tipo !== 3 && (
                  <>
                    <p>Duplas inscritas: {categoria.quantidadeDuplasInscritas}</p>
                    <p>Limite de duplas: {categoria.quantidadeMaximaDuplas || 'Sem limite'}</p>
                    <p>Inscrições: {categoria.inscricoesEncerradas ? 'Encerradas' : 'Abertas'}</p>
                  </>
                )}
              </div>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-terciario"
                  onClick={() => navegar(`/partidas/registrar?categoriaId=${categoria.id}`)}
                >
                  Partidas
                </button>
                {competicoes.find((competicao) => competicao.id === categoria.competicaoId)?.tipo !== 3 && (
                  <button
                    type="button"
                    className="botao-terciario"
                    onClick={() => navegar(`/inscricoes?campeonatoId=${categoria.competicaoId}&categoriaId=${categoria.id}`)}
                  >
                    Inscrições
                  </button>
                )}
                <button type="button" className="botao-secundario botao-editar" onClick={() => iniciarEdicao(categoria)}>
                  Editar
                </button>
                {competicoes.find((competicao) => competicao.id === categoria.competicaoId)?.tipo !== 3 && (
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => alternarEncerramentoInscricoes(categoria)}
                  >
                    {categoria.inscricoesEncerradas ? 'Reabrir inscrições' : 'Encerrar inscrições'}
                  </button>
                )}
                <button type="button" className="botao-perigo" onClick={() => removerCategoria(categoria.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          {categorias.length === 0 && <p>Nenhuma categoria cadastrada para esta competição.</p>}
        </div>
      )}
    </section>
  );
}
