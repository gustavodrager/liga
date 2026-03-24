import { useEffect, useRef, useState } from 'react';
import { atletasServico } from '../services/atletasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData, paraInputData } from '../utils/formatacao';
import { rolarParaElemento } from '../utils/rolagem';

const estadoInicial = {
  nome: '',
  apelido: '',
  cadastroPendente: false,
  lado: '3',
  dataNascimento: ''
};

const lados = [
  { valor: '1', rotulo: 'Direito' },
  { valor: '2', rotulo: 'Esquerdo' },
  { valor: '3', rotulo: 'Ambos' }
];

export function PaginaAtletas() {
  const [atletas, setAtletas] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [atletaEdicaoId, setAtletaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const formularioRef = useRef(null);

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
      cadastroPendente: Boolean(atleta.cadastroPendente),
      lado: String(atleta.lado || 3),
      dataNascimento: paraInputData(atleta.dataNascimento)
    });
    rolarParaElemento(formularioRef.current);
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
      apelido: formulario.apelido.trim() || null,
      cadastroPendente: Boolean(formulario.cadastroPendente),
      lado: Number(formulario.lado),
      dataNascimento: formulario.dataNascimento || null
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
        <p>Cadastre atletas com nome completo e, se necessário, informe um apelido para diferenciar o cadastro.</p>
      </div>

      <form ref={formularioRef} className="formulario-grid" onSubmit={aoSubmeter}>
        <label>
          Nome completo
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

        <label className="campo-checkbox">
          <input
            type="checkbox"
            checked={formulario.cadastroPendente}
            onChange={(evento) => atualizarCampo('cadastroPendente', evento.target.checked)}
          />
          <span>Cadastro pendente</span>
        </label>

        <label>
          Lado
          <select
            value={formulario.lado}
            onChange={(evento) => atualizarCampo('lado', evento.target.value)}
            required
          >
            {lados.map((lado) => (
              <option key={lado.valor} value={lado.valor}>
                {lado.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label>
          Data de nascimento
          <input
            type="date"
            value={formulario.dataNascimento}
            onChange={(evento) => atualizarCampo('dataNascimento', evento.target.value)}
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
                <p>Status: {atleta.cadastroPendente ? 'Cadastro pendente' : 'Cadastro completo'}</p>
                <p>Lado: {lados.find((lado) => Number(lado.valor) === atleta.lado)?.rotulo || '-'}</p>
                <p>Nascimento: {formatarData(atleta.dataNascimento)}</p>
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
