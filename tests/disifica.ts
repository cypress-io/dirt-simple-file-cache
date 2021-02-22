import test from 'tape'
import path from 'path'
import { promises as fs } from 'fs'
import { Disifica } from '../src/disifica'

const fixtures = path.join(__dirname, 'fixtures')
const aAAfoo = path.join(fixtures, 'a', 'aa', 'foo.ts')
const aAAbar = path.join(fixtures, 'a', 'aa', 'bar.ts')
const aABfoo = path.join(fixtures, 'a', 'ab', 'foo.ts')

async function touch(fullPath: string) {
  const content = await fs.readFile(fullPath, 'utf8')
  return fs.writeFile(fullPath, content, 'utf8')
}

async function addUpperCase(disifica: Disifica, fullPath: string) {
  const content = await fs.readFile(fullPath, 'utf8')
  const upperCase = content.toUpperCase()
  disifica.add(fullPath, upperCase)
}

test('disifica', async (t) => {
  const disifica = await Disifica.init(fixtures)

  //
  t.comment('Empty cache')
  await disifica.clear()

  t.notOk(disifica.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.notOk(disifica.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.notOk(disifica.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')

  //
  t.comment('Adding /a/aa/foo.ts to cache')
  await addUpperCase(disifica, aAAfoo)

  t.equal(
    disifica.get(aAAfoo),
    '// A/AA/FOO.TS\n',
    'getting /a/aa/foo.ts returns converted'
  )
  t.notOk(disifica.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.notOk(disifica.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')

  //
  t.comment('Clear cache')

  await disifica.clear()
  t.notOk(disifica.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.notOk(disifica.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.notOk(disifica.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')

  //
  t.comment('Adding /a/ab/foo.ts to cache')

  await addUpperCase(disifica, aABfoo)
  t.notOk(disifica.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.notOk(disifica.get(aAAbar), 'getting /a/aa/bar.ts returns undefined')
  t.equal(
    disifica.get(aABfoo),
    '// A/AB/FOO.TS\n',
    'getting /a/ab/foo.ts returns converted'
  )

  //
  t.comment('Adding /a/aa/bar.ts to cache')

  await addUpperCase(disifica, aAAbar)
  t.notOk(disifica.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.equal(
    disifica.get(aAAbar),
    '// A/AA/BAR.TS\n',
    'getting /a/aa/bar.ts returns converted'
  )
  t.equal(
    disifica.get(aABfoo),
    '// A/AB/FOO.TS\n',
    'getting /a/ab/foo.ts returns converted'
  )

  //
  t.comment('Modifying /a/ab/foo.ts')

  await touch(aABfoo)
  t.notOk(disifica.get(aAAfoo), 'getting /a/aa/foo.ts returns undefined')
  t.equal(
    disifica.get(aAAbar),
    '// A/AA/BAR.TS\n',
    'getting /a/aa/bar.ts returns converted'
  )
  t.notOk(disifica.get(aABfoo), 'getting /a/ab/foo.ts returns undefined')

  t.end()
})
