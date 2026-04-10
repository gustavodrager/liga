import { useEffect, useRef, useState } from 'react';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { formatosCampeonatoServico } from '../services/formatosCampeonatoServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { rolarParaElemento } from '../utils/rolagem';

const textoAjudaCabecaDeChave =
  'O sistema de cabeça de chave serve para distribuir melhor as duplas na chave, evitando que as mais fortes se enfrentem logo nas primeiras partidas. Quando essa opção está habilitada, o organizador pode definir algumas duplas como cabeça de chave com base em ranking, histórico ou critério próprio. O sistema monta a chave respeitando essa ordem e sorteia normalmente as demais duplas.';

const tiposFormato = [
  { valor: 1, rotulo: 'Pontos corridos' },
  { valor: 2, rotulo: 'Fase de grupos' },
  { valor: 3, rotulo: 'Chave' }
];

const estadoInicial = {
  nome: '',
  descricao: '',
  tipoFormato: '1',
  ativo: true,
  quantidadeGrupos: '',
  classificadosPorGrupo: '',
  geraMataMataAposGrupos: false,
  turnoEVolta: false,
  tipoChave: '',
  quantidadeDerrotasParaEliminacao: '1',
  permiteCabecaDeChave: false,
  disputaTerceiroLugar: false
};

function limparCamposPorTipo(formulario, tipoFormato) {
  const proximo = { ...formulario, tipoFormato };

  if (Number(tipoFormato) !== 2) {
    proximo.quantidadeGrupos = '';
    proximo.classificadosPorGrupo = '';
    proximo.geraMataMataAposGrupos = false;
  }

  if (Number(tipoFormato) === 3) {
    proximo.turnoEVolta = false;
  }

  if (Number(tipoFormato) !== 1 && Number(tipoFormato) !== 2) {
    proximo.turnoEVolta = false;
  }

  if (Number(tipoFormato) !== 3) {
    proximo.tipoChave = '';
    proximo.quantidadeDerrotasParaEliminacao = '1';
    proximo.permiteCabecaDeChave = false;
    proximo.disputaTerceiroLugar = false;
  }

  if (Number(tipoFormato) === 2 && !proximo.geraMataMataAposGrupos) {
    proximo.classificadosPorGrupo = '';
  }

  return proximo;
}

function descreverTipo(tipoFormato) {
  return tiposFormato.find((tipo) => tipo.valor === tipoFormato)?.rotulo || '-';
}

export function PaginaFormatosCampeonato() {
  const [formatos, setFormatos] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [formatoEdicaoId, setFormatoEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const formularioRef = useRef(null);

  useEffect(() => {
    carregarFormatos();
  }, []);

  async function carregarFormatos() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await formatosCampeonatoServico.listar();
      setFormatos(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => {
      if (campo === 'tipoFormato') {
        return limparCamposPorTipo(anterior, valor);
      }

      const proximo = { ...anterior, [campo]: valor };

      if (campo === 'geraMataMataAposGrupos' && !valor) {
        proximo.classificadosPorGrupo = '';
      }

      return proximo;
    });
  }

  function iniciarEdicao(formato) {
    if (formato.ehPadrao) {
      setErro('Formatos padrão não podem ser alterados.');
      return;
    }

    setFormatoEdicaoId(formato.id);
    setFormulario({
      nome: formato.nome,
      descricao: formato.descricao || '',
      tipoFormato: String(formato.tipoFormato),
      ativo: Boolean(formato.ativo),
      quantidadeGrupos: formato.quantidadeGrupos ? String(formato.quantidadeGrupos) : '',
      classificadosPorGrupo: formato.classificadosPorGrupo ? String(formato.classificadosPorGrupo) : '',
      geraMataMataAposGrupos: Boolean(formato.geraMataMataAposGrupos),
      turnoEVolta: Boolean(formato.turnoEVolta),
      tipoChave: formato.tipoChave || '',
      quantidadeDerrotasParaEliminacao: formato.quantidadeDerrotasParaEliminacao
        ? String(formato.quantidadeDerrotasParaEliminacao)
        : '1',
      permiteCabecaDeChave: Boolean(formato.permiteCabecaDeChave),
      disputaTerceiroLugar: Boolean(formato.disputaTerceiroLugar)
    });
    rolarParaElemento(formularioRef.current);
  }

  function cancelarEdicao() {
    setFormatoEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');
    setSalvando(true);

    const tipoFormato = Number(formulario.tipoFormato);
    const dados = {
      nome: formulario.nome,
      descricao: formulario.descricao || null,
      tipoFormato,
      ativo: formulario.ativo,
      quantidadeGrupos: tipoFormato === 2 && formulario.quantidadeGrupos !== '' ? Number(formulario.quantidadeGrupos) : null,
      classificadosPorGrupo:
        tipoFormato === 2 && formulario.geraMataMataAposGrupos && formulario.classificadosPorGrupo !== ''
          ? Number(formulario.classificadosPorGrupo)
          : null,
      geraMataMataAposGrupos: tipoFormato === 2 ? formulario.geraMataMataAposGrupos : false,
      turnoEVolta: tipoFormato === 1 || tipoFormato === 2 ? formulario.turnoEVolta : false,
      tipoChave: tipoFormato === 3 ? formulario.tipoChave || null : null,
      quantidadeDerrotasParaEliminacao:
        tipoFormato === 3 ? Number(formulario.quantidadeDerrotasParaEliminacao) : null,
      permiteCabecaDeChave: tipoFormato === 3 ? formulario.permiteCabecaDeChave : false,
      disputaTerceiroLugar: tipoFormato === 3 ? formulario.disputaTerceiroLugar : false
    };

    try {
      if (formatoEdicaoId) {
        await formatosCampeonatoServico.atualizar(formatoEdicaoId, dados);
      } else {
        await formatosCampeonatoServico.criar(dados);
      }

      cancelarEdicao();
      await carregarFormatos();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerFormato(id) {
    const formato = formatos.find((item) => item.id === id);
    if (formato?.ehPadrao) {
      setErro('Formatos padrão não podem ser excluídos.');
      return;
    }

    if (!window.confirm('Deseja remover este formato de campeonato?')) {
      return;
    }

    try {
      await formatosCampeonatoServico.remover(id);
      await carregarFormatos();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  const tipoFormato = Number(formulario.tipoFormato);

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Formatos de campeonato</h2>
        <p>Cadastre formatos reutilizáveis para campeonato sem antecipar geração de tabela ou chaveamento.</p>
      </div>

      <form ref={formularioRef} className="formulario-secoes" onSubmit={aoSubmeter}>
        <div className="secao-formulario">
          <div className="secao-formulario-cabecalho">
            <h3>Identificação</h3>
            <p>Defina um formato reutilizável para campeonatos futuros.</p>
          </div>

          <div className="secao-formulario-conteudo">
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
              Tipo do formato
              <select
                value={formulario.tipoFormato}
                onChange={(evento) => atualizarCampo('tipoFormato', evento.target.value)}
                required
              >
                {tiposFormato.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo-largo">
              Descrição
              <textarea
                rows={3}
                value={formulario.descricao}
                onChange={(evento) => atualizarCampo('descricao', evento.target.value)}
              />
            </label>

            <label className="campo-checkbox campo-largo">
              <input
                type="checkbox"
                checked={formulario.ativo}
                onChange={(evento) => atualizarCampo('ativo', evento.target.checked)}
              />
              <span>Formato ativo para uso</span>
            </label>
          </div>
        </div>

        {(tipoFormato === 1 || tipoFormato === 2) && (
          <div className="secao-formulario">
            <div className="secao-formulario-cabecalho">
              <h3>Turnos</h3>
              <p>Use turno e volta quando cada confronto precisar acontecer duas vezes.</p>
            </div>

            <div className="secao-formulario-conteudo">
              <label className="campo-checkbox campo-largo">
                <input
                  type="checkbox"
                  checked={formulario.turnoEVolta}
                  onChange={(evento) => atualizarCampo('turnoEVolta', evento.target.checked)}
                />
                <span>Turno e volta</span>
              </label>
            </div>
          </div>
        )}

        {tipoFormato === 2 && (
          <div className="secao-formulario">
            <div className="secao-formulario-cabecalho">
              <h3>Fase de grupos</h3>
              <p>Configure apenas o necessário para a fase inicial do campeonato.</p>
            </div>

            <div className="secao-formulario-conteudo">
              <label>
                Quantidade de grupos
                <input
                  type="number"
                  min={1}
                  value={formulario.quantidadeGrupos}
                  onChange={(evento) => atualizarCampo('quantidadeGrupos', evento.target.value)}
                  required
                />
              </label>

              <label className="campo-checkbox">
                <input
                  type="checkbox"
                  checked={formulario.geraMataMataAposGrupos}
                  onChange={(evento) => atualizarCampo('geraMataMataAposGrupos', evento.target.checked)}
                />
                <span>Gera mata-mata após grupos</span>
              </label>

              {formulario.geraMataMataAposGrupos && (
                <label>
                  Classificados por grupo
                  <input
                    type="number"
                    min={1}
                    value={formulario.classificadosPorGrupo}
                    onChange={(evento) => atualizarCampo('classificadosPorGrupo', evento.target.value)}
                    required
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {tipoFormato === 3 && (
          <div className="secao-formulario">
            <div className="secao-formulario-cabecalho">
              <h3>Chave</h3>
              <p>Configure a chave de forma simples, com validação mínima para futura geração.</p>
            </div>

            <div className="secao-formulario-conteudo">
              <label>
                Tipo da chave
                <input
                  type="text"
                  value={formulario.tipoChave}
                  onChange={(evento) => atualizarCampo('tipoChave', evento.target.value)}
                  required
                />
              </label>

              <label>
                Derrotas para eliminação
                <select
                  value={formulario.quantidadeDerrotasParaEliminacao}
                  onChange={(evento) => atualizarCampo('quantidadeDerrotasParaEliminacao', evento.target.value)}
                  required
                >
                  <option value="1">1 derrota</option>
                  <option value="2">2 derrotas</option>
                </select>
              </label>

              <div className="campo-largo caixa-ajuda">
                <strong>Como funciona</strong>
                <p>1 derrota = eliminação simples.</p>
                <p>2 derrotas = vai para chave do perdedor e só é eliminado na segunda derrota.</p>
              </div>

              <label className="campo-checkbox campo-largo">
                <input
                  type="checkbox"
                  checked={formulario.permiteCabecaDeChave}
                  onChange={(evento) => atualizarCampo('permiteCabecaDeChave', evento.target.checked)}
                />
                <span>Permite cabeça de chave</span>
              </label>

              {formulario.permiteCabecaDeChave && (
                <div className="campo-largo caixa-ajuda">
                  <strong>Cabeça de chave</strong>
                  <p>{textoAjudaCabecaDeChave}</p>
                </div>
              )}

              <label className="campo-checkbox campo-largo">
                <input
                  type="checkbox"
                  checked={formulario.disputaTerceiroLugar}
                  onChange={(evento) => atualizarCampo('disputaTerceiroLugar', evento.target.checked)}
                />
                <span>Disputa terceiro lugar</span>
              </label>
            </div>
          </div>
        )}

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>

          {formatoEdicaoId && (
            <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
              <ConteudoBotao icone="cancelar" texto="Cancelar" />
            </button>
          )}
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando formatos...</p>
      ) : (
        <div className="lista-cartoes">
          {formatos.map((formato) => (
            <article key={formato.id} className="cartao-lista">
              <div>
                <h3>{formato.nome}{formato.ehPadrao ? ' (Padrão)' : ''}</h3>
                <p>Tipo: {descreverTipo(formato.tipoFormato)}</p>
                <p>Status: {formato.ativo ? 'Ativo' : 'Inativo'}</p>
                <p>Descrição: {formato.descricao || '-'}</p>

                {formato.tipoFormato === 1 && (
                  <p>{formato.turnoEVolta ? 'Com turno e volta' : 'Turno único'}</p>
                )}

                {formato.tipoFormato === 2 && (
                  <>
                    <p>Grupos: {formato.quantidadeGrupos}</p>
                    <p>
                      Mata-mata após grupos: {formato.geraMataMataAposGrupos ? 'Sim' : 'Não'}
                    </p>
                    {formato.geraMataMataAposGrupos && (
                      <p>Classificados por grupo: {formato.classificadosPorGrupo}</p>
                    )}
                    <p>{formato.turnoEVolta ? 'Com turno e volta' : 'Turno único'}</p>
                  </>
                )}

                {formato.tipoFormato === 3 && (
                  <>
                    <p>Tipo da chave: {formato.tipoChave}</p>
                    <p>Derrotas para eliminação: {formato.quantidadeDerrotasParaEliminacao}</p>
                    <p>Cabeça de chave: {formato.permiteCabecaDeChave ? 'Sim' : 'Não'}</p>
                    <p>Disputa terceiro lugar: {formato.disputaTerceiroLugar ? 'Sim' : 'Não'}</p>
                  </>
                )}

                <p>Criado em: {formatarDataHora(formato.dataCriacao)}</p>
              </div>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-secundario botao-editar"
                  onClick={() => iniciarEdicao(formato)}
                  disabled={formato.ehPadrao}
                >
                  <ConteudoBotao icone="editar" texto="Editar" />
                </button>
                <button
                  type="button"
                  className="botao-perigo"
                  onClick={() => removerFormato(formato.id)}
                  disabled={formato.ehPadrao}
                >
                  <ConteudoBotao icone="excluir" texto="Excluir" />
                </button>
              </div>
            </article>
          ))}

          {formatos.length === 0 && <p>Nenhum formato de campeonato cadastrado.</p>}
        </div>
      )}
    </section>
  );
}
