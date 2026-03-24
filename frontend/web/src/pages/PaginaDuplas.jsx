import { useEffect, useRef, useState } from 'react';
import { atletasServico } from '../services/atletasServico';
import { duplasServico } from '../services/duplasServico';
import { extrairMensagemErro } from '../utils/erros';
import { rolarParaElemento } from '../utils/rolagem';

const estadoInicial = {
  nome: '',
  atleta1Id: '',
  atleta2Id: ''
};

export function PaginaDuplas() {
  const [duplas, setDuplas] = useState([]);
  const [atletas, setAtletas] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [duplaEdicaoId, setDuplaEdicaoId] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const formularioRef = useRef(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setErro('');
    setCarregando(true);

    try {
      const [listaDuplas, listaAtletas] = await Promise.all([duplasServico.listar(), atletasServico.listar()]);
      setDuplas(listaDuplas);
      setAtletas(listaAtletas);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function iniciarEdicao(dupla) {
    setDuplaEdicaoId(dupla.id);
    setFormulario({
      nome: dupla.nome || '',
      atleta1Id: dupla.atleta1Id,
      atleta2Id: dupla.atleta2Id
    });
    rolarParaElemento(formularioRef.current);
  }

  function cancelarEdicao() {
    setDuplaEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      nome: formulario.nome || null,
      atleta1Id: formulario.atleta1Id,
      atleta2Id: formulario.atleta2Id
    };

    try {
      if (duplaEdicaoId) {
        await duplasServico.atualizar(duplaEdicaoId, dados);
      } else {
        await duplasServico.criar(dados);
      }

      cancelarEdicao();
      await carregarDados();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerDupla(id) {
    if (!window.confirm('Deseja remover esta dupla?')) {
      return;
    }

    try {
      await duplasServico.remover(id);
      await carregarDados();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Duplas</h2>
        <p>Cada dupla precisa ter exatamente dois atletas diferentes.</p>
      </div>

      <form ref={formularioRef} className="formulario-grid" onSubmit={aoSubmeter}>
        <label>
          Nome da dupla (opcional)
          <input
            type="text"
            value={formulario.nome}
            onChange={(evento) => atualizarCampo('nome', evento.target.value)}
            placeholder="Ex: Raio Azul"
          />
        </label>

        <label>
          Atleta 1
          <select
            value={formulario.atleta1Id}
            onChange={(evento) => atualizarCampo('atleta1Id', evento.target.value)}
            required
          >
            <option value="">Selecione</option>
            {atletas.map((atleta) => (
              <option key={atleta.id} value={atleta.id}>
                {atleta.nome}{atleta.cadastroPendente ? ' (pendente)' : ''}
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
            {atletas.map((atleta) => (
              <option key={atleta.id} value={atleta.id}>
                {atleta.nome}{atleta.cadastroPendente ? ' (pendente)' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : duplaEdicaoId ? 'Atualizar dupla' : 'Cadastrar dupla'}
          </button>

          {duplaEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando duplas...</p>
      ) : (
        <div className="lista-cartoes">
          {duplas.map((dupla) => (
            <article key={dupla.id} className="cartao-lista">
              <div>
                <h3>{dupla.nome}</h3>
                <p>{dupla.nomeAtleta1} + {dupla.nomeAtleta2}</p>
              </div>

              <div className="acoes-item">
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(dupla)}>
                  Editar
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerDupla(dupla.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}

          {duplas.length === 0 && <p>Nenhuma dupla cadastrada.</p>}
        </div>
      )}
    </section>
  );
}
