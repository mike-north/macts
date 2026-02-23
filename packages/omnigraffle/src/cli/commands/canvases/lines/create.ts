import { Command, Option } from 'clipanion';
import * as t from 'typanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new line.
 */
export class CreateLineCommand extends Command {
  static override paths = [["omnigraffle", "canvases", "lines", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new line',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' });
  lineType = Option.String('--line-type', { required: true, description: "Type of the line", validator: t.isEnum(["straight", "curved", "orthogonal", "bezier"]) });
  hopType = Option.String('--hop-type', { required: true, description: "The behavior when one line crosses over another line", validator: t.isEnum(["noHop", "roundHop", "squareHop", "twoSideHop", "threeSideHop", "ignoreHop", "gapHop", "bridgeHop"]) });
  headType = Option.String('--head-type', { required: true, description: "Type of line ending on the head of the line" });
  tailType = Option.String('--tail-type', { required: true, description: "Type of line ending on the tail of the line" });
  headScale = Option.String('--head-scale', { required: true, description: "Scale of line ending on the head of the line" });
  tailScale = Option.String('--tail-scale', { required: true, description: "Scale of line ending on the tail of the line" });
  headMagnet = Option.String('--head-magnet', { required: true, description: "Which magnet of the destination graphic the line attaches to" });
  tailMagnet = Option.String('--tail-magnet', { required: true, description: "Which magnet of the source graphic the line attaches to" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.lines.create({
        lineType: this.lineType,
        hopType: this.hopType,
        headType: this.headType,
        tailType: this.tailType,
        headScale: this.headScale,
        tailScale: this.tailScale,
        headMagnet: this.headMagnet,
        tailMagnet: this.tailMagnet,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Line created successfully',
        id: item.id,
        lineType: item.lineType,
        hopType: item.hopType,
        headType: item.headType,
        tailType: item.tailType,
        headScale: item.headScale,
        tailScale: item.tailScale,
        headMagnet: item.headMagnet,
        tailMagnet: item.tailMagnet,
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
