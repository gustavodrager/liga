import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { competicoesServico } from '../services/competicoesServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData, paraInputData } from '../utils/formatacao';

const estadoInicial = {
  nome: '',
  tipo: '1',
  descricao: '',
  dataInicio: '',
  dataFim: ''
};

const tiposCompeticao = [
  { valor: 1, rotulo: 'Campeonato' },
  { valor: 2, rotulo: 'Evento' },
  { valor: 3, rotulo: 'Grupo' }
];

export function PaginaCompeticoes() {
  const [competicoes, setCompeticoes] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [competicaoEdicaoId, setCompeticaoEdicaoId] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    carregarCompeticoes();
  }, []);

  async function carregarCompeticoes() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await competicoesServico.listar();
      setCompeticoes(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function iniciarEdicao(competicao) {
    setCompeticaoEdicaoId(competicao.id);
    setFormulario({
      nome: competicao.nome,
      tipo: String(competicao.tipo),
      descricao: competicao.descricao || '',
      dataInicio: paraInputData(competicao.dataInicio),
      dataFim: paraInputData(competicao.dataFim)
    });
  }

  function cancelarEdicao() {
    setCompeticaoEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      nome: formulario.nome,
      tipo: Number(formulario.tipo),
      descricao: formulario.descricao || null,
      dataInicio: formulario.dataInicio,
      dataFim: formulario.dataFim || null
    };

    try {
      if (competicaoEdicaoId) {
        await competicoesServico.atualizar(competicaoEdicaoId, dados);
      } else {
        await competicoesServico.criar(dados);
      }

      cancelarEdicao();
      await carregarCompeticoes();
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
      <div className="cabecalho-pagina">
        <h2>Competições</h2>
        <p>Crie campeonatos, eventos e grupos de jogos.</p>
      </div>

      <form className="formulario-grid" onSubmit={aoSubmeter}>
        <label>
          Nome
          <input
            type="text"
            value={formulario.nome}
            onChange={(evento) => atualizarCampo('nome', evento.target.value)}
            required
          />
        </label>

        <label>
          Tipo
          <select
            value={formulario.tipo}
            onChange={(evento) => atualizarCampo('tipo', evento.target.value)}
            required
          >
            {tiposCompeticao.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
        </label>

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
          Descrição
          <textarea
            value={formulario.descricao}
            onChange={(evento) => atualizarCampo('descricao', evento.target.value)}
            rows={3}
          />
        </label>

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : competicaoEdicaoId ? 'Atualizar competição' : 'Cadastrar competição'}
          </button>

          {competicaoEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando competições...</p>
      ) : (
        <div className="lista-cartoes">
          {competicoes.map((competicao) => (
            <article key={competicao.id} className="cartao-lista">
              <div>
                <h3>{competicao.nome}</h3>
                <p>Tipo: {tiposCompeticao.find((tipo) => tipo.valor === competicao.tipo)?.rotulo || '-'}</p>
                <p>Início: {formatarData(competicao.dataInicio)}</p>
                <p>Fim: {formatarData(competicao.dataFim)}</p>
              </div>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-terciario"
                  onClick={() => navegar(`/categorias?competicaoId=${competicao.id}`)}
                >
                  Categorias
                </button>
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(competicao)}>
                  Editar
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerCompeticao(competicao.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          {competicoes.length === 0 && <p>Nenhuma competição cadastrada.</p>}
        </div>
      )}
    </section>
  );
}
