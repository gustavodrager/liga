function escaparCsv(valor) {
  if (valor === null || valor === undefined) {
    return '';
  }

  const texto = String(valor);
  if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }

  return texto;
}

function gerarCsv(colunas, exemplo) {
  const cabecalho = colunas.map(escaparCsv).join(',');
  const linhaExemplo = exemplo.map(escaparCsv).join(',');
  return `${cabecalho}\n${linhaExemplo}\n`;
}

export const modelosImportacao = [
  {
    id: 'atletas',
    titulo: 'Atletas',
    arquivo: 'modelo-atletas.csv',
    descricao: 'Modelo base para importar atletas.',
    observacoes: [
      'Lado: 1=Direito, 2=Esquerdo, 3=Ambos.',
      'CadastroPendente: true ou false.',
      'Data de nascimento no formato AAAA-MM-DD.',
      'Se CadastroPendente for false, informe ao menos um identificador.'
    ],
    csv: gerarCsv(
      ['nome', 'apelido', 'telefone', 'email', 'instagram', 'cpf', 'cadastroPendente', 'lado', 'dataNascimento'],
      ['Maria Silva', 'Mari', '(11)99999-8888', 'maria@email.com', '@mari.silva', '12345678900', false, 3, '1998-04-12']
    )
  },
  {
    id: 'duplas',
    titulo: 'Duplas',
    arquivo: 'modelo-duplas.csv',
    descricao: 'Modelo para importar duplas já vinculando atletas existentes.',
    observacoes: [
      'Use os IDs de atletas já cadastrados em atleta1Id e atleta2Id.',
      'Cada dupla deve ter exatamente 2 atletas diferentes.'
    ],
    csv: gerarCsv(
      ['nome', 'atleta1Id', 'atleta2Id'],
      ['Dupla Sol e Mar', 'GUID_ATLETA_1', 'GUID_ATLETA_2']
    )
  },
  {
    id: 'ligas',
    titulo: 'Ligas',
    arquivo: 'modelo-ligas.csv',
    descricao: 'Modelo simples para importar ligas.',
    observacoes: [
      'Descrição é opcional.'
    ],
    csv: gerarCsv(
      ['nome', 'descricao'],
      ['Liga Praia Grandense', 'Liga principal da temporada']
    )
  },
  {
    id: 'formatos-campeonato',
    titulo: 'Formatos de campeonato',
    arquivo: 'modelo-formatos-campeonato.csv',
    descricao: 'Modelo para importar formatos reutilizáveis de campeonato.',
    observacoes: [
      'TipoFormato: 1=PontosCorridos, 2=FaseDeGrupos, 3=Chave.',
      'QuantidadeDerrotasParaEliminacao aceita 1 ou 2.',
      'Booleanos: true ou false.'
    ],
    csv: gerarCsv(
      [
        'nome',
        'descricao',
        'tipoFormato',
        'ativo',
        'quantidadeGrupos',
        'classificadosPorGrupo',
        'geraMataMataAposGrupos',
        'turnoEVolta',
        'tipoChave',
        'quantidadeDerrotasParaEliminacao',
        'permiteCabecaDeChave',
        'disputaTerceiroLugar'
      ],
      [
        'Chave dupla eliminação',
        'Formato para campeonato principal',
        3,
        true,
        '',
        '',
        false,
        false,
        'Dupla eliminação',
        2,
        true,
        true
      ]
    )
  },
  {
    id: 'regras-competicao',
    titulo: 'Regras',
    arquivo: 'modelo-regras.csv',
    descricao: 'Modelo para importar regras reutilizáveis de competição.',
    observacoes: [
      'Sem empate no futevôlei: permiteEmpate deve ficar false.',
      'Campos de colocação são independentes da pontuação por jogo.'
    ],
    csv: gerarCsv(
      [
        'nome',
        'descricao',
        'pontosMinimosPartida',
        'diferencaMinimaPartida',
        'permiteEmpate',
        'pontosVitoria',
        'pontosDerrota',
        'pontosParticipacao',
        'pontosPrimeiroLugar',
        'pontosSegundoLugar',
        'pontosTerceiroLugar'
      ],
      ['Regra padrão campeonato', 'Regra base da temporada', 18, 2, false, 3, 0, 0, 15, 9, 6]
    )
  },
  {
    id: 'competicoes',
    titulo: 'Competições',
    arquivo: 'modelo-competicoes.csv',
    descricao: 'Modelo para importar competições.',
    observacoes: [
      'Tipo: 1=Campeonato, 2=Evento, 3=Grupo.',
      'LigaId, LocalId, FormatoCampeonatoId, RegraCompeticaoId e PossuiFinalReset são opcionais e usam GUIDs existentes.',
      'Datas no formato AAAA-MM-DD.'
    ],
    csv: gerarCsv(
      ['nome', 'tipo', 'descricao', 'dataInicio', 'dataFim', 'ligaId', 'localId', 'formatoCampeonatoId', 'regraCompeticaoId', 'inscricoesAbertas', 'possuiFinalReset'],
      ['Copa Verão 2026', 1, 'Campeonato de verão', '2026-01-10', '2026-02-28', 'GUID_LIGA', 'GUID_LOCAL', 'GUID_FORMATO', 'GUID_REGRA', true, true]
    )
  },
  {
    id: 'categorias',
    titulo: 'Categorias',
    arquivo: 'modelo-categorias.csv',
    descricao: 'Modelo para importar categorias dentro de uma competição.',
    observacoes: [
      'CompeticaoId usa GUID de competição existente.',
      'FormatoCampeonatoId é opcional e deve ser usado só para campeonatos.',
      'Genero: 1=Masculino, 2=Feminino, 3=Misto. Nivel: 1 a 6.'
    ],
    csv: gerarCsv(
      ['competicaoId', 'formatoCampeonatoId', 'nome', 'genero', 'nivel', 'pesoRanking'],
      ['GUID_COMPETICAO', 'GUID_FORMATO', 'Masculino Livre', 1, 6, 1]
    )
  },
  {
    id: 'inscricoes',
    titulo: 'Inscrições',
    arquivo: 'modelo-inscricoes.csv',
    descricao: 'Modelo para importar inscrições em campeonatos.',
    observacoes: [
      'Use duplaId quando a dupla já existir.',
      'Se não houver duplaId, informe atleta1Id e atleta2Id.',
      'A categoria deve pertencer ao campeonato informado.'
    ],
    csv: gerarCsv(
      ['campeonatoId', 'categoriaId', 'duplaId', 'atleta1Id', 'atleta2Id', 'pago', 'observacao'],
      ['GUID_CAMPEONATO', 'GUID_CATEGORIA', 'GUID_DUPLA', '', '', true, 'Inscrição confirmada']
    )
  },
  {
    id: 'inscricoes-campeonato',
    titulo: 'Inscritos de campeonato',
    arquivo: 'modelo-inscritos-campeonato.csv',
    accept: '.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    requerCampeonato: true,
    descricao: 'Modelo para importar inscritos por nome em um campeonato já selecionado.',
    observacoes: [
      'Aceita CSV próprio do sistema ou a planilha XLSX de inscritos com aba Vendas.',
      'O campeonato é escolhido na tela; categorias faltantes podem ser criadas automaticamente.',
      'Linhas sem dupla válida ficam como erro, pois partida e inscrição são sempre 2x2.'
    ],
    csv: gerarCsv(
      ['categoria', 'genero', 'nivel', 'nomeAtleta1', 'nomeAtleta2', 'observacao'],
      ['Intermediário', 2, 3, 'Carla Ribeiro', 'Marina Vicenzo', 'Voucher ABC123']
    )
  },
  {
    id: 'partidas',
    titulo: 'Partidas',
    arquivo: 'modelo-partidas.csv',
    descricao: 'Modelo para importar partidas registradas.',
    observacoes: [
      'Use categoriaCompeticaoId e IDs de duplas já existentes.',
      'DataPartida no formato AAAA-MM-DDTHH:mm:ss.',
      'A dupla vencedora é derivada do placar; não precisa coluna separada.'
    ],
    csv: gerarCsv(
      ['categoriaCompeticaoId', 'duplaAId', 'duplaBId', 'placarDuplaA', 'placarDuplaB', 'dataPartida', 'observacoes'],
      ['GUID_CATEGORIA', 'GUID_DUPLA_A', 'GUID_DUPLA_B', 18, 14, '2026-03-23T10:30:00', 'Rodada 1']
    )
  }
];

export function baixarModeloImportacao(modelo) {
  const blob = new Blob([modelo.csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = modelo.arquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
