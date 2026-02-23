import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a shape by ID.
 */
export class GetShapeCommand extends Command {
  static override paths = [["omnigraffle", "canvases", "shapes", "get"]];

  static override usage = Command.Usage({
    description: 'Get a shape by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' });

  shapeId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.shapes.get(this.shapeId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Shape not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
        name: item.name,
        text: item.text,
        fill: item.fill,
        fillColor: item.fillColor,
        gradientColor: item.gradientColor,
        gradientAngle: item.gradientAngle,
        rotation: item.rotation,
        textPlacement: item.textPlacement,
        autosizing: item.autosizing,
        sidePadding: item.sidePadding,
        verticalPadding: item.verticalPadding,
      });

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
