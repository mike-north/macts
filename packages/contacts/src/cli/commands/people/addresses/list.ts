import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List addresses.
 */
export class ListAddressesCommand extends Command {
  static override paths = [["contacts", "people", "addresses", "list"]];

  static override usage = Command.Usage({
    description: 'List addresses',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.addresses.list();

      const output = formatter.formatList(items.map(item => ({
        city: item.city,
        formattedAddress: item.formattedAddress,
        street: item.street,
        id: item.id,
        zip: item.zip,
        country: item.country,
        label: item.label,
        countryCode: item.countryCode,
        state: item.state,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
