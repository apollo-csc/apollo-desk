// ApolloDesk — tudo que o painel ainda mostrava em inglês, em pt-BR (ver deploy/patch-campanhas.rb).
// Pedido do Leonardo (06/nov/2026), E16 da APOLLO-132: "se tiver qualquer outra escrita em inglês, deixe em PT".
//
// Por quê por fora do bundle: o Dockerfile não recompila o front (parte da imagem chatwoot/chatwoot),
// então a única porta é fundir as traduções no vue-i18n em tempo de execução. Levantamento de 06/nov
// no container (en × pt_BR, 257 chaves faltando + as que estavam copiadas do inglês).
//
// ⚠️ vue-i18n só expõe app.__VUE_I18N__ em modo de desenvolvimento; em produção a instância vem de
// app._context.provides[app.__VUE_I18N_SYMBOL__]. Foi por isso que a tradução do relatório nunca
// aparecia (campanhas.js usava só o primeiro caminho).
//
// Formato: chave pontilhada → texto. Plural do vue-i18n = " | ". Placeholders {x} são mantidos.
(function () {
  'use strict';

  var T = {
    // ---- filtros avançados / contatos ----
    'FILTER.MULTI_VALUE_INPUT_PLACEHOLDER': 'Digite um valor e pressione Enter para adicionar outro',
    'FILTER.MULTI_VALUE_INPUT_PLACEHOLDER_SHORT': 'Digite um valor',
    'FILTER.ATTRIBUTES.CUSTOM_ATTRIBUTE_CHECKBOX': 'Caixa de seleção',
    'CONTACTS_FILTER.ATTRIBUTES.CUSTOM_ATTRIBUTE_CHECKBOX': 'Caixa de seleção',
    'CONTACT_PANEL.CLICK_TO_EDIT': 'Clique para editar',

    // ---- registros de auditoria ----
    'AUDIT_LOGS.COUNT': '{n} evento | {n} eventos',
    'AUDIT_LOGS.FILTERS.SEARCH_PLACEHOLDER': 'Buscar por nome ou e-mail',
    'AUDIT_LOGS.FILTERS.ALL_EVENTS': 'Todos os eventos',
    'AUDIT_LOGS.FILTERS.DATE_RANGE': 'Período',
    'AUDIT_LOGS.FILTERS.CLEAR_ALL': 'Limpar filtros',
    'AUDIT_LOGS.FILTERS.EVENT_TYPE_GROUPS.ACCESS': 'Acesso',
    'AUDIT_LOGS.FILTERS.EVENT_TYPE_GROUPS.AGENTS_TEAMS': 'Agentes e times',
    'AUDIT_LOGS.FILTERS.EVENT_TYPE_GROUPS.CONFIGURATION': 'Configuração',
    'AUDIT_LOGS.FILTERS.EVENT_TYPE_GROUPS.CONVERSATIONS': 'Conversas',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.SIGN_IN_OUT': 'Entrada / saída',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.AGENTS': 'Agentes',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.TEAMS': 'Times',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.TEAM_MEMBERS': 'Membros do time',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.INBOX_MEMBERS': 'Colaboradores da caixa',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.ACCOUNT': 'Configurações da conta',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.INBOXES': 'Caixas de entrada',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.WEBHOOKS': 'Webhooks',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.AUTOMATION_RULES': 'Regras de automação',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.MACROS': 'Macros',
    'AUDIT_LOGS.FILTERS.EVENT_TYPES.CONVERSATION_DELETIONS': 'Exclusões de conversa',
    'AUDIT_LOGS.FILTERS.SORT.NEWEST': 'Mais recentes primeiro',
    'AUDIT_LOGS.FILTERS.SORT.OLDEST': 'Mais antigos primeiro',

    // ---- automação / macros ----
    'AUTOMATION.ACTION.INSERT_CONTACT_EMAIL': 'Usar o e-mail do contato',
    'AUTOMATION.ACTIONS.REMOVE_ASSIGNED_AGENT': 'Remover agente atribuído',
    'MACROS.ACTIONS.CHANGE_STATUS': 'Alterar status',
    'MACROS.ACTIONS.REMOVE_ASSIGNED_AGENT': 'Remover agente atribuído',
    'COMMAND_BAR.SECTIONS.EXECUTE_MACRO': 'Executar macro',
    'COMMAND_BAR.COMMANDS.EXECUTE_A_MACRO': 'Executar uma macro',

    // ---- chamadas ----
    'CALLS_PAGE.ROW.DELETED_CONTACT': 'Contato excluído',

    // ---- editor (comandos com /) ----
    'SLASH_COMMANDS.HEADING_1': 'Título 1',
    'SLASH_COMMANDS.HEADING_2': 'Título 2',
    'SLASH_COMMANDS.HEADING_3': 'Título 3',
    'SLASH_COMMANDS.ITALIC': 'Itálico',
    'SLASH_COMMANDS.STRIKETHROUGH': 'Tachado',
    'SLASH_COMMANDS.BULLET_LIST': 'Lista com marcadores',
    'SLASH_COMMANDS.ORDERED_LIST': 'Lista numerada',
    'SLASH_COMMANDS.TABLE': 'Tabela',

    // ---- conversa ----
    'CONVERSATION.FEEDBACK_TITLE': 'Avaliação',
    'CONVERSATION.REFERRAL.AD_LABEL': 'Anúncio',
    'CONVERSATION.REFERRAL.POST_LABEL': 'Publicação',
    'CONVERSATION.REFERRAL.VIEW_AD': 'Ver anúncio',
    'CONVERSATION.REFERRAL.WELCOME_MESSAGE_LABEL': 'Mensagem pré-preenchida: ',
    'CONVERSATION.REFERRAL.REPLIED_BELOW': 'O cliente respondeu abaixo',
    'CONVERSATION.WHATSAPP_REFERRAL.AD': 'Anúncio',
    'CONVERSATION.PICKER.VARIABLE.SEARCH_PLACEHOLDER': 'Buscar variáveis',
    'CONVERSATION.PICKER.VARIABLE.DESCRIPTION': 'Descrição',
    'CONVERSATION.PICKER.VARIABLE.VALUE': 'Valor',
    'CONVERSATION.PICKER.VARIABLE.NO_VALUE': 'Sem valor nesta conversa',
    'CONVERSATION.PICKER.EMOJI.SEARCH_PLACEHOLDER': 'Buscar emojis',
    'CONVERSATION.PICKER.EMOJI.EMPTY_STATE': 'Digite para buscar emojis',
    'CONVERSATION.PICKER.MACRO.SEARCH_PLACEHOLDER': 'Buscar macros',
    'CONVERSATION.PICKER.MACRO.ACTION_COUNT': '1 ação | {count} ações',
    'CONVERSATION.PICKER.MENTION.SEARCH_PLACEHOLDER': 'Buscar agentes e times',
    'CONVERSATION.PICKER.MENTION.FILTER.ALL': 'Todos',
    'CONVERSATION.PICKER.MENTION.AVAILABILITY': 'Disponibilidade',
    'CONVERSATION.PICKER.MENTION.ROLE': 'Papel',
    'CONVERSATION.PICKER.MENTION.AUTO_ASSIGN': 'Atribuição automática',
    'CONVERSATION.PICKER.MENTION.ENABLED': 'Ligada',
    'CONVERSATION.PICKER.MENTION.DISABLED': 'Desligada',
    'CONVERSATION.PICKER.MENTION.YOU_ARE_A_MEMBER': 'Você faz parte deste time',

    // ---- central de ajuda ----
    'HELP_CENTER.EDIT_ARTICLE_PAGE.EDIT_ARTICLE.EDITOR_PLACEHOLDER': "Escreva o conteúdo aqui. Digite '/' para as opções de formatação.",

    // ---- caixas de entrada / saúde da conta do WhatsApp ----
    'INBOX_MGMT.DETAILS.ERROR_CHANNEL_CREATION': 'Não foi possível criar a caixa de entrada. Tente de novo.',
    'INBOX_MGMT.ACCOUNT_HEALTH.SECTIONS.BUSINESS_PROFILE': 'Perfil comercial',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_DESCRIPTION.LABEL': 'Descrição',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_DESCRIPTION.TOOLTIP': 'Descrição mostrada aos clientes no perfil comercial do WhatsApp',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_ADDRESS.LABEL': 'Endereço',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_ADDRESS.TOOLTIP': 'Endereço da empresa mostrado no perfil comercial do WhatsApp',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_EMAIL.LABEL': 'E-mail',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_EMAIL.TOOLTIP': 'E-mail de contato mostrado no perfil comercial do WhatsApp',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_WEBSITES.LABEL': 'Sites',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.PROFILE_WEBSITES.TOOLTIP': 'Links de site mostrados no perfil comercial do WhatsApp',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.APPROVED': 'O nome de exibição foi aprovado e pode aparecer no topo das conversas do WhatsApp. Um nome salvo pelo destinatário pode aparecer no lugar.',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.AVAILABLE_WITHOUT_REVIEW': 'O nome de exibição está salvo no seu perfil do WhatsApp, mas os destinatários podem ver o número de telefone até a Meta analisar e aprovar. A Meta inicia essa análise quando a empresa atinge um limite de mensagens maior.',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.PENDING_REVIEW': 'A Meta está analisando o nome de exibição. Nenhuma ação é necessária, a menos que a Meta peça mais informações.',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.REJECTED': 'A Meta não aprovou o nome de exibição. Revise as diretrizes de nome de exibição e depois altere o nome ou recorra na Meta.',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.DECLINED': 'A Meta não aprovou o nome de exibição. Revise as diretrizes de nome de exibição e depois altere o nome ou recorra na Meta.',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.EXPIRED': 'O certificado do número de telefone expirou, então este número não pode ser registrado para uso na API.',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.UNKNOWN': 'A Meta não retornou o status da análise do nome de exibição.',
    'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.MESSAGING_LIMIT_TIER.DESCRIPTION': 'Este limite é compartilhado por todos os números de WhatsApp do portfólio comercial.',
    'INBOX_MGMT.ACCOUNT_HEALTH.BUSINESS_PROFILE.PREVIEW_LABEL': 'Perfil comercial do WhatsApp',
    'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.MODES.SANDBOX': 'Teste',
    'INBOX_MGMT.ADD.TELEGRAM_CHANNEL.BOT_TOKEN.LABEL': 'Token do bot',
    'INBOX_MGMT.ADD.TELEGRAM_CHANNEL.BOT_TOKEN.PLACEHOLDER': 'Token do bot',
    'INBOX_MGMT.ADD.MICROSOFT.TITLE': 'E-mail da Microsoft',
    'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_EMBEDDED_SIGNUP_TITLE': 'Cadastro integrado do WhatsApp',

    // ---- modelos do WhatsApp ----
    'WHATSAPP_TEMPLATE_MGMT.SYNC_TEMPLATES': 'Sincronizar modelos',
    'WHATSAPP_TEMPLATE_MGMT.SYNC_SUCCESS': 'Sincronização de modelos iniciada para todas as caixas de WhatsApp. A atualização pode levar alguns minutos.',
    'WHATSAPP_TEMPLATE_MGMT.PARTIAL_SYNC_ERROR': 'Sincronização iniciada para algumas caixas de WhatsApp, mas outras não puderam ser sincronizadas.',
    'WHATSAPP_TEMPLATE_MGMT.SYNC_ERROR': 'Não foi possível iniciar a sincronização de modelos. Tente de novo.',
    'WHATSAPP_TEMPLATE_MGMT.STATUSES.UNSUBMITTED': 'Não enviado para aprovação do WhatsApp',
    'WHATSAPP_TEMPLATE_MGMT.FILTERS.ALL_TYPES': 'Todos os tipos',

    // ---- relatórios ----
    'REPORT.METRICS.FIRST_RESPONSE_TIME.TOOLTIP_DESCRIPTION': 'Com base em {count} conversa | Com base em {count} conversas',
    'REPORT.METRICS.RESOLUTION_TIME.TOOLTIP_DESCRIPTION': 'Com base em {count} conversa | Com base em {count} conversas',
    'REPORT.METRICS.REPLY_TIME.TOOLTIP_LABEL': 'Tempo de espera',
    'REPORT.METRICS.REPLY_TIME.TOOLTIP_DESCRIPTION': 'Com base em {count} resposta | Com base em {count} respostas',
    'OVERVIEW_REPORTS.HEATMAP_ARIA_LABEL': '{metric} por dia e hora',

    // ---- login / etiquetas / integrações ----
    'LOGIN.SAML.LABEL': 'Entrar com SSO',
    'LABEL_MGMT.SUGGESTIONS.POWERED_BY': 'IA do ApolloDesk',
    'INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.TABLE_HEADER.ENDPOINT': 'Endereço',
    'INTEGRATION_SETTINGS.DASHBOARD_APPS.FORM.URL_LABEL': 'Endereço',
    'CAPTAIN.CUSTOM_TOOLS.FORM.AUTH_TYPES.BEARER': 'Token Bearer',
    'CAPTAIN.CUSTOM_TOOLS.FORM.AUTH_TYPES.BASIC': 'Autenticação básica',
    'CAPTAIN.CUSTOM_TOOLS.FORM.AUTH_CONFIG.BEARER_TOKEN': 'Token Bearer',
    'CAPTAIN.CUSTOM_TOOLS.FORM.PARAM_TYPES.STRING': 'Texto',
    'CAPTAIN.CUSTOM_TOOLS.FORM.PARAM_TYPES.BOOLEAN': 'Verdadeiro/falso',
    'CAPTAIN.CUSTOM_TOOLS.FORM.PARAM_TYPES.ARRAY': 'Lista',
    'CAPTAIN.CUSTOM_TOOLS.FORM.PARAM_TYPES.OBJECT': 'Objeto',

    // ---- Captain (assistente de IA do Chatwoot) ----
    'CAPTAIN.OVERVIEW.METRICS.HOURS_SAVED.NOTE': 'Com base em dois minutos economizados por resposta pública do Captain.',
    'CAPTAIN.OVERVIEW.METRICS.REOPEN.NOTE': 'Quanto menor, mais resoluções permaneceram resolvidas.',
    'CAPTAIN.OVERVIEW.METRICS.DEPTH.NOTE': 'Um número menor pode indicar respostas mais rápidas, mas perguntas complexas podem exigir mais respostas.',
    'CAPTAIN.OVERVIEW.V2.EMPTY': 'Sem dados para este período.',
    'CAPTAIN.OVERVIEW.V2.SUMMARY.GREETING': 'Olá, {name}!',
    'CAPTAIN.OVERVIEW.V2.SUMMARY.DEFAULT_NAME': 'tudo bem',
    'CAPTAIN.OVERVIEW.V2.SUMMARY.EMPTY': 'O resumo de desempenho do Captain aparece aqui quando houver atividade suficiente.',
    'CAPTAIN.OVERVIEW.V2.SUMMARY.PREVIOUS': 'Ponto anterior do resumo',
    'CAPTAIN.OVERVIEW.V2.SUMMARY.NEXT': 'Próximo ponto do resumo',
    'CAPTAIN.OVERVIEW.V2.UNITS.DAYS': '{value}d',
    'CAPTAIN.OVERVIEW.V2.UNITS.HOURS': '{value}h',
    'CAPTAIN.OVERVIEW.V2.UNITS.MINUTES': '{value} min',
    'CAPTAIN.OVERVIEW.V2.METRICS.TIME_SAVED.LABEL': 'Economizado em esforço e tempo dos agentes',
    'CAPTAIN.OVERVIEW.V2.METRICS.DURABLE.LABEL': 'Resoluções do Captain que continuaram fechadas',
    'CAPTAIN.OVERVIEW.V2.METRICS.DURABLE.HINT': 'Parcela das conversas resolvidas pelo Captain que ainda estavam fechadas sete dias depois.',
    'CAPTAIN.OVERVIEW.V2.METRICS.DURABLE.NOTE': 'Só entram resoluções antigas o bastante para serem observadas por sete dias.',
    'CAPTAIN.OVERVIEW.V2.METRICS.MEDIAN_RESOLUTION.LABEL': 'Tempo mediano de resolução',
    'CAPTAIN.OVERVIEW.V2.METRICS.MEDIAN_RESOLUTION.HINT': 'Tempo típico entre a conversa chegar ao Captain e ser resolvida.',
    'CAPTAIN.OVERVIEW.V2.METRICS.MEDIAN_RESOLUTION.NOTE': 'Quanto menor, mais cedo os clientes foram atendidos.',
    'CAPTAIN.OVERVIEW.V2.METRICS.DEPTH.LABEL': 'Mensagens por conversa',
    'CAPTAIN.OVERVIEW.V2.METRICS.OF_TOTAL': 'de {total}',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.ARIA_LABEL': 'Fluxo das conversas atendidas pelo Captain e desfechos com o time',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.HANDLED': 'Atendidas',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.RESOLVED_BY_CAPTAIN': 'Resolvidas pelo Captain',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.HANDED_OFF': 'Transferidas',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.CLOSED_WITH_TEAM': 'Fechadas com o time',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.REOPENED': 'Reabertas em 7 dias',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.STAYED_CLOSED': 'Continuaram fechadas',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_FLOW.NODES.OTHER_REASONS': 'Outros motivos',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.TITLE': 'Motivos de transferência',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.CUSTOMER_REQUEST': 'Pedido do cliente',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.MISSING_KNOWLEDGE': 'Falta de conhecimento',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.UNSUPPORTED_REQUEST': 'Pedido não suportado',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.POLICY_RESTRICTION': 'Restrição de política',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.TOOL_FAILURE': 'Falha de ferramenta',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.PENDING_CLARIFICATION': 'Aguardando esclarecimento do cliente',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.PERCENTAGE': '({value}%)',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.USAGE_LIMIT': 'Limite de uso',
    'CAPTAIN.OVERVIEW.V2.HANDOFF_REASONS.UNCLASSIFIED': 'Sem classificação',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.TITLE': 'Tendência de resolução',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.CONVERSATION_COUNT': 'Quantidade de conversas',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.RESOLUTION_RATE': 'Taxa de resolução',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.CURRENT_PERIOD': 'Período atual',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.PREVIOUS_PERIOD': 'Período anterior',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.HANDLED': 'Atendidas',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.RESOLVED': 'Resolvidas pelo Captain',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.ARIA_LABEL': 'Conversas atendidas e resolvidas pelo Captain por período',
    'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.RATE_ARIA_LABEL': 'Taxas de resolução do Captain no período atual e no anterior',
    'CAPTAIN.OVERVIEW.V2.CSAT.TITLE': 'CSAT do Captain',
    'CAPTAIN.OVERVIEW.V2.CSAT.AUTONOMOUS': 'Conversas resolvidas pelo Captain',
    'CAPTAIN.OVERVIEW.V2.CSAT.AUTONOMOUS_HINT': 'Nota média dos clientes nas conversas que o Captain resolveu sem ajuda do time.',
    'CAPTAIN.OVERVIEW.V2.CSAT.ASSISTED': 'Conversas assistidas pelo Captain',
    'CAPTAIN.OVERVIEW.V2.CSAT.ASSISTED_HINT': 'Nota média dos clientes quando o Captain ajudou antes de o time resolver a conversa.',
    'CAPTAIN.OVERVIEW.V2.CSAT.VS_HUMANS': '{value} vs. humanos',
    'CAPTAIN.OVERVIEW.V2.USAGE.TITLE': 'Uso',
    'CAPTAIN.OVERVIEW.V2.USAGE.CREDITS': 'Créditos',
    'CAPTAIN.OVERVIEW.V2.USAGE.DOCUMENTS': 'Documentos',
    'CAPTAIN.OVERVIEW.V2.USAGE.USED': '({percentage}% usado)',
    'CAPTAIN.OVERVIEW.V2.USAGE.VALUE': '{used}/{total}',
    'CAPTAIN.OVERVIEW.V2.USAGE.REFRESH': 'Atualizar uso',
    'CAPTAIN.OVERVIEW.V2.USAGE.BUY_MORE': 'Comprar mais créditos',
    'CAPTAIN.OVERVIEW.V2.KNOWLEDGE.REVIEW': 'Revisar perguntas frequentes',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.TITLE': 'Quando o cliente para de responder',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.DESCRIPTION': 'Escolha como o Captain trata a conversa.',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.MODE_LABEL': 'Ação quando o cliente para de responder',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.REVIEW_AFTER': 'Revisar após',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.RESOLVE_AFTER': 'Resolver após',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.ALWAYS_WARNING': 'O Captain vai resolver toda conversa após o tempo escolhido, sem revisar. Conversas que ainda precisam de ajuda podem ser fechadas.',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.PENDING_INFO': 'A conversa fica pendente até o cliente responder.',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.RESOLUTION_MESSAGE.TITLE': 'Enviar uma mensagem ao resolver',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.RESOLUTION_MESSAGE.DESCRIPTION': 'O Captain envia esta mensagem de encerramento antes de resolver a conversa.',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.MODES.DISABLED.LABEL': 'Esperar o cliente',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.MODES.DISABLED.DESCRIPTION': 'O Captain não resolve a conversa. Ainda pode transferir se o cliente pedir.',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.MODES.LEGACY.LABEL': 'Sempre resolver',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.MODES.LEGACY.DESCRIPTION': 'O Captain resolve toda conversa após o tempo escolhido.',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.MODES.EVALUATED.LABEL': 'Deixar o Captain revisar (recomendado)',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.MODES.EVALUATED.DESCRIPTION': 'O Captain decide se resolve a conversa ou transfere.',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.DURATION_HOURS_ARIA_LABEL': 'Horas antes da ação',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.DURATION_MINUTES_ARIA_LABEL': 'Minutos antes da ação',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.DURATION_HOURS_SHORT': '{count} h',
    'CAPTAIN.ASSISTANTS.FORM.INACTIVITY_RESOLUTION.DURATION_MINUTES_SHORT': '{count} min',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.EVERYONE.LABEL': 'Todos',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.EVERYONE.DESC': 'O Captain responde a toda conversa nas caixas conectadas.',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.SPECIFIC.LABEL': 'Público específico',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.SPECIFIC.DESC': 'O Captain responde só aos clientes que atendem às condições abaixo.',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.ADD_CONDITION': 'Adicionar condição',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.ADD_GROUP': 'Adicionar grupo de condições',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.EMPTY_TITLE': 'Nenhuma condição ainda',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.EMPTY_BODY': 'Adicione uma condição para segmentar clientes, ou um grupo de condições para combinar condições com lógica e/ou.',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.EMPTY_ERROR': 'Adicione pelo menos uma condição para um público específico.',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.MATCH_PREFIX': 'Atender',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.MATCH_SUFFIX': 'das condições a seguir',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.MATCH_ALL': 'todas',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.MATCH_ANY': 'qualquer uma',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.GROUP_CONTACT': 'Atributos do contato',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.GROUP_CONVERSATION': 'Conversa',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.GROUP_CUSTOM': 'Atributos personalizados',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.BROWSER_LANGUAGE': 'Idioma do navegador',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.CONVERSATION_LANGUAGE': 'Idioma da primeira mensagem',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.LOGGED_IN': 'Usuário autenticado',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.LOGGED_IN_TRUE': 'Sim',
    'CAPTAIN.ASSISTANTS.FORM.AUDIENCE.LOGGED_IN_FALSE': 'Não',
    'CAPTAIN.ASSISTANTS.FORM.SCHEDULE.ALWAYS.LABEL': 'A qualquer hora',
    'CAPTAIN.ASSISTANTS.FORM.SCHEDULE.ALWAYS.DESC': 'O Captain responde a toda conversa, independentemente do horário.',
    'CAPTAIN.ASSISTANTS.FORM.SCHEDULE.BUSINESS_HOURS.LABEL': 'No horário comercial',
    'CAPTAIN.ASSISTANTS.FORM.SCHEDULE.BUSINESS_HOURS.DESC': 'O Captain responde só dentro do horário comercial de cada caixa.',
    'CAPTAIN.ASSISTANTS.FORM.SCHEDULE.OUTSIDE_BUSINESS_HOURS.LABEL': 'Fora do horário comercial',
    'CAPTAIN.ASSISTANTS.FORM.SCHEDULE.OUTSIDE_BUSINESS_HOURS.DESC': 'O Captain responde só quando cada caixa está fechada.',
    'CAPTAIN.ASSISTANTS.FORM.SCHEDULE.HINT': 'Caixas sem horário comercial configurado são sempre cobertas.',
    'CAPTAIN.ASSISTANTS.SETTINGS.SYSTEM_SETTINGS.DESCRIPTION_V2': 'Defina o que o Captain faz quando o cliente para de responder e a mensagem de transferência.',
    'CAPTAIN.ASSISTANTS.SETTINGS.AUDIENCE.TITLE': 'Público',
    'CAPTAIN.ASSISTANTS.SETTINGS.AUDIENCE.DESCRIPTION': 'Escolha se este assistente responde a todos ou só a um público específico.',
    'CAPTAIN.ASSISTANTS.SETTINGS.SCHEDULE.TITLE': 'Horário',
    'CAPTAIN.ASSISTANTS.SETTINGS.SCHEDULE.DESCRIPTION': 'Escolha quando o Captain responde. Fora dessa janela, as conversas vão para o time.',
    'CAPTAIN.DOCUMENTS.USED_IN_CONVERSATIONS': 'Usado em {n} conversa | Usado em {n} conversas',
    'CAPTAIN.DOCUMENTS.NO_USED_CONVERSATIONS': 'Nenhuma conversa encontrada para este documento.',
    'CAPTAIN.DOCUMENTS.FILTERS.SORT.MOST_USED': 'Mais usados em conversas',
    'CAPTAIN.DOCUMENTS.DETAILS.USED_IN_CONVERSATIONS': 'Usado em conversas',
    'CAPTAIN.RESPONSES.NO_USED_CONVERSATIONS': 'Nenhuma conversa encontrada para esta pergunta.'
  };

  // chave pontilhada → objeto aninhado (o mergeLocaleMessage funde por ramo)
  function aninha(flat) {
    var raiz = {};
    Object.keys(flat).forEach(function (k) {
      var partes = k.split('.'), no = raiz;
      for (var i = 0; i < partes.length - 1; i++) no = no[partes[i]] = no[partes[i]] || {};
      no[partes[partes.length - 1]] = flat[k];
    });
    return raiz;
  }

  function i18nDoApp() {
    var el = document.getElementById('app');
    var a = el && el.__vue_app__;
    if (!a) return null;
    if (a.__VUE_I18N__) return a.__VUE_I18N__; // desenvolvimento
    var sym = a.__VUE_I18N_SYMBOL__; // produção
    return (sym && a._context && a._context.provides && a._context.provides[sym]) || null;
  }
  window.apolloI18n = i18nDoApp; // reaproveitado por campanhas.js

  var feito = false;
  function aplica() {
    if (feito) return;
    var i18n = i18nDoApp();
    if (!i18n || !i18n.global || !i18n.global.mergeLocaleMessage) return;
    var arvore = aninha(T);
    ['pt_BR', 'pt'].forEach(function (loc) { try { i18n.global.mergeLocaleMessage(loc, arvore); } catch (e) { /* idioma não carregado */ } });
    feito = true;
  }
  aplica();
  var tentativas = 0;
  var timer = setInterval(function () { aplica(); if (feito || ++tentativas > 60) clearInterval(timer); }, 500);
})();
