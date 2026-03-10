import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { extrairMensagemErro } from '../utils/erros';

export function PaginaLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const { entrar, token } = useAutenticacao();
  const navegar = useNavigate();
  const localizacao = useLocation();

  useEffect(() => {
    if (token) {
      navegar('/dashboard', { replace: true });
    }
  }, [token, navegar]);

  const origem = localizacao.state?.origem?.pathname || '/dashboard';

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await entrar(email, senha);
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
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </section>
  );
}
