import { useEffect, useRef, useState } from 'react';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { ligasServico } from '../services/ligasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { rolarParaElemento, rolarParaTopo } from '../utils/rolagem';

const estadoInicial = {
  nome: '',
  descricao: ''
};

export function PaginaLigas() {
  const [ligas, setLigas] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [ligaEdicaoId, setLigaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const formularioRef = useRef(null);

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
    setFormularioAberto(true);
    setLigaEdicaoId(liga.id);
    setFormulario({
      nome: liga.nome || '',
      descricao: liga.descricao || ''
    });
    setTimeout(() => rolarParaElemento(formularioRef.current), 0);
  }

  function cancelarEdicao() {
    setFormularioAberto(false);
    setLigaEdicaoId(null);
    setFormulario(estadoInicial);
  }

  function abrirFormulario() {
    setLigaEdicaoId(null);
    setFormulario(estadoInicial);
    setFormularioAberto(true);
    setTimeout(() => rolarParaElemento(formularioRef.current), 0);
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
      rolarParaTopo();
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

      {!formularioAberto && (
        <div className="acoes-item campo-largo">
          <button type="button" className="botao-primario" onClick={abrirFormulario}>
            Nova liga
          </button>
        </div>
      )}

      {formularioAberto && (
        <form ref={formularioRef} className="formulario-grid" onSubmit={aoSubmeter}>
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
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>

            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              <ConteudoBotao icone="cancelar" texto={ligaEdicaoId ? 'Cancelar' : 'Fechar'} />
            </button>
          </div>
        </form>
      )}

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
                <button type="button" className="botao-secundario botao-editar" onClick={() => iniciarEdicao(liga)}>
                  <ConteudoBotao icone="editar" texto="Editar" />
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerLiga(liga.id)}>
                  <ConteudoBotao icone="excluir" texto="Excluir" />
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
