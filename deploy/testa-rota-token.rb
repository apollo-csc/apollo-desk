# ApolloDesk — prova da rota estreita do conector (deploy/apollo-rota-token.rb).
#
#   CONTA=4 OUTRA=5 bundle exec rails runner deploy/testa-rota-token.rb
#
# Roda dentro da imagem (a nova, antes de trocar o serviço) contra o banco de
# verdade. NÃO ESCREVE NADA: a rota só lê, e o roteiro confere ao fim que a
# contagem de usuários, de tokens e de Platform Apps não mudou. O segredo usado é
# gerado aqui, vive só neste processo e não vai para o log — e o token lido NUNCA
# é impresso — as conferências de token comparam BOOLEANO, justamente para o relatório de falha
# não vazar credencial. Sai com código 1 se alguma conferência falhar.
#
# ⚠️ O log do Rails no meio da saída IMPRIME O E-MAIL de quem foi consultado (é a
# linha de auditoria da própria rota). Para ler só o resultado, sem dado de
# pessoa na tela:  ... | grep -vE '^[IWDEF], '
conta = Integer(ENV.fetch('CONTA'))
outra = ENV['OUTRA'] ? Integer(ENV['OUTRA']) : nil
falhas = []
confere = lambda do |nome, obtido, esperado|
  ok = obtido == esperado
  puts "  #{ok ? 'ok   ' : 'FALHA'} #{nome}#{ok ? '' : " | obtido #{obtido.inspect} | esperado #{esperado.inspect}"}"
  falhas << nome unless ok
end

SEGREDO = SecureRandom.hex(32)
SEGREDO_OUTRA = SecureRandom.hex(32)
antes = { usuarios: User.count, tokens: AccessToken.count, platform_apps: PlatformApp.count }

account = Account.find(conta)
# um agente comum da conta: não super administrador E não administrador da conta, com token.
# ⚠️ O "não administrador" é de propósito: se um dia uma conferência falhar, o estrago de um
# valor vazado é menor. (Aconteceu em 12/nov: na 1ª rodada, com FORCE_SSL devolvendo 301, as
# conferências de token imprimiam o esperado em claro — por isso agora elas comparam booleano.)
admins = account.account_users.where(role: :administrator).pluck(:user_id)
agente = account.users.where(type: nil).where.not(id: admins).find { |u| u.access_token.present? }
abort('sem agente comum (não administrador) com token na conta') if agente.nil?
superadmin = User.where.not(type: nil).first
de_fora = if outra
            Account.find(outra).users.where(type: nil).find { |u| !u.account_users.exists?(account_id: conta) }
          end

puts "conta #{conta}: agente ##{agente.id}; super admin #{superadmin ? "##{superadmin.id}" : '(nenhum)'}; " \
     "de outra conta #{de_fora ? "##{de_fora.id} (conta #{outra})" : '(nenhum)'}"
puts "antes: #{antes.inspect}"

ENV["#{ApolloRotaToken::PREFIXO}#{conta}"] = SEGREDO
ENV["#{ApolloRotaToken::PREFIXO}#{outra}"] = SEGREDO_OUTRA if outra
ApolloRotaToken.recarrega!

sessao = ActionDispatch::Integration::Session.new(Rails.application)
# ⚠️ FORCE_SSL está ligado: sem isto TODA requisição volta 301 e a prova vira um
# campo de falhas que nada tem a ver com a rota (foi o que aconteceu na 1ª rodada).
sessao.https!
sessao.host!('app.apollodesk.com.br')
pede = lambda do |email, segredo|
  cabecalhos = segredo ? { 'Api-Access-Token' => segredo } : {}
  sessao.get('/apollo/api/v1/users/token', params: { email: email }, headers: cabecalhos)
  corpo = begin
    JSON.parse(sessao.response.body)
  rescue StandardError
    {}
  end
  [sessao.response.status, corpo]
end

puts 'a rota existe e o porteiro fecha:'
confere.call('rota reconhecida (não é 404 de rota inexistente)',
             Rails.application.routes.recognize_path('/apollo/api/v1/users/token', method: :get)[:controller],
             'apollo/api/v1/tokens')
confere.call('sem segredo: 401', pede.call(agente.email, nil).first, 401)
confere.call('segredo errado: 401', pede.call(agente.email, SecureRandom.hex(32)).first, 401)
confere.call('segredo curto: 401', pede.call(agente.email, 'curto').first, 401)

puts 'com o segredo da conta:'
status, corpo = pede.call(agente.email, SEGREDO)
confere.call('agente da conta: 200', status, 200)
confere.call('devolve o token certo', corpo['access_token'] == agente.access_token.token, true)
confere.call('devolve a conta do segredo', corpo['account_id'], conta)
confere.call('a resposta tem SÓ access_token e account_id', corpo.keys.sort, %w[access_token account_id])
confere.call('não devolve link de SSO nem nada de usuário',
             corpo.to_s.include?('sso_auth_token') || corpo.key?('user') || corpo.key?('pubsub_token'), false)
confere.call('e-mail com espaço e maiúscula resolve igual',
             pede.call(" #{agente.email.upcase} ", SEGREDO).last['access_token'] == agente.access_token.token, true)

puts 'confinamento e recusas (tudo 404, sem dizer o motivo):'
confere.call('e-mail que não existe: 404', pede.call("nao-existe-#{SecureRandom.hex(6)}@invalido.local", SEGREDO).first, 404)
confere.call('e-mail vazio: 404', pede.call('', SEGREDO).first, 404)
if superadmin
  confere.call('super administrador: 404', pede.call(superadmin.email, SEGREDO).first, 404)
  confere.call('super administrador não vaza token', pede.call(superadmin.email, SEGREDO).last.key?('access_token'), false)
end
if de_fora
  confere.call("pessoa da conta #{outra} com o segredo da #{conta}: 404", pede.call(de_fora.email, SEGREDO).first, 404)
  confere.call("a mesma pessoa com o segredo da conta #{outra}: 200", pede.call(de_fora.email, SEGREDO_OUTRA).first, 200)
  confere.call("e o agente da #{conta} com o segredo da #{outra}: 404", pede.call(agente.email, SEGREDO_OUTRA).first, 404)
end

puts 'separação da Platform API (o nosso segredo não é credencial dela):'
sessao.get("/platform/api/v1/users/#{agente.id}", headers: { 'Api-Access-Token' => SEGREDO })
confere.call('Platform API recusa o nosso segredo', sessao.response.status, 401)
confere.call('nenhum Platform App existe', PlatformApp.count, 0)

puts 'nada foi criado nem alterado:'
depois = { usuarios: User.count, tokens: AccessToken.count, platform_apps: PlatformApp.count }
confere.call('contagens iguais às do início', depois, antes)
confere.call('o token do agente é o mesmo de antes', agente.reload.access_token.token == corpo['access_token'], true)

ENV.delete("#{ApolloRotaToken::PREFIXO}#{conta}")
ENV.delete("#{ApolloRotaToken::PREFIXO}#{outra}") if outra
ApolloRotaToken.recarrega!
confere.call('sem segredo no ambiente a rota fecha: 401', pede.call(agente.email, SEGREDO).first, 401)

puts(falhas.empty? ? 'RESULTADO: tudo certo' : "RESULTADO: #{falhas.size} FALHA(S)")
exit(falhas.empty? ? 0 : 1)
