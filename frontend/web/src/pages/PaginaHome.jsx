import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { rankingServico } from '../services/rankingServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData } from '../utils/formatacao';
import { obterLinkHttp } from '../utils/links';

const TIPO_CAMPEONATO = 1;
const TIPO_GRUPO = 3;
const NOME_COMPETICAO_PARTIDAS_AVULSAS = 'Partidas avulsas';

function obterTimestamp(data, fallback = Number.MAX_SAFE_INTEGER) {
  if (!data) {
    return fallback;
  }

  const timestamp = new Date(data).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

function ordenarPorInicio(a, b) {
  return obterTimestamp(a.dataInicio) - obterTimestamp(b.dataInicio) || a.nome.localeCompare(b.nome, 'pt-BR');
}

function ordenarPorFimDesc(a, b) {
  return obterTimestamp(b.dataFim, 0) - obterTimestamp(a.dataFim, 0) || a.nome.localeCompare(b.nome, 'pt-BR');
}

function ehCompeticaoPartidasAvulsas(competicao) {
  return Number(competicao?.tipo) === TIPO_GRUPO &&
    (competicao?.nome || '').trim().toLowerCase() === NOME_COMPETICAO_PARTIDAS_AVULSAS.toLowerCase();
}

function ehCompeticaoGrupo(competicao) {
  return Number(competicao?.tipo) === TIPO_GRUPO && !ehCompeticaoPartidasAvulsas(competicao);
}

function selecionarTopRanking(ranking) {
  const grupos = ranking || [];
  const primeiroGrupoComAtletas = grupos.find((grupo) => (grupo.atletas || []).length > 0);

  if (!primeiroGrupoComAtletas) {
    return {
      titulo: 'Ranking geral',
      atletas: []
    };
  }

  return {
    titulo: primeiroGrupoComAtletas.nomeCompeticao || primeiroGrupoComAtletas.nomeCategoria || 'Ranking geral',
    atletas: [...(primeiroGrupoComAtletas.atletas || [])]
      .sort((a, b) => (a.posicao || 0) - (b.posicao || 0))
      .slice(0, 3)
  };
}

function obterNomeLocal(competicao) {
  return competicao?.nomeLocal ||
    competicao?.localNome ||
    competicao?.local?.nome ||
    (competicao?.localId ? 'Local cadastrado' : '');
}

function montarResumoPlataforma(competicoes, ranking, resumoPublico) {
  const atletas = new Set();
  const jogos = new Set();
  const totalGruposLista = (competicoes || []).filter(ehCompeticaoGrupo).length;

  (ranking || []).forEach((grupo) => {
    (grupo.atletas || []).forEach((atleta) => {
      if (atleta.atletaId) {
        atletas.add(atleta.atletaId);
      }

      (atleta.partidas || []).forEach((partida) => {
        if (partida.partidaId) {
          jogos.add(partida.partidaId);
        }
      });
    });
  });

  return {
    atletas: atletas.size,
    jogos: jogos.size,
    grupos: resumoPublico?.totalGrupos ?? totalGruposLista
  };
}

export function PaginaHome() {
  const { token } = useAutenticacao();
  const [competicoes, setCompeticoes] = useState([]);
  const [categoriasPorCompeticao, setCategoriasPorCompeticao] = useState({});
  const [rankingGeral, setRankingGeral] = useState([]);
  const [resumoPublico, setResumoPublico] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarHome();
  }, [token]);

  const hoje = useMemo(() => {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    return data.getTime();
  }, []);

  const campeonatos = useMemo(
    () => competicoes.filter((competicao) => Number(competicao.tipo) === TIPO_CAMPEONATO),
    [competicoes]
  );

  const proximosCampeonatos = useMemo(
    () => campeonatos
      .filter((competicao) => obterTimestamp(competicao.dataFim, obterTimestamp(competicao.dataInicio)) >= hoje)
      .sort(ordenarPorInicio)
      .slice(0, 3),
    [campeonatos, hoje]
  );

  const inscricoesAbertas = useMemo(
    () => campeonatos
      .filter((competicao) => competicao.inscricoesAbertas)
      .sort(ordenarPorInicio)
      .slice(0, 4),
    [campeonatos]
  );

  const campeonatosRealizados = useMemo(
    () => campeonatos
      .filter((competicao) => competicao.dataFim && obterTimestamp(competicao.dataFim, 0) < hoje)
      .sort(ordenarPorFimDesc)
      .slice(0, 4),
    [campeonatos, hoje]
  );

  const destaqueRanking = useMemo(() => selecionarTopRanking(rankingGeral), [rankingGeral]);
  const resumoPlataforma = useMemo(
    () => montarResumoPlataforma(competicoes, rankingGeral, resumoPublico),
    [competicoes, rankingGeral, resumoPublico]
  );

  async function carregarHome() {
    setCarregando(true);
    setErro('');

    const [resultadoCompeticoes, resultadoRanking, resultadoResumo] = await Promise.allSettled([
      competicoesServico.listar(),
      rankingServico.listarAtletasGeral(),
      competicoesServico.obterResumoPublico()
    ]);

    if (resultadoCompeticoes.status === 'fulfilled') {
      const listaCompeticoes = resultadoCompeticoes.value;
      setCompeticoes(listaCompeticoes);
      await carregarCategoriasCampeonatos(listaCompeticoes);
    } else {
      setCompeticoes([]);
      setCategoriasPorCompeticao({});
      setErro(extrairMensagemErro(resultadoCompeticoes.reason));
    }

    if (resultadoRanking.status === 'fulfilled') {
      setRankingGeral(resultadoRanking.value);
    } else {
      setRankingGeral([]);
    }

    if (resultadoResumo.status === 'fulfilled') {
      setResumoPublico(resultadoResumo.value);
    } else {
      setResumoPublico(null);
    }

    setCarregando(false);
  }

  async function carregarCategoriasCampeonatos(listaCompeticoes) {
    const campeonatosHome = (listaCompeticoes || [])
      .filter((competicao) => Number(competicao.tipo) === TIPO_CAMPEONATO);

    if (campeonatosHome.length === 0) {
      setCategoriasPorCompeticao({});
      return;
    }

    const resultados = await Promise.allSettled(
      campeonatosHome.map(async (competicao) => ({
        competicaoId: competicao.id,
        categorias: await categoriasServico.listarPorCompeticao(competicao.id)
      }))
    );

    const mapa = {};
    resultados.forEach((resultado) => {
      if (resultado.status === 'fulfilled') {
        mapa[resultado.value.competicaoId] = resultado.value.categorias || [];
      }
    });

    setCategoriasPorCompeticao(mapa);
  }

  function renderizarCategoriasCampeonato(competicao) {
    const categorias = categoriasPorCompeticao[competicao.id] || [];
    const linkInscricao = obterLinkHttp(competicao.link);

    if (categorias.length === 0) {
      return null;
    }

    return (
      <div className="home-card-categorias" aria-label={`Categorias de ${competicao.nome}`}>
        {categorias.map((categoria) => (
          <div key={categoria.id} className="home-card-categoria-item">
            <span>{categoria.nome}</span>
            {linkInscricao ? (
              <a
                href={linkInscricao}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-secundario botao-compacto home-card-categoria-acao"
              >
                Inscrever dupla
              </a>
            ) : (
              <Link
                to={`/inscricoes?campeonatoId=${competicao.id}&categoriaId=${categoria.id}`}
                className="botao-secundario botao-compacto home-card-categoria-acao"
              >
                Inscrever dupla
              </Link>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderizarCardCampeonato(competicao, acao) {
    const nomeLocal = obterNomeLocal(competicao);

    return (
      <article key={competicao.id} className="cartao-lista home-card-campeonato">
        <div className="home-card-topo">
          <div className="home-card-topo-resumo">
            <span className={`tag-status ${competicao.inscricoesAbertas ? 'tag-status-sucesso' : 'tag-status-alerta'}`}>
              {competicao.inscricoesAbertas ? 'Inscrições abertas' : 'Inscrições fechadas'}
            </span>           
          </div>
        </div>
        <h3>{competicao.nome}</h3>
        {competicao.descricao && <p>{competicao.descricao}</p>} 
        <div className="home-card-detalhes">
          <span>Início: {formatarData(competicao.dataInicio)}</span>
          <span>Fim: {formatarData(competicao.dataFim)}</span>
          <span>Local: {nomeLocal || 'A definir'}</span>
        </div>
        {renderizarCategoriasCampeonato(competicao)}
        {acao}
      </article>
    );
  }

  return (
    <section className="pagina pagina-home">
      <article className="cartao home-hero">
        <div className="home-hero-conteudo">
          <span className="home-eyebrow">Plataforma Futevôlei</span>
          <h2>Registre seus jogos, crie seu ranking que a resenha está garantida.</h2>
          <p>
            Acompanhe os próximos campeonatos, entre nas inscrições abertas e consulte os rankings dos torneios já realizados.
          </p>
          <div className="home-hero-acoes">
            <Link to="/partidas/registrar" className="botao-primario home-botao">
              Registrar partida
            </Link>
            <Link to="/ranking" className="botao-secundario home-botao">
              Ver rankings
            </Link>            
          </div>
        </div>
        <div className="home-hero-resumo" aria-label="Resumo da plataforma">
          <div>
            <span>{resumoPlataforma.atletas}</span>
            <small>Atletas</small>
          </div>
          <div>
            <span>{resumoPlataforma.jogos}</span>
            <small>Jogos</small>
          </div>
          <div>
            <span>{resumoPlataforma.grupos}</span>
            <small>Grupos</small>
          </div>
        </div>
      </article>

      {carregando ? (
        <p>Carregando informações públicas...</p>
      ) : (
        <>
          <section className="home-secao">
            <div className="home-secao-cabecalho">
              <div>
                <h3>Próximos campeonatos</h3>
                <p>Eventos programados ou em andamento.</p>
              </div>             
            </div>

            <div className="grade-cartoes home-grade">
              {proximosCampeonatos.map((competicao) => renderizarCardCampeonato(
                competicao                
              ))}
              {proximosCampeonatos.length === 0 && (
                <article className="cartao-lista">
                  <h3>Nenhum campeonato próximo</h3>
                  <p>Assim que houver campeonato cadastrado, ele aparecerá aqui.</p>
                </article>
              )}
            </div>
          </section>

          <section className="home-grid-duas-colunas">
            <div className="home-secao">
              <div className="home-secao-cabecalho">
                <div>
                  <h3>Destaque do ranking</h3>
                  <p>{destaqueRanking.titulo}</p>
                </div>
                <Link to="/ranking" className="link-acao">Ranking completo</Link>
              </div>

              <div className="cartao-lista home-ranking-card">
                {destaqueRanking.atletas.length > 0 ? (
                  destaqueRanking.atletas.map((atleta) => (
                    <div key={atleta.atletaId} className="home-ranking-linha">
                      <span>{atleta.posicao}º</span>
                      <strong>{atleta.nomeAtleta}</strong>
                      <small>{atleta.pontos} pts</small>
                    </div>
                  ))
                ) : (
                  <p>Nenhuma pontuação publicada ainda.</p>
                )}
              </div>
            </div>
          </section>

          <section className="home-secao">
            <div className="home-secao-cabecalho">
              <div>
                <h3>Rankings de campeonatos realizados</h3>
                <p>Consulte a classificação dos campeonatos encerrados.</p>
              </div>
              <Link to="/ranking?tipo=competicao" className="link-acao">Ver todos</Link>
            </div>

            <div className="grade-cartoes home-grade">
              {campeonatosRealizados.map((competicao) => (
                <Link
                  key={competicao.id}
                  to={`/ranking?tipo=competicao&competicaoId=${competicao.id}`}
                  className="cartao-lista home-lista-link home-ranking-link"
                >
                  <strong>{competicao.nome}</strong>
                  <span>Encerrado em {formatarData(competicao.dataFim)}</span>
                  <small>Ver ranking do campeonato</small>
                </Link>
              ))}
              {campeonatosRealizados.length === 0 && (
                <article className="cartao-lista">
                  <p>Nenhum campeonato realizado com ranking disponível ainda.</p>
                </article>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
