import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new address.
 */
export class CreateAddressCommand extends Command {
  static override paths = [["contacts", "people", "addresses", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new address',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });
  city = Option.String('--city', { required: true, description: "City part of the address." });
  street = Option.String('--street', { required: true, description: "Street part of the address, multiple lines separated by carriage returns." });
  id = Option.String('--id', { required: true, description: "unique identifier for this address." });
  zip = Option.String('--zip', { required: true, description: "Zip or postal code of the address." });
  country = Option.String('--country', { required: true, description: "Country part of the address." });
  label = Option.String('--label', { required: true, description: "Label." });
  countryCode = Option.String('--country-code', { required: true, description: "Country code part of the address (should be a two character iso country code)." });
  state = Option.String('--state', { required: true, description: "State, Province, or Region part of the address." });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.addresses.create({
        city: this.city,
        street: this.street,
        id: this.id,
        zip: this.zip,
        country: this.country,
        label: this.label,
        countryCode: this.countryCode,
        state: this.state,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Address created successfully',
        city: item.city,
        formattedAddress: item.formattedAddress,
        street: item.street,
        id: item.id,
        zip: item.zip,
        country: item.country,
        label: item.label,
        countryCode: item.countryCode,
        state: item.state,
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
