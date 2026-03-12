import { NavLink, Outlet } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import logoLiga from '../assets/logo-liga.svg';

const itensMenu = [
  { caminho: '/dashboard', nome: 'Dashboard' },
  { caminho: '/atletas', nome: 'Atletas' },
  { caminho: '/duplas', nome: 'Duplas' },
  { caminho: '/competicoes', nome: 'Competições' },
  { caminho: '/categorias', nome: 'Categorias' },
  { caminho: '/partidas', nome: 'Partidas' }
];

export function LayoutPrincipal() {
  const { usuario, sair } = useAutenticacao();

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
          <span>{usuario?.nome}</span>
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
