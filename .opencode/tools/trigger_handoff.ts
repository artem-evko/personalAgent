import { z } from "zod"
import fs from "fs/promises"
import path from "path"

export default {
  description:
    "Выгружает важное состояние проекта (архитектуру, неочевидные баги, текущий статус и следующие шаги) в .opencode/memory/active_handoff.md для перехода в новый чистый чат без потери нити разработки.",
  args: {
    goal: z.string().describe("Глобальная цель текущей разработки"),
    completed_work: z.array(z.string()).describe("Что уже сделано (текущий статус)"),
    key_findings: z
      .array(z.string())
      .describe("Неочевидные баги, точные пути к файлам, номера строк и сигнатуры функций"),
    modified_files: z.array(z.string()).describe("Список измененных файлов"),
    next_steps: z.array(z.string()).describe("План следующих шагов для нового чата"),
    architecture_notes: z
      .string()
      .optional()
      .describe("Опционально: важные архитектурные узлы проекта для сохранения в project_architecture.md"),
  },
  async execute(args: any, context: any) {
    const cwd = context?.directory || process.cwd()
    const memDir = path.resolve(cwd, ".opencode/memory")
    const histDir = path.join(memDir, "history")
    await fs.mkdir(histDir, { recursive: true })

    if (args.architecture_notes && args.architecture_notes.trim()) {
      await fs.writeFile(
        path.join(memDir, "project_architecture.md"),
        "# Архитектура и контракты проекта\n\n" + args.architecture_notes.trim() + "\n",
        "utf8"
      )
    }

    const now = new Date().toISOString()
    const md = [
      "# Слепок состояния проекта (Handoff от " + now + ")",
      "\n## 1. Глобальная цель задачи\n" + args.goal,
      "\n## 2. Текущий статус (Что выполнено)\n" + (args.completed_work.map((i: string) => "- [x] " + i).join("\n") || "- Нет"),
      "\n## 3. Неочевидные баги, находки и сигнатуры\n" + (args.key_findings.map((i: string) => "- " + i).join("\n") || "- Нет"),
      "\n## 4. Измененные файлы\n" + (args.modified_files.map((i: string) => "- `" + i + "`").join("\n") || "- Нет"),
      "\n## 5. Следующие шаги для нового чата\n" + (args.next_steps.map((i: string) => "- [ ] " + i).join("\n") || "- Нет"),
    ].join("\n")

    const activePath = path.join(memDir, "active_handoff.md")
    await fs.writeFile(activePath, md, "utf8")
    await fs.writeFile(path.join(histDir, "handoff_" + now.replace(/[:.]/g, "-") + ".md"), md, "utf8")

    return "✅ Состояние проекта выгружено в " + activePath + ". Теперь введите /new для старта нового чистого чата — вся память подгрузится автоматически!"
  },
}
