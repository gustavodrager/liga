import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { atletasServico } from '../services/atletasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData, paraInputData } from '../utils/formatacao';
import { rolarParaElemento } from '../utils/rolagem';
import { ehOrganizador } from '../utils/perfis';

const estadoInicial = {
  nome: '',
  apelido: '',
  telefone: '',
  email: '',
  instagram: '',
  cpf: '',
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
  const { usuario } = useAutenticacao();
  const usuarioOrganizador = ehOrganizador(usuario);
  const [params] = useSearchParams();
  const [atletas, setAtletas] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [atletaEdicaoId, setAtletaEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const formularioRef = useRef(null);

  useEffect(() => {
    carregarAtletas();
  }, [usuarioOrganizador]);

  useEffect(() => {
    const atletaId = params.get('atletaId');
    if (!atletaId || atletas.length === 0) {
      return;
    }

    const atleta = atletas.find((item) => item.id === atletaId);
    if (atleta) {
      iniciarEdicao(atleta);
    }
  }, [atletas, params]);

  async function carregarAtletas() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await atletasServico.listar({
        somenteInscritosMinhasCompeticoes: usuarioOrganizador
      });
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
      telefone: atleta.telefone || '',
      email: atleta.email || '',
      instagram: atleta.instagram || '',
      cpf: atleta.cpf || '',
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
      telefone: formulario.telefone.trim() || null,
      email: formulario.email.trim() || null,
      instagram: formulario.instagram.trim() || null,
      cpf: formulario.cpf.trim() || null,
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
        <p>
          {usuarioOrganizador
            ? 'Veja os atletas com inscrição ativa em competições criadas por você.'
            : 'Cadastre atletas com nome completo. Quando o cadastro não estiver pendente, informe ao menos um identificador.'}
        </p>
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

        <label>
          Telefone
          <input
            type="text"
            value={formulario.telefone}
            onChange={(evento) => atualizarCampo('telefone', evento.target.value)}
          />
        </label>

        <label>
          E-mail
          <input
            type="email"
            value={formulario.email}
            onChange={(evento) => atualizarCampo('email', evento.target.value)}
          />
        </label>

        <label>
          Instagram
          <input
            type="text"
            value={formulario.instagram}
            onChange={(evento) => atualizarCampo('instagram', evento.target.value)}
          />
        </label>

        <label>
          CPF
          <input
            type="text"
            value={formulario.cpf}
            onChange={(evento) => atualizarCampo('cpf', evento.target.value)}
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

        <div className="acoes-formulario campo-largo">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>

          {atletaEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              <ConteudoBotao icone="cancelar" texto="Cancelar" />
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
                <p>Telefone: {atleta.telefone || '-'}</p>
                <p>E-mail: {atleta.email || '-'}</p>
                <p>Instagram: {atleta.instagram || '-'}</p>
                <p>CPF: {atleta.cpf || '-'}</p>
                <p>Status: {atleta.cadastroPendente ? 'Cadastro pendente' : 'Cadastro completo'}</p>
                <p>Lado: {lados.find((lado) => Number(lado.valor) === atleta.lado)?.rotulo || '-'}</p>
                <p>Nascimento: {formatarData(atleta.dataNascimento)}</p>
                <p>Criado em: {formatarData(atleta.dataCriacao)}</p>
              </div>

              <div className="acoes-item">
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(atleta)}>
                  <ConteudoBotao icone="editar" texto="Editar" />
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerAtleta(atleta.id)}>
                  <ConteudoBotao icone="excluir" texto="Excluir" />
                </button>
              </div>
            </article>
          ))}

          {atletas.length === 0 && (
            <p>{usuarioOrganizador ? 'Nenhum atleta inscrito em competições criadas por você.' : 'Nenhum atleta cadastrado.'}</p>
          )}
        </div>
      )}
    </section>
  );
}
