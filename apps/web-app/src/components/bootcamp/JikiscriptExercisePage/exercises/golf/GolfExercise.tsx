import type { ExecutionContext, ExternalFunction } from '@/lib/interpreter/executor'
import DrawExercise from '../draw'
import * as Jiki from '@/lib/interpreter/jikiObjects'

export default class GolfExercise extends DrawExercise {
  private shotLength: number = 0

  constructor() {
    super('golf')
  }

  setShotLength(_executionCtx: ExecutionContext, length: number) {
    this.shotLength = length
  }
  getShotLength(_executionCtx: ExecutionContext): Jiki.JikiNumber {
    return new Jiki.Number(this.shotLength)
  }
  override fireFireworks(executionCtx: ExecutionContext) {
    super.fireFireworks(executionCtx, 0)
  }

  // TODO: How do I get just the ones I want out of DrawExercise
  // (circle, fillColorHex, fillColorRGB, fillColorHSL)
  // and then add the new ones to this?
  public override availableFunctions: ExternalFunction[] = [
    {
      name: 'clear',
      func: this.clear.bind(this) as (...args: unknown[]) => unknown,
      description: 'Clears the canvas.',
    },
    {
      name: 'get_shot_length',
      func: this.getShotLength.bind(this) as (...args: unknown[]) => unknown,
      description: "Returns the length of the player's shot",
    },
    {
      name: 'fire_fireworks',
      func: this.fireFireworks.bind(this) as (...args: unknown[]) => unknown,
      description: 'Fires celebratory fireworks.',
    },
    {
      name: 'circle',
      func: this.circle.bind(this) as (...args: unknown[]) => unknown,
      description:
        'It drew a circle with its center at (${arg1}, ${arg2}), and a radius of ${arg3}.',
    },
    {
      name: 'fill_color_hex',
      func: this.fillColorHex.bind(this) as (...args: unknown[]) => unknown,
      description: 'Changes the fill color using a hex string',
    },
    {
      name: 'fill_color_rgb',
      func: this.fillColorRGB.bind(this) as (...args: unknown[]) => unknown,
      description: 'Changes the fill color using red, green and blue values',
    },
    {
      name: 'fill_color_hsl',
      func: this.fillColorHSL.bind(this) as (...args: unknown[]) => unknown,
      description:
        'Changes the fill color using hue, saturation and lumisity values',
    },
  ]
}
