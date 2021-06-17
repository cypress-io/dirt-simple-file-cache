import { tmpdir } from 'os'
import { promises as fsp } from 'fs'
import fs from 'fs'
import path from 'path'

import debug from 'debug'
const logError = debug('dsfc:error')
const logTrace = debug('dsfc:trace')
const logDebug = debug('dsfc:debug')
const logInfo = debug('dsfc:info')

const DEFAULT_CACHE_DIR = tmpdir()

export class DirtSimpleFileCache {
  private readonly _cacheDir: string
  private constructor(
    private readonly _projectBaseDir: string,
    readonly cacheDir: string
  ) {
    this._cacheDir = path.join(cacheDir, 'dirt-simple-file-cache')
    logInfo('initialized dirt-simple-file-cache at %s', this._cacheDir)
  }

  static async init(projectBasedir: string, cacheDir = DEFAULT_CACHE_DIR) {
    await fsp.mkdir(cacheDir, { recursive: true })
    return new DirtSimpleFileCache(projectBasedir, cacheDir)
  }

  static initSync(projectBasedir: string, cacheDir = DEFAULT_CACHE_DIR) {
    fs.mkdirSync(cacheDir, { recursive: true })
    return new DirtSimpleFileCache(projectBasedir, cacheDir)
  }

  get(fullPath: string, skipStaleCheck: boolean = false): string | undefined {
    const cachedPath = this._resolveCachePath(fullPath)
    if (!canAccessSync(cachedPath)) {
      logDebug('cache miss "%s"', fullPath)
      return
    }

    if (!skipStaleCheck) {
      const { mtime: currentTime } = fs.statSync(fullPath)
      const { mtime: cachedTime } = fs.statSync(cachedPath)
      if (logTrace.enabled) {
        // prettier-ignore
        logTrace(
      'loading [%s] "%s"\n' +
      'cached  [%s] "%s"',
      currentTime.toLocaleString(),
      fullPath,
      cachedTime.toLocaleString(),
      cachedPath
    )
      }

      if (currentTime > cachedTime) {
        if (logDebug.enabled) {
          logDebug(
            'outdated "%s" [%s] < [%s])',
            fullPath,
            cachedTime.toLocaleString(),
            currentTime.toLocaleString()
          )
        }
        return
      }
    }
    logDebug('cache hit: "%s"', fullPath)
    return fs.readFileSync(cachedPath, 'utf8')
  }

  /**
   * Asynchronously writes the file to the cache directory.
   * All errors are handled (`DEBUG=dsfd*error*`), so the caller doesn't need
   * to `await` the result, but can fire/forget.
   */
  async addAsync(origFullPath: string, convertedContent: string) {
    const cachePath = this._resolveCachePath(origFullPath)
    const cachePathDir = path.dirname(cachePath)
    logDebug('adding "%s" to cache', origFullPath)
    try {
      await fs.promises.mkdir(cachePathDir, { recursive: true })
    } catch (err) {
      logError('Failed to create directory %s', cachePathDir)
      logError(err)
    }
    try {
      await fs.promises.writeFile(cachePath, convertedContent)
    } catch (err) {
      logError('Failed to write file %s', cachePath)
      logError(err)
    } finally {
      logDebug('added "%s" to cache', origFullPath)
    }
  }

  /**
   * Synchronously writes the file to the cache directory.
   * All errors are handled (`DEBUG=dsfd*error*`), so the caller doesn't need
   * to handle them.
   */
  add(origFullPath: string, convertedContent: string) {
    const cachePath = this._resolveCachePath(origFullPath)
    const cachePathDir = path.dirname(cachePath)
    logDebug('adding "%s" to cache', origFullPath)
    try {
      fs.mkdirSync(cachePathDir, { recursive: true })
    } catch (err) {
      logError('Failed to create directory %s', cachePathDir)
      logError(err)
    }
    try {
      fs.writeFileSync(cachePath, convertedContent)
    } catch (err) {
      logError('Failed to write file %s', cachePath)
      logError(err)
    } finally {
      logDebug('added "%s" to cache', origFullPath)
    }
  }

  clear() {
    logInfo('clearing cache')
    return fsp.rmdir(this._cacheDir, { recursive: true })
  }

  clearSync() {
    logInfo('clearing cache')
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
