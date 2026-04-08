import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { autenticacaoServico } from '../services/autenticacaoServico';
import { extrairMensagemErro } from '../utils/erros';
import logoLiga from '../assets/logo-liga.svg';

const EMAIL_LOGIN_DESENVOLVIMENTO = import.meta.env.DEV ? 'admin@teste.com' : '';

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

  const { solicitarCodigoLogin, entrarComCodigo, token } = useAutenticacao();
  const navegar = useNavigate();
  const localizacao = useLocation();

  useEffect(() => {
    if (token) {
      navegar('/dashboard', { replace: true });
    }
  }, [token, navegar]);

  const origem = localizacao.state?.origem?.pathname || '/dashboard';
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
        navegar(origem, { replace: true });
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
        <img className="logo-login" src={logoLiga} alt="Logo Liga" />
        <h1>Plataforma QuebraNunca Futevôlei</h1>
        <p>Registre partidas, atletas e competições em um fluxo simples.</p>

        <p>O cadastro público foi desativado. Novas contas só podem ser criadas por convite. Para entrar, informe seu e-mail e receba um código de acesso.</p>

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
              : (emModoRecuperacao ? 'Redefinir senha' : 'Entrar com código')}
          </button>

          {!emModoRecuperacao && (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => alterarModo('recuperacao')}
              disabled={carregando || carregandoCodigo}
            >
              Esqueci minha senha
            </button>
          )}

          {emModoRecuperacao && (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => alterarModo('login')}
              disabled={carregando || carregandoCodigo}
            >
              Voltar ao login
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
