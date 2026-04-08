import { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { competicoesServico } from '../services/competicoesServico';
import { grupoAtletasServico } from '../services/grupoAtletasServico';
import { ligasServico } from '../services/ligasServico';
import { rankingServico } from '../services/rankingServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { ehAtleta } from '../utils/perfis';

const tiposConsulta = [
  { valor: 'liga', rotulo: 'Ranking da liga' },
  { valor: 'competicao', rotulo: 'Ranking da competição' },
  { valor: 'geral', rotulo: 'Ranking Geral' }
];

const generos = {
  1: 'Masculino',
  2: 'Feminino',
  3: 'Misto'
};

function normalizarRanking(lista, tipoConsulta) {
  const grupos = (lista || [])
    .map((grupo) => ({
      ...grupo,
      chave: `${tipoConsulta}-${grupo.categoriaId}`,
      atletas: (grupo.atletas || []).map((atleta) => ({
        ...atleta,
        partidas: atleta.partidas || []
      }))
    }));

  if (tipoConsulta === 'liga') {
    return grupos;
  }

  return grupos.sort((a, b) => {
    const ordemCompeticao = a.nomeCompeticao.localeCompare(b.nomeCompeticao, 'pt-BR');
    if (ordemCompeticao !== 0) {
      return ordemCompeticao;
    }

    if ((a.genero ?? 0) !== (b.genero ?? 0)) {
      return (a.genero ?? 0) - (b.genero ?? 0);
    }

    return a.nomeCategoria.localeCompare(b.nomeCategoria, 'pt-BR');
  });
}

function classeStatusPendencia(item) {
  if (item.possuiUsuarioVinculado) {
    return 'tag-status-sucesso';
  }

  return item.temEmail ? 'tag-status-alerta' : 'tag-status-erro';
}

function formatarPontuacao(valor) {
  const numero = Number(valor || 0);
  if (Number.isInteger(numero)) {
    return String(numero);
  }

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function PaginaRanking() {
  const { usuario } = useAutenticacao();
  const usuarioAtleta = ehAtleta(usuario);
  const [ligas, setLigas] = useState([]);
  const [competicoes, setCompeticoes] = useState([]);
  const [tipoConsulta, setTipoConsulta] = useState(usuarioAtleta ? 'competicao' : 'liga');
  const [ligaId, setLigaId] = useState('');
  const [competicaoId, setCompeticaoId] = useState('');
  const [ranking, setRanking] = useState([]);
  const [detalheAberto, setDetalheAberto] = useState(null);
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [carregandoRanking, setCarregandoRanking] = useState(false);
  const [erro, setErro] = useState('');
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (tipoConsulta === 'liga' && !ligaId) {
      setRanking([]);
      return;
    }

    if (tipoConsulta === 'competicao' && !competicaoId) {
      setRanking([]);
      return;
    }

    carregarRanking();
  }, [tipoConsulta, ligaId, competicaoId]);

  async function carregarBase() {
    setCarregandoBase(true);
    setErro('');

    try {
      const [listaCompeticoes, listaLigas, filtroInicial] = await Promise.all([
        competicoesServico.listar(),
        usuarioAtleta ? Promise.resolve([]) : ligasServico.listar(),
        rankingServico.obterFiltroInicial()
      ]);

      let competicoesDisponiveis = listaCompeticoes;
      if (usuarioAtleta) {
        if (!usuario?.atletaId) {
          competicoesDisponiveis = [];
        } else {
          const grupos = listaCompeticoes.filter((competicao) => competicao.tipo === 3);
          const gruposParticipando = await Promise.all(
            grupos.map(async (competicao) => {
              try {
                const atletasGrupo = await grupoAtletasServico.listarPorCompeticao(competicao.id);
                return atletasGrupo.some((item) => item.atletaId === usuario.atletaId) ? competicao : null;
              } catch {
                return null;
              }
            })
          );

          competicoesDisponiveis = gruposParticipando.filter(Boolean);
        }
      }

      setLigas(listaLigas);
      setCompeticoes(competicoesDisponiveis);

      const tipoUrl = params.get('tipo');
      const tipoInicial = usuarioAtleta
        ? 'competicao'
        : tipoUrl === 'competicao' ? 'competicao' : 'liga';
      const ligaUrl = params.get('ligaId');
      const competicaoUrl = params.get('competicaoId');
      const haFiltroUrl = Boolean(tipoUrl || ligaUrl || competicaoUrl);
      const competicaoHistoricoValida = filtroInicial?.competicaoId &&
        competicoesDisponiveis.some((competicao) => competicao.id === filtroInicial.competicaoId)
        ? filtroInicial.competicaoId
        : '';

      const ligaInicial = ligaUrl && listaLigas.some((liga) => liga.id === ligaUrl)
        ? ligaUrl
        : listaLigas[0]?.id || '';
      const competicaoInicial = competicaoUrl && competicoesDisponiveis.some((competicao) => competicao.id === competicaoUrl)
        ? competicaoUrl
        : !haFiltroUrl && competicaoHistoricoValida
          ? competicaoHistoricoValida
          : competicoesDisponiveis[0]?.id || '';
      const deveUsarCompeticaoPorAusenciaDeLiga = !usuarioAtleta &&
        listaLigas.length === 0 &&
        competicoesDisponiveis.length > 0;
      const tipoConsultaInicial = usuarioAtleta
        ? 'competicao'
        : deveUsarCompeticaoPorAusenciaDeLiga
          ? 'competicao'
        : !haFiltroUrl && competicaoHistoricoValida && filtroInicial?.tipoConsulta === 'competicao'
          ? 'competicao'
          : tipoInicial;

      setTipoConsulta(tipoConsultaInicial);
      setLigaId(ligaInicial);
      setCompeticaoId(competicaoInicial);
      atualizarParametros(tipoConsultaInicial, ligaInicial, competicaoInicial);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregandoBase(false);
    }
  }

  async function carregarRanking() {
    setCarregandoRanking(true);
    setErro('');
    setDetalheAberto(null);

    try {
      const lista = tipoConsulta === 'liga'
        ? await rankingServico.listarAtletasPorLiga(ligaId)
        : await rankingServico.listarAtletasPorCompeticao(competicaoId);

      setRanking(normalizarRanking(lista, tipoConsulta));
      atualizarParametros(tipoConsulta, ligaId, competicaoId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setRanking([]);
    } finally {
      setCarregandoRanking(false);
    }
  }

  function atualizarParametros(tipo, novaLigaId, novaCompeticaoId) {
    const proximos = { tipo };

    if (tipo === 'liga' && novaLigaId) {
      proximos.ligaId = novaLigaId;
    }

    if (tipo === 'competicao' && novaCompeticaoId) {
      proximos.competicaoId = novaCompeticaoId;
    }

    setParams(proximos);
  }

  function selecionarTipoConsulta(valor) {
    if (usuarioAtleta) {
      return;
    }

    setTipoConsulta(valor);
    atualizarParametros(valor, ligaId, competicaoId);
  }

  function selecionarLiga(valor) {
    setLigaId(valor);
    atualizarParametros(tipoConsulta, valor, competicaoId);
  }

  function selecionarCompeticao(valor) {
    setCompeticaoId(valor);
    atualizarParametros(tipoConsulta, ligaId, valor);
  }

  function alternarDetalhe(chaveGrupo, atletaId) {
    const chave = `${chaveGrupo}-${atletaId}`;
    setDetalheAberto((anterior) => (anterior === chave ? null : chave));
  }

  function renderizarDetalhesAtleta(item) {
    return (
      <div className="ranking-detalhes">
        <strong>Partidas do ranking</strong>
        {item.partidas.length === 0 ? (
          <p>Nenhuma partida detalhada.</p>
        ) : (
          <div className="ranking-detalhe-lista">
            {item.partidas.map((partida) => (
              <div key={partida.partidaId} className="ranking-detalhe-item">
                <strong>{partida.confronto}</strong>
                <span>{formatarDataHora(partida.dataPartida)}</span>
                <span>{partida.nomeCompeticao}</span>
                <span>{partida.nomeCategoria}</span>
                <span>{partida.resultado}</span>
                <span>Pontos {formatarPontuacao(partida.pontos)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Ranking</h2>
      </div>

      <div className="formulario-grid">
        {!usuarioAtleta && (
          <label>
            Tipo
            <select value={tipoConsulta} onChange={(evento) => selecionarTipoConsulta(evento.target.value)}>
              {tiposConsulta.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
          </label>
        )}

        {tipoConsulta === 'liga' ? (
          <label>
            Liga
            <select value={ligaId} onChange={(evento) => selecionarLiga(evento.target.value)}>
              <option value="">Selecione</option>
              {ligas.map((liga) => (
                <option key={liga.id} value={liga.id}>
                  {liga.nome}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Competição
            <select value={competicaoId} onChange={(evento) => selecionarCompeticao(evento.target.value)}>
              <option value="">Selecione</option>
              {competicoes.map((competicao) => (
                <option key={competicao.id} value={competicao.id}>
                  {competicao.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregandoBase ? (
        <p>Carregando ranking...</p>
      ) : tipoConsulta === 'liga' && ligas.length === 0 && competicoes.length === 0 ? (
        <p>Nenhuma liga cadastrada.</p>
      ) : usuarioAtleta && competicoes.length === 0 ? (
        <p>Seu atleta ainda não participa de nenhum grupo com ranking disponível.</p>
      ) : tipoConsulta === 'competicao' && competicoes.length === 0 ? (
        <p>Nenhuma competição cadastrada.</p>
      ) : carregandoRanking ? (
        <p>Carregando ranking...</p>
      ) : ranking.length === 0 ? (
        <p>Nenhuma pontuação encontrada para o filtro selecionado.</p>
      ) : (
        <div className="lista-cartoes">
          {ranking.map((grupo) => (
            <article key={grupo.categoriaId} className="cartao-lista">
              <div>
                <h3>{grupo.nomeCategoria}</h3>
                <p>{tipoConsulta === 'liga' ? grupo.nomeCompeticao : `Gênero: ${generos[grupo.genero] || '-'}`}</p>
                {tipoConsulta !== 'liga' && <p>Competição: {grupo.nomeCompeticao}</p>}
              </div>

              <div className="ranking-tabela-wrapper">
                <table className="ranking-tabela">
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Atleta</th>
                      <th>Status</th>
                      <th>Pontuação</th>
                      <th>Jogos</th>
                      <th>Vitórias</th>
                      <th>Derrotas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.atletas.map((item) => {
                      const chaveDetalhe = `${grupo.chave}-${item.atletaId}`;
                      const aberto = detalheAberto === chaveDetalhe;

                      return (
                        <Fragment key={item.atletaId}>
                          <tr>
                            <td>{item.posicao}º</td>
                            <td>
                              <button
                                type="button"
                                className="botao-link"
                                onClick={() => alternarDetalhe(grupo.chave, item.atletaId)}
                                aria-expanded={aberto}
                              >
                                {item.nomeAtleta}
                              </button>
                            </td>
                            <td>
                              <span className={`tag-status ${classeStatusPendencia(item)}`}>
                                {item.statusPendencia}
                              </span>
                            </td>
                            <td>{formatarPontuacao(item.pontos)}</td>
                            <td>{item.jogos}</td>
                            <td>{item.vitorias}</td>
                            <td>{item.derrotas}</td>
                          </tr>
                          {aberto && (
                            <tr className="ranking-linha-detalhe">
                              <td colSpan={7}>
                                {renderizarDetalhesAtleta(item)}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ranking-mobile-cards">
                {grupo.atletas.map((item) => {
                  const chaveDetalhe = `${grupo.chave}-${item.atletaId}`;
                  const aberto = detalheAberto === chaveDetalhe;

                  return (
                    <article key={item.atletaId} className="ranking-mobile-card">
                      <div className="ranking-mobile-topo">
                        <span className="ranking-mobile-posicao">{item.posicao}º</span>
                        <div className="ranking-mobile-identidade">
                          <strong className="ranking-mobile-nome">{item.nomeAtleta}</strong>
                          <span className={`tag-status ${classeStatusPendencia(item)}`}>
                            {item.statusPendencia}
                          </span>
                        </div>
                        <div className="ranking-mobile-pontos">
                          <span>Pontos</span>
                          <strong>{formatarPontuacao(item.pontos)}</strong>
                        </div>
                      </div>

                      <div className="ranking-mobile-metricas">
                        <div className="ranking-mobile-metrica">
                          <span>Jogos</span>
                          <strong>{item.jogos}</strong>
                        </div>
                        <div className="ranking-mobile-metrica">
                          <span>Vitórias</span>
                          <strong>{item.vitorias}</strong>
                        </div>
                        <div className="ranking-mobile-metrica">
                          <span>Derrotas</span>
                          <strong>{item.derrotas}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="botao-secundario botao-compacto ranking-mobile-detalhe-botao"
                        onClick={() => alternarDetalhe(grupo.chave, item.atletaId)}
                        aria-expanded={aberto}
                      >
                        {aberto ? 'Ocultar partidas' : 'Ver partidas'}
                      </button>

                      {aberto && renderizarDetalhesAtleta(item)}
                    </article>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
