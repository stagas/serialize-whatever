import { deserialize, serialize } from '../src/serialize-whatever'
import { Cable, Plug } from './plugs-and-cables'

describe('serialize/deserialize', () => {
  it('works', () => {
    class Foo {
      a = 1
      b = 2
      constructor(state: Partial<Foo> = {}) {
        Object.assign(this, state)
      }
      toJSON() {
        return {
          a: this.a,
        }
      }
    }
    const obj = {
      a: 123,
      b: new Foo({ a: 2 }),
      c: new Date(123),
    }
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str, [Foo])
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
  })

  it('preserves references', () => {
    class Foo {
      a = 1
      b = 2
      constructor(state: Partial<Foo> = {}) {
        Object.assign(this, state)
      }
      toJSON() {
        return {
          a: this.a,
        }
      }
    }
    const foo = new Foo({ a: 2 })
    const obj = {
      a: 123,
      b: foo,
      c: new Date(123),
      d: foo,
    }
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str, [Foo]) as typeof obj
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
    expect(res.d).toBe(res.b)
  })

  it('common types', () => {
    const obj = {
      a: 123,
      b: new Date(123),
      c: new Map([[1, 2], [3, 4]]),
      d: new Set([1, 2, 3, 4]),
    }
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str)
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
  })

  it('top level map', () => {
    const obj = new Map([[1, 2], [3, 4]])
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str)
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
  })

  it('refs in maps and sets', () => {
    const foo = { hello: 'world' }
    const arr = [1, 2, 3]
    const arrRef = [1, 2, foo]
    const obj = {
      a: foo,
      b: new Date(123),
      c: new Map([[1, foo], [2, arr]] as any),
      d: new Set([1, 2, foo, 4]),
      e: arr,
      f: arrRef,
    }
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str) as typeof obj
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
    expect(res.c.get(1)).toBe(res.a)
    expect(res.c.get(2)).toBe(res.e)
    expect(res.f[2]).toBe(res.a)
  })

  it('refs in maps keys', () => {
    const foo = { hello: 'world' }
    const bar = { one: 'two' }
    const obj = {
      a: new Map([[foo, bar]]),
    }
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str) as typeof obj
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
  })

  it('cross refs', () => {
    const foo = { hello: 'world', bar: undefined } as any
    const bar = { one: 'two', b: foo }
    foo.bar = bar
    const obj = {
      a: foo,
      b: bar,
    } as any
    obj.c = obj.a
    obj.d = { a: obj.a, b: obj.b }
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str)
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
  })

  it('array', () => {
    const obj = [{
      a: 123,
      b: new Date(123),
      c: new Map([[1, 2], [3, 4]]),
      d: new Set([1, 2, 3, 4]),
    }]
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str)
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
  })

  it('plugs and cables', () => {
    const output = new Plug(Plug.Output, 'audio')
    const input = new Plug(Plug.Input, 'audio')
    output.connect(input)
    const obj: Record<'input' | 'output', Plug> = {
      output,
      input,
    }
    const str = serialize(obj)
    expect(str).toMatchSnapshot()
    const res = deserialize(str, [Plug, Cable])
    expect(res).toMatchSnapshot()
    expect(res).toEqual(obj)
  })
})
