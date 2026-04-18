import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { atletasServico } from '../services/atletasServico';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { pendenciasServico } from '../services/pendenciasServico';
import { rankingServico } from '../services/rankingServico';
import { nomeEstadoAcesso } from '../utils/acesso';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData } from '../utils/formatacao';
import { obterLinkHttp } from '../utils/links';
import { criarPendenciasPerfil } from '../utils/pendenciasPerfil';
import { nomePerfil } from '../utils/perfis';

const TIPO_CAMPEONATO = 1;
const TIPO_GRUPO = 3;
const NOME_COMPETICAO_PARTIDAS_AVULSAS = 'Partidas avulsas';
const TIPO_PENDENCIA_COMPLETAR_CONTATO = 2;
const STATUS_PENDENCIA_PENDENTE = 1;

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

function pendenciaAindaVisivel(item) {
  if (!item || item.status !== STATUS_PENDENCIA_PENDENTE) {
    return false;
  }

  if (item.tipo !== TIPO_PENDENCIA_COMPLETAR_CONTATO) {
    return true;
  }

  return !item.emailAtleta && !item.atletaPossuiUsuarioVinculado;
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
  const { token, usuario, estadoAcesso } = useAutenticacao();
  const [competicoes, setCompeticoes] = useState([]);
  const [categoriasPorCompeticao, setCategoriasPorCompeticao] = useState({});
  const [rankingGeral, setRankingGeral] = useState([]);
  const [pendenciasUsuario, setPendenciasUsuario] = useState([]);
  const [atletaPerfil, setAtletaPerfil] = useState(null);
  const [resumoPublico, setResumoPublico] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarHome();
  }, [token, usuario?.atletaId]);

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
  const pendenciasPerfil = useMemo(
    () => criarPendenciasPerfil({ estadoAcesso, usuario, atletaDetalhe: atletaPerfil }),
    [atletaPerfil, estadoAcesso, usuario]
  );
  const totalPendenciasHome = pendenciasUsuario.length + pendenciasPerfil.length;

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

    if (token) {
      try {
        const listaPendencias = await pendenciasServico.listar();
        setPendenciasUsuario((listaPendencias || []).filter(pendenciaAindaVisivel));
      } catch {
        setPendenciasUsuario([]);
      }

      if (usuario?.atletaId) {
        try {
          setAtletaPerfil(await atletasServico.obterMeu());
        } catch {
          setAtletaPerfil(null);
        }
      } else {
        setAtletaPerfil(null);
      }
    } else {
      setPendenciasUsuario([]);
      setAtletaPerfil(null);
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
    const inscricoesAbertas = Boolean(competicao.inscricoesAbertas);

    if (categorias.length === 0) {
      return null;
    }

    return (
      <div className="home-card-categorias" aria-label={`Categorias de ${competicao.nome}`}>
        {categorias.map((categoria) => (
          <div key={categoria.id} className="home-card-categoria-item">
            <span>{categoria.nome}</span>
            {!inscricoesAbertas ? (
              <button
                type="button"
                className="botao-secundario botao-compacto home-card-categoria-acao"
                disabled
                title="As inscrições deste campeonato estão fechadas."
              >
                Inscrever dupla
              </button>
            ) : linkInscricao ? (
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

  function renderizarCardUsuarioLogado() {
    if (!token) {
      return null;
    }

    const nomeAtleta = atletaPerfil?.nome || usuario?.atleta?.nome || '';
    const rotaPendenciaPrincipal = pendenciasUsuario.length > 0 ? '/app/pendencias' : '/app/perfil';

    return (
      <article className="cartao-lista home-usuario-card">
        <div className="home-usuario-card-conteudo">
          <div>
            <span className="home-eyebrow home-usuario-eyebrow">Acesso logado</span>
            <h3>{usuario?.nome ? `Olá, ${usuario.nome}` : 'Bem-vindo'}</h3>
            <p>
              {nomePerfil(usuario?.perfil)}
              {estadoAcesso ? ` · ${nomeEstadoAcesso(estadoAcesso)}` : ''}
            </p>
          </div>

          <div className="home-usuario-infos">
            <span>E-mail: {usuario?.email || '-'}</span>
            <span>Atleta: {nomeAtleta || 'Não vinculado'}</span>
            <span>Pendências: {totalPendenciasHome}</span>
          </div>
        </div>

        {pendenciasPerfil.length > 0 && (
          <div className="home-usuario-pendencias">
            {pendenciasPerfil.slice(0, 4).map((pendencia) => (
              <span key={pendencia.id} className="tag-status tag-status-alerta">
                {pendencia.titulo}
              </span>
            ))}
            {pendenciasPerfil.length > 4 && (
              <span className="tag-status tag-status-alerta">
                +{pendenciasPerfil.length - 4}
              </span>
            )}
          </div>
        )}

        {totalPendenciasHome > 0 && (
          <div className="acoes-item">
            <Link to={rotaPendenciaPrincipal} className="botao-primario">
              {pendenciasUsuario.length > 0 ? 'Ver pendências' : 'Completar perfil'}
            </Link>
          </div>
        )}
      </article>
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
      {renderizarCardUsuarioLogado()}

      <article className="cartao home-hero">
        <div className="home-hero-conteudo">
          <span className="home-eyebrow">Plataforma Futevôlei</span>
          <h2>Registre seus jogos, crie o grupo e monte seu ranking.</h2>
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
          {token && totalPendenciasHome > 0 && (
            <section className="home-secao">
              <article className="cartao-lista">
                <div className="linha-entre">
                  <div>
                    <h3>Pendências</h3>
                    <p>
                      {totalPendenciasHome === 1
                        ? 'Você tem 1 pendência aguardando ação.'
                        : `Você tem ${totalPendenciasHome} pendências aguardando ação.`}
                    </p>
                  </div>
                  <span className="tag-status tag-status-alerta">Ação necessária</span>
                </div>
                {pendenciasPerfil.length > 0 && (
                  <div className="home-usuario-pendencias">
                    {pendenciasPerfil.map((pendencia) => (
                      <span key={pendencia.id} className="tag-status tag-status-alerta">
                        {pendencia.titulo}
                      </span>
                    ))}
                  </div>
                )}
                <div className="acoes-item">
                  <Link to={pendenciasUsuario.length > 0 ? '/app/pendencias' : '/app/perfil'} className="botao-primario">
                    {pendenciasUsuario.length > 0 ? 'Ver pendências' : 'Completar perfil'}
                  </Link>
                </div>
              </article>
            </section>
          )}

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
