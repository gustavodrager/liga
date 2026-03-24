export function rolarParaElemento(elemento) {
  if (!elemento) {
    return;
  }

  window.requestAnimationFrame(() => {
    elemento.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
}
