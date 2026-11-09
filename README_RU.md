# OpenCode + RSI AI Gateway (-95%)

Готовая сборка OpenCode для Windows: дешёвый шлюз [rsiai.net](https://www.rsiai.net), команда агентов на моделях Claude и GPT, браузер через Playwright, двухуровневая память, команда `/handoff` и короткие команды `ai` и `aifix`.

## Что внутри

- **RSI AI Gateway (-95%)**: два провайдера в окне выбора модели.
  - **RSI · Claude (0.05x)**: Claude Opus 5.5, Sonnet 5.5, Opus 5, Opus 4.8.
  - **RSI · GPT (0.07x)**: GPT-6 Astra, GPT-6.1 Sol, GPT-6 Sol, GPT-5.6 Terra.
- **Оркестратор и субагенты**: главный агент `orchestrator` раздаёт задачи профильным агентам на разных моделях (см. ниже).
- **Playwright MCP**: агенты открывают сайты и свои локальные файлы, делают скриншоты и PDF.
- **Двухуровневая память**: `.opencode/memory/active_handoff.md` (текущий статус) и `.opencode/memory/project_architecture.md` (архитектура и контракты). Они подгружаются в каждый новый чат.
- **`/handoff`**: сохраняет слепок состояния в память перед сменой чата.
- **`ai`**: запускает OpenCode из любой папки.
- **`aifix`**: завершает зависшие процессы Bun и запускает OpenCode заново.

## Агенты

| Агент | Модель | Задача |
| --- | --- | --- |
| `orchestrator` (основной) | Claude Opus 5.5 | планирует, раздаёт задачи субагентам, проверяет результат |
| `designer-html` | GPT-6 Astra | HTML-презентации на Reveal.js, лендинги, вёрстка; проверяет себя по скриншотам |
| `designer-pptx` | Claude Opus 5.5 | редактируемые `.pptx` через PptxGenJS |
| `browser` | Claude Sonnet 5.5 | поиск и сбор данных на сайтах, формы, проверка страниц |
| `writer` | Claude Opus 5.5 | статьи, сценарии слайдов, письма, редактура |
| `reviewer` | GPT-6.1 Sol | независимая проверка, файлы не меняет |

Модели подобраны по рейтингу [DesignArena](https://www.designarena.ai/leaderboard) (ноябрь 2026): GPT-6 Astra первый в HTML-слайдах и вёрстке, Claude Opus 5.5 первый в `.pptx` и агентных задачах.

Шаблоны агентов лежат в `.opencode/agents/`, установщик копирует их в `~/.config/opencode/agents/`.

**Как выбрать оркестратора:** нажимайте **Shift+Tab**, пока внизу не появится `orchestrator`, или наберите `/agents`. Затем в `/models` выберите **Claude Opus 5.5 (RSI)**. Субагенты всегда работают на моделях из своих файлов, выбор модели в чате на них не влияет.

Пример запроса: «Сделай HTML-презентацию на 8 слайдов про …».

## Установка

### 1. Получите API-ключи

В rsiai каждый ключ привязан к одной группе моделей. Ключ группы `claude` не работает с GPT, и наоборот. Нужны два ключа:

| Группа | Множитель цены | Для чего | Файл ключа |
| --- | --- | --- | --- |
| `claude` | 0.05x | оркестратор, `designer-pptx`, `browser`, `writer` | `~/.secrets/rsiai-key` |
| `gpt` | 0.07x | `designer-html`, `reviewer` | `~/.secrets/rsiai-gpt-key` |

1. Откройте [www.rsiai.net](https://www.rsiai.net) и зарегистрируйтесь или войдите.
2. В разделе API-ключей создайте ключ и выберите группу `claude`.
3. Создайте второй ключ с группой `gpt`.
4. Ключи начинаются с `sk-`. Установщик спросит их сам и сохранит в нужные файлы.

Без ключа `gpt` всё работает, кроме `designer-html` и `reviewer`. Оркестратор в этом случае переключает их задачи на Claude Opus 5.5.

### 2. Запустите установку одной командой

Склонируйте репозиторий и запустите установщик в PowerShell:

```powershell
git clone https://github.com/artem-evko/personalAgent.git opencode
cd opencode
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Установщик:

1. проверит Bun и поставит его, если нужно;
2. выполнит `bun install`;
3. запустит `setup.ts`: спросит ключи, сохранит их в `~/.secrets/`, создаст `opencode.jsonc`, папку памяти, агентов, глобальные правила и команды `ai` / `aifix`.

Если репозиторий уже скачан, достаточно двух последних команд.

Ключи можно передать и без вопроса, перед запуском установки:

```powershell
$env:RSIAI_API_KEY = "sk-..."      # группа claude
$env:RSIAI_GPT_API_KEY = "sk-..."  # группа gpt
```

### 3. Откройте новое окно PowerShell

Изменения `$PROFILE` и `PATH` применяются только в новых окнах. Затем введите:

```powershell
ai
```

## Как добавить или заменить ключ вручную

Конфиг не хранит ключи. Он читает их из файлов через `{file:~/.secrets/rsiai-key}` и `{file:~/.secrets/rsiai-gpt-key}`.

Правила:

- **один ключ на файл**, без других строк. Если дописать второй ключ строкой ниже, OpenCode прочитает обе строки как один ключ и получит `Invalid token`;
- ключ группы `claude` кладите в `rsiai-key`, ключ группы `gpt` в `rsiai-gpt-key`.

Записать ключ из PowerShell (подставьте свой ключ вместо `sk-...`):

```powershell
New-Item -ItemType Directory -Force "$HOME\.secrets" | Out-Null
Set-Content -Path "$HOME\.secrets\rsiai-gpt-key" -Value "sk-..." -NoNewline
```

Проверить, что ключ принимается шлюзом:

```powershell
$k = (Get-Content "$HOME\.secrets\rsiai-gpt-key" -Raw).Trim()
$b = '{"model":"gpt-6.1-sol","max_tokens":16,"messages":[{"role":"user","content":"Say OK"}]}'
Invoke-RestMethod -Uri "https://www.rsiai.net/v1/chat/completions" -Method Post -Headers @{Authorization="Bearer $k"} -ContentType "application/json" -Body $b
```

Для ключа `claude` используйте файл `rsiai-key` и модель `claude-sonnet-5-5`. Перезапускать OpenCode после замены ключа не нужно.

## Что создаёт установщик

| Что | Где |
| --- | --- |
| Ключи rsiai | `~/.secrets/rsiai-key`, `~/.secrets/rsiai-gpt-key` |
| Конфиг (без ключей) | `opencode.jsonc` в корне, `packages/opencode/` и `~/.config/opencode/` |
| Агенты | `~/.config/opencode/agents/*.md` |
| Память проекта | `.opencode/memory/active_handoff.md`, `.opencode/memory/project_architecture.md` |
| Глобальные правила и `/handoff` | `~/.config/opencode/AGENTS.md`, `~/.config/opencode/commands/handoff.md` |
| Команды `ai` и `aifix` | `~/.bun/bin/ai.cmd`, `~/.bun/bin/aifix.cmd` |
| PATH для PowerShell | блок в `$PROFILE` (добавляется один раз) |

Если файл уже существовал и отличался, старая версия сохраняется рядом с суффиксом `.bak`. Если ключ уже есть в `~/.secrets/`, установщик его не спрашивает. Ключ из старого `opencode.jsonc` (до этого обновления) переносится в `~/.secrets/rsiai-key` автоматически.

Пути в `ai.cmd` и `aifix.cmd` берутся из места, куда вы склонировали репозиторий. Если папку перенесли, запустите `bun run setup.ts` ещё раз.

Чтобы посмотреть, что будет сделано, без записи файлов:

```powershell
bun run setup.ts --dry-run
```

## Как пользоваться

### `ai`

Запускает OpenCode. Аргументы передаются дальше, например `ai --help`.

### `aifix`

Если OpenCode завис или не стартует, выполните `aifix`. Команда завершит **все** процессы `bun.exe` и запустит OpenCode заново. Другие ваши Bun-процессы тоже закроются.

### `/handoff` и `/new`: как не сжигать токены

Длинный чат стоит дорого: каждый запрос тащит за собой всю историю. Поэтому:

1. Когда чат разросся (примерно после 8–10 шагов), введите `/handoff`.
2. Агент запишет в память цель, статус, неочевидные баги и список следующих шагов.
3. Введите `/new`, чтобы открыть чистый чат.
4. Память подгрузится автоматически, и агент продолжит с того же места без перечитывания файлов.

## Требования для браузера и презентаций

- **Node.js** (проверено на v24) и **Google Chrome**. Playwright MCP скачивается при первом запуске.
- Конфиг запускает `npx` через `node "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js"`, потому что PowerShell по умолчанию блокирует `npx.ps1`. Если Node стоит в другой папке, поправьте путь в `mcp.servers.playwright` в `opencode.jsonc`.
- `.pptx` собираются на Node через PptxGenJS, Python не нужен. В PowerShell агенты вызывают `npm.cmd`, а не `npm`.

## Безопасность

- Ключи хранятся только в `~/.secrets/`, вне репозитория. В конфиге и в Git остаются лишь ссылки на файлы.
- `opencode.jsonc` и `.opencode/memory/` добавлены в `.gitignore`.
- Не публикуйте ключи и не вставляйте их в чат с агентом. Если ключ утёк, перевыпустите его в кабинете rsiai.net.
- Playwright запущен с флагом `--allow-unrestricted-file-access`, чтобы дизайнеры могли открывать свои файлы через `file://`. Из-за этого браузерные инструменты могут читать любые локальные файлы. Агенты по инструкции не выполняют команды со сторонних сайтов, но жёсткой гарантии это не даёт. Если это не подходит, уберите флаг: тогда открывайте файлы через локальный сервер (`npx serve`).

## Проблемы

- **`ai` не найдена**: откройте новое окно PowerShell и проверьте, что `~/.bun/bin` есть в `$env:Path`.
- **Скрипты запрещены**: запускайте установщик с `-ExecutionPolicy Bypass`, как в примере выше.
- **`Invalid token`**: файл ключа повреждён или в нём несколько строк. Оставьте в файле один ключ (см. «Как добавить или заменить ключ вручную»).
- **`No available channel for model ... under group claude`** (`model_not_found`): ключ не той группы. Например, GPT-модель вызвана с ключом `claude`. Проверьте, что ключи лежат в правильных файлах.
- **Playwright: доступ к `file://` запрещён**: в `opencode.jsonc` нет флага `--allow-unrestricted-file-access`.
- **`Server process exited with code 1` и `Cannot find module 'react/jsx-dev-runtime'`**: не установлены зависимости. Выполните `bun install` в корне репозитория и запустите команду снова. Повторяйте этот шаг после каждого `git pull` и после добавления новых пакетов в монорепозиторий.
