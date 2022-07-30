export enum PlugKind {
  Input = 'input',
  Output = 'output',
}

export class Plug<P extends PlugKind = any, C extends string = any> {
  static Output = PlugKind.Output as const
  static Input = PlugKind.Input as const

  plugKind!: P
  cableKind!: C

  cables = new Map<Cable<C, C>, Plug<(P extends PlugKind.Output ? PlugKind.Input : PlugKind.Output), C>>()
  plugs = new Map<Plug<(P extends PlugKind.Output ? PlugKind.Input : PlugKind.Output), C>, Cable<C, C>>()
  allPlugs = new Set()
  allCables = new Set()

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
    if (typeof plugKind === 'object') {
      Object.assign(this, plugKind)
    } else {
      this.plugKind = plugKind
      this.cableKind = cableKind!
    }
  }

  connect(other: Plug) {
    const cable = new Cable()
    this.cables.set(cable, other)
    other.cables.set(cable, this)
    this.plugs.set(other, cable)
    other.plugs.set(this, cable)
    this.allPlugs.add(other)
    this.allCables.add(cable)
    other.allPlugs.add(this)
    other.allCables.add(cable)
    return cable
  }
}

export class Cable<T extends string, K extends T> {
  outputCh!: number
  inputCh!: number

  constructor(
    cable: Cable<T, K>,
  )
  constructor(
    outputCh?: number,
    inputCh?: number,
  )
  constructor(
    outputCh: Cable<T, K> | number = 0,
    inputCh = 0,
  ) {
    if (typeof outputCh === 'object') {
      Object.assign(this, outputCh)
    } else {
      this.outputCh = outputCh as number
      this.inputCh = inputCh
    }
  }
}

// const output = new Plug(Plug.Output, 'audio')
// const input = new Plug(Plug.Input, 'audio')
// const cable = new Cable(output, input)
