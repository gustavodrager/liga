import { useEffect, useMemo, useState } from 'react';
import { atletasServico } from '../services/atletasServico';
import { extrairMensagemErro } from '../utils/erros';

function criarEstadoEmails(lista) {
  const proximo = {};
  (lista || []).forEach((item) => {
    proximo[item.atletaId] = item.email || '';
  });
  return proximo;
}

export function PaginaPendenciasAtletas() {
  const [pendencias, setPendencias] = useState([]);
  const [emails, setEmails] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarPendencias();
  }, []);

  const totalSemContato = useMemo(
    () => pendencias.filter((item) => !item.temEmail).length,
    [pendencias]
  );

  async function carregarPendencias() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await atletasServico.listarPendencias();
      setPendencias(lista);
      setEmails(criarEstadoEmails(lista));
    } catch (error) {
      setErro(extrairMensagemErro(error));
      setPendencias([]);
    } finally {
      setCarregando(false);
    }
  }

  async function salvarEmail(atletaId) {
    setErro('');
    setMensagem('');
    setSalvandoId(atletaId);

    try {
      await atletasServico.informarEmailPendente(atletaId, emails[atletaId] || '');
      setMensagem('E-mail salvo. O atleta continua pendente até concluir o cadastro, mas já pode receber convite depois.');
      await carregarPendencias();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Pendências de atletas</h2>
        <p>Complete depois o e-mail dos atletas pendentes das partidas registradas por você.</p>
        {!carregando && pendencias.length > 0 && (
          <p>
            {totalSemContato > 0
              ? `${totalSemContato} atleta(s) ainda sem contato.`
              : 'Todos os atletas pendentes já possuem e-mail informado.'}
          </p>
        )}
      </div>

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      {carregando ? (
        <p>Carregando pendências...</p>
      ) : pendencias.length === 0 ? (
        <p>Nenhuma pendência encontrada para as partidas registradas por você.</p>
      ) : (
        <div className="lista-cartoes">
          {pendencias.map((item) => (
            <article key={item.atletaId} className="cartao-lista">
              <div className="linha-entre">
                <div>
                  <h3>{item.nomeAtleta}</h3>
                  <p>Status: <strong>{item.statusPendencia}</strong></p>
                  <p>Partidas relacionadas: {item.quantidadePartidas}</p>
                  <p>Competições: {item.competicoes?.join(', ') || 'Sem competição definida'}</p>
                </div>
                <span className={`tag-status ${item.temEmail ? 'tag-status-alerta' : 'tag-status-erro'}`}>
                  {item.temEmail ? 'Com contato' : 'Sem contato'}
                </span>
              </div>

              <label className="campo-largo">
                E-mail do atleta
                <input
                  type="email"
                  value={emails[item.atletaId] || ''}
                  onChange={(evento) => setEmails((anterior) => ({
                    ...anterior,
                    [item.atletaId]: evento.target.value
                  }))}
                  placeholder="atleta@exemplo.com"
                />
              </label>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-primario"
                  onClick={() => salvarEmail(item.atletaId)}
                  disabled={salvandoId === item.atletaId}
                >
                  {salvandoId === item.atletaId ? 'Salvando...' : 'Salvar e-mail'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
