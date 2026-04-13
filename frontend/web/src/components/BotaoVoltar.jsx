import { useNavigate } from 'react-router-dom';

export function BotaoVoltar({ fallback = '/dashboard', rotulo = 'Voltar' }) {
  const navegar = useNavigate();

  function aoVoltar() {
    if (window.history.length > 1) {
      navegar(-1);
      return;
    }

    navegar(fallback);
  }

  return (
    <button type="button" className="botao-terciario" onClick={aoVoltar}>
      {rotulo}
    </button>
  );
}
