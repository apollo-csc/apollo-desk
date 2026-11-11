# ApolloDesk — prova da patch "conversas restritas" (deploy/patch-conversas-restritas.rb).
#
#   CONTA=4 CAIXA=20 bundle exec rails runner deploy/testa-conversas-restritas.rb
#   CONTA=4 CAIXA=20 AGENTE=33 bundle exec rails runner deploy/testa-conversas-restritas.rb   # com um agente escolhido
#
# Roda dentro da imagem (a nova, antes de trocar o serviço; ou a que está no ar) contra o banco de verdade. Liga a regra da conta DENTRO
# de uma transação que é desfeita no fim: nada fica gravado, e a regra de produção não muda por causa deste roteiro. Só mostra ids e
# contagens, nunca texto de cliente. Sai com código 1 se alguma conferência falhar.
conta = Integer(ENV.fetch('CONTA')); caixa = Integer(ENV.fetch('CAIXA'))
falhas = []
confere = lambda do |nome, obtido, esperado|
  ok = obtido == esperado
  puts "  #{ok ? 'ok   ' : 'FALHA'} #{nome}#{ok ? '' : " | obtido #{obtido.inspect} | esperado #{esperado.inspect}"}"
  falhas << nome unless ok
end

account = Account.find(conta); inbox = account.inboxes.find(caixa)
Current.account = account
admin_ids = account.account_users.where(role: :administrator).pluck(:user_id)
# o agente comum, membro da caixa, com MAIS conversas atribuídas nela (e que não é dono de todas)
# AGENTE=<id> escolhe o agente (útil para provar com quem também atende outra caixa)
agente = ENV['AGENTE'] ? inbox.members.where.not(id: admin_ids).find(Integer(ENV['AGENTE'])) : inbox.members.where.not(id: admin_ids).max_by { |u| account.conversations.where(inbox_id: caixa, assignee_id: u.id).count }
admin = User.find(admin_ids.first)
abort('sem agente comum na caixa') unless agente
total = account.conversations.where(inbox_id: caixa).count
dele = account.conversations.where(inbox_id: caixa, assignee_id: agente.id).count
outras_caixas = agente.inboxes.where(account_id: conta).where.not(id: caixa).pluck(:id)
nas_outras = account.conversations.where(inbox_id: outras_caixas).count
puts "conta #{conta}, caixa #{caixa}: #{total} conversas; agente ##{agente.id} tem #{dele}; nas outras caixas dele (#{outras_caixas.inspect}): #{nas_outras}; admin ##{admin.id}"
abort('o agente escolhido precisa ter alguma conversa e não todas') unless dele.positive? && dele < total

visiveis = ->(user) { Conversations::PermissionFilterService.new(account.conversations, user, account).perform }
politica = ->(user, conv) { ConversationPolicy.new({ user: user, account: account, account_user: account.account_users.find_by(user_id: user.id) }, conv).show? }
minha = account.conversations.where(inbox_id: caixa, assignee_id: agente.id).last
alheia = account.conversations.where(inbox_id: caixa).where.not(assignee_id: [agente.id, nil]).last
orfa = account.conversations.where(inbox_id: caixa, assignee_id: nil).last
busca = lambda do |user, tipo|
  Current.user = user
  SearchService.new(current_user: user, current_account: account, search_type: tipo, params: ActionController::Parameters.new(q: 'a')).perform.values.first
end

puts 'SEM a regra (como é hoje):'
confere.call('agente vê todas as conversas da caixa', visiveis.call(agente).where(inbox_id: caixa).count, total)
confere.call('agente abre conversa de outro vendedor', politica.call(agente, alheia), true) if alheia
confere.call('eventos em tempo real vão para todos os membros da caixa', ApolloConversasRestritas.membros(minha).pluck(:id).sort, inbox.members.pluck(:id).sort)

ActiveRecord::Base.transaction do
  account.update!(custom_attributes: account.custom_attributes.to_h.merge('conversas_restritas' => { 'caixas' => [caixa] }))
  account.reload
  puts "COM a regra (caixas #{ApolloConversasRestritas.caixas(account).inspect}), dentro de uma transação que será desfeita:"
  confere.call('lista: na caixa restrita o agente só vê as atribuídas a ele', visiveis.call(agente).where(inbox_id: caixa).count, dele)
  confere.call('lista: nenhuma conversa de outro responsável escapa', visiveis.call(agente).where(inbox_id: caixa).where.not(assignee_id: agente.id).count, 0)
  confere.call('lista: nas outras caixas dele nada muda', visiveis.call(agente).where(inbox_id: outras_caixas).count, nas_outras)
  confere.call('lista: administrador continua vendo tudo', visiveis.call(admin).where(inbox_id: caixa).count, total)
  confere.call('abrir: a conversa dele abre', politica.call(agente, minha), true)
  confere.call('abrir: a de outro vendedor NÃO abre', politica.call(agente, alheia), false) if alheia
  confere.call('abrir: a sem responsável NÃO abre', politica.call(agente, orfa), false) if orfa
  confere.call('abrir: administrador abre a de qualquer um', politica.call(admin, alheia || minha), true)
  robo = account.agent_bots.first || AgentBot.first
  confere.call('abrir: o robô continua abrindo', ConversationPolicy.new({ user: robo, account: account, account_user: nil }, alheia || minha).show?, true) if robo
  em_outra = account.conversations.where(inbox_id: outras_caixas).where.not(assignee_id: agente.id).last
  confere.call('abrir: em caixa não restrita, conversa de outro continua abrindo', politica.call(agente, em_outra), true) if em_outra
  achadas = busca.call(agente, 'Conversation')
  confere.call('busca de conversas: nada de outro responsável na caixa restrita', achadas.where(inbox_id: caixa).where.not(assignee_id: agente.id).count, 0)
  msgs = busca.call(agente, 'Message')
  fora = msgs.to_a.count { |m| m.inbox_id == caixa && m.conversation.assignee_id != agente.id }
  confere.call("busca de mensagens (#{msgs.to_a.size} na página): nenhuma de conversa alheia na caixa restrita", fora, 0)
  confere.call('busca de mensagens do administrador não é filtrada', busca.call(admin, 'Message').to_a.size.positive?, true)
  confere.call('tempo real: só o responsável recebe', ApolloConversasRestritas.membros(minha).pluck(:id), [agente.id])
  confere.call('tempo real: conversa sem responsável não vai para nenhum agente', ApolloConversasRestritas.membros(orfa).pluck(:id), []) if orfa
  if em_outra
    confere.call('tempo real: em caixa não restrita vai para todos os membros', ApolloConversasRestritas.membros(em_outra).pluck(:id).sort, em_outra.inbox.members.pluck(:id).sort)
  end
  if alheia
    alheia.update_columns(assignee_id: agente.id)   # troca de responsável, só nesta transação
    confere.call('depois de receber a conversa, o agente passa a abrir', politica.call(agente, alheia.reload), true)
  end
  raise ActiveRecord::Rollback
end
account.reload
confere.call('a transação foi desfeita: a regra da conta está como antes', account.custom_attributes.to_h.key?('conversas_restritas'), !ENV['REGRA_JA_LIGADA'].nil?)
puts(falhas.empty? ? 'RESULTADO: tudo certo' : "RESULTADO: #{falhas.size} FALHA(S)")
exit(falhas.empty? ? 0 : 1)
