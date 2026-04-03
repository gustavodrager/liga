import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { ehAdministrador, ehGestorCompeticao, PERFIS_USUARIO } from '../utils/perfis';

export function PaginaDashboard() {
  const { usuario } = useAutenticacao();
  const administrador = ehAdministrador(usuario);
  const gestorCompeticao = ehGestorCompeticao(usuario);
  const atleta = Number(usuario?.perfil) === PERFIS_USUARIO.atleta;
  const atalhos = [
    {
      titulo: 'Meu Perfil',
      descricao: 'Atualize os dados do atleta vinculados ao seu acesso.',
      rota: '/meu-perfil'
    },
    ...(administrador ? [
      {
        titulo: 'Perfil Usuário',
        descricao: 'Consulte os dados do usuário autenticado e o vínculo atual com atleta.',
        rota: '/perfil-usuario'
      }
    ] : []),
    ...(atleta ? [
      {
        titulo: 'Competições',
        descricao: 'Veja os campeonatos com inscrições abertas para participar.',
        rota: '/competicoes'
      },
      {
        titulo: 'Inscrições',
        descricao: 'Selecione campeonato e categoria para se inscrever com sua dupla ou parceiro pendente.',
        rota: '/inscricoes'
      }
    ] : []),
    ...(gestorCompeticao ? [
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

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Dashboard</h2>
        <p>Use os atalhos disponíveis para o seu perfil.</p>
      </div>

      <div className="grade-cartoes">
        {atalhos.map((atalho) => (
          <article key={atalho.rota} className="cartao">
            <h3>{atalho.titulo}</h3>
            <p>{atalho.descricao}</p>
            <Link to={atalho.rota} className="link-acao">
              Acessar
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
