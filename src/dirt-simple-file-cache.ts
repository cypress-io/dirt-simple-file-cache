import { tmpdir } from 'os'
import { promises as fsp } from 'fs'
import fs from 'fs'
import path from 'path'

const DEFAULT_CACHE_DIR = tmpdir()

export class DirtSimpleFileCache {
  private readonly _cacheDir: string
  private constructor(
    private readonly _projectBaseDir: string,
    readonly cacheDir: string
  ) {
    this._cacheDir = path.join(cacheDir, 'dirt-simple-file-cache')
  }

  static async init(projectBasedir: string, cacheDir = DEFAULT_CACHE_DIR) {
    await fsp.mkdir(cacheDir, { recursive: true })
    return new DirtSimpleFileCache(projectBasedir, cacheDir)
  }

  static initSync(projectBasedir: string, cacheDir = DEFAULT_CACHE_DIR) {
    fs.mkdirSync(cacheDir, { recursive: true })
    return new DirtSimpleFileCache(projectBasedir, cacheDir)
  }

  get(fullPath: string): string | undefined {
    const cachedPath = this._resolveCachePath(fullPath)
    if (!canAccessSync(cachedPath)) return

    const { mtime: currentTime } = fs.statSync(fullPath)
    const { mtime: cachedTime } = fs.statSync(cachedPath)

    if (currentTime > cachedTime) return
    return fs.readFileSync(cachedPath, 'utf8')
  }

  add(origFullPath: string, convertedContent: string) {
    const cachePath = this._resolveCachePath(origFullPath)
    const cachePathDir = path.dirname(cachePath)
    fs.mkdirSync(cachePathDir, { recursive: true })
    fs.writeFileSync(cachePath, convertedContent)
  }

  clear() {
    return fsp.rmdir(this._cacheDir, { recursive: true })
  }

  clearSync() {
    fs.rmdirSync(this._cacheDir, { recursive: true })
  }

  _resolveCachePath(fullPath: string) {
    const relPath = path.relative(this._projectBaseDir, fullPath)
    return path.resolve(this._cacheDir, relPath)
  }
}

function canAccessSync(p: string) {
  try {
    fs.accessSync(p)
    return true
  } catch (_) {
    return false
  }
}
