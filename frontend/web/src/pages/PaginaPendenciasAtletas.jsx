import { useEffect, useMemo, useState } from 'react';
import { pendenciasServico } from '../services/pendenciasServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';

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

function criarEstadoEmails(lista) {
  const proximo = {};
  (lista || []).forEach((item) => {
    if (item.tipo === TIPOS_PENDENCIA.completarContato) {
      proximo[item.id] = item.emailAtleta || '';
    }
  });
  return proximo;
}

function obterTituloPendencia(tipo) {
  return tipo === TIPOS_PENDENCIA.aprovarPartida
    ? 'Aprovação de partida'
    : 'Completar contato do atleta';
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
  const [pendencias, setPendencias] = useState([]);
  const [emails, setEmails] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarPendencias();
  }, []);

  const totalSemContato = useMemo(
    () => pendencias.filter((item) => item.tipo === TIPOS_PENDENCIA.completarContato && !item.emailAtleta).length,
    [pendencias]
  );

  async function carregarPendencias() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await pendenciasServico.listar();
      setPendencias(lista);
      setEmails(criarEstadoEmails(lista));
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setPendencias([]);
    } finally {
      setCarregando(false);
    }
  }

  async function salvarEmail(pendenciaId) {
    setErro('');
    setMensagem('');
    setProcessandoId(pendenciaId);

    try {
      await pendenciasServico.completarContato(pendenciaId, emails[pendenciaId] || '');
      setMensagem('Contato atualizado. A pendência continua aberta até o atleta ficar apto a aprovar.');
      await carregarPendencias();
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
        <p>Centralize aqui as aprovações de partidas e a regularização de atletas que ainda não podem aprovar.</p>
        {!carregando && pendencias.length > 0 && (
          <p>
            {totalSemContato > 0
              ? `${totalSemContato} pendência(s) ainda sem e-mail informado.`
              : 'Todas as pendências de contato já possuem e-mail informado.'}
          </p>
        )}
      </div>

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      {carregando ? (
        <p>Carregando pendências...</p>
      ) : pendencias.length === 0 ? (
        <p>Nenhuma pendência encontrada para o seu usuário.</p>
      ) : (
        <div className="lista-cartoes">
          {pendencias.map((item) => (
            <article key={item.id} className="cartao-lista">
              <div className="linha-entre">
                <div>
                  <h3>{obterTituloPendencia(item.tipo)}</h3>
                  {item.nomeAtleta && <p>Atleta: {item.nomeAtleta}</p>}
                  {item.partidaId && (
                    <>
                      <p>Partida: {item.nomeDuplaA} x {item.nomeDuplaB}</p>
                      <p>Jogadores: {item.nomeDuplaAAtleta1}, {item.nomeDuplaAAtleta2}, {item.nomeDuplaBAtleta1}, {item.nomeDuplaBAtleta2}</p>
                      <p>Placar: {item.placarDuplaA ?? '-'} x {item.placarDuplaB ?? '-'}</p>
                      <p>Registrada por: {item.nomeCriadoPorUsuario || 'Não informado'}</p>
                      <p>Data da partida: {formatarDataHora(item.dataPartida)}</p>
                    </>
                  )}
                  <p>Criada em: {formatarDataHora(item.dataCriacao)}</p>
                  {item.observacao && <p>Obs: {item.observacao}</p>}
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
                    E-mail do atleta
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
