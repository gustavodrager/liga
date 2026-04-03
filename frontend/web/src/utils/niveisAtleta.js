export const opcoesNivelAtleta = [
  { valor: 1, rotulo: 'Iniciante' },
  { valor: 2, rotulo: 'Intermediário' },
  { valor: 3, rotulo: 'Amador' },
  { valor: 4, rotulo: 'Profissional' }
];

export function nomeNivelAtleta(nivel) {
  return opcoesNivelAtleta.find((item) => item.valor === Number(nivel))?.rotulo || '-';
}
