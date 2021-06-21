# dirt-simple-file-cache [![](https://github.com/thlorenz/dirt-simple-file-cache/workflows/Node/badge.svg?branch=master)](https://github.com/thlorenz/dirt-simple-file-cache/actions)

Dirt Simple File Cache based on mtime.

## Example

```typescript
import path from 'path'
import { strict as assert } from 'assert'
import { DirtSimpleFileCache } from 'dirt-simple-file-cache'
  
function async doMyThing(projectRoot: string) {
  const dirtSimpleFileCache = await DirtSimpleFileCache.init(projectRoot)
  
  // Clear cache f you want to start fresh 
  await dirtSimpleFileCache.clear()

  const foo = path.join(projectRoot, '/some/file/foo.ts')
  const bar = path.join(projectRoot, '/some/file/bar.ts')

  const converted = convertMyFile(foo)
  dirtSimpleFileCache.add(foo, converted)
  
  const cachedFoo = dirtSimpleFileCache.get(foo)
  const cachedBar = dirtSimpleFileCache.get(bar)
  
  assert(cachedFoo === converted)
  assert(cachedBar == null)
}
```

The above works across runs as the cache is persisted to a tmp folder.

## Extra Features

If `keepInMemoryCache: true` is passed as `opts` then an in memory cache is used. This cache is
not checked for staleness.

For the file cache  _mtimes_ are compared via `fs` operations and cached content is retrieved the same way.

Therefore it is advisable to not keep an in memory cache if you expect your original assets to
change while the program is running.

## LICENSE

MIT
