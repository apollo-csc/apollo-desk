# ApolloDesk — conversas restritas: nas caixas marcadas, o agente comum só enxerga as
# conversas ATRIBUÍDAS A ELE. Roda no BUILD da imagem (ver Dockerfile).
#
# O PEDIDO (Leonardo, 11/nov/2026)
# --------------------------------
# "Não era para nenhum vendedor poder ver mensagens que não estão atribuídas a ele."
# Vale para o WhatsApp; no Instagram e no e-mail quem tem acesso à caixa continua podendo
# responder qualquer conversa aberta. Só administradores enxergam tudo. Começa na
# Dagostino; os outros clientes são os próximos.
# O Chatwoot não tem isso na edição MIT: todo membro da caixa vê todas as conversas dela
# (a Enterprise tem papéis personalizados, que não usamos).
#
# COMO FICA
# ---------
# A regra mora nos custom_attributes da CONTA (dado, não código; sem a chave nada muda):
#   account.custom_attributes['conversas_restritas'] = { 'caixas' => [20] }     # ids das caixas
# Nessas caixas, quem NÃO é administrador da conta só alcança a conversa cujo responsável
# (assignee) é ele. Robôs e administradores não mudam. Os cinco caminhos por onde uma
# conversa chega a um agente passam pelo mesmo módulo (ApolloConversasRestritas):
#   1. listas, contadores, filtros e "conversas anteriores" do contato
#      (Conversations::PermissionFilterService);
#   2. abrir a conversa e tudo dentro dela — mensagens, anexos, etiquetas, atribuição
#      (ConversationPolicy#show?, usada pelo controlador-base das conversas);
#   3. busca de conversas e de mensagens (SearchService);
#   4. eventos em tempo real: mensagem nova, conversa nova, digitando… (ActionCableListener
#      mandava para todos os membros da caixa; agora só para o responsável e os
#      administradores, mais o responsável ANTERIOR no momento da troca, para a tela dele
#      atualizar);
#   5. notificação de conversa nova (NotificationListener notificava todos os membros).
# Conversa sem responsável numa caixa restrita só aparece para administradores.
# Conversa aberta pelo próprio agente nasce atribuída a ele (a tela já manda assignee_id).
#
# O QUE ISTO NÃO COBRE (dito por extenso)
# ---------------------------------------
# - notificações ANTIGAS já gravadas continuam na lista de notificações de cada um;
# - menção (@) a um colega em nota privada avisa o colega, mas ele não consegue abrir a
#   conversa enquanto não for o responsável;
# - o aplicativo do WhatsApp no celular da loja (coexistência) mostra tudo: aquilo não
#   passa pelo Desk.
#
# ⚠️ Ao subir de versão do Chatwoot: as âncoras abaixo precisam continuar existindo, com a
# mesma contagem; o build FALHA se mudarem, de propósito. Conferir com
# deploy/testa-conversas-restritas.rb depois de qualquer build.
require 'fileutils'

APP = ENV.fetch('APOLLO_APP', '/app').freeze

MODULO = <<~'RUBY'
  # ApolloDesk — conversas restritas ao responsável. Ver deploy/patch-conversas-restritas.rb.
  module ApolloConversasRestritas
    CHAVE = 'conversas_restritas'.freeze

    # ids das caixas em que o agente comum só vê o que está atribuído a ele
    def self.caixas(account)
      regra = account&.custom_attributes.to_h[CHAVE]
      return [] unless regra.is_a?(Hash)

      Array(regra['caixas']).map(&:to_i).reject(&:zero?)
    rescue StandardError
      []
    end

    # A regra vale para este usuário? Só para pessoa (User) que não é administradora da conta.
    def self.restrito?(account, user)
      return false unless account && user.is_a?(User)

      !AccountUser.where(account_id: account.id, user_id: user.id, role: :administrator).exists?
    end

    # Escopo de conversas → só as que o usuário pode alcançar.
    def self.filtra(conversations, user, account)
      ids = caixas(account)
      return conversations if ids.empty? || !restrito?(account, user)

      conversations.where('conversations.inbox_id NOT IN (?) OR conversations.assignee_id = ?', ids, user.id)
    end

    # Escopo de mensagens (busca) → só as de conversa que o usuário pode alcançar.
    def self.filtra_mensagens(messages, user, account)
      ids = caixas(account)
      return messages if ids.empty? || !restrito?(account, user)

      messages.where(
        'messages.inbox_id NOT IN (?) OR messages.conversation_id IN (SELECT c.id FROM conversations c WHERE c.account_id = ? AND c.assignee_id = ?)',
        ids, account.id, user.id
      )
    end

    def self.pode_ver?(conversation, user, account)
      account ||= conversation.account
      return true unless caixas(account).include?(conversation.inbox_id)
      return true unless restrito?(account, user)

      conversation.assignee_id == user.id
    end

    # Quem recebe os eventos em tempo real e a notificação de conversa nova. Os
    # administradores são somados à parte por quem chama (ActionCableListener#user_tokens).
    def self.membros(conversation)
      membros = conversation.inbox.members
      return membros unless caixas(conversation.account).include?(conversation.inbox_id)

      ids = [conversation.assignee_id]
      # na troca de responsável, o anterior também recebe o evento (a tela dele precisa saber)
      anterior = conversation.respond_to?(:previous_changes) ? conversation.previous_changes['assignee_id'] : nil
      ids << anterior.first if anterior.is_a?(Array)
      membros.where(id: ids.compact)
    end
  end
RUBY

FileUtils.mkdir_p("#{APP}/app/models/concerns")
File.write("#{APP}/app/models/concerns/apollo_conversas_restritas.rb", MODULO)

# Troca `antes` por `depois` exatamente `vezes` vezes; qualquer outra contagem derruba o build.
def troca(arquivo, antes, depois, vezes = 1)
  caminho = "#{APP}/#{arquivo}"
  src = File.read(caminho)
  achadas = src.scan(antes).length
  abort("patch-conversas-restritas: âncora esperada #{vezes}x e achada #{achadas}x em #{arquivo}:\n#{antes}") unless achadas == vezes
  File.write(caminho, src.gsub(antes) { depois })
  puts "patch-conversas-restritas: #{arquivo} ok (#{vezes}x)"
end

# 1. listas, contadores, filtros, conversas do contato
troca('app/services/conversations/permission_filter_service.rb',
      "    return conversations if user_role == 'administrator'\n\n    accessible_conversations\n",
      "    return conversations if user_role == 'administrator'\n\n    ApolloConversasRestritas.filtra(accessible_conversations, user, account)\n")

# 2. abrir a conversa e tudo dentro dela
troca('app/policies/conversation_policy.rb',
      "    administrator? || agent_bot? || agent_can_view_conversation?\n",
      "    administrator? || agent_bot? || (agent_can_view_conversation? && ApolloConversasRestritas.pode_ver?(record, user, account))\n")

# 3. busca de conversas e de mensagens
troca('app/services/search_service.rb',
      "    conversations_query = current_account.conversations.where(inbox_id: accessable_inbox_ids)\n",
      "    conversations_query = ApolloConversasRestritas.filtra(current_account.conversations.where(inbox_id: accessable_inbox_ids), @current_user, current_account)\n")
troca('app/services/search_service.rb',
      "    query = query.where(inbox_id: accessable_inbox_ids) unless should_skip_inbox_filtering?\n",
      "    query = query.where(inbox_id: accessable_inbox_ids) unless should_skip_inbox_filtering?\n" \
      "    query = ApolloConversasRestritas.filtra_mensagens(query, @current_user, current_account)\n")

# 4. eventos em tempo real
troca('app/listeners/action_cable_listener.rb', 'conversation.inbox.members', 'ApolloConversasRestritas.membros(conversation)', 11)

# 5. notificação de conversa nova
troca('app/listeners/notification_listener.rb', 'conversation.inbox.members', 'ApolloConversasRestritas.membros(conversation)', 2)

puts 'patch-conversas-restritas: módulo gravado em app/models/concerns/apollo_conversas_restritas.rb'
