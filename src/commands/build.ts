import { CommandHost } from '../command';

export function setup(commandHost: CommandHost) {
  commandHost.registerNamedCommand(
    {
      name: 'build',
      description: 'Build out something',
      options: {
        entry: {
          array: true,
          string: true,
          description: 'Specify the path to source entrypoint',
          default: ['./src/index.ts'],
        },
      },
    },
    async argv => {
      const { buildWithRollup } = await import('../build');

      for (const i in argv.entry) {
        const entry = argv.entry[i];

        await buildWithRollup({
          emptyDir: i === '0',
          entry,
        });
      }
    }
  );
}
