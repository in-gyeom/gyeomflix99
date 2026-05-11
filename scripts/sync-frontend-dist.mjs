import { copyFile, mkdir, readdir, rm, stat } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, "..")
const sourceDir = path.join(projectRoot, "frontend", "dist")
const targetDir = path.join(projectRoot, "backend", "dist")

function shouldSkipPath(sourcePath) {
  const relativePath = path.relative(sourceDir, sourcePath)
  return relativePath === "dev" || relativePath.startsWith(`dev${path.sep}`)
}

async function copyRecursive(sourcePath, targetPath) {
  if (shouldSkipPath(sourcePath)) {
    return
  }

  const sourceStat = await stat(sourcePath)

  if (sourceStat.isDirectory()) {
    await mkdir(targetPath, { recursive: true })

    const entries = await readdir(sourcePath, { withFileTypes: true })
    for (const entry of entries) {
      await copyRecursive(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name),
      )
    }

    return
  }

  await mkdir(path.dirname(targetPath), { recursive: true })
  await copyFile(sourcePath, targetPath)
}

async function main() {
  await rm(targetDir, { recursive: true, force: true })
  await copyRecursive(sourceDir, targetDir)
  console.log(`Synced frontend dist to ${path.relative(projectRoot, targetDir).replace(/\\/g, "/")}`)
}

main().catch((error) => {
  console.error("Failed to sync frontend dist:", error)
  process.exitCode = 1
})