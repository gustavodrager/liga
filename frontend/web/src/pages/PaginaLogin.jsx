import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { extrairMensagemErro } from '../utils/erros';

export function PaginaLogin() {
  const [modo, setModo] = useState('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

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

  function alterarModo(novoModo) {
    setModo(novoModo);
    setErro('');
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      if (emModoRegistro) {
        await registrar(nome, email, senha);
      } else {
        await entrar(email, senha);
      }

      navegar(origem, { replace: true });
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="pagina-login">
      <div className="painel-login">
        <h1>Plataforma de Futevôlei</h1>
        <p>Registre partidas, atletas e competições em um fluxo simples.</p>

        <div className="alternador-auth">
          <button
            type="button"
            className={modo === 'login' ? 'botao-primario' : 'botao-secundario'}
            onClick={() => alterarModo('login')}
            disabled={carregando}
          >
            Entrar
          </button>
          <button
            type="button"
            className={modo === 'registro' ? 'botao-primario' : 'botao-secundario'}
            onClick={() => alterarModo('registro')}
            disabled={carregando}
          >
            Registrar
          </button>
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

          {erro && <p className="texto-erro">{erro}</p>}

          <button type="submit" className="botao-primario" disabled={carregando}>
            {carregando
              ? (emModoRegistro ? 'Registrando...' : 'Entrando...')
              : (emModoRegistro ? 'Criar conta' : 'Entrar')}
          </button>
        </form>
      </div>
    </section>
  );
}
