# ApolloDesk — prova do painel do Inspetor (deploy/patch-inspetor.rb): quem pode ver e quem é recusado.
#
#   CONTA=4 bundle exec rails runner deploy/testa-inspetor.rb                 # liga o painel com o slug 'dagostino' só dentro da prova
#   CONTA=4 SLUG=dagostino BUSCA=1 bundle exec rails runner deploy/testa-inspetor.rb   # também busca o painel de verdade no Inspetor
#
# Roda dentro da imagem (a nova, antes de trocar o serviço; ou a que está no ar) contra o banco de verdade. Liga e desliga o painel da
# conta DENTRO de uma transação que é desfeita no fim: nada fica gravado. Os tokens de acesso são lidos do banco para a memória e nunca
# impressos. Só mostra ids, códigos de resposta e nomes de chave, nunca texto de cliente. Sai com código 1 se alguma conferência falhar.
require 'action_dispatch/testing/integration'

conta = Integer(ENV.fetch('CONTA')); slug = ENV.fetch('SLUG', 'dagostino'); busca = ENV['BUSCA'] == '1'
falhas = []
confere = lambda do |nome, obtido, esperado|
  ok = obtido == esperado
  puts "  #{ok ? 'ok   ' : 'FALHA'} #{nome}#{ok ? '' : " | obtido #{obtido.inspect} | esperado #{esperado.inspect}"}"
  falhas << nome unless ok
end

account = Account.find(conta)
vinculo = ->(papel) { account.account_users.where(role: papel).joins(:user).order(:id).detect { |au| au.user.access_token.present? } }
au_admin = vinculo.call(:administrator); au_agente = vinculo.call(:agent)
abort('a conta precisa de um administrador e de um agente comum, os dois com token de acesso') unless au_admin && au_agente
# um administrador de OUTRA conta que não seja membro desta
au_fora = AccountUser.where(role: :administrator).where.not(account_id: conta).where.not(user_id: account.account_users.select(:user_id)).joins(:user).order(:id)
                     .detect { |au| au.user.access_token.present? }
robo = AgentBot.where(account_id: conta).order(:id).detect { |b| b.access_token.present? }
puts "conta #{conta}: admin ##{au_admin.user_id}, agente ##{au_agente.user_id}, admin de outra conta #{au_fora ? "##{au_fora.user_id} (conta #{au_fora.account_id})" : 'não há'}, robô #{robo ? "##{robo.id}" : 'não há'}"

sessao = ActionDispatch::Integration::Session.new(Rails.application)
sessao.host!(URI.parse(ENV.fetch('FRONTEND_URL', 'https://localhost')).host); sessao.https!
pede = lambda do |caminho, dono|
  cab = dono ? { 'api_access_token' => dono.access_token.token } : {}
  sessao.get("/api/v1/accounts/#{conta}/apollo_inspetor#{caminho}", headers: cab)
  corpo = begin
    JSON.parse(sessao.response.body)
  rescue JSON::ParserError
    nil
  end
  [sessao.response.status, corpo]
end
liga = lambda do |valor|
  a = Account.find(conta); attrs = a.custom_attributes.dup
  if valor.nil?
    attrs.delete('inspetor')
  else
    attrs['inspetor'] = valor
  end
  a.update_columns(custom_attributes: attrs) # rubocop:disable Rails/SkipsModelValidations
end

ActiveRecord::Base.transaction do
  puts '1) as regras, direto no módulo'
  liga.call(nil)
  confere.call('painel desligado: administrador não pode', ApolloInspetor.pode?(Account.find(conta), au_admin), false)
  liga.call({ 'painel' => slug })
  a = Account.find(conta)
  confere.call('painel ligado: administrador pode', ApolloInspetor.pode?(a, au_admin), true)
  confere.call('painel ligado: agente comum não pode', ApolloInspetor.pode?(a, au_agente), false)
  confere.call('painel ligado: quem não é da conta não pode', ApolloInspetor.pode?(a, nil), false)
  confere.call('painel ligado: administrador de outra conta não pode', ApolloInspetor.pode?(a, au_fora), false) if au_fora
  ['../outro', 'Dagostino', 'a b', '', 'x' * 41].each do |ruim|
    liga.call({ 'painel' => ruim })
    confere.call("slug inválido #{ruim[0, 12].inspect}: painel fica desligado", ApolloInspetor.pode?(Account.find(conta), au_admin), false)
  end
  liga.call('dagostino'); confere.call('atributo que não é objeto: painel fica desligado', ApolloInspetor.pode?(Account.find(conta), au_admin), false)
  liga.call({ 'painel' => slug }); a = Account.find(conta)
  corpo = ApolloInspetor.pedido(a, ActionController::Parameters.new(de: '2026-11-09', ate: '2026-11-13', cde: "2026-11-02'; DROP TABLE x; --", cate: '13/11/2026', conta: 999, outro: 'x'))
  confere.call('pedido: leva a conta de verdade e só datas no formato exato', corpo, { 'conta' => conta, 'de' => '2026-11-09', 'ate' => '2026-11-13' })

  puts '2) as rotas'
  rota = Rails.application.routes.recognize_path("/api/v1/accounts/#{conta}/apollo_inspetor", method: :get)
  confere.call('GET apollo_inspetor', [rota[:controller], rota[:action]], ['api/v1/accounts/apollo_inspetor', 'show'])
  rota = Rails.application.routes.recognize_path("/api/v1/accounts/#{conta}/apollo_inspetor/acesso", method: :get)
  confere.call('GET apollo_inspetor/acesso', [rota[:controller], rota[:action]], ['api/v1/accounts/apollo_inspetor', 'acesso'])

  puts '3) o controller, com o painel LIGADO'
  confere.call('administrador pergunta o acesso', pede.call('/acesso', au_admin.user), [200, { 'ligado' => true }])
  confere.call('agente comum pergunta o acesso', pede.call('/acesso', au_agente.user), [200, { 'ligado' => false }])
  confere.call('agente comum pede o painel: 403', pede.call('', au_agente.user), [403, { 'erro' => 'sem acesso' }])
  confere.call('agente comum pede o painel com datas: 403', pede.call('?de=2026-11-12&ate=2026-11-12', au_agente.user).first, 403)
  confere.call('sem token: 401', pede.call('', nil).first, 401)
  confere.call('sem token, acesso: 401', pede.call('/acesso', nil).first, 401)
  confere.call('administrador de outra conta: 401', pede.call('', au_fora.user).first, 401) if au_fora
  confere.call('robô: 401', pede.call('', robo).first, 401) if robo
  confere.call('robô, acesso: 401', pede.call('/acesso', robo).first, 401) if robo
  if busca
    status, corpo = pede.call('?de=2026-11-12&ate=2026-11-12', au_admin.user)
    confere.call('administrador pede o painel: 200', status, 200)
    confere.call('a resposta é o painel do Inspetor', corpo.is_a?(Hash) && %w[hoje de ate cde cate dias painel].all? { |k| corpo.key?(k) }, true)
    confere.call('a resposta não fica guardada pelo navegador', sessao.response.headers['Cache-Control'].to_s.include?('no-store'), true)
    puts "       chaves da resposta: #{corpo.is_a?(Hash) ? corpo.keys.sort.inspect : corpo.class}"
  else
    puts '  (sem BUSCA=1: a busca de verdade no Inspetor não foi feita)'
  end

  puts '4) o controller, com o painel DESLIGADO'
  liga.call(nil)
  confere.call('administrador pergunta o acesso', pede.call('/acesso', au_admin.user), [200, { 'ligado' => false }])
  confere.call('administrador pede o painel: 403', pede.call('', au_admin.user), [403, { 'erro' => 'sem acesso' }])

  raise ActiveRecord::Rollback
end
confere.call('nada ficou gravado: o atributo da conta voltou ao que era', Account.find(conta).custom_attributes['inspetor'], account.custom_attributes['inspetor'])
puts(falhas.empty? ? "\nTUDO CERTO" : "\n#{falhas.size} FALHA(S): #{falhas.join(' | ')}")
exit(falhas.empty? ? 0 : 1)
