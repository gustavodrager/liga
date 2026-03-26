import { useEffect, useState } from 'react';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { atletasServico } from '../services/atletasServico';
import { usuariosServico } from '../services/usuariosServico';
import { extrairMensagemErro } from '../utils/erros';
import {
  formatarCpfParaInput,
  formatarTelefoneParaInput,
  limparCpf,
  limparTelefone,
  paraInputData,
  validarCpf
} from '../utils/formatacao';
import { nomePerfil, PERFIS_USUARIO } from '../utils/perfis';

const estadoInicialAtleta = {
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

function criarEstadoInicialAtleta(usuario, usuarioEhAtleta) {
  return {
    ...estadoInicialAtleta,
    nome: usuarioEhAtleta ? usuario?.nome || '' : '',
    email: usuarioEhAtleta ? usuario?.email || '' : ''
  };
}

function criarResumoAtleta(atleta) {
  if (!atleta) {
    return null;
  }

  return {
    id: atleta.id,
    nome: atleta.nome,
    apelido: atleta.apelido,
    telefone: formatarTelefoneParaInput(atleta.telefone),
    email: atleta.email,
    instagram: atleta.instagram,
    cpf: formatarCpfParaInput(atleta.cpf),
    cadastroPendente: Boolean(atleta.cadastroPendente)
  };
}

export function PaginaMeuPerfil() {
  const { usuario, atualizarUsuarioLocal, recarregarUsuario } = useAutenticacao();
  const [usuarioDetalhe, setUsuarioDetalhe] = useState(null);
  const [formularioAtleta, setFormularioAtleta] = useState(estadoInicialAtleta);
  const [buscaAtleta, setBuscaAtleta] = useState('');
  const [resultadosAtleta, setResultadosAtleta] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [salvandoAtleta, setSalvandoAtleta] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarPerfil();
  }, [usuario?.id]);

  async function carregarPerfil() {
    setCarregando(true);
    setErro('');
    setMensagem('');

    try {
      if (!usuario) {
        setUsuarioDetalhe(null);
        setFormularioAtleta(estadoInicialAtleta);
        return;
      }

      const dadosUsuario = await recarregarUsuario();
      const usuarioEhAtleta = Number(dadosUsuario.perfil) === PERFIS_USUARIO.atleta;

      if (dadosUsuario.atletaId) {
        try {
          const atleta = await atletasServico.obterPorId(dadosUsuario.atletaId);
          preencherFormularioAtleta(atleta);
          setUsuarioDetalhe({
            ...dadosUsuario,
            atleta: criarResumoAtleta(atleta)
          });
        } catch (error) {
          if (error?.response?.status === 404) {
            const usuarioSemAtleta = {
              ...dadosUsuario,
              atletaId: null,
              atleta: null
            };

            setUsuarioDetalhe(usuarioSemAtleta);
            atualizarUsuarioLocal(usuarioSemAtleta);
            setFormularioAtleta(criarEstadoInicialAtleta(dadosUsuario, usuarioEhAtleta));
            setErro('Atleta vinculado não encontrado. Você pode criar novamente seu atleta pelo perfil.');
          } else {
            throw error;
          }
        }
      } else {
        setUsuarioDetalhe(dadosUsuario);
        setFormularioAtleta(criarEstadoInicialAtleta(dadosUsuario, usuarioEhAtleta));
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function preencherFormularioAtleta(atleta) {
    setFormularioAtleta({
      nome: atleta.nome || '',
      apelido: atleta.apelido || '',
      telefone: formatarTelefoneParaInput(atleta.telefone),
      email: atleta.email || '',
      instagram: atleta.instagram || '',
      cpf: formatarCpfParaInput(atleta.cpf),
      cadastroPendente: Boolean(atleta.cadastroPendente),
      lado: String(atleta.lado || 3),
      dataNascimento: paraInputData(atleta.dataNascimento)
    });
  }

  function atualizarCampoAtleta(campo, valor) {
    if (campo === 'telefone') {
      setFormularioAtleta((anterior) => ({ ...anterior, telefone: formatarTelefoneParaInput(valor) }));
      return;
    }

    if (campo === 'cpf') {
      setFormularioAtleta((anterior) => ({ ...anterior, cpf: formatarCpfParaInput(valor) }));
      return;
    }

    setFormularioAtleta((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function salvarAtleta(evento) {
    evento.preventDefault();
    if (!usuarioDetalhe?.atletaId) {
      return;
    }

    const cpfLimpo = limparCpf(formularioAtleta.cpf);
    if (cpfLimpo && !validarCpf(cpfLimpo)) {
      setErro('CPF inválido.');
      setMensagem('');
      return;
    }

    setSalvandoAtleta(true);
    setErro('');
    setMensagem('');

    const dados = {
      nome: formularioAtleta.nome,
      apelido: formularioAtleta.apelido.trim() || null,
      telefone: limparTelefone(formularioAtleta.telefone) || null,
      email: formularioAtleta.email.trim() || null,
      instagram: formularioAtleta.instagram.trim() || null,
      cpf: cpfLimpo || null,
      cadastroPendente: Boolean(formularioAtleta.cadastroPendente),
      lado: Number(formularioAtleta.lado),
      dataNascimento: formularioAtleta.dataNascimento || null
    };

    try {
      const atleta = await atletasServico.atualizar(usuarioDetalhe.atletaId, dados);
      preencherFormularioAtleta(atleta);
      const proximoUsuario = {
        ...usuarioDetalhe,
        atleta: criarResumoAtleta(atleta)
      };
      setUsuarioDetalhe(proximoUsuario);
      atualizarUsuarioLocal(proximoUsuario);
      setMensagem('Dados do atleta atualizados com sucesso.');
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvandoAtleta(false);
    }
  }

  async function buscarAtletas() {
    setCarregandoBusca(true);
    setErro('');

    try {
      const resultados = await atletasServico.buscar(buscaAtleta);
      setResultadosAtleta(resultados);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregandoBusca(false);
    }
  }

  async function vincularAtleta(atletaId) {
    setErro('');
    setMensagem('');

    try {
      const resposta = await usuariosServico.vincularMeuAtleta({ atletaId });
      atualizarUsuarioLocal(resposta);
      setResultadosAtleta([]);
      setBuscaAtleta('');

      try {
        const atleta = await atletasServico.obterPorId(atletaId);
        preencherFormularioAtleta(atleta);
        setUsuarioDetalhe({
          ...resposta,
          atleta: criarResumoAtleta(atleta)
        });
      } catch (error) {
        if (error?.response?.status === 404) {
          setUsuarioDetalhe(resposta);
        } else {
          throw error;
        }
      }

      setMensagem('Atleta vinculado com sucesso.');
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  async function criarAtletaNovo(evento) {
    evento.preventDefault();

    const cpfLimpo = limparCpf(formularioAtleta.cpf);
    if (cpfLimpo && !validarCpf(cpfLimpo)) {
      setErro('CPF inválido.');
      setMensagem('');
      return;
    }

    setSalvandoAtleta(true);
    setErro('');
    setMensagem('');

    const dados = {
      nome: formularioAtleta.nome,
      apelido: formularioAtleta.apelido.trim() || null,
      telefone: limparTelefone(formularioAtleta.telefone) || null,
      email: formularioAtleta.email.trim() || null,
      instagram: formularioAtleta.instagram.trim() || null,
      cpf: cpfLimpo || null,
      cadastroPendente: Boolean(formularioAtleta.cadastroPendente),
      lado: Number(formularioAtleta.lado),
      dataNascimento: formularioAtleta.dataNascimento || null
    };

    try {
      const atleta = await atletasServico.criar(dados);
      if (usuarioEhAtleta) {
        const proximoUsuario = {
          ...(usuarioDetalhe || usuario),
          atletaId: atleta.id,
          atleta: criarResumoAtleta(atleta)
        };

        preencherFormularioAtleta(atleta);
        setUsuarioDetalhe(proximoUsuario);
        atualizarUsuarioLocal(proximoUsuario);
        setMensagem('Atleta criado com sucesso.');
      } else {
        const resposta = await usuariosServico.vincularMeuAtleta({ atletaId: atleta.id });
        preencherFormularioAtleta(atleta);
        setUsuarioDetalhe({
          ...resposta,
          atleta: criarResumoAtleta(atleta)
        });
        atualizarUsuarioLocal(resposta);
        setMensagem('Atleta criado e vinculado com sucesso.');
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvandoAtleta(false);
    }
  }

  if (carregando) {
    return (
      <section className="pagina">
        <div className="cabecalho-pagina">
          <h2>Meu Perfil</h2>
          <p>Carregando dados do usuário...</p>
        </div>
      </section>
    );
  }

  const usuarioEhAtleta = Number(usuarioDetalhe?.perfil || usuario?.perfil) === PERFIS_USUARIO.atleta;

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Meu Perfil</h2>
        <p>Consulte seu usuário e atualize os dados do atleta vinculado.</p>
      </div>

      <div className="cartao-lista">
        <h3>{usuarioDetalhe?.nome || usuario?.nome}</h3>
        <p>E-mail: {usuarioDetalhe?.email || usuario?.email}</p>
        <p>Perfil: {nomePerfil(usuarioDetalhe?.perfil || usuario?.perfil)}</p>
        <p>Atleta vinculado: {usuarioDetalhe?.atleta?.nome || 'Nenhum atleta vinculado'}</p>
      </div>

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      <div className="cartao-lista">
        <h3>Informações do atleta</h3>
        {!usuarioDetalhe?.atletaId && usuarioEhAtleta && (
          <p>Preencha os dados abaixo para se tornar um atleta cadastrado.</p>
        )}
      </div>

      {usuarioDetalhe?.atletaId ? (
        <form className="formulario-grid" onSubmit={salvarAtleta}>
          <label>
            Nome completo
            <input
              type="text"
              value={formularioAtleta.nome}
              onChange={(evento) => atualizarCampoAtleta('nome', evento.target.value)}
              readOnly={usuarioEhAtleta}
              disabled={usuarioEhAtleta}
              required
            />
          </label>

          <label>
            Apelido
            <input
              type="text"
              value={formularioAtleta.apelido}
              onChange={(evento) => atualizarCampoAtleta('apelido', evento.target.value)}
            />
          </label>

          <label>
            Telefone
            <input
              type="text"
              value={formularioAtleta.telefone}
              onChange={(evento) => atualizarCampoAtleta('telefone', evento.target.value)}
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={formularioAtleta.email}
              onChange={(evento) => atualizarCampoAtleta('email', evento.target.value)}
              readOnly={usuarioEhAtleta}
              disabled={usuarioEhAtleta}
            />
          </label>

          <label>
            Instagram
            <input
              type="text"
              value={formularioAtleta.instagram}
              onChange={(evento) => atualizarCampoAtleta('instagram', evento.target.value)}
            />
          </label>

          <label>
            CPF
            <input
              type="text"
              value={formularioAtleta.cpf}
              onChange={(evento) => atualizarCampoAtleta('cpf', evento.target.value)}
            />
          </label>

          <label>
            Lado
            <select
              value={formularioAtleta.lado}
              onChange={(evento) => atualizarCampoAtleta('lado', evento.target.value)}
            >
              <option value="1">Direito</option>
              <option value="2">Esquerdo</option>
              <option value="3">Ambos</option>
            </select>
          </label>

          <label>
            Data de nascimento
            <input
              type="date"
              value={formularioAtleta.dataNascimento}
              onChange={(evento) => atualizarCampoAtleta('dataNascimento', evento.target.value)}
            />
          </label>

          <div className="acoes-formulario campo-largo">
            <button type="submit" className="botao-primario" disabled={salvandoAtleta}>
              {salvandoAtleta ? 'Salvando...' : 'Salvar atleta'}
            </button>
          </div>
        </form>
      ) : usuarioEhAtleta ? (
        <>
          <form className="formulario-grid" onSubmit={criarAtletaNovo}>
            <label>
              Nome completo
              <input type="text" value={formularioAtleta.nome} readOnly disabled />
            </label>

            <label>
              Apelido
              <input
                type="text"
                value={formularioAtleta.apelido}
                onChange={(evento) => atualizarCampoAtleta('apelido', evento.target.value)}
              />
            </label>

            <label>
              Telefone
              <input
                type="text"
                value={formularioAtleta.telefone}
                onChange={(evento) => atualizarCampoAtleta('telefone', evento.target.value)}
              />
            </label>

            <label>
              E-mail
              <input type="email" value={formularioAtleta.email} readOnly disabled />
            </label>

            <label>
              Instagram
              <input
                type="text"
                value={formularioAtleta.instagram}
                onChange={(evento) => atualizarCampoAtleta('instagram', evento.target.value)}
              />
            </label>

            <label>
              CPF
              <input
                type="text"
                value={formularioAtleta.cpf}
                onChange={(evento) => atualizarCampoAtleta('cpf', evento.target.value)}
              />
            </label>

            <label>
              Lado
              <select
                value={formularioAtleta.lado}
                onChange={(evento) => atualizarCampoAtleta('lado', evento.target.value)}
              >
                <option value="1">Direito</option>
                <option value="2">Esquerdo</option>
                <option value="3">Ambos</option>
              </select>
            </label>

            <label>
              Data de nascimento
              <input
                type="date"
                value={formularioAtleta.dataNascimento}
                onChange={(evento) => atualizarCampoAtleta('dataNascimento', evento.target.value)}
              />
            </label>

            <div className="acoes-formulario campo-largo">
              <button type="submit" className="botao-primario" disabled={salvandoAtleta}>
                {salvandoAtleta ? 'Salvando...' : 'Criar meu atleta'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="formulario-grid">
            <label className="campo-largo">
              Vincular atleta existente
              <input
                type="text"
                value={buscaAtleta}
                onChange={(evento) => setBuscaAtleta(evento.target.value)}
                placeholder="Busque por nome, apelido, telefone ou e-mail"
              />
            </label>

            <div className="acoes-formulario">
              <button type="button" className="botao-secundario" onClick={buscarAtletas} disabled={carregandoBusca}>
                {carregandoBusca ? 'Buscando...' : 'Buscar atleta'}
              </button>
            </div>
          </div>

          {resultadosAtleta.length > 0 && (
            <div className="lista-cartoes">
              {resultadosAtleta.map((atleta) => (
                <article key={atleta.id} className="cartao-lista">
                  <div>
                    <h3>{atleta.nome}</h3>
                    <p>Apelido: {atleta.apelido || '-'}</p>
                    <p>E-mail: {atleta.email || '-'}</p>
                    <p>Telefone: {atleta.telefone || '-'}</p>
                  </div>

                  <div className="acoes-item">
                    <button type="button" className="botao-primario" onClick={() => vincularAtleta(atleta.id)}>
                      Vincular atleta existente
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <form className="formulario-grid" onSubmit={criarAtletaNovo}>
            <label>
              Nome completo
              <input
                type="text"
                value={formularioAtleta.nome}
                onChange={(evento) => atualizarCampoAtleta('nome', evento.target.value)}
                required
              />
            </label>

            <label>
              Apelido
              <input
                type="text"
                value={formularioAtleta.apelido}
                onChange={(evento) => atualizarCampoAtleta('apelido', evento.target.value)}
              />
            </label>

            <label>
              Telefone
              <input
                type="text"
                value={formularioAtleta.telefone}
                onChange={(evento) => atualizarCampoAtleta('telefone', evento.target.value)}
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                value={formularioAtleta.email}
                onChange={(evento) => atualizarCampoAtleta('email', evento.target.value)}
              />
            </label>

            <label>
              Instagram
              <input
                type="text"
                value={formularioAtleta.instagram}
                onChange={(evento) => atualizarCampoAtleta('instagram', evento.target.value)}
              />
            </label>

            <label>
              CPF
              <input
                type="text"
                value={formularioAtleta.cpf}
                onChange={(evento) => atualizarCampoAtleta('cpf', evento.target.value)}
              />
            </label>

            <label>
              Lado
              <select
                value={formularioAtleta.lado}
                onChange={(evento) => atualizarCampoAtleta('lado', evento.target.value)}
              >
                <option value="1">Direito</option>
                <option value="2">Esquerdo</option>
                <option value="3">Ambos</option>
              </select>
            </label>

            <label>
              Data de nascimento
              <input
                type="date"
                value={formularioAtleta.dataNascimento}
                onChange={(evento) => atualizarCampoAtleta('dataNascimento', evento.target.value)}
              />
            </label>

            <div className="acoes-formulario campo-largo">
              <button type="submit" className="botao-primario" disabled={salvandoAtleta}>
                {salvandoAtleta ? 'Salvando...' : 'Criar novo atleta'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
