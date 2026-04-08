import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import logoLiga from '../assets/logo-liga.svg';

import { ehAdministrador, ehAtleta, ehGestorCompeticao, nomePerfil } from '../utils/perfis';
 
export function LayoutPrincipal() {
  const { usuario, sair } = useAutenticacao();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const administrador = ehAdministrador(usuario);
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const atleta = ehAtleta(usuario);
  const organizador = ehOrganizador(usuario);
  const menuRestrito = organizador || atleta;
  const itensMenu = [
    { caminho: '/dashboard', nome: 'Dashboard', visivel: !menuRestrito },
    { caminho: '/meu-perfil', nome: 'Meu Perfil', visivel: true },
    { caminho: '/perfil-usuario', nome: 'Perfil Usuário', visivel: administrador },
    { caminho: '/pendencias', nome: 'Pendências', visivel: true },
    { caminho: '/atletas', nome: 'Atletas', visivel: gestorCompeticao && !menuRestrito },
    { caminho: '/duplas', nome: 'Duplas', visivel: gestorCompeticao && !menuRestrito },
    { caminho: '/ligas', nome: 'Ligas', visivel: administrador },
    { caminho: '/locais', nome: 'Locais', visivel: gestorCompeticao && !menuRestrito },
    { caminho: '/formatos-campeonato', nome: 'Formatos', visivel: administrador },
    { caminho: '/regras', nome: 'Regras', visivel: gestorCompeticao && !menuRestrito },
    { caminho: '/modelos-importacao', nome: 'Modelos', visivel: administrador },
    { caminho: '/competicoes', nome: 'Competições', visivel: !menuRestrito },
    { caminho: '/ranking', nome: 'Ranking', visivel: gestorCompeticao || atleta },
    { caminho: '/categorias', nome: 'Categorias', visivel: gestorCompeticao && !menuRestrito },
    { caminho: '/inscricoes', nome: 'Inscrições', visivel: !menuRestrito },
    { caminho: '/partidas', nome: 'Partidas', visivel: gestorCompeticao || atleta },
    { caminho: '/usuarios', nome: 'Usuários', visivel: administrador },
    { caminho: '/convites-cadastro', nome: 'Convites', visivel: administrador }
  ].filter((item) => item.visivel);

  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  return (
    <div className="layout-app">
      <header className="topo-app">
        <div className="marca-topo">
          <img className="logo-interno" src={logoLiga} alt="Liga" />
          <div className="marca-texto">
            <p className="marca-subtitulo">Plataforma</p>
            <h1 className="marca-titulo">Plataforma QuebraNunca Futevôlei</h1>
          </div>
        </div>

        <div className="usuario-topo">
          <span className="usuario-identidade">
            <span className="usuario-nome">{usuario?.nome}</span>
            <span className="usuario-perfil">{nomePerfil(usuario?.perfil)}</span>
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
          <button type="button" className="botao-secundario botao-sair-topo" onClick={sair}>
            <ConteudoBotao icone="sair" texto="Sair" />
          </button>
        </div>
      </header>

      <nav
        id="menu-principal-app"
        className={`menu-principal ${menuAberto ? 'aberto' : ''}`}
        aria-label="Navegação principal"
      >
        {itensMenu.map((item) => (
          <NavLink
            key={item.caminho}
            to={item.caminho}
            className={({ isActive }) => `item-menu ${isActive ? 'ativo' : ''}`}
          >
            {item.nome}
          </NavLink>
        ))}
      </nav>

      <main className="conteudo-principal">
        <Outlet />
      </main>
    </div>
  );
}
