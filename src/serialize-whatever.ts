import { Ctor } from 'everyday-types'

type AnyFn = (x: any) => any

type Entry = {
  $r: number // ref id
  $t: string // type
  $v: any // value
}

type Ptr = {
  $p: number // pointer to reference id
}

export const thru = (x: any) => x

export const createContext = (extraTypes: [Ctor, [AnyFn, AnyFn]][] = []) => {
  const Types = new Map([
    [Object],
    [Array, [thru, thru]],
    [Map, [x => [...x]]],
    [Set, [x => [...x]]],
    [Date],
    ...extraTypes,
  ] as [Ctor, [AnyFn, AnyFn]][])

  const TypesMap = [...Types.keys()].map(x => [x.name, x])

  let pointer = 0
  const ptrs = new Map<object, Ptr>()

  const defaultSerializer = (obj: object & { toJSON?: () => object }): any =>
    obj.toJSON ? obj.toJSON() : Object.assign({}, obj)

  const createEntry = (serializer: AnyFn, obj: object & { toJSON?: () => object }): Entry | Ptr =>
    ptrs.get(obj) ?? ({
      $r: (ptrs.set(obj, { $p: ++pointer } as Ptr), pointer),
      $t: obj.constructor.name,
      $v: serializer(obj),
    })

  const replacer = (
    top: unknown,
    clear = true,
  ) => (clear && (pointer = 0, ptrs.clear()), function(this: any, key: string): string | Entry | Ptr {
    const value = this[key]

    if (
      (value === top && key !== '')
      || (typeof value === 'object' && value.$r)
      || this.$r
    ) {
      return value
    }

    if (typeof value === 'object') {
      const [serializer = defaultSerializer] = Types.get(value.constructor) ?? []
      return createEntry(serializer, value)
    }

    return value
  })

  const reviver = (
    classes: Ctor[],
    refs: Map<number, object> = new Map(),
    pending: Map<number, Set<[any, string | ((result: any) => void)]>> = new Map(),
  ) => {
    const types = new Map([
      ...TypesMap,
      ...classes.map(x => [x.name, x]),
    ] as [string, Ctor][])

    return function(this: any, key: string, value: any) {
      if (typeof value === 'object' && value !== null) {
        if (value.$t) {
          const { $r, $t, $v } = value as Entry
          const ctor = types.get($t)
          if (!ctor) {
            throw new TypeError(
              'Unable to deserialize object type: ' + $t
                + `\n  Be sure to pass the class like so:\n\n    deserialize(serialized, [${$t}])`
            )
          }
          const [, deserializer = ((x: any) => new ctor(x))] = Types.get(ctor) ?? []

          const result = deserializer($v) // deserialize($v, knownTypes, refs, pending) // , knownTypes, refs, pending)

          if ($t === 'Map') {
            for (const pv of pending.values()) {
              for (const q of pv) {
                if ($v.includes(q[0])) {
                  if (q[1] == '0') {
                    q[1] = (key: any) => {
                      const p = q[0][0]
                      const v = result.get(p)
                      result.set(key, v)
                      result.delete(p)
                    }
                  } else if (q[1] == '1') {
                    q[1] = (value: any) => {
                      result.set(q[0][0], value)
                    }
                  }
                }
              }
            }
          }

          if ($t === 'Set') {
            for (const pv of pending.values()) {
              for (const q of pv) {
                if ($v.includes(q[0][0])) {
                  const p = q[0][0]
                  if (q[1] == '0') {
                    q[1] = (value: any) => {
                      result.add(value)
                      result.delete(p)
                    }
                  }
                }
              }
            }
          }

          refs.set($r, result)
          if (pending.has($r)) {
            pending.get($r)!.forEach(([parent, key]) => {
              if (typeof key === 'function') {
                key(result)
              } else {
                parent[key] = result
              }
            })
          }
          return result
        } else if (value.$p) {
          const { $p } = value
          if (refs.has($p)) return refs.get($p)
          else {
            let queued = pending.get($p)
            if (!queued) pending.set($p, queued = new Set())
            queued.add([this, key])
          }
          return value
        }
      }
      return value
    }
  }

  return { replacer, reviver }
}

export const { replacer, reviver } = createContext()

export const serialize = (any: unknown, indent?: number, clear?: boolean) =>
  JSON.stringify(any, replacer(any, clear), indent)

export const deserialize = (
  serialized: string,
  classes: Ctor[] = [],
): unknown => JSON.parse(serialized, reviver(classes))
