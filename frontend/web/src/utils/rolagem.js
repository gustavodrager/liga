function obterContainerRolagem() {
  return document.querySelector('.conteudo-principal') || window;
}

function ehJanela(container) {
  return container === window;
}

export function rolarParaElemento(elemento) {
  if (!elemento) {
    return;
  }

  window.requestAnimationFrame(() => {
    const container = obterContainerRolagem();
    const retanguloElemento = elemento.getBoundingClientRect();
    const retanguloContainer = ehJanela(container)
      ? { top: 0 }
      : container.getBoundingClientRect();
    const topoDestino = Math.max(
      (ehJanela(container) ? window.scrollY : container.scrollTop)
        + retanguloElemento.top
        - retanguloContainer.top,
      0
    );

    container.scrollTo({
      top: topoDestino,
      behavior: 'smooth'
    });
  });
}

export function rolarParaTopo() {
  window.requestAnimationFrame(() => {
    obterContainerRolagem().scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}
