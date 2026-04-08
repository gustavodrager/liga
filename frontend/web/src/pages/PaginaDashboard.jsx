import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { obterItensNavegacao } from './navagacao';
import { ehAdministrador, ehAtleta, ehGestorCompeticao, nomePerfil } from '../utils/perfis';

export function PaginaDashboard() {
  const { usuario } = useAutenticacao();
  const administrador = ehAdministrador(usuario);
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const atleta = ehAtleta(usuario);
  const atalhos = obterItensNavegacao(usuario, { incluirDashboard: false }).map((item) => ({
    titulo: item.nome,
    descricao: item.descricao,
    rota: item.caminho
  }));
  const rotaAtalhoPrincipal = atleta
    ? '/competicoes'
    : administrador
      ? '/convites-cadastro'
      : gestorCompeticao
        ? '/partidas'
        : '/meu-perfil';
  const atalhoPrincipal = atalhos.find((atalho) => atalho.rota === rotaAtalhoPrincipal) || atalhos[0];

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Dashboard</h2>
        <p>Use os atalhos disponíveis para o seu perfil.</p>
      </div>

      <article className="cartao dashboard-hero">
        <div className="dashboard-hero-conteudo">
          <span className="dashboard-perfil">Perfil {nomePerfil(usuario?.perfil)}</span>
          <h3>{usuario?.nome ? `Olá, ${usuario.nome}` : 'Bem-vindo'}</h3>
          <p>
            {atalhoPrincipal
              ? `Comece por ${atalhoPrincipal.titulo} ou escolha outro atalho abaixo.`
              : 'Escolha uma área para continuar o fluxo operacional da plataforma.'}
          </p>
        </div>
        <div className="dashboard-hero-acoes">
          <strong>{atalhos.length} atalho(s)</strong>
          {atalhoPrincipal && (
            <Link to={atalhoPrincipal.rota} className="botao-primario dashboard-acao-principal">
              {atalhoPrincipal.titulo}
            </Link>
          )}
        </div>
      </article>

      <div className="grade-cartoes grade-atalhos">
        {atalhos.map((atalho) => (
          <Link
            key={atalho.rota}
            to={atalho.rota}
            className={`cartao cartao-atalho ${atalho.rota === atalhoPrincipal?.rota ? 'cartao-atalho-destaque' : ''}`}
          >
            <div className="cartao-atalho-cabecalho">
              <span className="cartao-atalho-meta">
                {atalho.rota === atalhoPrincipal?.rota ? 'Comece aqui' : 'Atalho'}
              </span>
            </div>
            <h3>{atalho.titulo}</h3>
            <p>{atalho.descricao}</p>
            <span className="link-acao">Acessar</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
