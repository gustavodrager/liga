import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import logoLiga from '../assets/logo-liga.svg';
import { obterItensNavegacao, obterItensNavegacaoPublica } from '../pages/navagacao';
import { nomePerfil } from '../utils/perfis';
import { nomeEstadoAcesso } from '../utils/acesso';
 
export function LayoutPrincipal() {
  const { token, usuario, estadoAcesso, sair } = useAutenticacao();
  const location = useLocation();
  const navegar = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const autenticado = Boolean(token);
  const itensMenu = autenticado
    ? obterItensNavegacao(usuario, estadoAcesso)
    : obterItensNavegacaoPublica();

  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  function aoSair() {
    sair();
    navegar('/', { replace: true });
  }

  return (
    <div className="layout-app">
      <header className="topo-app">
        <NavLink to="/" className="marca-topo" aria-label="Ir para a home">
          <img className="logo-interno" src={logoLiga} alt="Liga" />
          <div className="marca-texto">
            <p className="marca-subtitulo">Plataforma</p>
            <h1 className="marca-titulo">QuebraNunca Futevôlei</h1>
          </div>
        </NavLink>

        <div className="usuario-topo">
          <span className="usuario-identidade">
            {autenticado ? (
              <>
                <span className="usuario-nome">{usuario?.nome}</span>
                <span className="usuario-perfil">
                  {nomePerfil(usuario?.perfil)}
                  {estadoAcesso ? ` · ${nomeEstadoAcesso(estadoAcesso)}` : ''}
                </span>
              </>
            ) : (
              <>
                <span className="usuario-nome">Acesso público</span>
                <span className="usuario-perfil">Visitante</span>
              </>
            )}
          </span>
          <button
            type="button"
            className="botao-terciario botao-menu-mobile"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-expanded={menuAberto}
            aria-controls="menu-principal-app"
            aria-label={menuAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            title={menuAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {menuAberto ? (
                <path
                  d="M6.7 5.3 12 10.6l5.3-5.3 1.4 1.4L13.4 12l5.3 5.3-1.4 1.4L12 13.4l-5.3 5.3-1.4-1.4L10.6 12 5.3 6.7Z"
                  fill="currentColor"
                />
              ) : (
                <path
                  d="M4 6.5h16v2H4zm0 4.5h16v2H4zm0 4.5h16v2H4z"
                  fill="currentColor"
                />
              )}
            </svg>
            <span className="rotulo-menu-mobile">{menuAberto ? 'Fechar' : 'Menu'}</span>
          </button>
          {autenticado ? (
            <button type="button" className="botao-secundario botao-sair-topo" onClick={aoSair}>
              <ConteudoBotao icone="sair" texto="Sair" />
            </button>
          ) : (
            <NavLink to="/login" className="botao-secundario botao-sair-topo">
              <ConteudoBotao icone="entrar" texto="Entrar" />
            </NavLink>
          )}
        </div>
      </header>

      <nav
        id="menu-principal-app"
        className={`menu-principal ${menuAberto ? 'aberto' : ''}`}
        aria-label="Navegação principal"
      >
        {itensMenu.map((item) => (
          item.externo ? (
            <a
              key={item.caminho}
              href={item.caminho}
              className="item-menu"
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.nome}
            </a>
          ) : (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              className={({ isActive }) => `item-menu ${isActive ? 'ativo' : ''}`}
            >
              {item.nome}
            </NavLink>
          )
        ))}
      </nav>

      <main className="conteudo-principal">
        <Outlet />
      </main>
    </div>
  );
}
