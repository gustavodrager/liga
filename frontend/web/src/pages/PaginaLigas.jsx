import { useEffect, useState } from 'react';
import { ligasServico } from '../services/ligasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';

const estadoInicial = {
  nome: '',
  descricao: ''
};

export function PaginaLigas() {
  const [ligas, setLigas] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [ligaEdicaoId, setLigaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarLigas();
  }, []);

  async function carregarLigas() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await ligasServico.listar();
      setLigas(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function iniciarEdicao(liga) {
    setLigaEdicaoId(liga.id);
    setFormulario({
      nome: liga.nome || '',
      descricao: liga.descricao || ''
    });
  }

  function cancelarEdicao() {
    setLigaEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      nome: formulario.nome,
      descricao: formulario.descricao || null
    };

    try {
      if (ligaEdicaoId) {
        await ligasServico.atualizar(ligaEdicaoId, dados);
      } else {
        await ligasServico.criar(dados);
      }

      cancelarEdicao();
      await carregarLigas();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerLiga(id) {
    const confirmar = window.confirm('Deseja realmente remover esta liga?');
    if (!confirmar) {
      return;
    }

    try {
      await ligasServico.remover(id);
      await carregarLigas();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Ligas</h2>
        <p>Cadastre, edite e consulte as ligas usadas para organizar as competições.</p>
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
            {salvando ? 'Salvando...' : ligaEdicaoId ? 'Atualizar liga' : 'Cadastrar liga'}
          </button>

          {ligaEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando ligas...</p>
      ) : (
        <div className="lista-cartoes">
          {ligas.map((liga) => (
            <article key={liga.id} className="cartao-lista">
              <div>
                <h3>{liga.nome}</h3>
                <p>Descrição: {liga.descricao || '-'}</p>
                <p>Criada em: {formatarDataHora(liga.dataCriacao)}</p>
                <p>Atualizada em: {formatarDataHora(liga.dataAtualizacao)}</p>
              </div>

              <div className="acoes-item">
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(liga)}>
                  Editar
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerLiga(liga.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          {ligas.length === 0 && <p>Nenhuma liga cadastrada.</p>}
        </div>
      )}
    </section>
  );
}
