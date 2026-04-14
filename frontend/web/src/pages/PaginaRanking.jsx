import { Fragment, useEffect, useMemo, useState } from 'react';
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
  { valor: 'competicao', rotulo: 'Competições' },
  { valor: 'liga', rotulo: 'Liga' },
  { valor: 'regiao', rotulo: 'Região' },
  { valor: 'geral', rotulo: 'Geral' }
];

const generos = {
  1: 'Masculino',
  2: 'Feminino',
  3: 'Misto'
};

const TIPOS_COMPETICAO = {
  grupo: 3
};

const NOME_COMPETICAO_PARTIDAS_AVULSAS = 'Partidas avulsas';

function ehCompeticaoPartidasAvulsas(competicao) {
  return Number(competicao?.tipo) === TIPOS_COMPETICAO.grupo &&
    (competicao?.nome || '').trim().toLowerCase() === NOME_COMPETICAO_PARTIDAS_AVULSAS.toLowerCase();
}

function normalizarRanking(lista, tipoConsulta) {
  const grupos = (lista || [])
    .map((grupo) => ({
      ...grupo,
      chave: `${tipoConsulta}-${grupo.categoriaId}`,
      atletas: (grupo.atletas || []).map((atleta) => ({
        ...atleta,
        pontosPendentes: Number(atleta.pontosPendentes || 0),
        partidas: atleta.partidas || []
      }))
    }));

  if (tipoConsulta !== 'competicao') {
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

function formatarRegiaoAtleta(item) {
  const partes = [item.estado, item.cidade, item.bairro].filter(Boolean);
  return partes.length > 0 ? partes.join(' / ') : '-';
}

function obterTiposConsultaDisponiveis(usuarioAtleta, ligas, competicoes) {
  const opcoes = [];

  if ((competicoes || []).length > 0) {
    opcoes.push(tiposConsulta.find((tipo) => tipo.valor === 'competicao'));
  }

  if (!usuarioAtleta && (ligas || []).length > 0) {
    opcoes.push(tiposConsulta.find((tipo) => tipo.valor === 'liga'));
  }

  opcoes.push(tiposConsulta.find((tipo) => tipo.valor === 'regiao'));
  opcoes.push(tiposConsulta.find((tipo) => tipo.valor === 'geral'));

  return opcoes.filter(Boolean);
}

export function PaginaRanking() {
  const { usuario } = useAutenticacao();
  const usuarioAtleta = ehAtleta(usuario);
  const [ligas, setLigas] = useState([]);
  const [regioes, setRegioes] = useState({ estados: [], cidades: [], bairros: [] });
  const [competicoes, setCompeticoes] = useState([]);
  const [tipoConsulta, setTipoConsulta] = useState(usuarioAtleta ? 'competicao' : 'geral');
  const [ligaId, setLigaId] = useState('');
  const [competicaoId, setCompeticaoId] = useState('');
  const [estadoRegiao, setEstadoRegiao] = useState('');
  const [cidadeRegiao, setCidadeRegiao] = useState('');
  const [bairroRegiao, setBairroRegiao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [ranking, setRanking] = useState([]);
  const [detalheAberto, setDetalheAberto] = useState(null);
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [carregandoRanking, setCarregandoRanking] = useState(false);
  const [erro, setErro] = useState('');
  const [params, setParams] = useSearchParams();
  const opcoesTipoConsulta = useMemo(() => {
    return obterTiposConsultaDisponiveis(usuarioAtleta, ligas, competicoes);
  }, [usuarioAtleta, ligas, competicoes]);
  const competicaoSelecionada = useMemo(
    () => competicoes.find((competicao) => competicao.id === competicaoId) || null,
    [competicaoId, competicoes]
  );
  const competicaoSelecionadaEhGrupo = Number(competicaoSelecionada?.tipo) === 3;
  const cidadesRegiao = useMemo(() => {
    return (regioes.cidades || [])
      .filter((cidade) => !estadoRegiao || cidade.estado === estadoRegiao)
      .map((cidade) => cidade.cidade)
      .filter((cidade, indice, lista) => lista.indexOf(cidade) === indice)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [estadoRegiao, regioes.cidades]);
  const bairrosRegiao = useMemo(() => {
    return (regioes.bairros || [])
      .filter((bairro) => !estadoRegiao || bairro.estado === estadoRegiao)
      .filter((bairro) => !cidadeRegiao || bairro.cidade === cidadeRegiao)
      .map((bairro) => bairro.bairro)
      .filter((bairro, indice, lista) => lista.indexOf(bairro) === indice)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [cidadeRegiao, estadoRegiao, regioes.bairros]);
  const categoriasRanking = useMemo(() => {
    if (tipoConsulta !== 'competicao' || competicaoSelecionadaEhGrupo) {
      return [];
    }

    return ranking
      .map((grupo) => ({
        id: grupo.categoriaId,
        nome: grupo.nomeCategoria,
        genero: grupo.genero
      }))
      .filter((categoria, indice, lista) => (
        categoria.id && lista.findIndex((item) => item.id === categoria.id) === indice
      ))
      .sort((a, b) => {
        if ((a.genero ?? 0) !== (b.genero ?? 0)) {
          return (a.genero ?? 0) - (b.genero ?? 0);
        }

        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [tipoConsulta, competicaoSelecionadaEhGrupo, ranking]);
  const exibirFiltroCategoria = tipoConsulta === 'competicao' && categoriasRanking.length > 0;
  const rankingFiltrado = useMemo(() => {
    if (!categoriaId) {
      return ranking;
    }

    return ranking.filter((grupo) => grupo.categoriaId === categoriaId);
  }, [ranking, categoriaId]);

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
  }, [tipoConsulta, ligaId, competicaoId, estadoRegiao, cidadeRegiao, bairroRegiao]);

  useEffect(() => {
    if (!categoriaId || categoriasRanking.length === 0) {
      return;
    }

    const categoriaExiste = categoriasRanking.some((categoria) => categoria.id === categoriaId);
    if (!categoriaExiste) {
      setCategoriaId('');
      atualizarParametros(tipoConsulta, ligaId, competicaoId, estadoRegiao, cidadeRegiao, bairroRegiao, '');
    }
  }, [categoriaId, categoriasRanking, tipoConsulta, ligaId, competicaoId, estadoRegiao, cidadeRegiao, bairroRegiao]);

  async function carregarBase() {
    setCarregandoBase(true);
    setErro('');

    try {
      const [listaCompeticoes, listaLigas, filtroInicial, filtroRegioes] = await Promise.all([
        competicoesServico.listar(),
        usuarioAtleta ? Promise.resolve([]) : ligasServico.listar(),
        rankingServico.obterFiltroInicial(),
        rankingServico.listarRegioesDisponiveis()
      ]);

      let competicoesDisponiveis = listaCompeticoes;
      if (usuarioAtleta) {
        if (!usuario?.atletaId) {
          competicoesDisponiveis = listaCompeticoes.filter(ehCompeticaoPartidasAvulsas);
        } else {
          const grupos = listaCompeticoes.filter((competicao) => competicao.tipo === 3);
          const gruposParticipando = await Promise.all(
            grupos.map(async (competicao) => {
              if (ehCompeticaoPartidasAvulsas(competicao)) {
                return competicao;
              }

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
      setRegioes({
        estados: filtroRegioes?.estados || [],
        cidades: filtroRegioes?.cidades || [],
        bairros: filtroRegioes?.bairros || []
      });
      setCompeticoes(competicoesDisponiveis);

      const tiposConsultaDisponiveis = obterTiposConsultaDisponiveis(
        usuarioAtleta,
        listaLigas,
        competicoesDisponiveis
      );

      const tipoUrl = params.get('tipo');
      const ligaUrl = params.get('ligaId');
      const competicaoUrl = params.get('competicaoId');
      const categoriaUrl = params.get('categoriaId');
      const estadoUrl = params.get('estado') || '';
      const cidadeUrl = params.get('cidade') || '';
      const bairroUrl = params.get('bairro') || '';
      const haFiltroUrl = Boolean(tipoUrl || ligaUrl || competicaoUrl || categoriaUrl || estadoUrl || cidadeUrl || bairroUrl);
      const competicaoHistoricoValida = filtroInicial?.competicaoId &&
        competicoesDisponiveis.some((competicao) => competicao.id === filtroInicial.competicaoId)
        ? filtroInicial.competicaoId
        : '';
      const tipoUrlValido = tiposConsultaDisponiveis.some((tipo) => tipo.valor === tipoUrl) ? tipoUrl : '';
      const tipoHistoricoValido = tiposConsultaDisponiveis.some((tipo) => tipo.valor === filtroInicial?.tipoConsulta)
        ? filtroInicial?.tipoConsulta
        : '';

      const ligaInicial = ligaUrl && listaLigas.some((liga) => liga.id === ligaUrl)
        ? ligaUrl
        : listaLigas[0]?.id || '';
      const competicaoInicial = competicaoUrl && competicoesDisponiveis.some((competicao) => competicao.id === competicaoUrl)
        ? competicaoUrl
        : !haFiltroUrl && competicaoHistoricoValida
          ? competicaoHistoricoValida
          : competicoesDisponiveis[0]?.id || '';
      const tipoConsultaPadrao = usuarioAtleta && competicoesDisponiveis.length > 0 ? 'competicao' : 'geral';
      const tipoConsultaInicial = tipoUrlValido || tipoHistoricoValido || tipoConsultaPadrao;

      setTipoConsulta(tipoConsultaInicial);
      setLigaId(ligaInicial);
      setCompeticaoId(competicaoInicial);
      setEstadoRegiao(estadoUrl);
      setCidadeRegiao(cidadeUrl);
      setBairroRegiao(bairroUrl);
      setCategoriaId(tipoConsultaInicial === 'competicao' ? categoriaUrl || '' : '');
      atualizarParametros(
        tipoConsultaInicial,
        ligaInicial,
        competicaoInicial,
        estadoUrl,
        cidadeUrl,
        bairroUrl,
        tipoConsultaInicial === 'competicao' ? categoriaUrl || '' : ''
      );
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
      let lista = [];
      if (tipoConsulta === 'geral') {
        lista = await rankingServico.listarAtletasGeral();
      } else if (tipoConsulta === 'liga') {
        lista = await rankingServico.listarAtletasPorLiga(ligaId);
      } else if (tipoConsulta === 'regiao') {
        lista = await rankingServico.listarAtletasPorRegiao({
          estado: estadoRegiao,
          cidade: cidadeRegiao,
          bairro: bairroRegiao
        });
      } else {
        lista = await rankingServico.listarAtletasPorCompeticao(competicaoId);
      }

      setRanking(normalizarRanking(lista, tipoConsulta));
      atualizarParametros(tipoConsulta, ligaId, competicaoId, estadoRegiao, cidadeRegiao, bairroRegiao, categoriaId);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setRanking([]);
    } finally {
      setCarregandoRanking(false);
    }
  }

  function atualizarParametros(
    tipo,
    novaLigaId,
    novaCompeticaoId,
    novoEstadoRegiao = '',
    novaCidadeRegiao = '',
    novoBairroRegiao = '',
    novaCategoriaId = ''
  ) {
    const proximos = { tipo };

    if (tipo === 'liga' && novaLigaId) {
      proximos.ligaId = novaLigaId;
    }

    if (tipo === 'competicao' && novaCompeticaoId) {
      proximos.competicaoId = novaCompeticaoId;
    }

    if (tipo === 'competicao' && novaCompeticaoId && novaCategoriaId) {
      proximos.categoriaId = novaCategoriaId;
    }

    if (tipo === 'regiao') {
      if (novoEstadoRegiao) {
        proximos.estado = novoEstadoRegiao;
      }
      if (novaCidadeRegiao) {
        proximos.cidade = novaCidadeRegiao;
      }
      if (novoBairroRegiao) {
        proximos.bairro = novoBairroRegiao;
      }
    }

    setParams(proximos);
  }

  function selecionarTipoConsulta(valor) {
    setTipoConsulta(valor);
    if (valor !== 'competicao') {
      setCategoriaId('');
    }
    atualizarParametros(
      valor,
      ligaId,
      competicaoId,
      estadoRegiao,
      cidadeRegiao,
      bairroRegiao,
      valor === 'competicao' ? categoriaId : ''
    );
  }

  function selecionarLiga(valor) {
    setLigaId(valor);
    atualizarParametros(tipoConsulta, valor, competicaoId, estadoRegiao, cidadeRegiao, bairroRegiao, categoriaId);
  }

  function selecionarCompeticao(valor) {
    setCompeticaoId(valor);
    setCategoriaId('');
    atualizarParametros(tipoConsulta, ligaId, valor, estadoRegiao, cidadeRegiao, bairroRegiao, '');
  }

  function selecionarEstadoRegiao(valor) {
    setEstadoRegiao(valor);
    setCidadeRegiao('');
    setBairroRegiao('');
    atualizarParametros(tipoConsulta, ligaId, competicaoId, valor, '', '', categoriaId);
  }

  function selecionarCidadeRegiao(valor) {
    setCidadeRegiao(valor);
    setBairroRegiao('');
    atualizarParametros(tipoConsulta, ligaId, competicaoId, estadoRegiao, valor, '', categoriaId);
  }

  function selecionarBairroRegiao(valor) {
    setBairroRegiao(valor);
    atualizarParametros(tipoConsulta, ligaId, competicaoId, estadoRegiao, cidadeRegiao, valor, categoriaId);
  }

  function selecionarCategoria(valor) {
    setCategoriaId(valor);
    atualizarParametros(tipoConsulta, ligaId, competicaoId, estadoRegiao, cidadeRegiao, bairroRegiao, valor);
  }

  function alternarDetalhe(chaveGrupo, atletaId) {
    const chave = `${chaveGrupo}-${atletaId}`;
    setDetalheAberto((anterior) => (anterior === chave ? null : chave));
  }

  function renderizarDetalhesAtleta(item) {
    return (
      <div className="ranking-detalhes">
        <strong>Partidas</strong>
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

      <div className="formulario-grid barra-selecao-fixa">
        <label>
          Tipo
          <select value={tipoConsulta} onChange={(evento) => selecionarTipoConsulta(evento.target.value)}>
            {opcoesTipoConsulta.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
        </label>

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
        ) : tipoConsulta === 'competicao' ? (
          <>
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

            {exibirFiltroCategoria && (
              <label>
                Categoria
                <select value={categoriaId} onChange={(evento) => selecionarCategoria(evento.target.value)}>
                  <option value="">Todas as categorias</option>
                  {categoriasRanking.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : tipoConsulta === 'regiao' ? (
          <>
            <label>
              Estado
              <select value={estadoRegiao} onChange={(evento) => selecionarEstadoRegiao(evento.target.value)}>
                <option value="">Todos os estados</option>
                {(regioes.estados || []).map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cidade
              <select value={cidadeRegiao} onChange={(evento) => selecionarCidadeRegiao(evento.target.value)}>
                <option value="">Todas as cidades</option>
                {cidadesRegiao.map((cidade) => (
                  <option key={cidade} value={cidade}>
                    {cidade}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Bairro
              <select value={bairroRegiao} onChange={(evento) => selecionarBairroRegiao(evento.target.value)}>
                <option value="">Todos os bairros</option>
                {bairrosRegiao.map((bairro) => (
                  <option key={bairro} value={bairro}>
                    {bairro}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregandoBase ? (
        <p>Carregando ranking...</p>
      ) : tipoConsulta === 'liga' && ligas.length === 0 ? (
        <p>Nenhuma liga cadastrada.</p>
      ) : tipoConsulta === 'competicao' && usuarioAtleta && competicoes.length === 0 ? (
        <p>Seu atleta ainda não participa de nenhum grupo com ranking disponível.</p>
      ) : tipoConsulta === 'competicao' && competicoes.length === 0 ? (
        <p>Nenhuma competição cadastrada.</p>
      ) : carregandoRanking ? (
        <p>Carregando ranking...</p>
      ) : rankingFiltrado.length === 0 ? (
        <p>Nenhuma pontuação encontrada para o filtro selecionado.</p>
      ) : (
        <div className="lista-cartoes">
          {rankingFiltrado.map((grupo) => (
            <article key={grupo.chave} className="cartao-lista">
              <div>
                {tipoConsulta === 'competicao' && !competicaoSelecionadaEhGrupo ? (
                  <>
                    <p>{grupo.nomeCategoria}</p>
                    <p>{`Gênero: ${generos[grupo.genero] || '-'}`}</p>
                    <p>Competição: {grupo.nomeCompeticao}</p>
                  </>
                ) : tipoConsulta !== 'competicao' ? (
                  <p>{grupo.nomeCompeticao}</p>
                ) : null}
                {tipoConsulta === 'regiao' && <p>{grupo.nomeCategoria}</p>}
              </div>

              <div className="ranking-tabela-wrapper">
                <table className="ranking-tabela">
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Atleta</th>
                      {tipoConsulta === 'regiao' && <th>Região</th>}
                      <th>Status</th>
                      <th>Pontuação</th>
                      <th>Pendentes</th>
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
                            {tipoConsulta === 'regiao' && <td>{formatarRegiaoAtleta(item)}</td>}
                            <td>
                              <span className={`tag-status ${classeStatusPendencia(item)}`}>
                                {item.statusPendencia}
                              </span>
                            </td>
                            <td>{formatarPontuacao(item.pontos)}</td>
                            <td>{formatarPontuacao(item.pontosPendentes)}</td>
                            <td>{item.jogos}</td>
                            <td>{item.vitorias}</td>
                            <td>{item.derrotas}</td>
                          </tr>
                          {aberto && (
                            <tr className="ranking-linha-detalhe">
                              <td colSpan={tipoConsulta === 'regiao' ? 9 : 8}>
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
                          {tipoConsulta === 'regiao' && <span>{formatarRegiaoAtleta(item)}</span>}
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
                          <span>Pendentes</span>
                          <strong>{formatarPontuacao(item.pontosPendentes)}</strong>
                        </div>
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
