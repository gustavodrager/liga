import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logoLiga from '../assets/logo-liga.svg';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { convitesCadastroServico } from '../services/convitesCadastroServico';
import { extrairMensagemErro } from '../utils/erros';
import { nomePerfil } from '../utils/perfis';

export function PaginaCadastroConvite() {
  const [searchParams] = useSearchParams();
  const tokenConvite = searchParams.get('token') || '';
  const [convite, setConvite] = useState(null);
  const [nome, setNome] = useState('');
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

      if (!tokenConvite) {
        setErro('Token do convite não informado.');
        setCarregandoConvite(false);
        return;
      }

      try {
        const resposta = await convitesCadastroServico.obterPublicoPorToken(tokenConvite);
        setConvite(resposta);
      } catch (error) {
        setErro(extrairMensagemErro(error));
      } finally {
        setCarregandoConvite(false);
      }
    }

    carregarConvite();
  }, [tokenConvite]);

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

    setSalvando(true);

    try {
      setDestinoAposAutenticacao('/meu-perfil');
      await registrarPorConvite(tokenConvite, nome, convite.email, senha);
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
                    E-mail do convite
                    <input type="email" value={convite.email} readOnly />
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
                  Este link é pessoal e só permite concluir o acesso com o e-mail acima.
                  Depois de definir sua senha, você entra automaticamente no app e segue para o seu perfil para completar os dados.
                </p>
                <p>
                  Se você já tiver participado de partidas antes de criar o acesso, o app tentará reaproveitar esse atleta quando você concluir o perfil.
                </p>

                {convite.podeSerUsado && (
                  <form onSubmit={aoSubmeter} className="formulario-grid unico">
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
