import { tmpdir } from 'os'
import { promises as fsp } from 'fs'
import fs from 'fs'
import path from 'path'

import debug from 'debug'
const logError = debug('dsfc:error')
const logTrace = debug('dsfc:trace')
const logDebug = debug('dsfc:debug')
const logInfo = debug('dsfc:info')

/**
 * Options that configure the [DirtSimpleFileCache].
 *
 * NOTE: if an in memory cache is used contents stored in it are not checked for staleness
 *
 * @property cacheDir: location on disk where cache is located
 * @property keepInMemoryCache: if `true` file contents are kept in an in memory cache as well as on the file system
 */
export type DirtSimpleFileCacheOpts = {
  cacheDir: string
  keepInMemoryCache: boolean
}

const DEFAULT_CACHE_DIR = tmpdir()
const DEFAULT_OPTS: DirtSimpleFileCacheOpts = {
  cacheDir: DEFAULT_CACHE_DIR,
  keepInMemoryCache: false,
}

export class DirtSimpleFileCache {
  private readonly _cacheDir: string
  private readonly _inMemoryCache: Map<string, string> = new Map()

  private constructor(
    private readonly _projectBaseDir: string,
    private readonly _keepInMemoryCache: boolean,
    readonly cacheDir: string
  ) {
    this._cacheDir = path.join(cacheDir, 'dirt-simple-file-cache')
    logInfo('initialized dirt-simple-file-cache at %s', this._cacheDir)
  }

  /**
   * Inits the file cache asynchronously
   *
   * @param projectBasedir root directory of the project whose converted files we are caching
   * @param opts configure location and behavior of the cache
   */
  static async init(
    projectBasedir: string,
    opts: Partial<DirtSimpleFileCacheOpts> = {}
  ) {
    const { cacheDir, keepInMemoryCache } = Object.assign(
      {},
      DEFAULT_OPTS,
      opts
    )
    await fsp.mkdir(cacheDir, { recursive: true })
    return new DirtSimpleFileCache(projectBasedir, keepInMemoryCache, cacheDir)
  }

  /**
   * Inits the file cache synchronously
   *
   * @param projectBasedir root directory of the project whose converted files we are caching
   * @param opts configure location and behavior of the cache
   */
  static initSync(
    projectBasedir: string,
    opts: Partial<DirtSimpleFileCacheOpts> = {}
  ) {
    const { cacheDir, keepInMemoryCache } = Object.assign(
      {},
      DEFAULT_OPTS,
      opts
    )
    fs.mkdirSync(cacheDir, { recursive: true })
    return new DirtSimpleFileCache(projectBasedir, keepInMemoryCache, cacheDir)
  }

  get(fullPath: string, skipStaleCheck: boolean = false): string | undefined {
    // -----------------
    // Check in memory cache
    // -----------------
    if (this._keepInMemoryCache) {
      const fromMemory = this._inMemoryCache.get(fullPath)
      if (fromMemory != null) {
        logDebug('mem cache hit: "%s"', fullPath)
        return fromMemory
      }
    }

    // -----------------
    // Check if cached file even exists
    // -----------------
    const cachedPath = this._resolveCachePath(fullPath)
    if (!canAccessSync(cachedPath)) {
      logDebug('cache miss "%s"', fullPath)
      return
    }

    // -----------------
    // Check if cached file is newer than the original
    // -----------------
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
          cachedPath)
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

    // -----------------
    // Add file loaded from file cache into memory cache and return it
    // -----------------
    logDebug('cache hit: "%s"', fullPath)
    const resource = fs.readFileSync(cachedPath, 'utf8')
    if (this._keepInMemoryCache) {
      this._inMemoryCache.set(fullPath, resource)
    }
    return resource
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
    // -----------------
    // Add to in memory cache
    // -----------------
    if (this._keepInMemoryCache) {
      this._inMemoryCache.set(origFullPath, convertedContent)
    }

    // -----------------
    // Resolve and prepare file cache directory
    // -----------------
    const cachePath = this._resolveCachePath(origFullPath)
    const cachePathDir = path.dirname(cachePath)
    logDebug('adding "%s" to cache', origFullPath)
    try {
      fs.mkdirSync(cachePathDir, { recursive: true })
    } catch (err) {
      logError('Failed to create directory %s', cachePathDir)
      logError(err)
    }

    // -----------------
    // Write file to file cache
    // -----------------
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
    this._inMemoryCache.clear()
    return fsp.rmdir(this._cacheDir, { recursive: true })
  }

  clearSync() {
    logInfo('clearing cache')
    this._inMemoryCache.clear()
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
