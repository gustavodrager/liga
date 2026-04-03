import { useEffect, useState } from 'react';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { convitesCadastroServico } from '../services/convitesCadastroServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { nomePerfil } from '../utils/perfis';

const formularioInicial = {
  email: '',
  telefone: '',
  canalEnvio: 'E-mail',
  expiraEmUtc: ''
};

function canalIncluiWhatsapp(canalEnvio) {
  return (canalEnvio || '').toLowerCase().includes('whatsapp');
}

export function PaginaConvitesCadastro() {
  const [convites, setConvites] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [enviandoEmailId, setEnviandoEmailId] = useState(null);
  const [enviandoWhatsappId, setEnviandoWhatsappId] = useState(null);
  const [obtendoLinkId, setObtendoLinkId] = useState(null);
  const [acessosAceite, setAcessosAceite] = useState({});

  useEffect(() => {
    carregarConvites();
  }, []);

  async function carregarConvites() {
    setCarregando(true);
    setErro('');

    try {
      const lista = await convitesCadastroServico.listar();
      setConvites(lista);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCarregando(false);
    }
  }

  function atualizarFormulario(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function aoCriarConvite(evento) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    setSalvando(true);

    if (canalIncluiWhatsapp(formulario.canalEnvio) && !formulario.telefone.trim()) {
      setErro('Informe o telefone quando o canal de envio incluir WhatsApp.');
      setSalvando(false);
      return;
    }

    try {
      const convite = await convitesCadastroServico.criar({
        email: formulario.email,
        telefone: formulario.telefone || null,
        canalEnvio: formulario.canalEnvio || null,
        expiraEmUtc: formulario.expiraEmUtc ? new Date(formulario.expiraEmUtc).toISOString() : null
      });

      await carregarConvites();
      setFormulario(formularioInicial);
      setMensagem(montarMensagemCriacao(convite));
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function obterECopiarLinkAceite(conviteId) {
    setErro('');
    setMensagem('');
    setObtendoLinkId(conviteId);

    try {
      const resposta = await convitesCadastroServico.obterLinkAceite(conviteId);
      setAcessosAceite((anterior) => ({
        ...anterior,
        [conviteId]: resposta
      }));
      const mensagemAcesso = `Link do convite: ${resposta.linkAceite}\nCódigo do convite: ${resposta.codigoConvite}`;

      try {
        await navigator.clipboard.writeText(mensagemAcesso);
        setMensagem('Link e código do convite copiados com sucesso.');
      } catch {
        setErro('Não foi possível copiar automaticamente. Copie manualmente o link e o código gerados abaixo.');
      }
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setObtendoLinkId(null);
    }
  }

  async function cancelarConvite(id) {
    setErro('');
    setMensagem('');
    setCancelandoId(id);

    try {
      await convitesCadastroServico.desativar(id);
      await carregarConvites();
      setMensagem('Convite cancelado com sucesso.');
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setCancelandoId(null);
    }
  }

  async function enviarPorEmail(convite) {
    setErro('');
    setMensagem('');
    setEnviandoEmailId(convite.id);

    try {
      await convitesCadastroServico.enviarEmail(convite.id);
      await carregarConvites();
      setMensagem('Convite enviado por e-mail com sucesso.');
    } catch (error) {
      const mensagemErro = extrairMensagemErro(error);
      await carregarConvites();
      setErro(mensagemErro);
    } finally {
      setEnviandoEmailId(null);
    }
  }

  async function enviarPorWhatsApp(convite) {
    setErro('');
    setMensagem('');
    setEnviandoWhatsappId(convite.id);

    try {
      await convitesCadastroServico.enviarWhatsapp(convite.id);
      await carregarConvites();
      setMensagem('Convite enviado por WhatsApp com sucesso.');
    } catch (error) {
      const mensagemErro = extrairMensagemErro(error);
      await carregarConvites();
      setErro(mensagemErro);
    } finally {
      setEnviandoWhatsappId(null);
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Convites de Cadastro</h2>
        <p>Crie convites fechados para novos organizadores. Quando o canal incluir e-mail, o sistema tenta enviar automaticamente a mensagem com o link direto para criação de senha e primeiro acesso.</p>
        <p>O WhatsApp usa o mesmo convite e o mesmo código do convite. Falhas de envio não invalidam o convite.</p>
      </div>

      <form className="formulario-grid" onSubmit={aoCriarConvite}>
        <label>
          E-mail
          <input
            type="email"
            value={formulario.email}
            onChange={(evento) => atualizarFormulario('email', evento.target.value)}
            placeholder="organizador@email.com"
            required
          />
        </label>

        <label>
          Telefone
          <input
            type="text"
            value={formulario.telefone}
            onChange={(evento) => atualizarFormulario('telefone', evento.target.value)}
            placeholder="Obrigatório para WhatsApp"
            required={canalIncluiWhatsapp(formulario.canalEnvio)}
          />
        </label>

        <label>
          Canal de envio
          <select
            value={formulario.canalEnvio}
            onChange={(evento) => atualizarFormulario('canalEnvio', evento.target.value)}
          >
            <option value="">Não informado</option>
            <option value="E-mail">E-mail</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="E-mail e WhatsApp">E-mail e WhatsApp</option>
          </select>
        </label>

        <label>
          Expira em
          <input
            type="datetime-local"
            value={formulario.expiraEmUtc}
            onChange={(evento) => atualizarFormulario('expiraEmUtc', evento.target.value)}
          />
        </label>

        <label>
          Perfil de destino
          <input type="text" value="Organizador" readOnly />
        </label>

        <div className="acoes-formulario">
          <button type="submit" className="botao-primario" disabled={salvando}>
            <ConteudoBotao
              icone="convite"
              texto={salvando ? 'Criando...' : 'Criar convite'}
              somenteIconeNoMobile={false}
            />
          </button>
        </div>
      </form>

      {erro && <p className="texto-erro">{erro}</p>}
      {mensagem && <p className="texto-sucesso">{mensagem}</p>}

      {carregando ? (
        <p>Carregando convites...</p>
      ) : (
        <div className="lista-cartoes">
          {convites.length === 0 ? (
            <p>Nenhum convite cadastrado até o momento.</p>
          ) : (
            convites.map((convite) => {
              const podeCancelar = convite.ativo && convite.situacao !== 'Usado';
              const podeEnviar = convite.podeSerUsado;
              const acessoAceite = acessosAceite[convite.id];

              return (
                <article key={convite.id} className="cartao-lista">
                  <div>
                    <h3>{convite.email}</h3>
                    <p>Perfil: {nomePerfil(convite.perfilDestino)}</p>
                    <p>Status: {convite.situacao}</p>
                    <p>Canal: {convite.canalEnvio || 'Não informado'}</p>
                    <p>Telefone: {convite.telefone || 'Não informado'}</p>
                    <p>E-mail automático: {convite.situacaoEnvioEmail}</p>
                    <p>Última tentativa de e-mail: {convite.ultimaTentativaEnvioEmailEmUtc ? formatarDataHora(convite.ultimaTentativaEnvioEmailEmUtc) : 'Ainda não realizada'}</p>
                    <p>E-mail enviado em: {convite.emailEnviadoEmUtc ? formatarDataHora(convite.emailEnviadoEmUtc) : 'Ainda não enviado'}</p>
                    {convite.erroEnvioEmail ? <p>Falha no e-mail: {convite.erroEnvioEmail}</p> : null}
                    <p>WhatsApp: {convite.situacaoEnvioWhatsapp}</p>
                    <p>Última tentativa de WhatsApp: {convite.ultimaTentativaEnvioWhatsappEmUtc ? formatarDataHora(convite.ultimaTentativaEnvioWhatsappEmUtc) : 'Ainda não realizada'}</p>
                    <p>WhatsApp enviado em: {convite.whatsappEnviadoEmUtc ? formatarDataHora(convite.whatsappEnviadoEmUtc) : 'Ainda não enviado'}</p>
                    {convite.erroEnvioWhatsapp ? <p>Falha no WhatsApp: {convite.erroEnvioWhatsapp}</p> : null}
                    <p>Expira em: {formatarDataHora(convite.expiraEmUtc)}</p>
                    <p>Usado em: {convite.usadoEmUtc ? formatarDataHora(convite.usadoEmUtc) : 'Ainda não utilizado'}</p>
                    <p>Criado por: {convite.criadoPorUsuarioNome || 'Administrador'}</p>
                  </div>

                  <div className="acoes-formulario">
                    <button
                      type="button"
                      className="botao-primario"
                      onClick={() => enviarPorEmail(convite)}
                      disabled={!podeEnviar || enviandoEmailId === convite.id}
                    >
                      <ConteudoBotao
                        icone="email"
                        texto={enviandoEmailId === convite.id ? 'Enviando e-mail...' : 'Enviar e-mail'}
                        somenteIconeNoMobile={false}
                      />
                    </button>
                    <button
                      type="button"
                      className="botao-primario"
                      onClick={() => enviarPorWhatsApp(convite)}
                      disabled={!podeEnviar || enviandoWhatsappId === convite.id}
                    >
                      <ConteudoBotao
                        icone="whatsapp"
                        texto={enviandoWhatsappId === convite.id ? 'Enviando WhatsApp...' : 'Enviar WhatsApp'}
                        somenteIconeNoMobile={false}
                      />
                    </button>
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => obterECopiarLinkAceite(convite.id)}
                      disabled={obtendoLinkId === convite.id}
                    >
                      <ConteudoBotao
                        icone="link"
                        texto={obtendoLinkId === convite.id ? 'Gerando acesso...' : 'Gerar e copiar link e código'}
                        somenteIconeNoMobile={false}
                      />
                    </button>
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => cancelarConvite(convite.id)}
                      disabled={!podeCancelar || cancelandoId === convite.id}
                    >
                      <ConteudoBotao
                        icone="cancelar"
                        texto={cancelandoId === convite.id ? 'Cancelando...' : 'Cancelar convite'}
                        somenteIconeNoMobile={false}
                      />
                    </button>
                  </div>

                  {acessoAceite ? (
                    <>
                      <p>Link gerado sob demanda: <code>{acessoAceite.linkAceite}</code></p>
                      <p>Código do convite: <code>{acessoAceite.codigoConvite}</code></p>
                    </>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

function montarMensagemCriacao(convite) {
  const emailEnviado = convite.situacaoEnvioEmail === 'Enviado';
  const emailFalhou = convite.situacaoEnvioEmail === 'Falhou';
  const emailPendente = convite.situacaoEnvioEmail === 'Pendente';
  const whatsappEnviado = convite.situacaoEnvioWhatsapp === 'Enviado';
  const whatsappFalhou = convite.situacaoEnvioWhatsapp === 'Falhou';
  const whatsappPendente = convite.situacaoEnvioWhatsapp === 'Pendente';
  const canal = (convite.canalEnvio || '').toLowerCase();

  if (emailEnviado && whatsappEnviado) {
    return 'Convite criado com sucesso. O e-mail e o WhatsApp foram enviados automaticamente.';
  }

  if (emailEnviado && !canalIncluiWhatsapp(canal)) {
    return 'Convite criado com sucesso. O e-mail foi enviado automaticamente.';
  }

  if (whatsappEnviado && canal === 'whatsapp') {
    return 'Convite criado com sucesso. O WhatsApp foi enviado automaticamente.';
  }

  if (emailEnviado && whatsappPendente && canal === 'e-mail e whatsapp') {
    return 'Convite criado com sucesso. O e-mail foi enviado automaticamente e o WhatsApp ficou pendente porque o provedor ainda não está configurado.';
  }

  if (whatsappEnviado && emailPendente && canal === 'e-mail e whatsapp') {
    return 'Convite criado com sucesso. O WhatsApp foi enviado automaticamente e o e-mail ficou pendente porque o provedor ainda não está configurado.';
  }

  if (emailEnviado && whatsappFalhou) {
    return `Convite criado com sucesso. O e-mail foi enviado, mas o WhatsApp falhou: ${convite.erroEnvioWhatsapp || 'Verifique a configuração do provedor e tente novamente.'}`;
  }

  if (whatsappEnviado && emailFalhou) {
    return `Convite criado com sucesso. O WhatsApp foi enviado, mas o e-mail falhou: ${convite.erroEnvioEmail || 'Verifique a configuração do provedor e tente novamente.'}`;
  }

  if (emailFalhou && whatsappFalhou) {
    return `Convite criado, mas os envios automáticos falharam: e-mail: ${convite.erroEnvioEmail || 'falha não detalhada'} | WhatsApp: ${convite.erroEnvioWhatsapp || 'falha não detalhada'}`;
  }

  if (emailFalhou) {
    return `Convite criado, mas o e-mail automático falhou: ${convite.erroEnvioEmail || 'Verifique a configuração do provedor e tente novamente.'}`;
  }

  if (whatsappFalhou) {
    return `Convite criado, mas o WhatsApp automático falhou: ${convite.erroEnvioWhatsapp || 'Verifique a configuração do provedor e tente novamente.'}`;
  }

  if (canal === 'whatsapp') {
    return 'Convite criado com sucesso. O envio automático por WhatsApp ficou pendente porque o provedor ainda não está configurado.';
  }

  if (canal === 'e-mail e whatsapp') {
    return 'Convite criado com sucesso. Os envios automáticos ficaram pendentes porque os provedores ainda não estão configurados.';
  }

  return 'Convite criado com sucesso. O envio automático ficou pendente porque o provedor ainda não está configurado.';
}
