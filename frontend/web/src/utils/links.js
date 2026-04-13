export function obterLinkHttp(valor) {
  const link = (valor || '').trim();

  if (!link) {
    return '';
  }

  return /^https?:\/\//i.test(link) ? link : '';
}

export function abrirLinkExterno(valor) {
  const link = obterLinkHttp(valor);

  if (!link) {
    return false;
  }

  window.open(link, '_blank', 'noopener,noreferrer');
  return true;
}
