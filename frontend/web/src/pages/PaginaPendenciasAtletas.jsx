import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { atletasServico } from '../services/atletasServico';
import { pendenciasServico } from '../services/pendenciasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { criarPendenciasPerfil } from '../utils/pendenciasPerfil';
import { rolarParaTopo } from '../utils/rolagem';

const TIPOS_PENDENCIA = {
  aprovarPartida: 1,
  completarContato: 2
};

const STATUS_APROVACAO = {
  pendenteDeVinculos: 1,
  pendenteAprovacao: 2,
  aprovada: 3,
  contestada: 4
};

const STATUS_PENDENCIA = {
  pendente: 1
};

function pendenciaAindaVisivel(item) {
  if (!item || item.status !== STATUS_PENDENCIA.pendente) {
    return false;
  }

  if (item.tipo !== TIPOS_PENDENCIA.completarContato) {
    return true;
  }

  return !item.emailAtleta && !item.atletaPossuiUsuarioVinculado;
}

function criarEstadoEmails(lista) {
  const proximo = {};
  (lista || []).forEach((item) => {
    if (pendenciaAindaVisivel(item) && item.tipo === TIPOS_PENDENCIA.completarContato) {
      proximo[item.id] = item.emailAtleta || '';
    }
  });
  return proximo;
}

function obterTituloPendencia(tipo) {
  return tipo === TIPOS_PENDENCIA.aprovarPartida
    ? 'Aprovação de partida'
    : 'Completar e-mail';
}

function obterRotuloStatusAprovacao(status) {
  switch (status) {
    case STATUS_APROVACAO.pendenteDeVinculos:
      return 'Pendente de vínculos';
    case STATUS_APROVACAO.pendenteAprovacao:
      return 'Pendente de aprovação';
    case STATUS_APROVACAO.aprovada:
      return 'Aprovada';
    case STATUS_APROVACAO.contestada:
      return 'Contestada';
    default:
      return 'Sem status';
  }
}

function obterClasseStatusAprovacao(status) {
  switch (status) {
    case STATUS_APROVACAO.aprovada:
      return 'tag-status-sucesso';
    case STATUS_APROVACAO.contestada:
      return 'tag-status-erro';
    default:
      return 'tag-status-alerta';
  }
}

export function PaginaPendenciasAtletas() {
  const { usuario, estadoAcesso } = useAutenticacao();
  const [pendencias, setPendencias] = useState([]);
  const [atletaPerfil, setAtletaPerfil] = useState(null);
  const [emails, setEmails] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarPendencias();
  }, [usuario?.atletaId]);

  const totalSemContato = useMemo(
    () => pendencias.filter((item) => item.tipo === TIPOS_PENDENCIA.completarContato && !item.emailAtleta).length,
    [pendencias]
  );
  const totalPendenciasContato = useMemo(
    () => pendencias.filter((item) => item.tipo === TIPOS_PENDENCIA.completarContato).length,
    [pendencias]
  );
  const pendenciasPerfil = useMemo(
    () => criarPendenciasPerfil({ estadoAcesso, usuario, atletaDetalhe: atletaPerfil }),
    [atletaPerfil, estadoAcesso, usuario]
  );

  async function carregarPendencias() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await pendenciasServico.listar();
      const pendenciasVisiveis = (lista || []).filter(pendenciaAindaVisivel);
      setPendencias(pendenciasVisiveis);
      setEmails(criarEstadoEmails(pendenciasVisiveis));

      if (usuario?.atletaId) {
        setAtletaPerfil(await atletasServico.obterMeu());
      } else {
        setAtletaPerfil(null);
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setPendencias([]);
      setAtletaPerfil(null);
    } finally {
      setCarregando(false);
    }
  }

  async function salvarEmail(pendenciaId) {
    setErro('');
    setMensagem('');
    setProcessandoId(pendenciaId);

    try {
      const pendenciaAtualizada = await pendenciasServico.completarContato(pendenciaId, emails[pendenciaId] || '');
      setPendencias((listaAtual) => listaAtual.filter((item) =>
        item.id !== pendenciaId &&
        (
          item.tipo !== TIPOS_PENDENCIA.completarContato ||
          !pendenciaAtualizada?.atletaId ||
          item.atletaId !== pendenciaAtualizada.atletaId
        )
      ));
      setMensagem('Contato atualizado. A pendência saiu da lista.');
      await carregarPendencias();
      rolarParaTopo();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setProcessandoId(null);
    }
  }

  async function responderPartida(pendenciaId, acao) {
    setErro('');
    setMensagem('');
    setProcessandoId(pendenciaId);

    try {
      if (acao === 'contestar') {
        await pendenciasServico.contestarPartida(pendenciaId);
        setMensagem('Contestação registrada com sucesso.');
      } else {
        await pendenciasServico.aprovarPartida(pendenciaId);
        setMensagem('Aprovação registrada com sucesso.');
      }

      setPendencias((listaAtual) => listaAtual.filter((item) => item.id !== pendenciaId));
      await carregarPendencias();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Pendências</h2>       
        {!carregando && totalPendenciasContato > 0 && (
          <p>
            {totalSemContato > 0
              ? `${totalSemContato} pendência(s) ainda sem e-mail informado.`
              : 'Todas as pendências de contato estão em dia.'}
          </p>
        )}
      </div>

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      {carregando ? (
        <p>Carregando pendências...</p>
      ) : pendencias.length === 0 && pendenciasPerfil.length === 0 ? (
        <p>Nenhuma pendência encontrada para o seu usuário.</p>
      ) : (
        <div className="lista-cartoes">
          {pendenciasPerfil.map((item) => (
            <article key={item.id} className="cartao-lista">
              <div className="linha-entre">
                <div>
                  <h3>{item.titulo}</h3>
                  <p>{item.descricao}</p>
                </div>
                <span className="tag-status tag-status-alerta">Perfil</span>
              </div>

              <div className="acoes-item">
                <Link to="/app/perfil" className="botao-primario">
                  {item.acaoTexto}
                </Link>
              </div>
            </article>
          ))}

          {pendencias.map((item) => (
            <article key={item.id} className="cartao-lista">
              <div className="linha-entre">
                <div>
                  <h3>{obterTituloPendencia(item.tipo)}</h3>
                  {item.nomeAtleta && <p>Atleta: {item.nomeAtleta}</p>}
                  {item.partidaId && (
                    <>
                      <p>Partida: {item.nomeDuplaA} x {item.nomeDuplaB}</p>
                      <p>Placar: {item.placarDuplaA ?? '-'} x {item.placarDuplaB ?? '-'}</p>
                      <p>Data da partida: {formatarDataHora(item.dataPartida)}</p>
                    </>
                  )}
                
                </div>
                {item.statusAprovacaoPartida ? (
                  <span className={`tag-status ${obterClasseStatusAprovacao(item.statusAprovacaoPartida)}`}>
                    {obterRotuloStatusAprovacao(item.statusAprovacaoPartida)}
                  </span>
                ) : (
                  <span className={`tag-status ${item.emailAtleta ? 'tag-status-alerta' : 'tag-status-erro'}`}>
                    {item.emailAtleta ? 'Com contato' : 'Sem contato'}
                  </span>
                )}
              </div>

              {item.tipo === TIPOS_PENDENCIA.completarContato ? (
                <>
                  <label className="campo-largo">
                    E-mail do {item.nomeAtleta || 'atleta'}
                    <input
                      type="email"
                      value={emails[item.id] || ''}
                      onChange={(evento) => setEmails((anterior) => ({
                        ...anterior,
                        [item.id]: evento.target.value
                      }))}
                      placeholder="atleta@exemplo.com"
                    />
                  </label>

                  <div className="acoes-item">
                    <button
                      type="button"
                      className="botao-primario"
                      onClick={() => salvarEmail(item.id)}
                      disabled={processandoId === item.id}
                    >
                      {processandoId === item.id ? 'Salvando...' : 'Salvar e-mail'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="acoes-item">
                  <button
                    type="button"
                    className="botao-primario"
                    onClick={() => responderPartida(item.id, 'aprovar')}
                    disabled={processandoId === item.id}
                  >
                    {processandoId === item.id ? 'Processando...' : 'Aprovar'}
                  </button>
                  <button
                    type="button"
                    className="botao-perigo"
                    onClick={() => responderPartida(item.id, 'contestar')}
                    disabled={processandoId === item.id}
                  >
                    {processandoId === item.id ? 'Processando...' : 'Contestar'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
