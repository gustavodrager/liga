export function rolarParaElemento(elemento) {
  if (!elemento) {
    return;
  }

  window.requestAnimationFrame(() => {
    const topoDestino = Math.max(
      window.scrollY + elemento.getBoundingClientRect().top,
      0
    );

    window.scrollTo({
      top: topoDestino,
      behavior: 'smooth'
    });
  });
}
