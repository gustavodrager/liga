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

const estadoInicialUsuario = {
  nome: '',
  email: ''
};

const mensagemErroAcessoOrganizador =
  'O organizador só pode alterar atletas inscritos em competições vinculadas ao próprio usuário.';

function criarEstadoInicialAtleta(usuario, usuarioEhAtleta) {
  return {
    ...estadoInicialAtleta,
    nome: usuarioEhAtleta ? usuario?.nome || '' : '',
    email: usuario?.email || ''
  };
}

function obterMensagemErroPerfil(error) {
  const mensagem = extrairMensagemErro(error);
  if (mensagem === mensagemErroAcessoOrganizador) {
    return 'Não foi possível atualizar o atleta vinculado por este perfil.';
  }

  return mensagem;
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
  const [formularioUsuario, setFormularioUsuario] = useState(estadoInicialUsuario);
  const [formularioAtleta, setFormularioAtleta] = useState(estadoInicialAtleta);
  const [carregando, setCarregando] = useState(true);
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);
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
        setFormularioUsuario(estadoInicialUsuario);
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
          preencherFormularioUsuario(dadosUsuario);
        } catch (error) {
          if (error?.response?.status === 404) {
            const usuarioSemAtleta = {
              ...dadosUsuario,
              atletaId: null,
              atleta: null
            };

            setUsuarioDetalhe(usuarioSemAtleta);
            atualizarUsuarioLocal(usuarioSemAtleta);
            preencherFormularioUsuario(dadosUsuario);
            setFormularioAtleta(criarEstadoInicialAtleta(dadosUsuario, usuarioEhAtleta));
            setErro('Atleta vinculado não encontrado. Você pode criar novamente seu atleta pelo perfil.');
          } else {
            throw error;
          }
        }
      } else {
        setUsuarioDetalhe(dadosUsuario);
        preencherFormularioUsuario(dadosUsuario);
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
      email: atleta.email || usuario?.email || '',
      instagram: atleta.instagram || '',
      cpf: formatarCpfParaInput(atleta.cpf),
      cadastroPendente: Boolean(atleta.cadastroPendente),
      lado: String(atleta.lado || 3),
      dataNascimento: paraInputData(atleta.dataNascimento)
    });
  }

  function preencherFormularioUsuario(dadosUsuario) {
    setFormularioUsuario({
      nome: dadosUsuario?.nome || '',
      email: dadosUsuario?.email || ''
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

  function atualizarCampoUsuario(campo, valor) {
    setFormularioUsuario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function salvarUsuario(evento) {
    evento.preventDefault();
    setSalvandoUsuario(true);
    setErro('');
    setMensagem('');

    try {
      const usuarioAtualizado = await usuariosServico.atualizarMeu({
        nome: formularioUsuario.nome
      });

      const proximoUsuario = {
        ...usuarioDetalhe,
        ...usuarioAtualizado,
        atleta: usuarioDetalhe?.atleta || null
      };

      setUsuarioDetalhe(proximoUsuario);
      preencherFormularioUsuario(usuarioAtualizado);
      atualizarUsuarioLocal(proximoUsuario);
      setMensagem('Dados do usuário atualizados com sucesso.');
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvandoUsuario(false);
    }
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
      setErro(obterMensagemErroPerfil(error));
    } finally {
      setSalvandoAtleta(false);
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
        preencherFormularioUsuario(proximoUsuario);
        atualizarUsuarioLocal(proximoUsuario);
        setMensagem('Atleta criado com sucesso.');
      } else {
        const resposta = await usuariosServico.vincularMeuAtleta({ atletaId: atleta.id });
        preencherFormularioAtleta(atleta);
        setUsuarioDetalhe({
          ...resposta,
          atleta: criarResumoAtleta(atleta)
        });
        preencherFormularioUsuario(resposta);
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
        <p>Consulte seu usuário e atualize os dados do perfil. O e-mail do acesso fica bloqueado.</p>
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
        <h3>Dados do usuário</h3>
      </div>

      <form className="formulario-grid" onSubmit={salvarUsuario}>
        <label>
          Nome completo
          <input
            type="text"
            value={formularioUsuario.nome}
            onChange={(evento) => atualizarCampoUsuario('nome', evento.target.value)}
            required
          />
        </label>

        <label>
          E-mail
          <input
            type="email"
            value={formularioUsuario.email}
            readOnly
            disabled
          />
        </label>

        <div className="acoes-formulario campo-largo">
          <button type="submit" className="botao-primario" disabled={salvandoUsuario}>
            {salvandoUsuario ? 'Salvando usuário...' : 'Salvar usuário'}
          </button>
        </div>
      </form>

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
              readOnly
              disabled
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
                readOnly
                disabled
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
