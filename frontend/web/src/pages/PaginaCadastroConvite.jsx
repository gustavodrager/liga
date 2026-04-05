import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logoLiga from '../assets/logo-liga.svg';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { convitesCadastroServico } from '../services/convitesCadastroServico';
import { extrairMensagemErro } from '../utils/erros';
import { nomePerfil } from '../utils/perfis';

export function PaginaCadastroConvite() {
  const { identificadorPublico = '' } = useParams();
  const [convite, setConvite] = useState(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregandoConvite, setCarregandoConvite] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [destinoAposAutenticacao, setDestinoAposAutenticacao] = useState('/dashboard');
  const { registrarPorConvite, token } = useAutenticacao();
  const navegar = useNavigate();

  useEffect(() => {
    if (token) {
      navegar(destinoAposAutenticacao, { replace: true });
    }
  }, [token, destinoAposAutenticacao, navegar]);

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

    if (senha !== confirmacaoSenha) {
      setErro('A confirmação de senha não confere.');
      return;
    }

    if (!codigoConvite.trim()) {
      setErro('Informe o código do convite.');
      return;
    }

    setSalvando(true);

    try {
      setDestinoAposAutenticacao('/meu-perfil');
      await registrarPorConvite({
        conviteIdPublico: identificadorPublico,
        codigoConvite,
        nome,
        email,
        senha
      });
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
        <p>Use este convite para criar sua senha e entrar pela primeira vez na Plataforma de Futevôlei.</p>

        {carregandoConvite ? (
          <p>Validando convite...</p>
        ) : (
          <>
            {erro && <p className="texto-erro">{erro}</p>}

            {convite && (
              <>
                <div className="formulario-grid unico">
                  <label>
                    E-mail liberado para o convite
                    <input type="text" value={convite.emailMascarado} readOnly />
                  </label>

                  <label>
                    Perfil do convite
                    <input type="text" value={nomePerfil(convite.perfilDestino)} readOnly />
                  </label>

                  <label>
                    Situação
                    <input type="text" value={convite.situacao} readOnly />
                  </label>
                </div>

                <p>
                  Este link identifica o convite, mas o cadastro só é concluído com o e-mail convidado
                  {' e o código do convite recebido por e-mail, WhatsApp ou pelo administrador.'}
                  Depois de definir sua senha, você entra automaticamente no app e segue para o seu perfil para completar os dados.
                </p>
                <p>
                  Se você já tiver participado de partidas antes de criar o acesso, o app tentará reaproveitar esse atleta quando você concluir o perfil.
                </p>

                {convite.podeSerUsado && (
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

                    <label>
                      Senha
                      <input
                        type="password"
                        value={senha}
                        onChange={(evento) => setSenha(evento.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
                    </label>

                    <label>
                      Confirmar senha
                      <input
                        type="password"
                        value={confirmacaoSenha}
                        onChange={(evento) => setConfirmacaoSenha(evento.target.value)}
                        placeholder="Repita a senha"
                        required
                      />
                    </label>

                    <button type="submit" className="botao-primario" disabled={salvando}>
                      {salvando ? 'Entrando no app...' : 'Criar senha e entrar'}
                    </button>
                  </form>
                )}

                {!convite.podeSerUsado && (
                  <p className="texto-aviso">
                    Este convite não está mais disponível. Se precisar, solicite um novo link ao administrador.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
