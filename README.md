# 🎤 GPS DAS RIMAS

> O mapa nacional das batalhas de rima.

App que ajuda a comunidade de hip-hop a encontrar, divulgar e acompanhar
batalhas de rima por todo o Brasil: mapa interativo com rota real, busca por
localização, cadastro de batalhas, favoritos e um painel de moderação —
com autenticação e banco de dados reais via **Supabase**.

---

## Índice

1. [Stack utilizada](#1-stack-utilizada)
2. [Como rodar localmente](#2-como-rodar-localmente)
3. [Configurar o Supabase (obrigatório)](#3-configurar-o-supabase-obrigatório)
4. [Estrutura do projeto](#4-estrutura-do-projeto)
5. [Como o banco de dados funciona](#5-como-o-banco-de-dados-funciona)
6. [Como promover o primeiro administrador](#6-como-promover-o-primeiro-administrador)
7. [Mapas, GPS e rotas (sem chave paga)](#7-mapas-gps-e-rotas-sem-chave-paga)
8. [Funcionalidades implementadas](#8-funcionalidades-implementadas)
9. [O que fica de fora (v2)](#9-o-que-fica-de-fora-v2)
10. [Deploy](#10-deploy)
11. [Licença de dados de mapa](#11-licença-de-dados-de-mapa)

---

## 1. Stack utilizada

| Camada          | Tecnologia                                                   |
|-----------------|----------------------------------------------------------------|
| Build/dev       | Vite 8                                                          |
| UI              | React 19 + TypeScript                                           |
| Estilo          | Tailwind CSS v4 (config CSS-first, sem `tailwind.config.js`)    |
| Roteamento      | React Router 7                                                   |
| Backend/banco   | **Supabase** (Postgres + Auth + Row Level Security)              |
| Estado global   | Zustand (cache client-side dos dados vindos do Supabase)         |
| Mapa            | Leaflet + React-Leaflet, tiles gratuitos OpenStreetMap/CARTO      |
| Rotas reais     | OSRM (Open Source Routing Machine, gratuito, sem chave)           |
| PWA             | `vite-plugin-pwa` (manifest + service worker automáticos)        |
| Lint            | oxlint                                                           |

Nenhuma dependência exige chave de API **paga** — o Supabase tem um plano
gratuito generoso o suficiente para rodar este projeto inteiro.

## 2. Como rodar localmente

Pré-requisitos: **Node.js 20+**, **npm** e uma conta gratuita no
[supabase.com](https://supabase.com).

```bash
# 1. Instalar dependências
npm install

# 2. Configurar as variáveis de ambiente (veja a seção 3 antes de rodar)
cp .env.example .env
# edite .env com a URL e a anon key do seu projeto Supabase

# 3. Rodar em modo desenvolvimento
npm run dev
# abre em http://localhost:5173

# 4. Build de produção
npm run build

# 5. Servir o build localmente para conferir
npm run preview

# 6. Lint
npm run lint
```

⚠️ Sem o `.env` preenchido, o app builda e abre normalmente, mas qualquer
tela que dependa de dados (login, mapa, listagens) vai falhar, porque não
existe um banco de verdade para conversar. Configure o Supabase primeiro
(seção 3).

## 3. Configurar o Supabase (obrigatório)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com/dashboard).
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Cole o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e rode
   (uma vez só). Isso cria as tabelas, as políticas de segurança (RLS), as
   funções auxiliares **e os buckets de Storage** para foto de perfil e
   banner de batalha (`avatars` e `battle-images`, ambos já com as
   permissões corretas — cada pessoa só sobrescreve o que ela mesma
   enviou).
4. (Opcional, recomendado) Crie uma conta pelo próprio app com o e-mail
   `demo@gpsdasrimas.com` (tela **Criar conta**) e depois rode
   [`supabase/seed.sql`](./supabase/seed.sql) no SQL Editor — isso popula o
   banco com 11 batalhas de exemplo em 7 capitais.
5. Em **Project Settings → API**, copie:
   - **Project URL** → cole em `VITE_SUPABASE_URL` no seu `.env`
   - **anon public key** → cole em `VITE_SUPABASE_ANON_KEY` no seu `.env`
6. (Recomendado para testar rápido) Em **Authentication → Providers →
   Email**, desative "Confirm email" enquanto estiver testando localmente —
   assim uma conta criada já entra direto, sem precisar clicar em link de
   e-mail. Em produção, deixe a confirmação ativada.

Pronto — o app já fala com um banco de dados Postgres real, com autenticação
de verdade.

## 4. Estrutura do projeto

```
src/
  components/     Componentes de UI reutilizáveis (cards, mapa, formulário...)
  hooks/          Hooks (geolocalização, rota, relógio "now" reativo)
  lib/            Cliente Supabase, tipos do banco, mapeadores de linhas
  pages/          Uma página por rota
  store/          Zustand: authStore e battleStore (fina camada de cache
                  sobre o Supabase), toastStore
  types/          Tipos TypeScript do domínio (usados pela UI)
  utils/          Funções puras (data, distância, rota, slug)
public/           Ícones, favicon, imagem de Open Graph
supabase/
  schema.sql      Schema completo: tabelas, RLS, triggers, funções
  seed.sql        Batalhas de exemplo (opcional)
```

## 5. Como o banco de dados funciona

Os dados (perfis, batalhas, favoritos, denúncias) vivem em um projeto
Postgres real no Supabase — não há mais nada salvo só no navegador. Os
stores Zustand (`src/store/`) funcionam como uma camada fina de cache: eles
buscam os dados do Supabase, guardam localmente para a UI renderizar rápido,
e re-sincronizam a cada ação (favoritar, cadastrar, aprovar etc.).

**Segurança por linha (Row Level Security).** Cada tabela tem políticas que
valem tanto para o app quanto para qualquer acesso direto ao banco:

- Qualquer pessoa (mesmo sem login) vê as batalhas **aprovadas**.
- Cada usuário só vê suas próprias batalhas pendentes/rejeitadas — exceto
  administradores, que veem tudo.
- Só o dono da batalha (ou um admin) pode editá-la; só um admin pode
  aprovar, rejeitar ou remover.
- Favoritos e denúncias são sempre amarrados ao usuário autenticado; ninguém
  read/edita favorito ou denúncia de outra pessoa por fora do painel admin.
- Ninguém consegue virar administrador sozinho: a coluna `role` é protegida
  por um trigger no banco, e só pode ser alterada pela função
  `promote_to_admin()`, que por sua vez exige que quem chama já seja admin.

Essas regras estão todas em [`supabase/schema.sql`](./supabase/schema.sql),
comentadas — vale a pena ler antes de mexer.

**Senhas** são gerenciadas inteiramente pelo Supabase Auth (hash seguro,
tokens, refresh automático) — o app nunca vê nem armazena senha em texto
puro.

## 6. Como promover o primeiro administrador

Como ninguém nasce administrador, o **primeiro** admin do projeto precisa
ser promovido manualmente, direto no banco:

1. Crie sua conta normalmente pelo app (tela **Criar conta**).
2. No **SQL Editor** do Supabase, rode (trocando o e-mail):
   ```sql
   update public.profiles set role = 'admin' where email = 'voce@email.com';
   ```
3. Atualize a página do app. O menu agora mostra **Admin**, e a rota
   `/admin` fica liberada.

A partir daí, **não precisa mais mexer no banco**: qualquer admin pode
promover outra pessoa direto pela aba **Usuários** do painel `/admin`
(campo "Promover a admin"), que chama a função segura `promote_to_admin()`
no servidor.

## 7. Mapas, GPS e rotas (sem chave paga)

- **Tiles do mapa**: OpenStreetMap, servidos com o estilo escuro gratuito
  da CARTO (`basemaps.cartocdn.com/dark_all`), com zoom de até nível **20**
  (dá pra aproximar até ver o desenho das ruas e quadras).
- **Tela cheia no celular**: botão flutuante (⛶) no mapa expande o mapa
  para ocupar a tela inteira do dispositivo, sem cabeçalho nem menu
  atrapalhando; outro toque volta ao normal.
- **Rota real dentro do app**: ao tocar em "Como chegar" (página da
  batalha) ou "Traçar rota" (mapa), o app calcula uma rota de verdade via
  **OSRM** (Open Source Routing Machine, gratuito, sem chave) e desenha a
  linha da rota diretamente no mapa — com distância e tempo estimado, sem
  precisar sair do site.
- **Instruções passo a passo (turn-by-turn)**: a rota vem com uma lista de
  manobras traduzidas para português — "Vire à esquerda na Rua X", "Siga em
  frente", "Entre na rotatória e saia na 2ª saída", "Você chegou ao
  destino" — cada uma com ícone de direção e distância até a manobra.
- **Modo navegação ao vivo**: botão "🧭 Navegar" liga o rastreamento
  contínuo da localização (`watchPosition`); a instrução atual avança
  sozinha conforme a pessoa se aproxima de cada manobra, o mapa acompanha a
  posição em zoom de nível de rua, e ao chegar a menos de 30 m do destino o
  app avisa "Você chegou!" e encerra a navegação automaticamente.
- **Localização precisa**: Geolocation API nativa em alta precisão
  (`enableHighAccuracy`), com halo no mapa mostrando o raio de precisão
  reportado pelo GPS do aparelho, e mensagens específicas para cada erro
  (permissão negada, indisponível, tempo esgotado).
- **Localização manual como reserva**: se a pessoa negar a permissão (ou o
  navegador não suportar), dá pra marcar o ponto de partida tocando
  diretamente no mapa — o fluxo de "como chegar" não trava.
- **Coordenadas exatas, não texto**: os links para abrir a rota em apps
  externos (Google Maps, Waze, Apple Maps) usam latitude/longitude exatas
  de origem e destino, não um endereço em texto que o outro app poderia
  interpretar errado.
- **Correção de bugs de mapa**: o componente de mapa agora chama
  `invalidateSize()` automaticamente sempre que o container muda de
  tamanho (troca de aba, tela cheia, rotação de tela) — a causa mais comum
  de mapas Leaflet aparecerem cinzas/cortados em apps React.

O servidor de demonstração do OSRM (`router.project-osrm.org`) é gratuito
e público, mas não tem SLA — para produção com muito tráfego, considere
hospedar sua própria instância OSRM ou um provedor pago (Mapbox Directions,
Google Directions, GraphHopper etc.).

## 8. Funcionalidades implementadas

- **Identidade visual própria**: logo, mascote, ícones de navegação e tela
  de carregamento usando as artes originais do projeto (`public/brand/` e
  `public/icons/`), tema grafite escuro com destaque amarelo neon.
- **Home**: hero com o mascote, indicadores "Ao vivo agora / Perto de você
  / Próximas / Populares" com contagem em tempo real, seções de destaque.
- **Mapa nacional**: pins por status (🔴 ao vivo, 🟢 hoje, 🔵 próxima,
  ⚪ encerrada), rota real desenhada no mapa com instruções passo a passo,
  modo tela cheia.
- **Busca e filtros**: por nome/cidade/bairro, com sidebar de filtros no
  desktop (tipo de batalha + ordenação) e chips no mobile.
- **Página de detalhes**: descrição, mini-mapa com rota e navegação ao
  vivo, banner da batalha, redes sociais, favoritar, compartilhar (Web
  Share API), denunciar, editar (dono/admin).
- **Cadastro de batalha**: local marcado no mapa, banner enviado direto do
  aparelho (câmera ou galeria), frequência (semanal/quinzenal/mensal/
  único), validação de campos. Toda batalha nova entra como **pendente**
  até ser aprovada por um admin.
- **Foto de perfil real**: tire uma selfie na hora ou escolha da galeria —
  o upload vai para o Supabase Storage e a URL pública fica salva no
  perfil, sem precisar colar link nenhum.
- **Autenticação real**: criar conta, login, logout, editar perfil — tudo
  via Supabase Auth, com sessão persistida entre recarregamentos.
- **Favoritos**: favoritar/desfavoritar, página dedicada.
- **Painel administrativo**: dashboard com estatísticas, aprovar/rejeitar/
  editar/remover batalhas, listar usuários, promover admins, resolver
  denúncias.
- **PWA**: instalável, tema escuro nas barras do navegador, splash screen
  própria.
- **Responsivo mobile-first**, com FAB de "Cadastrar" flutuante no
  celular.

Se você rodar `supabase/seed.sql`, as 11 batalhas de exemplo aparecem
marcadas com o selo "Exemplo demonstrativo" nos cards e na página de
detalhes.

## 9. O que fica de fora (v2)

- Notificações push reais sobre novas edições de batalhas favoritas.
- Avaliações (nota 0-5) enviadas por usuários — o campo `rating` já existe
  no schema, falta a tela de avaliar.
- Geocodificação automática de endereço (converter "Rua X, 123" em
  coordenadas sem precisar clicar no mapa).

## 10. Deploy

O projeto gera um build estático padrão (`npm run build` → pasta `dist/`),
compatível com qualquer host de arquivos estáticos:

- **Vercel** ou **Netlify**: importe o repositório, comando de build
  `npm run build`, diretório de saída `dist`. Configure `VITE_SUPABASE_URL`
  e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto no painel
  do host (os mesmos valores do seu `.env`).
- **GitHub Pages / Cloudflare Pages**: mesmo processo, ajustando o `base`
  no `vite.config.ts` se o site não for servido na raiz do domínio.

Como o roteamento é feito no cliente (React Router), configure o host para
redirecionar todas as rotas para `index.html` (fallback SPA) — Vercel e
Netlify fazem isso automaticamente para projetos Vite.

No Supabase, lembre de configurar **Authentication → URL Configuration**
com a URL de produção (Site URL e Redirect URLs), senão os links de
confirmação de e-mail vão apontar para `localhost`.

## 11. Licença de dados de mapa

Os mapas usam dados © colaboradores do
[OpenStreetMap](https://www.openstreetmap.org/copyright) e tiles da
[CARTO](https://carto.com/attributions), conforme atribuição exibida no
próprio mapa. Ao evoluir para produção com volume alto de requisições,
revise os termos de uso de tiles gratuitos da CARTO/OSM ou considere um
provedor pago com SLA (Mapbox, Google Maps, MapTiler etc.).
