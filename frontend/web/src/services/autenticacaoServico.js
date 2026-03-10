import { http } from './http';

export const autenticacaoServico = {
  async registrar(dados) {
    const resposta = await http.post('/autenticacao/registrar', dados);
    return resposta.data;
  },

  async login(dados) {
    const resposta = await http.post('/autenticacao/login', dados);
    return resposta.data;
  },

  async me() {
    const resposta = await http.get('/autenticacao/me');
    return resposta.data;
  }
};
