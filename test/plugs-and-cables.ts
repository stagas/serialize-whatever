let i = 0
const cheapRandomId = () => i++

const dispatch = (..._args: any[]) => {}

export enum PlugKind {
  Input = 'input',
  Output = 'output',
}

export class Plug<P extends PlugKind = any, C extends string = any> extends EventTarget {
  static Output = PlugKind.Output as const
  static Input = PlugKind.Input as const

  plugKind!: P
  cableKind!: C

  cables = new Map<Cable, null | Plug<(P extends PlugKind.Output ? PlugKind.Input : PlugKind.Output), C>>()

  // declare onchange: EventHandler<Plug, CustomEvent>
  // declare onstartconnecting: EventHandler<Plug, CustomEvent<{ cable: Cable }>>
  // declare onconnect: EventHandler<Plug, CustomEvent<{ cable: Cable; plug: Plug }>>
  // declare ondisconnect: EventHandler<Plug, CustomEvent<{ cable: Cable; plug: Plug | null }>>

  constructor(
    plug: Plug<P, C>,
  )
  constructor(
    plugKind: P | Plug<P, C>,
    cableKind: C,
  )
  constructor(
    plugKind: P | Plug<P, C>,
    cableKind?: C,
  ) {
    super()
    if (typeof plugKind === 'object') {
      Object.assign(this, plugKind)
    } else {
      this.plugKind = plugKind
      this.cableKind = cableKind!
    }
  }

  startConnecting(this: Plug, cable = new Cable()) {
    if (this.cables.get(cable) != null) {
      this.disconnectOther(cable)
    }
    this.cables.set(cable, null)
    cable.plugs.clear()
    cable.plugs.add(this)
    dispatch(this, 'startconnecting', { cable })
    dispatch(this, 'change')
    return cable
  }

  connect(this: Plug, other: Plug, cable = new Cable()) {
    this.cables.set(cable, other)
    other.cables.set(cable, this)
    cable.plugs.clear()
    cable.plugs.add(this)
    cable.plugs.add(other)
    dispatch(this, 'connect', { cable, plug: other })
    dispatch(other, 'connect', { cable, plug: this })
    dispatch(this, 'change')
    dispatch(other, 'change')
    return cable
  }

  disconnect(this: Plug, cable: Cable) {
    const other = this.cables.get(cable)
    if (!other) {
      throw new Error('Cable not connected')
    }
    this.cables.delete(cable)
    other.cables.delete(cable)
    cable.plugs.clear()
    dispatch(this, 'disconnect', { cable, plug: other })
    dispatch(other, 'disconnect', { cable, plug: this })
    dispatch(this, 'change')
    dispatch(other, 'change')
    return cable
  }

  disconnectSelf(this: Plug, cable: Cable) {
    if (!this.cables.has(cable)) {
      throw new Error('Cable not found')
    }
    if (this.cables.get(cable) !== null) {
      throw new Error('Cannot disconnect self while cable is connected to other')
    }
    this.cables.delete(cable)
    cable.plugs.delete(this)
    dispatch(this, 'disconnect', { cable, plug: null })
    dispatch(this, 'change')
    return cable
  }

  disconnectOther(this: Plug, cable: Cable) {
    const other = this.cables.get(cable)
    if (!other) {
      throw new Error('Cable not connected')
    }
    other.cables.delete(cable)
    this.cables.set(cable, null)
    cable.plugs.delete(other)
    dispatch(other, 'disconnect', { cable, plug: this })
    dispatch(other, 'change')
    return cable
  }
}

export class Cable {
  id = cheapRandomId()

  plugs = new Set<Plug>()

  outputCh!: number
  inputCh!: number

  gain = 1

  constructor(
    cable: Cable,
  )
  constructor(
    outputCh?: number,
    inputCh?: number,
  )
  constructor(
    outputCh: Cable | number = 0,
    inputCh = 0,
  ) {
    if (typeof outputCh === 'object') {
      Object.assign(this, outputCh)
    } else {
      this.outputCh = outputCh as number
      this.inputCh = inputCh
    }
  }

  disconnect() {
    if (!this.plugs.size) {
      throw new Error('Cable not connected to any plug')
    } else if (this.plugs.size === 1) {
      ;[...this.plugs][0].disconnectSelf(this)
    } else {
      ;[...this.plugs][0].disconnect(this)
    }
  }
}

// const output = new Plug(Plug.Output, 'audio')
// const input = new Plug(Plug.Input, 'audio')
