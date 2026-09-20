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
10. [Segurança](#10-segurança)
11. [Deploy](#11-deploy)
12. [Licença de dados de mapa](#12-licença-de-dados-de-mapa)

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
| Mapa            | Leaflet + React-Leaflet, tiles gratuitos Esri (sem chave)         |
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
7. Se o seu projeto **já existia** antes desta versão (ou seja, você já
   rodou um `schema.sql` mais antigo), rode também
   [`supabase/hardening.sql`](./supabase/hardening.sql) — ele adiciona os
   reforços de segurança mais recentes sem apagar nada. Veja a seção
   [10. Segurança](#10-segurança) para o que exatamente ele corrige.

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

- **Tiles do mapa**: estilo escuro gratuito da **Esri** (`World Dark Gray
  Canvas` + camada de referência com rótulos), sem precisar de chave nem
  cadastro — resolução nativa até o zoom **16**, e o Leaflet amplia
  (upscale) além disso em vez de mostrar tile em branco.
  > ⚠️ Este projeto usava tiles da CARTO antes, mas a CARTO passou a
  > exigir uma chave gratuita (com cadastro) a partir de agosto de 2026 —
  > por isso a troca para a Esri, que segue sem exigir nada. Se você
  > preferir o visual mais escuro da CARTO e não se importar com um
  > cadastro rápido de 1 minuto, pegue uma chave grátis em
  > [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey) (até 5
  > milhões de requisições/mês de graça) e troque a URL do `TileLayer` em
  > `src/components/BattleMap.tsx` e `src/components/LocationPicker.tsx`
  > de volta para `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=SUA_CHAVE`
  > — nesse caso adicione `https://*.basemaps.cartocdn.com` de volta no
  > `img-src` do CSP (`public/_headers`, `vercel.json` e `index.html`).
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

## 10. Segurança

Este projeto já sai de fábrica com uma base de segurança pensada para os
dois lados: banco de dados (Supabase/Postgres) e aplicação (React/HTTP).

### Banco de dados

- **RLS (Row Level Security) em toda tabela** — cada linha só é
  visível/editável por quem deveria, aplicado pelo próprio Postgres, não
  pela UI (então mesmo chamando a API diretamente, por fora do app, as
  regras valem).
- **Campos administrativos travados por trigger**: `role` (perfil) e
  `status`, `rating`, `editions_count`, `is_demo`, `organizer_id` e
  `created_at` (batalha) só mudam pelas mãos de um admin ou pelos fluxos
  corretos — um usuário comum não consegue virar admin, inflar a própria
  nota ou "roubar" a autoria de uma batalha chamando a API diretamente.
- **`email` do perfil protegido**: ninguém consegue exibir um e-mail
  diferente do que usa para logar (evita se passar por outra pessoa).
- **Limite de tamanho em todo campo de texto** e validação de faixa de
  latitude/longitude — reduz abuso e payloads gigantes.
- **Antiabuso em denúncias**: no máximo uma denúncia em aberto por
  pessoa/batalha por vez.
- **Buckets de imagem restritos no próprio Storage**: só jpeg/png/webp, até
  5 MB — vale mesmo que alguém chame a API do Storage diretamente, tentando
  burlar a validação do app (ex.: enviar um SVG com script embutido, ou um
  arquivo gigante).
- **`promote_to_admin()`** é a única forma de promover alguém a admin
  depois do primeiro — e só funciona se quem chama já for admin.

Se você já rodou `supabase/schema.sql` antes (como no seu projeto), rode
[`supabase/hardening.sql`](./supabase/hardening.sql) uma vez para aplicar
essas proteções sem precisar recriar nada. Instalações novas já recebem
tudo isso direto do `schema.sql` atualizado.

### Aplicação / HTTP

- **Content-Security-Policy** restritiva (bloqueia scripts inline e de
  origens não autorizadas — só carrega o que o app realmente usa: Supabase,
  tiles Esri, OSRM, Google Fonts), configurada em três camadas:
  [`public/_headers`](./public/_headers) (Netlify), [`vercel.json`](./vercel.json)
  (Vercel) e uma tag `<meta>` de reserva no `index.html` para hosts que não
  suportam headers customizados.
- **`X-Frame-Options: DENY`** e `frame-ancestors 'none'` — impede que o
  site seja embutido num iframe de outro domínio (clickjacking).
- **`Permissions-Policy`** restringe câmera/geolocalização ao próprio site
  e bloqueia recursos que o app não usa (microfone, pagamento, USB).
- **`Strict-Transport-Security`**, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy` e `Cross-Origin-Opener-Policy` também configurados.
- **Sem `dangerouslySetInnerHTML`, `eval` nem `innerHTML`** em nenhum
  componente — o React já escapa tudo por padrão, então não há como um
  nome ou descrição digitados por alguém virarem HTML/script executável.
- **Links externos** (Google Maps, Waze, Apple Maps) sempre com
  `rel="noopener noreferrer"`.
- **Senha**: mínimo de 8 caracteres com letra e número, validado no
  cadastro (a política final de senha também pode — e deve — ser reforçada
  direto no painel do Supabase, veja abaixo).
- **`.env` no `.gitignore`** — a chave que você usa aqui é a
  *publishable/anon key*, feita para rodar no navegador e protegida pelo
  RLS, mas mesmo assim o arquivo não deve ir para um repositório público.
- **`npm audit`**: 0 vulnerabilidades conhecidas nas dependências no
  momento em que este projeto foi gerado — vale rodar de novo
  periodicamente.

### Recomendações que só dá para configurar no painel do Supabase

Isso não dá para aplicar por SQL nem pelo código — precisa ser feito uma
vez no [painel do seu projeto](https://supabase.com/dashboard):

- **Authentication → Policies → Password**: ative "Leaked password
  protection" (recusa senhas que já vazaram em outros sites).
- **Authentication → URL Configuration**: configure a Site URL e as
  Redirect URLs com o domínio de produção antes de ir ao ar (senão os
  links de confirmação de e-mail apontam para `localhost`).
- **Authentication → Providers → Email**: mantenha "Confirm email" ativado
  em produção (só vale desativar durante testes locais).
- Considere ativar **CAPTCHA** (hCaptcha, já integrado ao Supabase Auth)
  nas telas de login/cadastro se o site começar a receber tráfego alto ou
  tentativas automatizadas.

## 11. Deploy

O projeto gera um build estático padrão (`npm run build` → pasta `dist/`),
compatível com qualquer host de arquivos estáticos:

- **Vercel** ou **Netlify**: importe o repositório, comando de build
  `npm run build`, diretório de saída `dist`. Configure `VITE_SUPABASE_URL`
  e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto no painel
  do host (os mesmos valores do seu `.env`). Os headers de segurança e o
  fallback de rotas do SPA já vêm prontos em `vercel.json` (Vercel) e
  `public/_headers` + `public/_redirects` (Netlify) — não precisa
  configurar nada manualmente nessa parte.
- **GitHub Pages / Cloudflare Pages**: mesmo processo, ajustando o `base`
  no `vite.config.ts` se o site não for servido na raiz do domínio (esses
  hosts não leem `_headers`/`vercel.json`, então os headers de segurança
  ficam só na tag `<meta>` de reserva do `index.html`).

No Supabase, lembre de configurar **Authentication → URL Configuration**
com a URL de produção (Site URL e Redirect URLs), senão os links de
confirmação de e-mail vão apontar para `localhost`.

## 12. Licença de dados de mapa

Os mapas usam tiles da [Esri](https://www.esri.com) (World Dark Gray
Canvas), com dados de OpenStreetMap, HERE, Garmin, FAO, NOAA e USGS,
conforme atribuição exibida no próprio mapa — gratuitos, sem chave nem
cadastro, sujeitos aos [termos de uso da Esri](https://www.esri.com/en-us/legal/terms/full-master-agreement)
para serviços hospedados. Ao evoluir para produção com volume muito alto
de requisições, considere um provedor pago com SLA (Mapbox, Google Maps,
MapTiler, ou a própria CARTO com uma chave — veja a seção 7).
