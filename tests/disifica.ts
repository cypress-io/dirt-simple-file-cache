import test from 'tape'
import path from 'path'
import { promises as fs } from 'fs'
import { DirtSimpleFileCache } from '../src/dirt-simple-file-cache'

const fixtures = path.join(__dirname, 'fixtures')
const aAAfoo = path.join(fixtures, 'a', 'aa', 'foo.ts')
const aAAbar = path.join(fixtures, 'a', 'aa', 'bar.ts')
const aABfoo = path.join(fixtures, 'a', 'ab', 'foo.ts')

async function touch(fullPath: string) {
  const content = await fs.readFile(fullPath, 'utf8')
  return fs.writeFile(fullPath, content, 'utf8')
}

async function addUpperCase(
  dirtSimpleFileCache: DirtSimpleFileCache,
  fullPath: string
) {
  const content = await fs.readFile(fullPath, 'utf8')
  const upperCase = content.toUpperCase()
  return dirtSimpleFileCache.addAsync(fullPath, upperCase)
}

test('dirt-simple-file-cache', async (t) => {
  const dirtSimpleFileCache = await DirtSimpleFileCache.init(fixtures)

  //
  t.comment('Empty cache')
  await dirtSimpleFileCache.clear()

  t.notOk(
    dirtSimpleFileCache.get(aAAfoo),
    'getting /a/aa/foo.ts returns undefined'
  )
  t.notOk(
    dirtSimpleFileCache.get(aAAbar),
    'getting /a/aa/bar.ts returns undefined'
  )
  t.notOk(
    dirtSimpleFileCache.get(aABfoo),
    'getting /a/ab/foo.ts returns undefined'
  )

  //
  t.comment('Adding /a/aa/foo.ts to cache')
  await addUpperCase(dirtSimpleFileCache, aAAfoo)

  t.equal(
    dirtSimpleFileCache.get(aAAfoo),
    '// A/AA/FOO.TS\n',
    'getting /a/aa/foo.ts returns converted'
  )
  t.notOk(
    dirtSimpleFileCache.get(aAAbar),
    'getting /a/aa/bar.ts returns undefined'
  )
  t.notOk(
    dirtSimpleFileCache.get(aABfoo),
    'getting /a/ab/foo.ts returns undefined'
  )

  //
  t.comment('Clear cache')

  await dirtSimpleFileCache.clear()
  t.notOk(
    dirtSimpleFileCache.get(aAAfoo),
    'getting /a/aa/foo.ts returns undefined'
  )
  t.notOk(
    dirtSimpleFileCache.get(aAAbar),
    'getting /a/aa/bar.ts returns undefined'
  )
  t.notOk(
    dirtSimpleFileCache.get(aABfoo),
    'getting /a/ab/foo.ts returns undefined'
  )

  //
  t.comment('Adding /a/ab/foo.ts to cache')

  await addUpperCase(dirtSimpleFileCache, aABfoo)
  t.notOk(
    dirtSimpleFileCache.get(aAAfoo),
    'getting /a/aa/foo.ts returns undefined'
  )
  t.notOk(
    dirtSimpleFileCache.get(aAAbar),
    'getting /a/aa/bar.ts returns undefined'
  )
  t.equal(
    dirtSimpleFileCache.get(aABfoo),
    '// A/AB/FOO.TS\n',
    'getting /a/ab/foo.ts returns converted'
  )

  //
  t.comment('Adding /a/aa/bar.ts to cache')

  await addUpperCase(dirtSimpleFileCache, aAAbar)
  t.notOk(
    dirtSimpleFileCache.get(aAAfoo),
    'getting /a/aa/foo.ts returns undefined'
  )
  t.equal(
    dirtSimpleFileCache.get(aAAbar),
    '// A/AA/BAR.TS\n',
    'getting /a/aa/bar.ts returns converted'
  )
  t.equal(
    dirtSimpleFileCache.get(aABfoo),
    '// A/AB/FOO.TS\n',
    'getting /a/ab/foo.ts returns converted'
  )

  //
  t.comment('Modifying /a/ab/foo.ts')

  await touch(aABfoo)
  t.notOk(
    dirtSimpleFileCache.get(aAAfoo),
    'getting /a/aa/foo.ts returns undefined'
  )
  t.equal(
    dirtSimpleFileCache.get(aAAbar),
    '// A/AA/BAR.TS\n',
    'getting /a/aa/bar.ts returns converted'
  )
  t.notOk(
    dirtSimpleFileCache.get(aABfoo),
    'getting /a/ab/foo.ts returns undefined'
  )

  t.end()
})
