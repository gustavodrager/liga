import { NavLink, Outlet } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import logoLiga from '../assets/logo-liga.svg';
import { ehAdministrador, ehAtleta, ehGestorCompeticao, nomePerfil } from '../utils/perfis';

export function LayoutPrincipal() {
  const { usuario, sair } = useAutenticacao();
  const administrador = ehAdministrador(usuario);
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const atleta = ehAtleta(usuario);
  const itensMenu = [
    { caminho: '/dashboard', nome: 'Dashboard', visivel: true },
    { caminho: '/meu-perfil', nome: 'Meu Perfil', visivel: true },
    { caminho: '/atletas', nome: 'Atletas', visivel: gestorCompeticao },
    { caminho: '/duplas', nome: 'Duplas', visivel: gestorCompeticao },
    { caminho: '/ligas', nome: 'Ligas', visivel: administrador },
    { caminho: '/locais', nome: 'Locais', visivel: gestorCompeticao },
    { caminho: '/formatos-campeonato', nome: 'Formatos', visivel: administrador },
    { caminho: '/regras', nome: 'Regras', visivel: gestorCompeticao },
    { caminho: '/modelos-importacao', nome: 'Modelos', visivel: administrador },
    { caminho: '/competicoes', nome: 'Competições', visivel: true },
    { caminho: '/ranking', nome: 'Ranking', visivel: gestorCompeticao || atleta },
    { caminho: '/categorias', nome: 'Categorias', visivel: gestorCompeticao },
    { caminho: '/inscricoes', nome: 'Inscrições', visivel: true },
    { caminho: '/partidas', nome: 'Partidas', visivel: gestorCompeticao || atleta },
    { caminho: '/usuarios', nome: 'Usuários', visivel: administrador }
  ].filter((item) => item.visivel);

  return (
    <div className="layout-app">
      <header className="topo-app">
        <div className="marca-topo">
          <img className="logo-interno" src={logoLiga} alt="Liga" />
          <div>
            <p className="marca-subtitulo">Plataforma</p>
            <h1 className="marca-titulo">Registro de Futevôlei</h1>
          </div>
        </div>

        <div className="usuario-topo">
          <span>{usuario?.nome} · {nomePerfil(usuario?.perfil)}</span>
          <button type="button" className="botao-secundario" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      <nav className="menu-principal" aria-label="Navegação principal">
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
