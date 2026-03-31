import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { autenticacaoServico } from '../services/autenticacaoServico';
import { extrairMensagemErro } from '../utils/erros';
import logoLiga from '../assets/logo-liga.svg';

export function PaginaLogin() {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigoRedefinicao, setCodigoRedefinicao] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [codigoMvp, setCodigoMvp] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoCodigo, setCarregandoCodigo] = useState(false);

  const { entrar, token } = useAutenticacao();
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
    setCodigoMvp('');
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
        await entrar(email, senha);
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
    setCodigoMvp('');
    setCarregandoCodigo(true);

    try {
      const resposta = await autenticacaoServico.solicitarRedefinicaoSenha({ email });
      setMensagem(resposta.mensagem);
      if (resposta.codigo) {
        setCodigoMvp(resposta.codigo);
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
        <h1>Plataforma de Futevôlei</h1>
        <p>Registre partidas, atletas e competições em um fluxo simples.</p>

        <p>O cadastro público foi desativado. Novas contas só podem ser criadas por convite. Se você recebeu um link de acesso, abra-o para criar sua senha e entrar pela primeira vez.</p>

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
            <label>
              Senha
              <input
                type="password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                placeholder="******"
                required
              />
            </label>
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

              {codigoMvp && (
                <p className="texto-aviso">
                  Código de redefinição (MVP): <strong>{codigoMvp}</strong>
                </p>
              )}

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
