# -*- coding: utf-8 -*-
# Piloto "caixa Equipe" na conta 4 do Desk (Dagostino): caixa API sem canal externo + 3 salas (conversas) com participantes.
# Roda no apollo-prod com o token em variavel de ambiente T (nunca impresso). Idempotente: reaproveita caixa/sala pelo nome.
import json, os, urllib.request
B = "https://app.apollodesk.com.br/api/v1/accounts/4"
H = {"Api-Access-Token": os.environ["T"], "Content-Type": "application/json"}

def api(method, path, body=None):
    data = json.dumps(body, ensure_ascii=True).encode("ascii") if body is not None else None
    req = urllib.request.Request(B + path, data=data, method=method, headers=H)
    with urllib.request.urlopen(req) as r:
        raw = r.read().decode("utf-8")
    return json.loads(raw) if raw.strip() else {}

SALAS = [
    ("Sala Corporativo", [23, 33, 34, 35]),
    ("Sala Loja e Cafeteria", [26, 38, 47, 36]),
    ("Sala Administrativo", [27, 28, 63, 29, 30, 31, 48, 49, 32, 22]),
]
membros = sorted({u for _, us in SALAS for u in us})

caixas = api("GET", "/inboxes")["payload"]
cx = next((c for c in caixas if c["name"] == "Equipe"), None)
if not cx:
    cx = api("POST", "/inboxes", {"name": "Equipe", "enable_auto_assignment": False, "channel": {"type": "api", "webhook_url": ""}})
api("PATCH", "/inboxes/%d" % cx["id"], {"enable_auto_assignment": False})
api("PATCH", "/inbox_members", {"inbox_id": cx["id"], "user_ids": membros})
print("caixa Equipe id", cx["id"], "| membros", len(membros))

for nome, users in SALAS:
    achados = api("GET", "/contacts/search?q=" + urllib.request.quote(nome))["payload"]
    ct = next((c for c in achados if c["name"] == nome), None)
    if not ct:
        ct = api("POST", "/contacts", {"name": nome, "inbox_id": cx["id"]})["payload"]["contact"]
    convs = api("GET", "/contacts/%d/conversations" % ct["id"])["payload"]
    cv = next((c for c in convs if c["inbox_id"] == cx["id"]), None)
    if not cv:
        ci = next(i for i in api("GET", "/contacts/%d" % ct["id"])["payload"]["contact_inboxes"] if i["inbox"]["id"] == cx["id"])
        cv = api("POST", "/conversations", {"inbox_id": cx["id"], "contact_id": ct["id"], "source_id": ci["source_id"], "status": "open"})
    api("PATCH", "/conversations/%d/participants" % cv["id"], {"user_ids": users})
    part = api("GET", "/conversations/%d/participants" % cv["id"])
    print(nome, "| contato", ct["id"], "| conversa", cv["id"], "| participantes", sorted(p["id"] for p in part))
