import { useEffect, useRef, useState } from 'react';
import { ConteudoBotao } from '../components/ConteudoBotao';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { regrasCompeticaoServico } from '../services/regrasCompeticaoServico';
import { extrairMensagemErro } from '../utils/erros';
import { formatarDataHora } from '../utils/formatacao';
import { rolarParaElemento } from '../utils/rolagem';
import { ehAdministrador } from '../utils/perfis';

const estadoInicial = {
  nome: '',
  descricao: '',
  pontosMinimosPartida: 18,
  diferencaMinimaPartida: 2,
  pontosPrimeiroLugar: 0,
  pontosSegundoLugar: 0,
  pontosTerceiroLugar: 0,
  pontosVitoria: 3,
  pontosDerrota: 0,
  pontosParticipacao: 0
};

export function PaginaRegrasCompeticao() {
  const { usuario } = useAutenticacao();
  const usuarioAdministrador = ehAdministrador(usuario);
  const [regras, setRegras] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [regraEdicaoId, setRegraEdicaoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [regrasDisponiveis, setRegrasDisponiveis] = useState(true);
  const formularioRef = useRef(null);

  useEffect(() => {
    carregarRegras();
  }, []);

  async function carregarRegras() {
    setCarregando(true);
    setErro('');
    setAviso('');

    try {
      const lista = await regrasCompeticaoServico.listar();
      setRegras(lista);
      setRegrasDisponiveis(true);
    } catch (error) {
      setRegras([]);

      if (error?.response?.status === 404) {
        setRegrasDisponiveis(false);
        setAviso('O cadastro de regras não está disponível nesta API. Atualize ou reinicie o backend para usar esta tela.');
      } else {
        setRegrasDisponiveis(true);
        setErro(extrairMensagemErro(error));
      }
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function iniciarEdicao(regra) {
    if (!usuarioAdministrador && regra.usuarioCriadorId !== usuario?.id) {
      setErro('Você só pode editar regras criadas pelo próprio usuário.');
      return;
    }

    setRegraEdicaoId(regra.id);
    setFormulario({
      nome: regra.nome,
      descricao: regra.descricao || '',
      pontosMinimosPartida: regra.pontosMinimosPartida,
      diferencaMinimaPartida: regra.diferencaMinimaPartida,
      pontosPrimeiroLugar: regra.pontosPrimeiroLugar,
      pontosSegundoLugar: regra.pontosSegundoLugar,
      pontosTerceiroLugar: regra.pontosTerceiroLugar,
      pontosVitoria: regra.pontosVitoria,
      pontosDerrota: regra.pontosDerrota,
      pontosParticipacao: regra.pontosParticipacao
    });
    rolarParaElemento(formularioRef.current);
  }

  function cancelarEdicao() {
    setRegraEdicaoId(null);
    setFormulario(estadoInicial);
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();

    if (!regrasDisponiveis) {
      return;
    }

    setErro('');
    setSalvando(true);

    const dados = {
      nome: formulario.nome,
      descricao: formulario.descricao || null,
      pontosMinimosPartida: Number(formulario.pontosMinimosPartida),
      diferencaMinimaPartida: Number(formulario.diferencaMinimaPartida),
      permiteEmpate: false,
      pontosPrimeiroLugar: Number(formulario.pontosPrimeiroLugar),
      pontosSegundoLugar: Number(formulario.pontosSegundoLugar),
      pontosTerceiroLugar: Number(formulario.pontosTerceiroLugar),
      pontosVitoria: Number(formulario.pontosVitoria),
      pontosDerrota: Number(formulario.pontosDerrota),
      pontosParticipacao: Number(formulario.pontosParticipacao)
    };

    try {
      if (regraEdicaoId) {
        await regrasCompeticaoServico.atualizar(regraEdicaoId, dados);
      } else {
        await regrasCompeticaoServico.criar(dados);
      }

      cancelarEdicao();
      await carregarRegras();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  async function removerRegra(id) {
    const regra = regras.find((item) => item.id === id);
    if (regra && !usuarioAdministrador && regra.usuarioCriadorId !== usuario?.id) {
      setErro('Você só pode excluir regras criadas pelo próprio usuário.');
      return;
    }

    if (!window.confirm('Deseja remover esta regra?')) {
      return;
    }

    try {
      await regrasCompeticaoServico.remover(id);
      await carregarRegras();
    } catch (error) {
      setErro(extrairMensagemErro(error));
    }
  }

  return (
    <section className="pagina">
      <div className="cabecalho-pagina">
        <h2>Regras</h2>
        <p>Cadastre regras reutilizáveis e organize a pontuação da competição em blocos mais fáceis de revisar.</p>
      </div>

      {regrasDisponiveis && (
        <form ref={formularioRef} className="formulario-secoes" onSubmit={aoSubmeter}>
          <div className="secao-formulario">
            <div className="secao-formulario-cabecalho">
              <h3>Identificação</h3>
              <p>Nomeie a regra e descreva quando ela deve ser usada.</p>
            </div>

            <div className="secao-formulario-conteudo">
              <label>
                Nome
                <input
                  type="text"
                  value={formulario.nome}
                  onChange={(evento) => atualizarCampo('nome', evento.target.value)}
                  required
                />
              </label>

              <label className="campo-largo">
                Descrição
                <textarea
                  rows={3}
                  value={formulario.descricao}
                  onChange={(evento) => atualizarCampo('descricao', evento.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="secao-formulario">
            <div className="secao-formulario-cabecalho">
              <h3>Regra da partida</h3>
              <p>Defina o mínimo para encerrar o jogo. No futevôlei, a tela já considera sempre sem empate.</p>
            </div>

            <div className="secao-formulario-conteudo">
              <label>
                Pontos mínimos da partida
                <input
                  type="number"
                  min={1}
                  value={formulario.pontosMinimosPartida}
                  onChange={(evento) => atualizarCampo('pontosMinimosPartida', evento.target.value)}
                  required
                />
              </label>

              <label>
                Diferença mínima
                <input
                  type="number"
                  min={1}
                  value={formulario.diferencaMinimaPartida}
                  onChange={(evento) => atualizarCampo('diferencaMinimaPartida', evento.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          <div className="secao-formulario">
            <div className="secao-formulario-cabecalho">
              <h3>Pontuação por colocação</h3>
              <p>Use estes campos para guardar a pontuação final da competição por pódio.</p>
            </div>

            <div className="secao-formulario-conteudo">
              <label>
                Pontos para 1º lugar
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formulario.pontosPrimeiroLugar}
                  onChange={(evento) => atualizarCampo('pontosPrimeiroLugar', evento.target.value)}
                  required
                />
              </label>

              <label>
                Pontos para 2º lugar
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formulario.pontosSegundoLugar}
                  onChange={(evento) => atualizarCampo('pontosSegundoLugar', evento.target.value)}
                  required
                />
              </label>

              <label>
                Pontos para 3º lugar
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formulario.pontosTerceiroLugar}
                  onChange={(evento) => atualizarCampo('pontosTerceiroLugar', evento.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          <div className="secao-formulario">
            <div className="secao-formulario-cabecalho">
              <h3>Pontuação por jogo</h3>
              <p>Esses campos continuam sendo usados no ranking atual calculado a partir das partidas registradas.</p>
            </div>

            <div className="secao-formulario-conteudo">
              <label>
                Pontos por vitória
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formulario.pontosVitoria}
                  onChange={(evento) => atualizarCampo('pontosVitoria', evento.target.value)}
                  required
                />
              </label>

              <label>
                Pontos por derrota
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formulario.pontosDerrota}
                  onChange={(evento) => atualizarCampo('pontosDerrota', evento.target.value)}
                  required
                />
              </label>

              <label>
                Pontos por participação
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formulario.pontosParticipacao}
                  onChange={(evento) => atualizarCampo('pontosParticipacao', evento.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          <div className="acoes-formulario">
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>

            {regraEdicaoId && (
              <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
                <ConteudoBotao icone="cancelar" texto="Cancelar" />
              </button>
            )}
          </div>
        </form>
      )}

      {erro && <p className="texto-erro">{erro}</p>}
      {aviso && <p>{aviso}</p>}

      {carregando ? (
        <p>Carregando regras...</p>
      ) : !regrasDisponiveis ? null : (
        <div className="lista-cartoes">
          {regras.map((regra) => (
            <article key={regra.id} className="cartao-lista">
              <div>
                <h3>{regra.nome}</h3>
                <p>Descrição: {regra.descricao || '-'}</p>
                <p>
                  Partida: mínimo {regra.pontosMinimosPartida} pontos, diferença mínima {regra.diferencaMinimaPartida}{' '}
                  e sem empate
                </p>
                <p>
                  Colocação: 1º {regra.pontosPrimeiroLugar} / 2º {regra.pontosSegundoLugar} / 3º{' '}
                  {regra.pontosTerceiroLugar}
                </p>
                <p>
                  Jogo: vitória {regra.pontosVitoria} / derrota {regra.pontosDerrota} / participação{' '}
                  {regra.pontosParticipacao}
                </p>
                <p>Criada por: {regra.nomeUsuarioCriador || 'Registro legado'}</p>
                <p>Criada em: {formatarDataHora(regra.dataCriacao)}</p>
              </div>

              <div className="acoes-item">
                <button
                  type="button"
                  className="botao-secundario"
                  onClick={() => iniciarEdicao(regra)}
                  disabled={!usuarioAdministrador && regra.usuarioCriadorId !== usuario?.id}
                >
                  <ConteudoBotao icone="editar" texto="Editar" />
                </button>
                <button
                  type="button"
                  className="botao-perigo"
                  onClick={() => removerRegra(regra.id)}
                  disabled={!usuarioAdministrador && regra.usuarioCriadorId !== usuario?.id}
                >
                  <ConteudoBotao icone="excluir" texto="Excluir" />
                </button>
              </div>
            </article>
          ))}

          {regras.length === 0 && <p>Nenhuma regra cadastrada.</p>}
        </div>
      )}
    </section>
  );
}
