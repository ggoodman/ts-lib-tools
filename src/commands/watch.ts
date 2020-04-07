import { CommandHost } from '../command';

export function setup(commandHost: CommandHost) {
  commandHost.registerNamedCommand(
    {
      name: 'watch',
      description: 'Build and watch your project',
      options: {
        entry: {
          array: true,
          string: true,
          description: 'Specify the path to source entrypoint',
          default: ['./src/index.ts'],
        },
      },
    },
    async (argv) => {
      const { watchWithRollup } = await import('../watch');

      await watchWithRollup({ entries: argv.entry });
    }
  );
}
