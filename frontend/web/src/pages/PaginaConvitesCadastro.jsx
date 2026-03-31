import { useEffect, useState } from 'react';
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

function montarLinkConvite(token) {
  return `${window.location.origin}/cadastro/convite?token=${encodeURIComponent(token)}`;
}

function montarMensagemConvite(convite, linkConvite) {
  return [
    'Olá!',
    '',
    'Você foi convidado(a) para usar a Plataforma de Futevôlei como organizador(a).',
    'Preparamos um link pessoal para você criar sua senha e fazer seu primeiro acesso.',
    '',
    `E-mail liberado para o convite: ${convite.email}`,
    '',
    'Abra o link abaixo e conclua seu cadastro:',
    linkConvite
    ,
    '',
    'Importante: este link é individual e só permite concluir o acesso com o e-mail convidado.'
  ].join('\n');
}

function montarTelefoneWhatsApp(telefone) {
  const telefoneNumerico = (telefone || '').replace(/\D/g, '');
  if (!telefoneNumerico) {
    return null;
  }

  if (telefoneNumerico.startsWith('55')) {
    return telefoneNumerico;
  }

  if (telefoneNumerico.length === 10 || telefoneNumerico.length === 11) {
    return `55${telefoneNumerico}`;
  }

  return telefoneNumerico;
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

  async function copiarTexto(texto, mensagemSucesso) {
    setErro('');
    setMensagem('');

    try {
      await navigator.clipboard.writeText(texto);
      setMensagem(mensagemSucesso);
    } catch {
      setErro('Não foi possível copiar automaticamente. Copie manualmente o conteúdo exibido.');
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

  function enviarPorWhatsApp(convite) {
    const telefone = montarTelefoneWhatsApp(convite.telefone);
    if (!telefone) {
      setMensagem('');
      setErro('Informe um telefone no convite para enviar por WhatsApp.');
      return;
    }

    const linkConvite = montarLinkConvite(convite.token);
    const texto = encodeURIComponent(montarMensagemConvite(convite, linkConvite));
    window.open(`https://wa.me/${telefone}?text=${texto}`, '_blank', 'noopener,noreferrer');
    setErro('');
    setMensagem('WhatsApp aberto com a mensagem do convite.');
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Convites de Cadastro</h2>
        <p>Crie convites fechados para novos organizadores. Quando o canal incluir e-mail, o sistema tenta enviar automaticamente a mensagem com o link direto para criação de senha e primeiro acesso.</p>
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
            placeholder="Opcional"
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
            {salvando ? 'Criando...' : 'Criar convite'}
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
              const linkConvite = montarLinkConvite(convite.token);
              const podeCancelar = convite.ativo && convite.situacao !== 'Usado';
              const podeEnviar = convite.podeSerUsado;

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
                    <p>Expira em: {formatarDataHora(convite.expiraEmUtc)}</p>
                    <p>Usado em: {convite.usadoEmUtc ? formatarDataHora(convite.usadoEmUtc) : 'Ainda não utilizado'}</p>
                    <p>Criado por: {convite.criadoPorUsuarioNome || 'Administrador'}</p>
                    <p>Token: <code>{convite.token}</code></p>
                  </div>

                  <div className="acoes-formulario">
                    <button
                      type="button"
                      className="botao-primario"
                      onClick={() => enviarPorEmail(convite)}
                      disabled={!podeEnviar || enviandoEmailId === convite.id}
                    >
                      {enviandoEmailId === convite.id ? 'Enviando e-mail...' : 'Enviar e-mail'}
                    </button>
                    <button
                      type="button"
                      className="botao-primario"
                      onClick={() => enviarPorWhatsApp(convite)}
                      disabled={!podeEnviar}
                    >
                      Enviar por WhatsApp
                    </button>
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => copiarTexto(linkConvite, 'Link do convite copiado com sucesso.')}
                    >
                      Copiar link
                    </button>
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => copiarTexto(convite.token, 'Token do convite copiado com sucesso.')}
                    >
                      Copiar token
                    </button>
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => cancelarConvite(convite.id)}
                      disabled={!podeCancelar || cancelandoId === convite.id}
                    >
                      {cancelandoId === convite.id ? 'Cancelando...' : 'Cancelar convite'}
                    </button>
                  </div>

                  <p>Link pronto: <code>{linkConvite}</code></p>
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
  if (convite.situacaoEnvioEmail === 'Enviado') {
    return 'Convite criado com sucesso. O e-mail foi enviado automaticamente.';
  }

  if (convite.situacaoEnvioEmail === 'Falhou') {
    return `Convite criado, mas o e-mail automático falhou: ${convite.erroEnvioEmail || 'Verifique a configuração do provedor e tente novamente.'}`;
  }

  if ((convite.canalEnvio || '').toLowerCase() === 'whatsapp') {
    return 'Convite criado com sucesso. O envio automático por e-mail não foi solicitado para este canal.';
  }

  return 'Convite criado com sucesso. O e-mail automático ficou pendente porque o provedor ainda não está configurado.';
}
