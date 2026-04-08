import { ehAdministrador, ehAtleta, ehGestorCompeticao } from '../utils/perfis';

const ITENS_NAVEGACAO = [
  {
    caminho: '/dashboard',
    nome: 'Dashboard',
    mostrarNoDashboard: false,
    descricao: 'Acompanhe os atalhos disponíveis para o seu perfil.',
    visivel: () => true
  },
  {
    caminho: '/meu-perfil',
    nome: 'Meu Perfil',
    descricao: 'Atualize os dados do atleta vinculados ao seu acesso.',
    visivel: () => true
  },
  {
    caminho: '/perfil-usuario',
    nome: 'Perfil Usuário',
    descricao: 'Consulte os dados do usuário autenticado e o vínculo atual com atleta.',
    visivel: ({ administrador }) => administrador
  },
  {
    caminho: '/pendencias',
    nome: 'Pendências',
    descricao: 'Centralize aprovações de partidas e a regularização de atletas pendentes.',
    visivel: () => true
  },
  {
    caminho: '/atletas',
    nome: 'Atletas',
    descricao: 'Cadastre e organize os atletas do seu circuito.',
    visivel: ({ gestorCompeticao }) => gestorCompeticao
  },
  {
    caminho: '/duplas',
    nome: 'Duplas',
    descricao: 'Monte as duplas com exatamente dois atletas.',
    visivel: ({ gestorCompeticao }) => gestorCompeticao
  },
  {
    caminho: '/ligas',
    nome: 'Ligas',
    descricao: 'Cadastre as ligas que agrupam as competições.',
    visivel: ({ administrador }) => administrador
  },
  {
    caminho: '/locais',
    nome: 'Locais',
    descricao: 'Cadastre e mantenha os locais disponíveis para suas competições.',
    visivel: ({ gestorCompeticao }) => gestorCompeticao
  },
  {
    caminho: '/formatos-campeonato',
    nome: 'Formatos',
    descricao: 'Gerencie formatos reutilizáveis para grupos, chaves e mata-mata.',
    visivel: ({ administrador }) => administrador
  },
  {
    caminho: '/regras',
    nome: 'Regras',
    descricao: 'Crie regras reutilizáveis para partidas e pontuação.',
    visivel: ({ gestorCompeticao }) => gestorCompeticao
  },
  {
    caminho: '/modelos-importacao',
    nome: 'Modelos',
    descricao: 'Baixe modelos CSV e execute importações em lote pelos fluxos já existentes.',
    visivel: ({ administrador }) => administrador
  },
  {
    caminho: '/competicoes',
    nome: 'Competições',
    descricao: 'Veja e gerencie campeonatos, eventos e grupos disponíveis para o seu perfil.',
    visivel: () => true
  },
  {
    caminho: '/ranking',
    nome: 'Ranking',
    descricao: 'Consulte os pontos por liga e competição.',
    visivel: ({ gestorCompeticao, atleta }) => gestorCompeticao || atleta
  },
  {
    caminho: '/categorias',
    nome: 'Categorias',
    descricao: 'Defina gênero e nível técnico por competição.',
    visivel: ({ gestorCompeticao }) => gestorCompeticao
  },
  {
    caminho: '/inscricoes',
    nome: 'Inscrições',
    descricao: 'Gerencie inscrições de duplas nas categorias de campeonatos.',
    visivel: () => true
  },
  {
    caminho: '/partidas',
    nome: 'Partidas',
    descricao: 'Registre placares, dupla vencedora e acompanhe os jogos.',
    visivel: ({ gestorCompeticao, atleta }) => gestorCompeticao || atleta
  },
  {
    caminho: '/usuarios',
    nome: 'Usuários',
    descricao: 'Gerencie perfis, status e vínculo com atletas.',
    visivel: ({ administrador }) => administrador
  },
  {
    caminho: '/convites-cadastro',
    nome: 'Convites',
    descricao: 'Crie e acompanhe convites fechados para novos organizadores.',
    visivel: ({ administrador }) => administrador
  }
];

export function obterItensNavegacao(usuario, opcoes = {}) {
  const { incluirDashboard = true } = opcoes;
  const contexto = {
    administrador: ehAdministrador(usuario),
    gestorCompeticao: ehGestorCompeticao(usuario),
    atleta: ehAtleta(usuario)
  };

  return ITENS_NAVEGACAO
    .filter((item) => item.visivel(contexto))
    .filter((item) => incluirDashboard || item.mostrarNoDashboard !== false);
}
