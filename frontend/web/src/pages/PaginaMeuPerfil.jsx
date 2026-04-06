import { useEffect, useState } from 'react';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { atletasServico } from '../services/atletasServico';
import { extrairMensagemErro } from '../utils/erros';
import {
  formatarCpfParaInput,
  formatarTelefoneParaInput,
  limparCpf,
  limparTelefone,
  normalizarDataParaApi,
  paraInputData,
  validarCpf
} from '../utils/formatacao';
import { opcoesNivelAtleta } from '../utils/niveisAtleta';
import { PERFIS_USUARIO } from '../utils/perfis';

const estadoInicialAtleta = {
  nome: '',
  apelido: '',
  telefone: '',
  email: '',
  instagram: '',
  cpf: '',
  cidade: '',
  estado: '',
  cadastroPendente: false,
  nivel: '',
  lado: '3',
  dataNascimento: ''
};

const mensagemErroAcessoOrganizador =
  'O organizador só pode alterar atletas inscritos em competições vinculadas ao próprio usuário.';
const dataMinimaNascimento = '1900-01-01';

function obterDataMaximaNascimento() {
  return new Date().toISOString().slice(0, 10);
}

function validarDataNascimento(dataNascimento) {
  if (!dataNascimento) {
    return null;
  }

  const dataNormalizada = dataNascimento.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNormalizada)) {
    return 'Informe uma data de nascimento válida.';
  }

  const [ano, mes, dia] = dataNormalizada.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const dataValida =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia;

  if (!dataValida) {
    return 'Informe uma data de nascimento válida.';
  }

  if (dataNormalizada < dataMinimaNascimento) {
    return 'Data de nascimento inválida.';
  }

  if (dataNormalizada > obterDataMaximaNascimento()) {
    return 'Data de nascimento não pode ser futura.';
  }

  return null;
}

function criarEstadoInicialAtleta(usuario) {
  return {
    ...estadoInicialAtleta,
    nome: usuario?.nome || '',
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
    cadastroPendente: Boolean(atleta.cadastroPendente),
    cidade: atleta.cidade,
    estado: atleta.estado,
    nivel: atleta.nivel
  };
}

export function PaginaMeuPerfil() {
  const { usuario, atualizarUsuarioLocal, recarregarUsuario } = useAutenticacao();
  const [usuarioDetalhe, setUsuarioDetalhe] = useState(null);
  const [formularioAtleta, setFormularioAtleta] = useState(estadoInicialAtleta);
  const [carregando, setCarregando] = useState(true);
  const [salvandoAtleta, setSalvandoAtleta] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const emailUsuarioPerfil = usuarioDetalhe?.email || usuario?.email || '';

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

      if (dadosUsuario.atletaId) {
        const atleta = await atletasServico.obterMeu();
        if (atleta) {
          preencherFormularioAtleta(atleta);
          setUsuarioDetalhe({
            ...dadosUsuario,
            atleta: criarResumoAtleta(atleta)
          });
        } else {
          const usuarioSemAtleta = {
            ...dadosUsuario,
            atletaId: null,
            atleta: null
          };

          setUsuarioDetalhe(usuarioSemAtleta);
          atualizarUsuarioLocal(usuarioSemAtleta);
          setFormularioAtleta(criarEstadoInicialAtleta(dadosUsuario));
          setErro('Atleta vinculado não encontrado. Você pode criar novamente seu atleta pelo perfil.');
        }
      } else {
        setUsuarioDetalhe(dadosUsuario);
        setFormularioAtleta(criarEstadoInicialAtleta(dadosUsuario));
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
      email: emailUsuarioPerfil,
      instagram: atleta.instagram || '',
      cpf: formatarCpfParaInput(atleta.cpf),
      cidade: atleta.cidade || '',
      estado: atleta.estado || '',
      cadastroPendente: Boolean(atleta.cadastroPendente),
      nivel: atleta.nivel ? String(atleta.nivel) : '',
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
    const cpfLimpo = limparCpf(formularioAtleta.cpf);
    if (cpfLimpo && !validarCpf(cpfLimpo)) {
      setErro('CPF inválido.');
      setMensagem('');
      return;
    }

    const erroDataNascimento = validarDataNascimento(formularioAtleta.dataNascimento);
    if (erroDataNascimento) {
      setErro(erroDataNascimento);
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
      email: emailUsuarioPerfil || null,
      instagram: formularioAtleta.instagram.trim() || null,
      cpf: cpfLimpo || null,
      cidade: formularioAtleta.cidade.trim() || null,
      estado: formularioAtleta.estado.trim() || null,
      cadastroPendente: Boolean(formularioAtleta.cadastroPendente),
      nivel: formularioAtleta.nivel ? Number(formularioAtleta.nivel) : null,
      lado: Number(formularioAtleta.lado),
      dataNascimento: normalizarDataParaApi(formularioAtleta.dataNascimento)
    };

    try {
      const atleta = await atletasServico.salvarMeu(dados);
      const possuiAtletaAnterior = Boolean(usuarioDetalhe?.atletaId);
      const proximoUsuario = {
        ...(usuarioDetalhe || usuario),
        atletaId: atleta.id,
        atleta: criarResumoAtleta(atleta)
      };

      preencherFormularioAtleta(atleta);
      setUsuarioDetalhe(proximoUsuario);
      atualizarUsuarioLocal(proximoUsuario);
      setMensagem(possuiAtletaAnterior ? 'Dados do atleta atualizados com sucesso.' : 'Atleta criado com sucesso.');
    } catch (error) {
      setErro(obterMensagemErroPerfil(error));
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
  const possuiAtleta = Boolean(usuarioDetalhe?.atletaId);
  const nomeSomenteLeitura = usuarioEhAtleta;
  const textoBotao = possuiAtleta ? 'Salvar atleta' : 'Criar meu atleta';

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Meu Perfil</h2>
      </div>

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      <form className="formulario-secoes" onSubmit={salvarAtleta}>
        <div className="secao-formulario">
          <div className="secao-formulario-cabecalho">
            <h3>Identificação</h3>
          </div>

          <div className="secao-formulario-conteudo">
            <label className="campo-largo">
              Nome completo
              <input
                type="text"
                value={formularioAtleta.nome}
                onChange={(evento) => atualizarCampoAtleta('nome', evento.target.value)}
                readOnly={nomeSomenteLeitura}
                disabled={nomeSomenteLeitura}
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
              Data de nascimento
              <input
                type="date"
                value={formularioAtleta.dataNascimento}
                onChange={(evento) => atualizarCampoAtleta('dataNascimento', evento.target.value)}
                min={dataMinimaNascimento}
                max={obterDataMaximaNascimento()}
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

          </div>
        </div>

        <div className="secao-formulario">
          <div className="secao-formulario-cabecalho">
            <h3>Contato</h3>
          </div>

          <div className="secao-formulario-conteudo">
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
                value={emailUsuarioPerfil}
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
              Cidade
              <input
                type="text"
                value={formularioAtleta.cidade}
                onChange={(evento) => atualizarCampoAtleta('cidade', evento.target.value)}
              />
            </label>

            <label>
              Estado
              <input
                type="text"
                value={formularioAtleta.estado}
                onChange={(evento) => atualizarCampoAtleta('estado', evento.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="secao-formulario">
          <div className="secao-formulario-cabecalho">
            <h3>Detalhes esportivos e cadastro</h3>
          </div>

          <div className="secao-formulario-conteudo">
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
              Nível
              <select
                value={formularioAtleta.nivel}
                onChange={(evento) => atualizarCampoAtleta('nivel', evento.target.value)}
              >
                <option value="">Selecione</option>
                {opcoesNivelAtleta.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="acoes-formulario campo-largo">
          <button type="submit" className="botao-primario" disabled={salvandoAtleta}>
            {salvandoAtleta ? 'Salvando...' : textoBotao}
          </button>
        </div>
      </form>
    </section>
  );
}
