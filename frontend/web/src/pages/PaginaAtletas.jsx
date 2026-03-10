import { useEffect, useState } from 'react';
import { atletasServico } from '../services/atletasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData } from '../utils/formatacao';

const estadoInicial = {
  nome: '',
  apelido: '',
  cidade: ''
};

export function PaginaAtletas() {
  const [atletas, setAtletas] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [atletaEdicaoId, setAtletaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarAtletas();
  }, []);

  async function carregarAtletas() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await atletasServico.listar();
      setAtletas(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function iniciarEdicao(atleta) {
    setAtletaEdicaoId(atleta.id);
    setFormulario({
      nome: atleta.nome || '',
      apelido: atleta.apelido || '',
      cidade: atleta.cidade || ''
    });
  }

  function cancelarEdicao() {
    setAtletaEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      nome: formulario.nome,
      apelido: formulario.apelido || null,
      cidade: formulario.cidade || null
    };

    try {
      if (atletaEdicaoId) {
        await atletasServico.atualizar(atletaEdicaoId, dados);
      } else {
        await atletasServico.criar(dados);
      }

      cancelarEdicao();
      await carregarAtletas();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerAtleta(id) {
    const confirmar = window.confirm('Deseja realmente remover este atleta?');
    if (!confirmar) {
      return;
    }

    try {
      await atletasServico.remover(id);
      await carregarAtletas();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Atletas</h2>
        <p>Cadastre atletas para formação das duplas.</p>
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
          Apelido
          <input
            type="text"
            value={formulario.apelido}
            onChange={(evento) => atualizarCampo('apelido', evento.target.value)}
          />
        </label>

        <label>
          Cidade
          <input
            type="text"
            value={formulario.cidade}
            onChange={(evento) => atualizarCampo('cidade', evento.target.value)}
          />
        </label>

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : atletaEdicaoId ? 'Atualizar atleta' : 'Cadastrar atleta'}
          </button>

          {atletaEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando atletas...</p>
      ) : (
        <div className="lista-cartoes">
          {atletas.map((atleta) => (
            <article key={atleta.id} className="cartao-lista">
              <div>
                <h3>{atleta.nome}</h3>
                <p>Apelido: {atleta.apelido || '-'}</p>
                <p>Cidade: {atleta.cidade || '-'}</p>
                <p>Criado em: {formatarData(atleta.dataCriacao)}</p>
              </div>

              <div className="acoes-item">
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(atleta)}>
                  Editar
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerAtleta(atleta.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          {atletas.length === 0 && <p>Nenhum atleta cadastrado.</p>}
        </div>
      )}
    </section>
  );
}
