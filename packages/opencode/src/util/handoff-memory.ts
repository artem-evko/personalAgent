import path from "path"
import fs from "fs/promises"

export interface HandoffPayload {
  goal: string
  completed_work: string[]
  key_findings: string[]
  modified_files: string[]
  next_steps: string[]
  architecture_notes?: string
}

const MEMORY_DIR = ".opencode/memory"
const ARCH_FILE = "project_architecture.md"
const HANDOFF_FILE = "active_handoff.md"

export async function saveHandoff(payload: HandoffPayload, cwd: string = process.cwd()): Promise<string> {
  const memPath = path.resolve(cwd, MEMORY_DIR)
  const historyPath = path.join(memPath, "history")
  await fs.mkdir(historyPath, { recursive: true })

  if (payload.architecture_notes && payload.architecture_notes.trim().length > 0) {
    const archFilePath = path.join(memPath, ARCH_FILE)
    await fs.writeFile(archFilePath, `# Архитектура и контракты проекта\n\n${payload.architecture_notes.trim()}\n`, "utf-8")
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const markdown = [
    `# Активный Handoff (${new Date().toISOString()})`,
    `\n## 1. Глобальная цель задачи\n${payload.goal}`,
    `\n## 2. Что уже выполнено (Completed)\n${payload.completed_work.map((i) => `- [x] ${i}`).join("\n") || "- Нет записей"}`,
    `\n## 3. Ключевые технические находки, сигнатуры и грабли\n${payload.key_findings.map((i) => `- ${i}`).join("\n") || "- Нет записей"}`,
    `\n## 4. Измененные файлы\n${payload.modified_files.map((i) => `- \`${i}\``).join("\n") || "- Нет файлов"}`,
    `\n## 5. План следующих шагов (Next Steps)\n${payload.next_steps.map((i) => `- [ ] ${i}`).join("\n") || "- Нет шагов"}`,
  ].join("\n")

  const activeFilePath = path.join(memPath, HANDOFF_FILE)
  const archiveFilePath = path.join(historyPath, `handoff_${timestamp}.md`)

  await fs.writeFile(activeFilePath, markdown, "utf-8")
  await fs.writeFile(archiveFilePath, markdown, "utf-8")

  return activeFilePath
}

export async function loadMemoryContext(cwd: string = process.cwd()): Promise<string> {
  const memPath = path.resolve(cwd, MEMORY_DIR)
  const sections: string[] = []

  try {
    const arch = await fs.readFile(path.join(memPath, ARCH_FILE), "utf-8")
    if (arch.trim()) sections.push(`<project_architecture_memory>\n${arch.trim()}\n</project_architecture_memory>`)
  } catch {}

  try {
    const handoff = await fs.readFile(path.join(memPath, HANDOFF_FILE), "utf-8")
    if (handoff.trim()) sections.push(`<active_handoff_memory>\n${handoff.trim()}\n</active_handoff_memory>`)
  } catch {}

  return sections.join("\n\n")
}
