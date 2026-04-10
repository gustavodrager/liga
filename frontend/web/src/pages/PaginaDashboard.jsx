import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { obterItensNavegacao } from './navagacao';
import { ehAdministrador, ehAtleta, ehGestorCompeticao, nomePerfil } from '../utils/perfis';
import { ESTADOS_ACESSO, nomeEstadoAcesso } from '../utils/acesso';

export function PaginaDashboard() {
  const { usuario, estadoAcesso } = useAutenticacao();
  const administrador = ehAdministrador(usuario);
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const atleta = ehAtleta(usuario);
  const atalhos = obterItensNavegacao(usuario, estadoAcesso, { incluirDashboard: false }).map((item) => ({
    titulo: item.nome,
    descricao: item.descricao,
    rota: item.caminho
  }));
  const rotaAtalhoPrincipal = estadoAcesso !== ESTADOS_ACESSO.ativo
    ? '/app/perfil'
    : atleta
      ? '/competicoes'
      : administrador
        ? '/convites-cadastro'
        : gestorCompeticao
          ? '/partidas/registrar'
          : '/app/perfil';
  const atalhoPrincipal = atalhos.find((atalho) => atalho.rota === rotaAtalhoPrincipal) || atalhos[0];

  return (
    <section className="pagina">
      
      <article className="cartao dashboard-hero">
        <div className="dashboard-hero-conteudo">
          <h3>{usuario?.nome ? `Olá, ${usuario.nome}` : 'Bem-vindo'}</h3>
          <p>
            {atalhoPrincipal
              ? `Comece por ${atalhoPrincipal.titulo} ou escolha outro atalho abaixo.`
              : 'Escolha uma área para continuar o fluxo operacional da plataforma.'}
          </p>
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
              
            </div>
            <h3>{atalho.titulo}</h3>
            <p>{atalho.descricao}</p>           
          </Link>
        ))}
      </div>
    </section>
  );
}
