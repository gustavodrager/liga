import { Link } from 'react-router-dom';

const atalhos = [
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
    titulo: 'Partidas',
    descricao: 'Registre placares e dupla vencedora.',
    rota: '/partidas'
  }
];

export function PaginaDashboard() {
  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Dashboard</h2>
        <p>Fluxo do MVP: atletas, duplas, competição, categoria e partidas.</p>
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
