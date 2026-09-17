-- =============================================================================
-- GPS DAS RIMAS — dados de demonstração
-- =============================================================================
-- Pré-requisito: crie uma conta pelo próprio app (tela "Criar conta") usando
-- o e-mail abaixo ANTES de rodar este script — as batalhas de exemplo
-- precisam de um organizador de verdade (auth.users), já que a tabela
-- battles referencia profiles(id).
--
--   E-mail sugerido: gpsdasrimas@email.com
--
-- Se preferir usar outro e-mail, troque a constante abaixo antes de rodar.
--
-- As datas usam `current_date + N` e horários relativos ao momento em que
-- você rodar este script, então sempre existirá pelo menos uma batalha
-- "ao vivo"/"hoje" quando você testar o app logo em seguida.
-- =============================================================================

do $$
declare
  organizer uuid;
begin
  select id into organizer from auth.users where email = 'gpsdasrimas@email.com' limit 1;

  if organizer is null then
    raise exception
      'Nenhum usuário com e-mail gpsdasrimas@email.com encontrado. Crie essa conta pelo app (tela "Criar conta") e rode este seed de novo — ou edite o e-mail no topo deste arquivo.';
  end if;

  insert into public.battles (
    slug, name, description, city, state, neighborhood, address,
    latitude, longitude, date, time, day_of_week, frequency,
    organizer_id, organizer_name, instagram, tiktok, whatsapp,
    status, editions_count, rating, participants_estimate, is_demo
  ) values
    (
      'batalha-da-aldeota',
      'Batalha da Aldeota',
      'Roda tradicional de improviso que reúne MCs de toda a Fortaleza toda semana, com público fiel e disputas eliminatórias.',
      'Fortaleza', 'CE', 'Aldeota', 'Praça Portugal, Fortaleza - CE',
      -3.7327, -38.5124,
      current_date, (localtime + interval '1 hour')::time,
      trim(to_char(now(), 'Day')), 'semanal',
      organizer, 'Coletivo Rima Certa', '@batalhadaaldeota', '@batalhadaaldeota', '5585999990001',
      'aprovada', 128, 4.7, 180, true
    ),
    (
      'batalha-da-praca-do-ferreira',
      'Batalha da Praça do Ferreira',
      'Ponto de encontro histórico do hip-hop cearense, com batalhas de improviso e apresentações de DJs locais.',
      'Fortaleza', 'CE', 'Centro', 'Praça do Ferreira, Fortaleza - CE',
      -3.7275, -38.5264,
      current_date, (localtime + interval '6 hours')::time,
      trim(to_char(now(), 'Day')), 'quinzenal',
      organizer, 'MC Zulu', '@pracadoferreirabattle', null, null,
      'aprovada', 64, 4.5, 90, true
    ),
    (
      'batalha-da-vila-madalena',
      'Batalha da Vila Madalena',
      'Uma das batalhas mais tradicionais de São Paulo, formadora de vários nomes da cena nacional de rima.',
      'São Paulo', 'SP', 'Vila Madalena', 'Largo da Batata, São Paulo - SP',
      -23.5615, -46.6911,
      current_date, time '21:00',
      trim(to_char(now(), 'Day')), 'semanal',
      organizer, 'Núcleo VM Rimas', '@battlevm', '@battlevm', '5511999990002',
      'aprovada', 210, 4.9, 400, true
    ),
    (
      'batalha-do-centro-sp',
      'Batalha do Centro SP',
      'Duelos de improviso na região central paulistana, com foco em MCs iniciantes.',
      'São Paulo', 'SP', 'Centro', 'Vale do Anhangabaú, São Paulo - SP',
      -23.5462, -46.6389,
      current_date + 1, time '19:30',
      trim(to_char(now() + interval '1 day', 'Day')), 'mensal',
      organizer, 'Coletivo Anhangabaú Livre', '@centrosp.rima', null, null,
      'aprovada', 32, 4.2, 120, true
    ),
    (
      'batalha-da-lapa',
      'Batalha da Lapa',
      'Tradição carioca de sextas-feiras: rima, batida e resenha nos arcos da Lapa.',
      'Rio de Janeiro', 'RJ', 'Lapa', 'Arcos da Lapa, Rio de Janeiro - RJ',
      -22.9133, -43.1797,
      current_date + 2, time '20:00',
      trim(to_char(now() + interval '2 days', 'Day')), 'semanal',
      organizer, 'MC Fenix', '@batalhadalapa', '@batalhadalapa', null,
      'aprovada', 175, 4.8, 300, true
    ),
    (
      'batalha-da-uruguaiana',
      'Batalha da Uruguaiana',
      'Batalha de improviso próxima ao centro do Rio, conhecida por revelar talentos jovens.',
      'Rio de Janeiro', 'RJ', 'Centro', 'Rua Uruguaiana, Rio de Janeiro - RJ',
      -22.9058, -43.1822,
      current_date + 4, time '18:00',
      trim(to_char(now() + interval '4 days', 'Day')), 'quinzenal',
      organizer, 'Coletivo Uru Rimas', null, null, '5521999990003',
      'aprovada', 48, 4.3, 140, true
    ),
    (
      'batalha-da-savassi',
      'Batalha da Savassi',
      'Ponto de encontro da nova geração do rap mineiro, com batalhas semanais animadas.',
      'Belo Horizonte', 'MG', 'Savassi', 'Praça da Savassi, Belo Horizonte - MG',
      -19.9385, -43.9375,
      current_date + 3, time '19:00',
      trim(to_char(now() + interval '3 days', 'Day')), 'semanal',
      organizer, 'BH Rima Coletivo', '@savassibattle', null, null,
      'aprovada', 95, 4.6, 160, true
    ),
    (
      'batalha-do-farol-da-barra',
      'Batalha do Farol da Barra',
      'Rimas à beira-mar em Salvador, misturando improviso com ritmos baianos.',
      'Salvador', 'BA', 'Barra', 'Farol da Barra, Salvador - BA',
      -13.0106, -38.5325,
      current_date + 5, time '19:00',
      trim(to_char(now() + interval '5 days', 'Day')), 'mensal',
      organizer, 'Coletivo Farol Rima', '@faroldabarrabattle', '@faroldabarrabattle', null,
      'aprovada', 40, 4.4, 130, true
    ),
    (
      'batalha-do-marco-zero',
      'Batalha do Marco Zero',
      'No coração do Recife Antigo, uma batalha que já revelou diversos nomes do rap pernambucano.',
      'Recife', 'PE', 'Recife Antigo', 'Marco Zero, Recife - PE',
      -8.0631, -34.8711,
      current_date + 7, time '20:00',
      trim(to_char(now() + interval '7 days', 'Day')), 'quinzenal',
      organizer, 'MC Aurora', '@marcozerobattle', null, null,
      'aprovada', 58, 4.5, 150, true
    ),
    (
      'batalha-da-torre-de-tv',
      'Batalha da Torre de TV',
      'Um dos points mais tradicionais de Brasília, reunindo MCs de todas as regiões administrativas.',
      'Brasília', 'DF', 'Asa Norte', 'Torre de TV, Brasília - DF',
      -15.7897, -47.8933,
      current_date + 2, time '17:00',
      trim(to_char(now() + interval '2 days', 'Day')), 'semanal',
      organizer, 'Coletivo Cerrado Rima', null, null, '5561999990004',
      'aprovada', 87, 4.6, 170, true
    ),
    (
      'batalha-da-ceilandia',
      'Batalha da Ceilândia',
      'Batalha histórica do DF, um dos berços do rap da região administrativa.',
      'Brasília', 'DF', 'Ceilândia', 'Setor O, Ceilândia, Brasília - DF',
      -15.8155, -48.1077,
      current_date + 10, time '18:30',
      trim(to_char(now() + interval '10 days', 'Day')), 'unico',
      organizer, 'MC Raiz', '@ceilandiabattle', null, null,
      'aprovada', 12, 4.1, 90, true
    )
  on conflict (slug) do nothing;
end $$;
