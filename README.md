# disifica [![](https://github.com/thlorenz/disifica/workflows/Node/badge.svg?branch=master)](https://github.com/thlorenz/disifica/actions)

Dirt Simple File Cache based on mtime.

## Example

```typescript
import path from 'path'
import { strict as assert } from 'assert'
import { Disifica } from 'disifica'
  
function async doMyThing(projectRoot: string) {
  const disifica = await Disifica.init(projectRoot)
  
  // Clear cache f you want to start fresh 
  await disifica.clear()

  const foo = path.join(projectRoot, '/some/file/foo.ts')
  const bar = path.join(projectRoot, '/some/file/bar.ts')

  const converted = convertMyFile(foo)
  disifica.add(foo, converted)
  
  const cachedFoo = disifica.get(foo)
  const cachedBar = disifica.get(bar)
  
  assert(cachedFoo === converted)
  assert(cachedBar == null)
}
```

The above works across runs as the cache is persisted to a tmp folder.

## Non Features

In memory cache:

Since this is supposed to be _dirt simple_ it does not maintain a cache in memory, i.e.
_mtimes_ are compared via `fs` operations and cached content is retrieved the same way.

## LICENSE

MIT
