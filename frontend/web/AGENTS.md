# Contexto local do frontend

Seguir o `AGENTS.md` da raiz. Neste diretório, além disso:

## Diretrizes
- Manter React + Vite em JavaScript, seguindo a organização atual por `pages`, `services`, `contexts`, `hooks`, `layouts` e `utils`
- Reutilizar `services`, `http.js`, utilitários e layout existente antes de criar abstrações novas
- Só extrair componente, hook ou helper quando houver reutilização real ou simplificação clara
- Não introduzir TypeScript, estado global, biblioteca de UI ou biblioteca de formulário sem necessidade real
- Não duplicar regra de negócio do backend no cliente; o frontend deve refletir dados, estados e mensagens vindos da API
- Tratar loading, erro, vazio e sucesso de forma explícita
- Priorizar fluxo simples, responsivo e legível

## Fluxos já adotados
- `Competições` já concentra atalhos para categorias e inscrições; preservar esse papel antes de criar navegação paralela
- `Locais` é cadastro próprio e `Competições` apenas referencia o local escolhido
- `Inscrições` aceita dupla existente ou criação no fluxo a partir de `Jogador 1` e `Jogador 2`
- `Meu Perfil` existe para qualquer usuário e concentra vínculo `Usuario` ↔ `Atleta`
- Usuário comum (`Atleta`) não vincula atleta existente; cria apenas o próprio atleta com o mesmo nome e e-mail do usuário
- `Competições` para atleta funciona como vitrine de campeonatos com inscrições abertas; para gestor continua sendo tela de gestão
- `Inscrições` para atleta permite escolher campeonato/categoria e se inscrever com dupla própria ou parceiro ainda pendente
- `Usuários` existe apenas para administrador; esconder rota e menu fora desse perfil
- `Partidas` deve exibir a tabela de jogos da categoria; administrador e organizador podem gerar/alterar jogos, respeitando ownership da competição
- `Ranking` já possui modos de liga e competição; o da liga é consolidado e o da competição segue separado por categoria
- `Modelos de importação` já oferece download e upload CSV por tipo de cadastro
