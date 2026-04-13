import { useEffect, useRef, useState } from 'react';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { locaisServico } from '../services/locaisServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { rolarParaElemento, rolarParaTopo } from '../utils/rolagem';
import { ehAdministrador } from '../utils/perfis';

const estadoInicial = {
  nome: '',
  tipo: '1',
  quantidadeQuadras: '1'
};

const tiposLocal = [
  { valor: 1, rotulo: 'Arena particular' },
  { valor: 2, rotulo: 'Rede na praia de grupo de amigos' },
  { valor: 3, rotulo: 'Rede na praia de escola de futevôlei' },
  { valor: 4, rotulo: 'Arena temporária' }
];

export function PaginaLocais() {
  const { usuario } = useAutenticacao();
  const usuarioAdministrador = ehAdministrador(usuario);
  const [locais, setLocais] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [localEdicaoId, setLocalEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const formularioRef = useRef(null);

  useEffect(() => {
    carregarLocais();
  }, []);

  async function carregarLocais() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await locaisServico.listar();
      setLocais(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function iniciarEdicao(local) {
    if (!usuarioAdministrador && local.usuarioCriadorId !== usuario?.id) {
      setErro('Você só pode editar locais criados pelo próprio usuário.');
      return;
    }

    setLocalEdicaoId(local.id);
    setFormulario({
      nome: local.nome || '',
      tipo: String(local.tipo),
      quantidadeQuadras: String(local.quantidadeQuadras)
    });
    rolarParaElemento(formularioRef.current);
  }

  function cancelarEdicao() {
    setLocalEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      nome: formulario.nome,
      tipo: Number(formulario.tipo),
      quantidadeQuadras: Number(formulario.quantidadeQuadras)
    };

    try {
      if (localEdicaoId) {
        await locaisServico.atualizar(localEdicaoId, dados);
      } else {
        await locaisServico.criar(dados);
      }

      cancelarEdicao();
      await carregarLocais();
      rolarParaTopo();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerLocal(id) {
    const local = locais.find((item) => item.id === id);
    if (local && !usuarioAdministrador && local.usuarioCriadorId !== usuario?.id) {
      setErro('Você só pode excluir locais criados pelo próprio usuário.');
      return;
    }

    const confirmar = window.confirm('Deseja realmente remover este local?');
    if (!confirmar) {
      return;
    }

    try {
      await locaisServico.remover(id);
      await carregarLocais();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Locais</h2>
        <p>Cadastre arenas e redes usadas para receber campeonatos, eventos e grupos.</p>
      </div>

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

        <label>
          Tipo
          <select
            value={formulario.tipo}
            onChange={(evento) => atualizarCampo('tipo', evento.target.value)}
            required
          >
            {tiposLocal.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quantidade de quadras
          <input
            type="number"
            min={1}
            step={1}
            value={formulario.quantidadeQuadras}
            onChange={(evento) => atualizarCampo('quantidadeQuadras', evento.target.value)}
            required
          />
        </label>

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>

          {localEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              <ConteudoBotao icone="cancelar" texto="Cancelar" />
            </button>
          )}
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando locais...</p>
      ) : (
        <div className="lista-cartoes">
          {locais.map((local) => (
            <article key={local.id} className="cartao-lista">
              <div>
                <h3>{local.nome}</h3>
                <p>Tipo: {tiposLocal.find((item) => item.valor === local.tipo)?.rotulo || '-'}</p>
                <p>Quadras: {local.quantidadeQuadras}</p>
                <p>Criado por: {local.nomeUsuarioCriador || 'Registro legado'}</p>
                <p>Criado em: {formatarDataHora(local.dataCriacao)}</p>
                <p>Atualizado em: {formatarDataHora(local.dataAtualizacao)}</p>
              </div>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-secundario botao-editar"
                  onClick={() => iniciarEdicao(local)}
                  disabled={!usuarioAdministrador && local.usuarioCriadorId !== usuario?.id}
                >
                  <ConteudoBotao icone="editar" texto="Editar" />
                </button>
                <button
                  type="button"
                  className="botao-perigo"
                  onClick={() => removerLocal(local.id)}
                  disabled={!usuarioAdministrador && local.usuarioCriadorId !== usuario?.id}
                >
                  <ConteudoBotao icone="excluir" texto="Excluir" />
                </button>
              </div>
            </article>
          ))}

          {locais.length === 0 && <p>Nenhum local cadastrado.</p>}
        </div>
      )}
    </section>
  );
}
