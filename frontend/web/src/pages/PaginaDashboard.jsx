import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { ehAdministrador, ehGestorCompeticao, nomePerfil, PERFIS_USUARIO } from '../utils/perfis';

export function PaginaDashboard() {
  const { usuario } = useAutenticacao();
  const administrador = ehAdministrador(usuario);
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const atleta = ehAtleta(usuario);
  const organizador = ehOrganizador(usuario);
  const dashboardRestrito = organizador || atleta;
  const atalhos = [
    {
      titulo: 'Meu Perfil',
      descricao: 'Atualize os dados do atleta vinculados ao seu acesso.',
      rota: '/meu-perfil'
    },
    ...(dashboardRestrito ? [
      {
        titulo: 'Pendências',
        descricao: 'Consulte vínculos e contatos pendentes para manter o fluxo das partidas regularizado.',
        rota: '/pendencias'
      },
      {
        titulo: 'Partidas',
        descricao: 'Acompanhe e registre partidas disponíveis para o seu perfil.',
        rota: '/partidas'
      },
      {
        titulo: 'Ranking',
        descricao: 'Consulte os pontos por liga e competição.',
        rota: '/ranking'
      }
    ] : []),
    ...(administrador ? [
      {
        titulo: 'Perfil Usuário',
        descricao: 'Consulte os dados do usuário autenticado e o vínculo atual com atleta.',
        rota: '/perfil-usuario'
      }
    ] : []),
    ...(gestorCompeticao && !dashboardRestrito ? [
      {
        titulo: 'Atletas',
        descricao: 'Cadastre e organize os atletas do seu circuito.',
        rota: '/atletas'
      },
      {
        titulo: 'Duplas',
        descricao: 'Monte as duplas com exatamente dois atletas.',
        rota: '/duplas'
      },
      {
        titulo: 'Competições',
        descricao: 'Crie campeonatos, eventos e grupos.',
        rota: '/competicoes'
      },
      {
        titulo: 'Categorias',
        descricao: 'Defina gênero e nível técnico por competição.',
        rota: '/categorias'
      },
      {
        titulo: 'Locais',
        descricao: 'Cadastre e mantenha os locais disponíveis para suas competições.',
        rota: '/locais'
      },
      {
        titulo: 'Regras',
        descricao: 'Crie regras reutilizáveis para partidas e pontuação.',
        rota: '/regras'
      },
      {
        titulo: 'Inscrições',
        descricao: 'Inscreva duplas em categorias de campeonatos.',
        rota: '/inscricoes'
      },
      {
        titulo: 'Partidas',
        descricao: 'Registre placares e dupla vencedora.',
        rota: '/partidas'
      },
      {
        titulo: 'Ranking',
        descricao: 'Consulte os pontos por liga e competição.',
        rota: '/ranking'
      }
    ] : []),
    ...(administrador ? [
      {
        titulo: 'Ligas',
        descricao: 'Cadastre as ligas que agrupam as competições.',
        rota: '/ligas'
      },
      {
        titulo: 'Convites',
        descricao: 'Crie e acompanhe convites fechados para novos organizadores.',
        rota: '/convites-cadastro'
      },
      {
        titulo: 'Usuários',
        descricao: 'Gerencie perfis, status e vínculo com atletas.',
        rota: '/usuarios'
      }
    ] : [])
  ];
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
