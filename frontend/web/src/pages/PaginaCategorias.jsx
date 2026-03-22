import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { extrairMensagemErro } from '../utils/erros';

const estadoInicial = {
  competicaoId: '',
  nome: '',
  genero: '1',
  nivel: '1'
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
  const [competicoes, setCompeticoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [categoriaEdicaoId, setCategoriaEdicaoId] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();

  useEffect(() => {
    carregarCompeticoes();
  }, []);

  useEffect(() => {
    if (!formulario.competicaoId) {
      setCategorias([]);
      return;
    }

    carregarCategorias(formulario.competicaoId);
  }, [formulario.competicaoId]);

  async function carregarCompeticoes() {
    setErro('');
    setCarregando(true);

    try {
      const listaCompeticoes = await competicoesServico.listar();
      setCompeticoes(listaCompeticoes);

      const competicaoUrl = params.get('competicaoId');
      const competicaoPadrao = competicaoUrl || listaCompeticoes[0]?.id || '';

      setFormulario((anterior) => ({ ...anterior, competicaoId: competicaoPadrao }));
      if (competicaoPadrao) {
        setParams({ competicaoId: competicaoPadrao });
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
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));

    if (campo === 'competicaoId') {
      setParams({ competicaoId: valor });
    }
  }

  function iniciarEdicao(categoria) {
    setCategoriaEdicaoId(categoria.id);
    setFormulario({
      competicaoId: categoria.competicaoId,
      nome: categoria.nome,
      genero: String(categoria.genero),
      nivel: String(categoria.nivel)
    });
    setParams({ competicaoId: categoria.competicaoId });
  }

  function cancelarEdicao() {
    setCategoriaEdicaoId(null);
    setFormulario((anterior) => ({
      ...estadoInicial,
      competicaoId: anterior.competicaoId || ''
    }));
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
          nome: formulario.nome,
          genero: Number(formulario.genero),
          nivel: Number(formulario.nivel)
        });
      } else {
        await categoriasServico.criar({
          competicaoId: formulario.competicaoId,
          nome: formulario.nome,
          genero: Number(formulario.genero),
          nivel: Number(formulario.nivel)
        });
      }

      cancelarEdicao();
      await carregarCategorias(formulario.competicaoId);
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

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Categorias</h2>
        <p>Cada categoria pertence a uma competição e define gênero e nível técnico.</p>
      </div>

      <form className="formulario-grid" onSubmit={aoSubmeter}>
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

        <label>
          Nome da categoria
          <input
            type="text"
            value={formulario.nome}
            onChange={(evento) => atualizarCampo('nome', evento.target.value)}
            placeholder="Ex: Ouro Misto"
            required
          />
        </label>

        <label>
          Gênero
          <select
            value={formulario.genero}
            onChange={(evento) => atualizarCampo('genero', evento.target.value)}
            required
          >
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
            {opcoesNivel.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </label>

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : categoriaEdicaoId ? 'Atualizar categoria' : 'Cadastrar categoria'}
          </button>

          {categoriaEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </form>

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
              </div>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-terciario"
                  onClick={() => navegar(`/partidas?categoriaId=${categoria.id}`)}
                >
                  Partidas
                </button>
                {competicoes.find((competicao) => competicao.id === categoria.competicaoId)?.tipo === 1 && (
                  <button
                    type="button"
                    className="botao-terciario"
                    onClick={() => navegar(`/inscricoes?campeonatoId=${categoria.competicaoId}&categoriaId=${categoria.id}`)}
                  >
                    Inscrições
                  </button>
                )}
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(categoria)}>
                  Editar
                </button>
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
