import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logoLiga from '../assets/logo-liga.svg';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { convitesCadastroServico } from '../services/convitesCadastroServico';
import { extrairMensagemErro } from '../utils/erros';

export function PaginaCadastroConvite() {
  const { identificadorPublico = '' } = useParams();
  const [convite, setConvite] = useState(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [erro, setErro] = useState('');
  const [carregandoConvite, setCarregandoConvite] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const { registrarPorConvite, token, rotaInicial } = useAutenticacao();
  const navegar = useNavigate();

  useEffect(() => {
    if (token) {
      navegar(rotaInicial, { replace: true });
    }
  }, [token, rotaInicial, navegar]);

  useEffect(() => {
    async function carregarConvite() {
      setCarregandoConvite(true);
      setErro('');

      if (!identificadorPublico) {
        setErro('Convite não informado.');
        setCarregandoConvite(false);
        return;
      }

      try {
        const resposta = await convitesCadastroServico.obterPublico(identificadorPublico);
        setConvite(resposta);
        setEmail(resposta.emailMascarado || '');
      } catch (error) {
        setErro(extrairMensagemErro(error));
      } finally {
        setCarregandoConvite(false);
      }
    }

    carregarConvite();
  }, [identificadorPublico]);

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro('');

    if (!convite?.podeSerUsado) {
      setErro('Este convite não está disponível para cadastro.');
      return;
    }

    if (!codigoConvite.trim()) {
      setErro('Informe o código do convite.');
      return;
    }

    if (!email.trim()) {
      setErro('Informe o e-mail.');
      return;
    }

    setSalvando(true);

    try {
      await registrarPorConvite({
        conviteIdPublico: identificadorPublico,
        codigoConvite: codigoConvite.trim(),
        nome: nome.trim(),
        email: email.trim()
      });
      navegar('/app/perfil', { replace: true });
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="pagina-login">
      <div className="painel-login">
        <img className="logo-login" src={logoLiga} alt="Logo Liga" />
        <h1>Seu primeiro acesso</h1>
        <p>Use este convite para confirmar seu acesso à Plataforma QuebraNunca Futevôlei.</p>

        {carregandoConvite ? (
          <p>Validando convite...</p>
        ) : (
          <>
            {erro && <p className="texto-erro">{erro}</p>}

            {convite && convite.podeSerUsado && (
              <form onSubmit={aoSubmeter} className="formulario-grid unico">
                  <label>
                    E-mail do convite
                    <input
                      type="email"
                      value={email}
                      onChange={(evento) => setEmail(evento.target.value)}
                      placeholder="voce@email.com"
                      required
                    />
                  </label>

                  <label>
                    Nome completo
                    <input
                      type="text"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </label>

                  <label>
                    Código do convite
                    <input
                      type="text"
                      value={codigoConvite}
                      onChange={(evento) => setCodigoConvite(evento.target.value)}
                      placeholder="Informe o código recebido"
                      required
                    />
                  </label>

                  <button type="submit" className="botao-primario" disabled={salvando}>
                    {salvando ? 'Entrando no app...' : 'Confirmar acesso e entrar'}
                  </button>
                </form>
              )}

              {convite && !convite.podeSerUsado && (
                <p className="texto-aviso">
                  Este convite não está mais disponível. Se precisar, solicite um novo link ao administrador.
                </p>
              )}
            </>
          )}
      </div>
    </section>
  );
}
