// Teste de ponta a ponta da API publicada (docs/NEON-SETUP.md):
// entrar → listar (catálogo oficial) → criar → ver no sync → excluir → ver excluido no sync.
// Uso: node scripts/e2e.mjs <url da API> <APP_KEY>
// Deixa um comando "e2e-<data>" EXCLUÍDO (exclusão lógica) no banco: é o rastro do teste.
const [base, key] = process.argv.slice(2)
if (!base || !key) {
  console.error('Uso: node scripts/e2e.mjs <url da API> <APP_KEY>')
  process.exit(1)
}

const user = 'Teste E2E'
const headers = { 'content-type': 'application/json', 'x-app-key': key, 'x-usuario': encodeURIComponent(user) }
async function call(method, path, body) {
  const res = await fetch(`${base.replace(/\/$/, '')}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`)
  return data
}
function check(ok, msg) {
  if (!ok) throw new Error(`falhou: ${msg}`)
  console.log(`✔ ${msg}`)
}

const entrou = await call('POST', '/api/entrar', { nome: user })
check(entrou.usuario?.nome === user, `entrar como "${user}"`)

const tudo = await call('GET', '/api/comandos')
const oficiais = tudo.comandos.filter((c) => c.oficial && !c.excluido).length
check(oficiais >= 47, `listar: ${oficiais} comandos oficiais`)

const id = `e2e-${Date.now()}`
const salvo = await call('PUT', `/api/comandos/${id}`, { id, categoria: 'Teste', nome: 'Teste E2E', resumo: '', comando: 'adb shell echo ok', parametro: null, pede_confirmacao: false })
check(salvo.comando.autor === user && !salvo.comando.oficial, 'criar comando (autor certo, não oficial)')

const depois = await call('GET', `/api/comandos?desde=${encodeURIComponent(tudo.servidor_agora)}`)
check(depois.comandos.some((c) => c.id === id), 'o novo aparece no sync')

await call('DELETE', `/api/comandos/${id}`)
const fim = await call('GET', `/api/comandos?desde=${encodeURIComponent(depois.servidor_agora)}`)
check(fim.comandos.find((c) => c.id === id)?.excluido === true, 'exclusão lógica chega no sync')

const semChave = await fetch(`${base.replace(/\/$/, '')}/api/comandos`)
check(semChave.status === 401, 'sem a chave do app: 401')
console.log('\nPonta a ponta OK.')
