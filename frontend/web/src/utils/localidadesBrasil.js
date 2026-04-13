export const estadosBrasil = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

const cidadesPorEstado = new Map();

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function normalizarEstadoParaUf(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) {
    return '';
  }

  const estado = estadosBrasil.find((item) => (
    normalizarTexto(item.sigla) === texto || normalizarTexto(item.nome) === texto
  ));

  return estado?.sigla || valor;
}

export async function buscarCidadesPorEstado(uf) {
  const estado = normalizarEstadoParaUf(uf);
  if (!estado || estado.length !== 2) {
    return [];
  }

  if (cidadesPorEstado.has(estado)) {
    return cidadesPorEstado.get(estado);
  }

  const resposta = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`
  );
  if (!resposta.ok) {
    throw new Error('Não foi possível carregar as cidades do estado.');
  }

  const dados = await resposta.json();
  const cidades = (dados || [])
    .map((cidade) => cidade.nome)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  cidadesPorEstado.set(estado, cidades);
  return cidades;
}
