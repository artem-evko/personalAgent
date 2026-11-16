#!/usr/bin/env bun
// Интерактивная установка сборки OpenCode + RSI AI Gateway (-95%) для Windows.
// Запуск: bun run setup.ts  (флаг --dry-run только показывает, что будет сделано)
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const ROOT = import.meta.dir
const HOME = os.homedir()
const DRY = process.argv.includes("--dry-run")
const PLACEHOLDER = "YOUR_RSIAI_API_KEY"
const KEY_PATTERN = /^[A-Za-z0-9._-]{8,}$/

const GLOBAL_DIR = path.join(HOME, ".config", "opencode")
const SECRETS_DIR = path.join(HOME, ".secrets")
const BUN_BIN = path.join(HOME, ".bun", "bin")
const MARKER = "# >>> rsi-opencode >>>"
const MARKER_END = "# <<< rsi-opencode <<<"

const rootConfig = path.join(ROOT, "opencode.jsonc")
const template = path.join(ROOT, "opencode.example.jsonc")

const ok = (msg: string) => console.log(`  [OK] ${msg}`)
const note = (msg: string) => console.log(`  [..] ${msg}`)

function write(file: string, content: string) {
  if (DRY) return note(`(dry-run) записал бы ${file}`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content, "utf8")
}

// Перезаписывает файл, но если у пользователя уже было другое содержимое, кладёт копию рядом (.bak).
function writeWithBackup(file: string, content: string) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") !== content) {
    if (DRY) note(`(dry-run) сделал бы резервную копию ${file}.bak`)
    else fs.copyFileSync(file, file + ".bak")
    note(`Старый файл сохранён как ${file}.bak`)
  }
  write(file, content)
}

function readOrExit(file: string) {
  if (!fs.existsSync(file)) {
    console.error(`Не найден файл ${file}. Запускайте setup.ts из корня репозитория.`)
    process.exit(1)
  }
  return fs.readFileSync(file, "utf8")
}

function askKey(envName: string, label: string, required: boolean): string | undefined {
  const fromEnv = process.env[envName]?.trim()
  if (fromEnv && KEY_PATTERN.test(fromEnv)) return fromEnv
  for (let attempt = 0; attempt < 3; attempt++) {
    const hint = required ? "" : " (Enter, чтобы пропустить)"
    const answer = (prompt(`Введите ключ rsiai.net группы ${label}${hint}:`) ?? "").trim()
    if (!answer && !required) return undefined
    if (KEY_PATTERN.test(answer)) return answer
    console.log("  Ключ выглядит неверно: только латиница, цифры, '.', '_' и '-', минимум 8 символов. Попробуйте ещё раз.")
  }
  if (!required) return undefined
  console.error("Не удалось получить ключ. Получите его на https://www.rsiai.net и запустите установку снова.")
  process.exit(1)
}

// Ключ из старого opencode.jsonc (до перехода на ~/.secrets), чтобы не спрашивать его заново.
function legacyKey(): string | undefined {
  if (!fs.existsSync(rootConfig)) return undefined
  const match = fs.readFileSync(rootConfig, "utf8").match(/"apiKey"\s*:\s*"([^"{]+)"/)
  const key = match?.[1]
  if (key && key !== PLACEHOLDER && KEY_PATTERN.test(key)) return key
  return undefined
}

function readKeyFile(file: string): string | undefined {
  if (!fs.existsSync(file)) return undefined
  const key = fs.readFileSync(file, "utf8").trim()
  return KEY_PATTERN.test(key) ? key : undefined
}

// Один ключ на файл, без переноса строки: OpenCode подставляет содержимое файла целиком.
function saveKey(file: string, key: string) {
  write(file, key)
  ok(`ключ сохранён в ${file}`)
}

function powershellProfiles(): string[] {
  const docsOverride = process.env.SETUP_DOCUMENTS_DIR
  let docs = docsOverride
  if (!docs) {
    const systemRoot = process.env.SystemRoot || process.env.windir || "C:\\Windows"
    const candidates = [
      path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
      "powershell",
      "pwsh",
    ]
    for (const exe of candidates) {
      try {
        const res = Bun.spawnSync([
          exe,
          "-NoProfile",
          "-Command",
          "[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Environment]::GetFolderPath('MyDocuments')",
        ])
        const out = res.exitCode === 0 ? res.stdout.toString().trim() : ""
        if (out) {
          docs = out
          break
        }
      } catch {}
    }
  }
  if (!docs) docs = path.join(HOME, "Documents")
  return [
    path.join(docs, "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1"),
    path.join(docs, "PowerShell", "Microsoft.PowerShell_profile.ps1"),
  ]
}

function addToProfile(profile: string) {
  const block = [
    MARKER,
    `if ($env:Path -notlike '*${BUN_BIN}*') { $env:Path += ';${BUN_BIN}' }`,
    MARKER_END,
  ].join("\r\n")
  const current = fs.existsSync(profile) ? fs.readFileSync(profile, "utf8") : ""
  if (current.includes(MARKER)) return ok(`$PROFILE уже настроен: ${profile}`)
  write(profile, current + (current && !current.endsWith("\n") ? "\r\n" : "") + block + "\r\n")
  ok(`~/.bun/bin добавлен в $PROFILE: ${profile}`)
}

console.log("")
console.log("=== Установка OpenCode + RSI AI Gateway (-95%) ===")
console.log("Здравствуйте! Сейчас я настрою конфиг, память, команду /handoff и алиасы ai / aifix.")
if (DRY) console.log("Режим --dry-run: ничего не будет записано.")
console.log("")

// 1. Конфиг с ключом
console.log("1/4 Конфигурация")
const configText = readOrExit(template)
const claudeKeyFile = path.join(SECRETS_DIR, "rsiai-key")
const gptKeyFile = path.join(SECRETS_DIR, "rsiai-gpt-key")
if (readKeyFile(claudeKeyFile)) ok(`ключ группы claude уже есть: ${claudeKeyFile}`)
else {
  console.log("  Ключи создаются на https://www.rsiai.net (раздел с API-ключами), по одному на группу.")
  const key = legacyKey() ?? askKey("RSIAI_API_KEY", "claude", true)!
  saveKey(claudeKeyFile, key)
}
if (readKeyFile(gptKeyFile)) ok(`ключ группы gpt уже есть: ${gptKeyFile}`)
else {
  const key = askKey("RSIAI_GPT_API_KEY", "gpt", false)
  if (key) saveKey(gptKeyFile, key)
  else note(`ключ gpt пропущен: агенты designer-html и reviewer заработают, когда появится ${gptKeyFile}`)
}
writeWithBackup(rootConfig, configText)
ok(`${rootConfig}`)
write(path.join(ROOT, "packages", "opencode", "opencode.jsonc"), configText)
ok("packages/opencode/opencode.jsonc")
writeWithBackup(path.join(GLOBAL_DIR, "opencode.jsonc"), configText)
ok(`${path.join(GLOBAL_DIR, "opencode.jsonc")}`)

// 2. Память
console.log("2/4 Память проекта")
const memDir = path.join(ROOT, ".opencode", "memory")
const memFiles: Record<string, string> = {
  "active_handoff.md": "# Активный Handoff\nАктивных передач состояния пока нет.\n",
  "project_architecture.md": "# Архитектура проекта\nЗдесь хранятся ключевые контракты и структура проекта.\n",
}
for (const [name, body] of Object.entries(memFiles)) {
  const file = path.join(memDir, name)
  if (fs.existsSync(file)) note(`${name} уже есть, не трогаю`)
  else {
    write(file, body)
    ok(`создан .opencode/memory/${name}`)
  }
}

// 3. Глобальные правила и команда /handoff
console.log("3/4 Глобальные правила и /handoff")
writeWithBackup(path.join(GLOBAL_DIR, "AGENTS.md"), readOrExit(path.join(ROOT, "AGENTS.md")))
ok(`${path.join(GLOBAL_DIR, "AGENTS.md")}`)
const commandsDir = path.join(ROOT, ".opencode", "commands")
for (const name of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"))) {
  writeWithBackup(path.join(GLOBAL_DIR, "commands", name), fs.readFileSync(path.join(commandsDir, name), "utf8"))
  ok(`команда /${name.replace(/\.md$/, "")}`)
}
const agentsDir = path.join(ROOT, ".opencode", "agents")
for (const name of fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"))) {
  writeWithBackup(path.join(GLOBAL_DIR, "agents", name), fs.readFileSync(path.join(agentsDir, name), "utf8"))
  ok(`агент ${name.replace(/\.md$/, "")}`)
}

// 3.1 Шаблоны для научных работ (templates/gost.docx, CSL-стили)
const templatesSrc = path.join(ROOT, "templates")
if (fs.existsSync(templatesSrc)) {
  const templatesDst = path.join(GLOBAL_DIR, "templates")
  for (const name of fs.readdirSync(templatesSrc)) {
    const srcFile = path.join(templatesSrc, name)
    if (!fs.statSync(srcFile).isFile()) continue
    if (DRY) note(`(dry-run) скопировал бы шаблон ${name}`)
    else {
      fs.mkdirSync(templatesDst, { recursive: true })
      fs.copyFileSync(srcFile, path.join(templatesDst, name))
    }
    ok(`шаблон ${name}`)
  }
}

// 3.2 Pandoc — нужен команде /docx для сборки научных работ в Word
const pandocExe = path.join(HOME, ".local", "bin", "pandoc.exe")
const pandocOnPath = Bun.spawnSync(["where", "pandoc"]).exitCode === 0
if (fs.existsSync(pandocExe) || pandocOnPath) ok("pandoc найден")
else note("pandoc не найден — нужен только для команды /docx (сборка научных работ в .docx). Поставьте portable-версию: https://github.com/jgm/pandoc/releases, распакуйте в %USERPROFILE%\\.local\\bin")

// 4. Алиасы ai и aifix
console.log("4/4 Команды ai и aifix")
const workDir = ROOT
const bunExe = path.basename(process.execPath).toLowerCase() === "bun.exe" ? process.execPath : path.join(BUN_BIN, "bun.exe")
// Без аргументов открываем проект в папке, из которой вызвана команда; с аргументами (ai run ..., ai serve) передаём их как есть.
const launch = (prefix: string) =>
  [
    "@echo off",
    "setlocal",
    'set "RSI_CWD=%CD%"',
    ...(prefix ? [prefix] : []),
    `cd /d "${workDir}"`,
    `if "%~1"=="" ("${bunExe}" dev "%RSI_CWD%\\.") else ("${bunExe}" dev %*)`,
    "",
  ].join("\r\n")
const cmdFiles: Record<string, string> = {
  "ai.cmd": launch(""),
  "aifix.cmd": launch("taskkill /F /IM bun.exe 2>nul"),
}
for (const [name, body] of Object.entries(cmdFiles)) {
  write(path.join(BUN_BIN, name), body)
  ok(path.join(BUN_BIN, name))
}
for (const profile of powershellProfiles()) addToProfile(profile)

console.log("")
console.log("Готово! Откройте НОВОЕ окно PowerShell и введите:  ai")
console.log("Если OpenCode завис или остались старые процессы:  aifix")
console.log("")
