import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { autenticacaoServico } from '../services/autenticacaoServico';
import { extrairMensagemErro } from '../utils/erros';
import logoLiga from '../assets/logo-liga.svg';

export function PaginaLogin() {
  const [modo, setModo] = useState('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigoRedefinicao, setCodigoRedefinicao] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [codigoMvp, setCodigoMvp] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoCodigo, setCarregandoCodigo] = useState(false);

  const { entrar, registrar, token } = useAutenticacao();
  const navegar = useNavigate();
  const localizacao = useLocation();

  useEffect(() => {
    if (token) {
      navegar('/dashboard', { replace: true });
    }
  }, [token, navegar]);

  const origem = localizacao.state?.origem?.pathname || '/dashboard';
  const emModoRegistro = modo === 'registro';
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
      if (emModoRegistro) {
        await registrar(nome, email, senha);
      } else if (emModoRecuperacao) {
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

        <div className="alternador-auth">
          <button
            type="button"
            className={modo === 'registro' ? 'botao-primario' : 'botao-secundario'}
            onClick={() => alterarModo('registro')}
            disabled={carregando || carregandoCodigo}
          >
            Registrar
          </button>
          <button
            type="button"
            className={modo === 'recuperacao' ? 'botao-primario' : 'botao-secundario'}
            onClick={() => alterarModo('recuperacao')}
            disabled={carregando || carregandoCodigo}
          >
            Esqueci senha
          </button>
          {modo !== 'login' && (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => alterarModo('login')}
              disabled={carregando || carregandoCodigo}
            >
              Voltar ao login
            </button>
          )}
        </div>

        <form onSubmit={aoSubmeter} className="formulario-grid unico">
          {emModoRegistro && (
            <label>
              Nome
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder="Seu nome"
                required
              />
            </label>
          )}

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
              ? (emModoRegistro
                ? 'Registrando...'
                : emModoRecuperacao
                  ? 'Redefinindo...'
                  : 'Entrando...')
              : (emModoRegistro
                ? 'Criar conta'
                : emModoRecuperacao
                  ? 'Redefinir senha'
                  : 'Entrar')}
          </button>
        </form>
      </div>
    </section>
  );
}
