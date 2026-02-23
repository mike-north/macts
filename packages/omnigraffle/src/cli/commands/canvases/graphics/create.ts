import { Command, Option } from 'clipanion';
import * as t from 'typanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new graphic.
 */
export class CreateGraphicCommand extends Command {
  static override paths = [["omnigraffle", "canvases", "graphics", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new graphic',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' });
  origin = Option.String('--origin', { required: true, description: "Origin of the graphic (position of the upper-left corner of the bounding rectangle)" });
  size = Option.String('--size', { required: true, description: "Size of the graphic (width and height of the bounding rectangle)" });
  locked = Option.Boolean('--locked', { description: "Is this graphic locked?" });
  allowsConnections = Option.Boolean('--allows-connections', { description: "Does this graphic allow connections to it?" });
  alignsEdgesToGrid = Option.Boolean('--aligns-edges-to-grid', { description: "When snapped to the grid does this graphic align its edges to the grid?" });
  cornerRadius = Option.String('--corner-radius', { required: true, description: "Curvature of corners in the stroke path" });
  drawsShadow = Option.Boolean('--draws-shadow', { description: "Does this graphic draw its shadow?" });
  drawsStroke = Option.Boolean('--draws-stroke', { description: "Does this graphic draw its stroke?" });
  doubleStroke = Option.Boolean('--double-stroke', { description: "Does this graphic have a double-lined stroke?" });
  flippedHorizontally = Option.Boolean('--flipped-horizontally', { description: "Is this graphic flipped horizontally?" });
  flippedVertically = Option.Boolean('--flipped-vertically', { description: "Is this graphic flipped vertically?" });
  shadowColor = Option.String('--shadow-color', { required: true, description: "Color of the shadow" });
  shadowFuzziness = Option.String('--shadow-fuzziness', { required: true, description: "The 'fuzziness' of the graphic's shadow" });
  shadowVector = Option.String('--shadow-vector', { required: true, description: "The direction of the graphic's shadow" });
  shadowBeneath = Option.Boolean('--shadow-beneath', { description: "Does this graphic draw its shadow immediately beneath itself?" });
  strokeColor = Option.String('--stroke-color', { required: true, description: "Color of the stroke" });
  strokeCap = Option.String('--stroke-cap', { required: true, description: "Type of cap at ends of the stroke", validator: t.isEnum(["butt", "round", "square"]) });
  strokeJoin = Option.String('--stroke-join', { required: true, description: "Type of join between segments of the stroke", validator: t.isEnum(["miter", "round", "bevel"]) });
  strokePattern = Option.String('--stroke-pattern', { required: true, description: "Dash pattern of the stroke" });
  thickness = Option.String('--thickness', { required: true, description: "Thickness of the stroke" });
  notes = Option.String('--notes', { required: true, description: "Notes for this graphic" });
  userName = Option.String('--user-name', { required: true, description: "Name of a graphic" });
  tag = Option.String('--tag', { required: true, description: "Arbitrary string tag attached to this graphic" });
  url = Option.String('--url', { required: true, description: "Web link for this graphic" });
  script = Option.String('--script', { required: true, description: "Source of attached AppleScript" });
  rankGroup = Option.String('--rank-group', { required: true, description: "Rank group assigned to this graphic for hierarchical layout" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.graphics.create({
        origin: this.origin,
        size: this.size,
        locked: this.locked,
        allowsConnections: this.allowsConnections,
        alignsEdgesToGrid: this.alignsEdgesToGrid,
        cornerRadius: this.cornerRadius,
        drawsShadow: this.drawsShadow,
        drawsStroke: this.drawsStroke,
        doubleStroke: this.doubleStroke,
        flippedHorizontally: this.flippedHorizontally,
        flippedVertically: this.flippedVertically,
        shadowColor: this.shadowColor,
        shadowFuzziness: this.shadowFuzziness,
        shadowVector: this.shadowVector,
        shadowBeneath: this.shadowBeneath,
        strokeColor: this.strokeColor,
        strokeCap: this.strokeCap,
        strokeJoin: this.strokeJoin,
        strokePattern: this.strokePattern,
        thickness: this.thickness,
        notes: this.notes,
        userName: this.userName,
        tag: this.tag,
        url: this.url,
        script: this.script,
        rankGroup: this.rankGroup,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Graphic created successfully',
        id: item.id,
        origin: item.origin,
        size: item.size,
        locked: item.locked,
        allowsConnections: item.allowsConnections,
        alignsEdgesToGrid: item.alignsEdgesToGrid,
        cornerRadius: item.cornerRadius,
        drawsShadow: item.drawsShadow,
        drawsStroke: item.drawsStroke,
        doubleStroke: item.doubleStroke,
        flippedHorizontally: item.flippedHorizontally,
        flippedVertically: item.flippedVertically,
        shadowColor: item.shadowColor,
        shadowFuzziness: item.shadowFuzziness,
        shadowVector: item.shadowVector,
        shadowBeneath: item.shadowBeneath,
        strokeColor: item.strokeColor,
        strokeCap: item.strokeCap,
        strokeJoin: item.strokeJoin,
        strokePattern: item.strokePattern,
        thickness: item.thickness,
        notes: item.notes,
        userName: item.userName,
        tag: item.tag,
        url: item.url,
        script: item.script,
        rankGroup: item.rankGroup,
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
