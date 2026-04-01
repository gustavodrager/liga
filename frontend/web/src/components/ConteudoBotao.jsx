export function IconeAcao({ nome }) {
  switch (nome) {
    case 'sortear':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 4h3l2 2m5 6h-3l-2-2m0-4 2-2h3M3 12h3l6-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'aprovar':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'excluir':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 4.5h9m-7.5 0 .5 8h3l.5-8M6 4.5l.3-1h3.4l.3 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'tabela':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 3.5h10v9H3zm0 3h10M7.5 3.5v9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lista':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.5 4.5h8M4.5 8h8M4.5 11.5h8M3 4.5h0M3 8h0M3 11.5h0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'grupo':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 4.5a1.5 1.5 0 1 1 0 .01M11 4.5a1.5 1.5 0 1 1 0 .01M8 11a1.5 1.5 0 1 1 0 .01M6.2 5.7 7.2 9M9.8 5.7 8.8 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'salvar':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 3.5h6l2 2v7H4zm1 .5v3h5V4M6 11h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'editar':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m10.5 3.5 2 2m-7 7 5.8-5.8-2-2L3.5 10.5V12.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'cancelar':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'sair':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 2.8h5v10.4h-5zm1.2 0V2h4.6v1.2M9 8h4m-1.7-1.8L13 8l-1.7 1.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'email':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 4.5h11v7h-11zm0 .3L8 8.7l5.5-3.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.5a5 5 0 0 0-4.3 7.5L3 13.5l3.6-.7A5 5 0 1 0 8 2.5Zm-1.2 2.2c-.2 0-.4.1-.6.4-.2.2-.6.6-.6 1.5 0 .8.6 1.7.7 1.8.1.1 1.2 2 3 2.8 1.5.7 1.8.5 2.1.4.3-.1 1-.4 1.1-.8.1-.4.1-.8.1-.8s-.2-.1-.4-.2c-.2-.1-1-.5-1.1-.6-.2-.1-.3-.1-.4.1-.1.2-.5.6-.6.7-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4 0-.1 0-.3 0-.4 0-.1-.4-1.1-.6-1.4-.1-.3-.3-.3-.4-.3Z" fill="currentColor" />
        </svg>
      );
    case 'link':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6.2 9.8 4.8 11.2a2 2 0 1 1-2.8-2.8l1.8-1.8a2 2 0 0 1 2.8 0m3.2-.4 1.4-1.4a2 2 0 1 1 2.8 2.8l-1.8 1.8a2 2 0 0 1-2.8 0M5.5 10.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'copiar':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 4.5h6.5v8H6zm-2.5 2V3.5H10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'filtro':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 4h10L9.2 8.3v3.2L6.8 13V8.3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'buscar':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M11.5 11.5 14 14M7 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'desvincular':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6.2 9.8 4.8 11.2a2 2 0 1 1-2.8-2.8l1.8-1.8a2 2 0 0 1 2.8 0m3.2-.4 1.4-1.4a2 2 0 1 1 2.8 2.8l-1.8 1.8a2 2 0 0 1-2.8 0M5 5l6 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'partidas':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 3.5 3 5.5l2 2m6-4 2 2-2 2M6.5 5.5h3m-5 5h7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'inscricoes':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2.8h8v10.4H4zm2 2.2h4m-4 2.4h4m-4 2.4h2.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'convite':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 5.2h11v5.6h-11zm0 .1L8 8.4l5.5-3.1M5 4V2.8h6V4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function ConteudoBotao({ icone, texto, ajuda, somenteIconeNoMobile = true }) {
  const textoAjuda = ajuda || texto;

  return (
    <span
      className={`botao-com-icone${somenteIconeNoMobile ? ' botao-mobile-icone' : ''}`}
      title={textoAjuda}
      aria-label={textoAjuda}
    >
      <IconeAcao nome={icone} />
      <span className="texto-botao">{texto}</span>
    </span>
  );
}
