import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriasServico } from '../services/categoriasServico';
import { competicoesServico } from '../services/competicoesServico';
import { formatosCampeonatoServico } from '../services/formatosCampeonatoServico';
import { ligasServico } from '../services/ligasServico';
import { locaisServico } from '../services/locaisServico';
import { regrasCompeticaoServico } from '../services/regrasCompeticaoServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarData, paraInputData } from '../utils/formatacao';
import { rolarParaElemento } from '../utils/rolagem';

const estadoInicial = {
  nome: '',
  tipo: '1',
  descricao: '',
  dataInicio: '',
  dataFim: '',
  ligaId: '',
  localId: '',
  regraCompeticaoId: '',
  inscricoesAbertas: true
};

const tiposCompeticao = [
  { valor: 1, rotulo: 'Campeonato' },
  { valor: 2, rotulo: 'Evento' },
  { valor: 3, rotulo: 'Grupo' }
];

const estadoInicialCategoria = {
  nome: '',
  genero: '1',
  nivel: '1',
  pesoRanking: '',
  formatoCampeonatoId: ''
};

const opcoesGenero = [
  { valor: 1, rotulo: 'Masculino' },
  { valor: 2, rotulo: 'Feminino' },
  { valor: 3, rotulo: 'Misto' }
];

const opcoesNivel = [
  { valor: 1, rotulo: 'Estreante' },
  { valor: 2, rotulo: 'Iniciante' },
  { valor: 3, rotulo: 'Intermediário' },
  { valor: 4, rotulo: 'Amador' },
  { valor: 5, rotulo: 'Profissional' },
  { valor: 6, rotulo: 'Livre' }
];

export function PaginaCompeticoes() {
  const [competicoes, setCompeticoes] = useState([]);
  const [ligas, setLigas] = useState([]);
  const [locais, setLocais] = useState([]);
  const [formatosCampeonato, setFormatosCampeonato] = useState([]);
  const [regras, setRegras] = useState([]);
  const [regrasDisponiveis, setRegrasDisponiveis] = useState(true);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [competicaoEdicaoId, setCompeticaoEdicaoId] = useState(null);
  const [competicaoCategoriasId, setCompeticaoCategoriasId] = useState(null);
  const [categoriasCompeticao, setCategoriasCompeticao] = useState([]);
  const [formularioCategoria, setFormularioCategoria] = useState(estadoInicialCategoria);
  const [categoriaEdicaoId, setCategoriaEdicaoId] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const formularioCompeticaoRef = useRef(null);
  const formularioCategoriaRef = useRef(null);
  const navegar = useNavigate();

  useEffect(() => {
    carregarCompeticoes();
  }, []);

  async function carregarCompeticoes() {
    setCarregando(true);
    setErro('');
    setAviso('');

    try {
      const [listaCompeticoes, listaLigas, listaLocais, listaFormatosCampeonato] = await Promise.all([
        competicoesServico.listar(),
        ligasServico.listar(),
        locaisServico.listar(),
        formatosCampeonatoServico.listar()
      ]);

      setCompeticoes(listaCompeticoes);
      setLigas(listaLigas);
      setLocais(listaLocais);
      setFormatosCampeonato(listaFormatosCampeonato);

      try {
        const listaRegras = await regrasCompeticaoServico.listar();
        setRegras(listaRegras);
        setRegrasDisponiveis(true);
      } catch (error) {
        setRegras([]);
        setRegrasDisponiveis(false);

        if (error?.response?.status === 404) {
          setAviso('O cadastro de regras não está disponível nesta API. As competições continuam usando a regra padrão.');
        } else {
          setAviso(`Não foi possível carregar as regras de competição: ${extrairMensagemErro(error)}`);
        }
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => {
      const proximo = { ...anterior, [campo]: valor };

      if (campo === 'tipo' && Number(valor) !== 1) {
        proximo.inscricoesAbertas = false;
      }

      return proximo;
    });
  }

  function iniciarEdicao(competicao) {
    setCompeticaoEdicaoId(competicao.id);
    setFormulario({
      nome: competicao.nome,
      tipo: String(competicao.tipo),
      descricao: competicao.descricao || '',
      dataInicio: paraInputData(competicao.dataInicio),
      dataFim: paraInputData(competicao.dataFim),
      ligaId: competicao.ligaId || '',
      localId: competicao.localId || '',
      regraCompeticaoId: competicao.regraCompeticaoId || '',
      inscricoesAbertas: Boolean(competicao.inscricoesAbertas)
    });
    rolarParaElemento(formularioCompeticaoRef.current);
  }

  function cancelarEdicao() {
    setCompeticaoEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function abrirCategorias(competicaoId) {
    setCompeticaoCategoriasId((anterior) => (anterior === competicaoId ? null : competicaoId));
    setCategoriaEdicaoId(null);
    setFormularioCategoria(estadoInicialCategoria);

    if (competicaoCategoriasId === competicaoId) {
      setCategoriasCompeticao([]);
      return;
    }

    try {
      const lista = await categoriasServico.listarPorCompeticao(competicaoId);
      setCategoriasCompeticao(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setCategoriasCompeticao([]);
    }
  }

  function atualizarCampoCategoria(campo, valor) {
    setFormularioCategoria((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function iniciarEdicaoCategoria(categoria) {
    setCategoriaEdicaoId(categoria.id);
    setFormularioCategoria({
      nome: categoria.nome,
      genero: String(categoria.genero),
      nivel: String(categoria.nivel),
      pesoRanking: String(categoria.pesoRanking),
      formatoCampeonatoId: categoria.formatoCampeonatoId || ''
    });
    rolarParaElemento(formularioCategoriaRef.current);
  }

  function cancelarEdicaoCategoria() {
    setCategoriaEdicaoId(null);
    setFormularioCategoria(estadoInicialCategoria);
  }

  async function aoSubmeterCategoria(evento) {
    evento.preventDefault();

    if (!competicaoCategoriasId) {
      return;
    }

    setErro('');
    setSalvandoCategoria(true);

    const dados = {
      formatoCampeonatoId: formularioCategoria.formatoCampeonatoId || null,
      nome: formularioCategoria.nome,
      genero: Number(formularioCategoria.genero),
      nivel: Number(formularioCategoria.nivel),
      pesoRanking: formularioCategoria.pesoRanking === '' ? null : Number(formularioCategoria.pesoRanking)
    };

    try {
      if (categoriaEdicaoId) {
        await categoriasServico.atualizar(categoriaEdicaoId, dados);
      } else {
        await categoriasServico.criar({
          competicaoId: competicaoCategoriasId,
          ...dados
        });
      }

      cancelarEdicaoCategoria();
      const lista = await categoriasServico.listarPorCompeticao(competicaoCategoriasId);
      setCategoriasCompeticao(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvandoCategoria(false);
    }
  }

  async function removerCategoria(id) {
    if (!window.confirm('Deseja remover esta categoria?')) {
      return;
    }

    try {
      await categoriasServico.remover(id);
      if (competicaoCategoriasId) {
        const lista = await categoriasServico.listarPorCompeticao(competicaoCategoriasId);
        setCategoriasCompeticao(lista);
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const dados = {
      nome: formulario.nome,
      tipo: Number(formulario.tipo),
      descricao: formulario.descricao || null,
      dataInicio: formulario.dataInicio,
      dataFim: formulario.dataFim || null,
      ligaId: formulario.ligaId || null,
      localId: formulario.localId || null,
      regraCompeticaoId: formulario.regraCompeticaoId || null,
      inscricoesAbertas: Number(formulario.tipo) === 1 ? formulario.inscricoesAbertas : false
    };

    try {
      if (competicaoEdicaoId) {
        await competicoesServico.atualizar(competicaoEdicaoId, dados);
      } else {
        await competicoesServico.criar(dados);
      }

      cancelarEdicao();
      await carregarCompeticoes();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerCompeticao(id) {
    if (!window.confirm('Deseja remover esta competição?')) {
      return;
    }

    try {
      await competicoesServico.remover(id);
      await carregarCompeticoes();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Competições</h2>
        <p>Crie campeonatos, eventos e grupos de jogos.</p>
      </div>

      <form ref={formularioCompeticaoRef} className="formulario-grid" onSubmit={aoSubmeter}>
        <label>
          Nome
          <input
            type="text"
            value={formulario.nome}
            onChange={(evento) => atualizarCampo('nome', evento.target.value)}
            required
          />
        </label>

        <label>
          Tipo
          <select
            value={formulario.tipo}
            onChange={(evento) => atualizarCampo('tipo', evento.target.value)}
            required
          >
            {tiposCompeticao.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label>
          Data de início
          <input
            type="date"
            value={formulario.dataInicio}
            onChange={(evento) => atualizarCampo('dataInicio', evento.target.value)}
            required
          />
        </label>

        <label>
          Data de fim
          <input
            type="date"
            value={formulario.dataFim}
            onChange={(evento) => atualizarCampo('dataFim', evento.target.value)}
          />
        </label>

        <label className="campo-largo">
          Descrição
          <textarea
            value={formulario.descricao}
            onChange={(evento) => atualizarCampo('descricao', evento.target.value)}
            rows={3}
          />
        </label>

        <label>
          Liga
          <select
            value={formulario.ligaId}
            onChange={(evento) => atualizarCampo('ligaId', evento.target.value)}
          >
            <option value="">Sem liga</option>
            {ligas.map((liga) => (
              <option key={liga.id} value={liga.id}>
                {liga.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Local
          <select
            value={formulario.localId}
            onChange={(evento) => atualizarCampo('localId', evento.target.value)}
          >
            <option value="">Sem local</option>
            {locais.map((local) => (
              <option key={local.id} value={local.id}>
                {local.nome}
              </option>
            ))}
          </select>
        </label>

        {regrasDisponiveis && (
          <label>
            Regra
            <select
              value={formulario.regraCompeticaoId}
              onChange={(evento) => atualizarCampo('regraCompeticaoId', evento.target.value)}
            >
              <option value="">Usar padrão</option>
              {regras.map((regra) => (
                <option key={regra.id} value={regra.id}>
                  {regra.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        {Number(formulario.tipo) === 1 && (
          <label className="campo-checkbox campo-largo">
            <input
              type="checkbox"
              checked={formulario.inscricoesAbertas}
              onChange={(evento) => atualizarCampo('inscricoesAbertas', evento.target.checked)}
            />
            <span>Campeonato aceitando inscrições</span>
          </label>
        )}

        {regrasDisponiveis && (
          <div className="acoes-item campo-largo">
            <button
              type="button"
              className="botao-terciario"
              onClick={() => navegar('/regras')}
            >
              Gerenciar regras
            </button>
          </div>
        )}

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : competicaoEdicaoId ? 'Atualizar competição' : 'Cadastrar competição'}
          </button>

          {competicaoEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}
      {aviso && <p>{aviso}</p>}

      {carregando ? (
        <p>Carregando competições...</p>
      ) : (
        <div className="lista-cartoes">
          {competicoes.map((competicao) => (
            <article key={competicao.id} className="cartao-lista">
              <div>
                <h3>{competicao.nome}</h3>
                <p>Tipo: {tiposCompeticao.find((tipo) => tipo.valor === competicao.tipo)?.rotulo || '-'}</p>
                <p>Liga: {competicao.nomeLiga || '-'}</p>
                <p>Local: {competicao.nomeLocal || '-'}</p>
                <p>Regra: {competicao.nomeRegraCompeticao || 'Padrão'}</p>
                <p>Ranking da liga: {competicao.ligaId ? 'Conta automaticamente' : 'Sem liga vinculada'}</p>
                <p>Início: {formatarData(competicao.dataInicio)}</p>
                <p>Fim: {formatarData(competicao.dataFim)}</p>
                {competicao.tipo === 1 && (
                  <p>Inscrições: {competicao.inscricoesAbertas ? 'Abertas' : 'Fechadas'}</p>
                )}
                <p>
                  Regra da partida: mínimo {competicao.pontosMinimosPartidaEfetivo} pontos, diferença mínima{' '}
                  {competicao.diferencaMinimaPartidaEfetiva} e{' '}
                  {competicao.permiteEmpateEfetivo ? 'empate permitido' : 'sem empate'}
                </p>
                <p>
                  Pontuação: vitória {competicao.pontosVitoriaEfetivo} / derrota {competicao.pontosDerrotaEfetivo}
                </p>
                <p>Participação: {competicao.pontosParticipacaoEfetivo}</p>
              </div>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-terciario"
                  onClick={() => abrirCategorias(competicao.id)}
                >
                  {competicaoCategoriasId === competicao.id ? 'Fechar categorias' : 'Categorias'}
                </button>
                {competicao.tipo === 1 && (
                  <button
                    type="button"
                    className="botao-terciario"
                    onClick={() => navegar(`/inscricoes?campeonatoId=${competicao.id}`)}
                  >
                    Inscrições
                  </button>
                )}
                <button type="button" className="botao-secundario" onClick={() => iniciarEdicao(competicao)}>
                  Editar
                </button>
                <button type="button" className="botao-perigo" onClick={() => removerCompeticao(competicao.id)}>
                  Excluir
                </button>
              </div>

              {competicaoCategoriasId === competicao.id && (
                <div className="campo-largo">
                  <form ref={formularioCategoriaRef} className="formulario-grid" onSubmit={aoSubmeterCategoria}>
                    <label>
                      Nome da categoria
                      <input
                        type="text"
                        value={formularioCategoria.nome}
                        onChange={(evento) => atualizarCampoCategoria('nome', evento.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Gênero
                      <select
                        value={formularioCategoria.genero}
                        onChange={(evento) => atualizarCampoCategoria('genero', evento.target.value)}
                        required
                      >
                        {opcoesGenero.map((opcao) => (
                          <option key={opcao.valor} value={opcao.valor}>
                            {opcao.rotulo}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Nível técnico
                      <select
                        value={formularioCategoria.nivel}
                        onChange={(evento) => atualizarCampoCategoria('nivel', evento.target.value)}
                        required
                      >
                        {opcoesNivel.map((opcao) => (
                          <option key={opcao.valor} value={opcao.valor}>
                            {opcao.rotulo}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Peso no ranking
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={formularioCategoria.pesoRanking}
                        onChange={(evento) => atualizarCampoCategoria('pesoRanking', evento.target.value)}
                        placeholder="Padrão: 1"
                      />
                    </label>

                    {competicao.tipo === 1 && (
                      <label>
                        Formato do campeonato
                        <select
                          value={formularioCategoria.formatoCampeonatoId}
                          onChange={(evento) => atualizarCampoCategoria('formatoCampeonatoId', evento.target.value)}
                        >
                          <option value="">Sem formato vinculado</option>
                          {formatosCampeonato
                            .filter((formato) => formato.ativo)
                            .map((formato) => (
                              <option key={formato.id} value={formato.id}>
                                {formato.nome}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}

                    <div className="acoes-formulario campo-largo">
                      <button type="submit" className="botao-primario" disabled={salvandoCategoria}>
                        {salvandoCategoria ? 'Salvando...' : categoriaEdicaoId ? 'Atualizar categoria' : 'Cadastrar categoria'}
                      </button>

                      {categoriaEdicaoId && (
                        <button type="button" className="botao-secundario" onClick={cancelarEdicaoCategoria}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="lista-cartoes">
                    {categoriasCompeticao.map((categoria) => (
                      <article key={categoria.id} className="cartao-lista">
                        <div>
                          <h3>{categoria.nome}</h3>
                          <p>Gênero: {opcoesGenero.find((item) => item.valor === categoria.genero)?.rotulo}</p>
                          <p>Nível: {opcoesNivel.find((item) => item.valor === categoria.nivel)?.rotulo}</p>
                          <p>Peso no ranking: {categoria.pesoRanking}</p>
                          {competicao.tipo === 1 && (
                            <p>Formato: {categoria.nomeFormatoCampeonato || 'Sem formato vinculado'}</p>
                          )}
                        </div>

                        <div className="acoes-item">
                          {competicao.tipo === 1 && (
                            <button
                              type="button"
                              className="botao-terciario"
                              onClick={() => navegar(`/inscricoes?campeonatoId=${competicao.id}&categoriaId=${categoria.id}`)}
                            >
                              Inscrições
                            </button>
                          )}
                          <button type="button" className="botao-secundario" onClick={() => iniciarEdicaoCategoria(categoria)}>
                            Editar
                          </button>
                          <button type="button" className="botao-perigo" onClick={() => removerCategoria(categoria.id)}>
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))}

                    {categoriasCompeticao.length === 0 && <p>Nenhuma categoria cadastrada para esta competição.</p>}
                  </div>
                </div>
              )}
            </article>
          ))}

          {competicoes.length === 0 && <p>Nenhuma competição cadastrada.</p>}
        </div>
      )}
    </section>
  );
}
