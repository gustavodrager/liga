import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { autenticacaoServico } from '../services/autenticacaoServico';
import { extrairMensagemErro } from '../utils/erros';

const USUARIOS_TESTE_DESENVOLVIMENTO = import.meta.env.DEV
  ? [
      { email: 'admin@teste.com', nome: 'Administrador' },
      { email: 'organizador@teste.com', nome: 'Organizador' },
      { email: 'atleta@teste.com', nome: 'Atleta' }
    ]
  : [];
const EMAIL_LOGIN_DESENVOLVIMENTO = USUARIOS_TESTE_DESENVOLVIMENTO[0]?.email || '';

export function PaginaLogin() {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState(EMAIL_LOGIN_DESENVOLVIMENTO);
  const [codigoLogin, setCodigoLogin] = useState('');
  const [codigoRedefinicao, setCodigoRedefinicao] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoCodigo, setCarregandoCodigo] = useState(false);
  const [codigoLoginEnviado, setCodigoLoginEnviado] = useState(false);

  const { solicitarCodigoLogin, entrarComCodigo, token, rotaInicial } = useAutenticacao();
  const navegar = useNavigate();

  useEffect(() => {
    if (token) {
      navegar(rotaInicial, { replace: true });
    }
  }, [token, rotaInicial, navegar]);

  const emModoRecuperacao = modo === 'recuperacao';

  function alterarModo(novoModo) {
    setModo(novoModo);
    setErro('');
    setMensagem('');
    setCodigoLogin('');
    setCodigoLoginEnviado(false);
    setCodigoRedefinicao('');
    setNovaSenha('');
  }

  function selecionarUsuarioTeste(emailTeste) {
    setEmail(emailTeste);
    setErro('');
    setMensagem('');
    setCodigoLogin('');
    setCodigoLoginEnviado(false);
    setCodigoRedefinicao('');
    setNovaSenha('');
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      if (emModoRecuperacao) {
        await autenticacaoServico.redefinirSenha({
          email,
          codigo: codigoRedefinicao,
          novaSenha
        });
        setMensagem('Senha redefinida com sucesso. Faça login com a nova senha.');
        setModo('login');
        setCodigoRedefinicao('');
        setNovaSenha('');
      } else {
        await entrarComCodigo(email, codigoLogin);
      }

      if (!emModoRecuperacao) {
        navegar('/', { replace: true });
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  async function aoSolicitarCodigo() {
    setErro('');
    setMensagem('');
    setCarregandoCodigo(true);

    try {
      const resposta = emModoRecuperacao
        ? await autenticacaoServico.solicitarRedefinicaoSenha({ email })
        : await solicitarCodigoLogin(email);

      if (!emModoRecuperacao && resposta.codigoDesenvolvimento) {
        setCodigoLogin(resposta.codigoDesenvolvimento);
        setMensagem(`${resposta.mensagem} Código de desenvolvimento: ${resposta.codigoDesenvolvimento}`);
      } else {
        setMensagem(resposta.mensagem);
      }

      if (!emModoRecuperacao) {
        setCodigoLoginEnviado(true);
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregandoCodigo(false);
    }
  }

  return (
    <section className="pagina-login">
      <div className="painel-login">
        
        {USUARIOS_TESTE_DESENVOLVIMENTO.length > 0 && (
          <div className="acoes-formulario">
            {USUARIOS_TESTE_DESENVOLVIMENTO.map((usuarioTeste) => (
              <button
                key={usuarioTeste.email}
                type="button"
                className="botao-secundario"
                onClick={() => selecionarUsuarioTeste(usuarioTeste.email)}
                disabled={carregando || carregandoCodigo}
              >
                {usuarioTeste.nome}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={aoSubmeter} className="formulario-grid unico">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="voce@email.com"
              required
            />
          </label>

          {!emModoRecuperacao && (
            <>
              <div className="acoes-formulario">
                <button
                  type="button"
                  className="botao-secundario"
                  onClick={aoSolicitarCodigo}
                  disabled={carregandoCodigo || carregando}
                >
                  {carregandoCodigo
                    ? 'Enviando código...'
                    : (codigoLoginEnviado ? 'Reenviar código' : 'Enviar código')}
                </button>
              </div>

              <label>
                Código de acesso
                <input
                  type="text"
                  value={codigoLogin}
                  onChange={(evento) => setCodigoLogin(evento.target.value)}
                  placeholder="Digite o código recebido por e-mail"
                  required
                />
              </label>
            </>
          )}

          {emModoRecuperacao && (
            <>
              <div className="acoes-formulario">
                <button
                  type="button"
                  className="botao-secundario"
                  onClick={aoSolicitarCodigo}
                  disabled={carregandoCodigo || carregando}
                >
                  {carregandoCodigo ? 'Enviando código...' : 'Enviar código'}
                </button>
              </div>

              <label>
                Código de redefinição
                <input
                  type="text"
                  value={codigoRedefinicao}
                  onChange={(evento) => setCodigoRedefinicao(evento.target.value)}
                  placeholder="Digite o código recebido"
                  required
                />
              </label>

              <label>
                Nova senha
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(evento) => setNovaSenha(evento.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </label>
            </>
          )}

          {erro && <p className="texto-erro">{erro}</p>}
          {mensagem && <p className="texto-sucesso">{mensagem}</p>}

          <button type="submit" className="botao-primario" disabled={carregando}>
            {carregando
              ? (emModoRecuperacao ? 'Redefinindo...' : 'Entrando...')
              : (emModoRecuperacao ? 'Redefinir senha' : 'Entrar')}
          </button>          
        </form>
      </div>
    </section>
  );
}
