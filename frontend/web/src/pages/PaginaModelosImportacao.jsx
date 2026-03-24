import { useEffect, useState } from 'react';
import { competicoesServico } from '../services/competicoesServico';
import { importacoesServico } from '../services/importacoesServico';
import { extrairMensagemErro } from '../utils/erros';
import { baixarModeloImportacao, modelosImportacao } from '../utils/modelosImportacao';

export function PaginaModelosImportacao() {
  const [arquivos, setArquivos] = useState({});
  const [importacoes, setImportacoes] = useState({});
  const [configuracoes, setConfiguracoes] = useState({});
  const [campeonatos, setCampeonatos] = useState([]);
  const [erroCampeonatos, setErroCampeonatos] = useState('');

  useEffect(() => {
    carregarCampeonatos();
  }, []);

  async function carregarCampeonatos() {
    try {
      const listaCompeticoes = await competicoesServico.listar();
      setCampeonatos(listaCompeticoes.filter((competicao) => competicao.tipo === 1));
      setErroCampeonatos('');
    } catch (erro) {
      setErroCampeonatos(extrairMensagemErro(erro));
    }
  }

  function atualizarArquivo(modeloId, arquivo) {
    setArquivos((anterior) => ({
      ...anterior,
      [modeloId]: arquivo || null
    }));

    limparResultado(modeloId);
  }

  function atualizarConfiguracao(modeloId, campo, valor) {
    setConfiguracoes((anterior) => ({
      ...anterior,
      [modeloId]: {
        ...anterior[modeloId],
        [campo]: valor
      }
    }));

    limparResultado(modeloId);
  }

  function limparResultado(modeloId) {
    setImportacoes((anterior) => ({
      ...anterior,
      [modeloId]: {
        ...anterior[modeloId],
        erro: '',
        resultado: null
      }
    }));
  }

  async function importarModelo(modelo) {
    const arquivo = arquivos[modelo.id];
    const configuracao = configuracoes[modelo.id] || {};

    if (!arquivo) {
      setImportacoes((anterior) => ({
        ...anterior,
        [modelo.id]: {
          carregando: false,
          erro: 'Selecione um arquivo antes de importar.',
          resultado: null
        }
      }));
      return;
    }

    if (modelo.requerCampeonato && !configuracao.campeonatoId) {
      setImportacoes((anterior) => ({
        ...anterior,
        [modelo.id]: {
          carregando: false,
          erro: 'Selecione o campeonato antes de importar os inscritos.',
          resultado: null
        }
      }));
      return;
    }

    setImportacoes((anterior) => ({
      ...anterior,
      [modelo.id]: {
        carregando: true,
        erro: '',
        resultado: null
      }
    }));

    try {
      const resultado = await importacoesServico.importar(modelo.id, arquivo, {
        campeonatoId: configuracao.campeonatoId
      });

      setImportacoes((anterior) => ({
        ...anterior,
        [modelo.id]: {
          carregando: false,
          erro: '',
          resultado
        }
      }));
    } catch (erro) {
      setImportacoes((anterior) => ({
        ...anterior,
        [modelo.id]: {
          carregando: false,
          erro: extrairMensagemErro(erro),
          resultado: null
        }
      }));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Modelos de importação</h2>
        <p>Baixe modelos CSV com os campos reais de cada cadastro existente no sistema.</p>
        <p>Também é possível importar a planilha XLSX de inscritos quando o modelo informar esse suporte.</p>
      </div>

      {erroCampeonatos && <p className="texto-erro">{erroCampeonatos}</p>}

      <div className="lista-cartoes">
        {modelosImportacao.map((modelo) => {
          const estadoImportacao = importacoes[modelo.id] || {};
          const configuracao = configuracoes[modelo.id] || {};
          const resultado = estadoImportacao.resultado;
          const aceita = modelo.accept || '.csv,text/csv';
          const arquivoSelecionado = arquivos[modelo.id];

          return (
            <article key={modelo.id} className="cartao-lista cartao-importacao">
              <div className="conteudo-importacao">
                <h3>{modelo.titulo}</h3>
                <p>{modelo.descricao}</p>
                {modelo.observacoes.map((observacao) => (
                  <p key={observacao}>{observacao}</p>
                ))}
              </div>

              <div className="acoes-importacao">
                <button
                  type="button"
                  className="botao-primario"
                  onClick={() => baixarModeloImportacao(modelo)}
                >
                  Baixar CSV
                </button>

                {modelo.requerCampeonato && (
                  <label className="campo-largo">
                    Campeonato
                    <select
                      value={configuracao.campeonatoId || ''}
                      onChange={(evento) => atualizarConfiguracao(modelo.id, 'campeonatoId', evento.target.value)}
                    >
                      <option value="">Selecione</option>
                      {campeonatos.map((campeonato) => (
                        <option key={campeonato.id} value={campeonato.id}>
                          {campeonato.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="campo-largo">
                  Arquivo
                  <input
                    type="file"
                    accept={aceita}
                    onChange={(evento) => atualizarArquivo(modelo.id, evento.target.files?.[0] || null)}
                  />
                </label>

                {arquivoSelecionado && <p>Selecionado: {arquivoSelecionado.name}</p>}

                <button
                  type="button"
                  className="botao-secundario"
                  disabled={
                    !arquivoSelecionado ||
                    estadoImportacao.carregando ||
                    (modelo.requerCampeonato && !configuracao.campeonatoId)
                  }
                  onClick={() => importarModelo(modelo)}
                >
                  {estadoImportacao.carregando ? 'Importando...' : 'Importar e salvar'}
                </button>

                {estadoImportacao.erro && <p className="texto-erro">{estadoImportacao.erro}</p>}

                {resultado && (
                  <div className="resultado-importacao">
                    <p className={resultado.registrosComErro > 0 ? 'texto-aviso' : 'texto-sucesso'}>
                      {resultado.registrosImportados} de {resultado.totalLinhas} linhas importadas.
                    </p>

                    {resultado.registrosComErro > 0 && (
                      <>
                        <p className="texto-erro">{resultado.registrosComErro} linha(s) com erro.</p>
                        <div className="caixa-ajuda lista-erros-importacao">
                          {resultado.erros.map((erroLinha) => (
                            <p key={`${modelo.id}-${erroLinha.linha}-${erroLinha.mensagem}`}>
                              Linha {erroLinha.linha}: {erroLinha.mensagem}
                            </p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
