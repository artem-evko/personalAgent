import path from "path"
import fs from "fs/promises"

export function normalizePath(inputPath: string, cwd: string = process.cwd()): string {
  const cleaned = inputPath.replace(/\\/g, "/").trim()
  const resolved = path.resolve(cwd, cleaned)
  const normalizedCwd = path.resolve(cwd)
  if (!resolved.toLowerCase().startsWith(normalizedCwd.toLowerCase())) {
    throw new Error(`Path escape blocked: ${inputPath} is outside of workspace ${cwd}`)
  }
  return resolved
}

export function detectCrLf(text: string): boolean {
  return text.includes("\r\n")
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n")
}

export function restoreLineEndings(text: string, useCrLf: boolean): string {
  const lfText = text.replace(/\r\n/g, "\n")
  return useCrLf ? lfText.replace(/\n/g, "\r\n") : lfText
}

export async function truncateOutput(
  output: string,
  headLines = 20,
  tailLines = 60,
  logDir = ".opencode/logs"
): Promise<string> {
  const lines = output.split(/\r?\n/)
  if (lines.length <= headLines + tailLines + 10) {
    return output
  }
  try {
    await fs.mkdir(logDir, { recursive: true })
    const logFile = path.join(logDir, `terminal_${Date.now()}.log`)
    await fs.writeFile(logFile, output, "utf-8")
    const head = lines.slice(0, headLines).join("\n")
    const tail = lines.slice(-tailLines).join("\n")
    const omitted = lines.length - headLines - tailLines
    return `${head}\n\n... [Скрыто ${omitted} строк для экономии контекста. Полный лог: ${logFile}] ...\n\n${tail}`
  } catch {
    const head = lines.slice(0, headLines).join("\n")
    const tail = lines.slice(-tailLines).join("\n")
    return `${head}\n\n... [Скрыто ${lines.length - headLines - tailLines} строк] ...\n\n${tail}`
  }
}
