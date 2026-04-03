import { http } from './http';

export const autenticacaoServico = {
  async registrarPorConvite(dados) {
    const resposta = await http.post('/autenticacao/registrar-por-convite', dados);
    return resposta.data;
  },

  async solicitarCodigoLogin(dados) {
    const resposta = await http.post('/autenticacao/login/codigo/solicitar', dados);
    return resposta.data;
  },

  async loginComCodigo(dados) {
    const resposta = await http.post('/autenticacao/login/codigo', dados);
    return resposta.data;
  },

  async login(dados) {
    const resposta = await http.post('/autenticacao/login', dados);
    return resposta.data;
  },

  async solicitarRedefinicaoSenha(dados) {
    const resposta = await http.post('/autenticacao/esqueci-senha/solicitar', dados);
    return resposta.data;
  },

  async redefinirSenha(dados) {
    const resposta = await http.post('/autenticacao/esqueci-senha/redefinir', dados);
    return resposta.data;
  },

  async me() {
    const resposta = await http.get('/autenticacao/me');
    return resposta.data;
  }
};
