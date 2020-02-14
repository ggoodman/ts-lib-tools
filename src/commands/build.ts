import { CommandHost } from '../command';

export function setup(commandHost: CommandHost) {
  commandHost.registerNamedCommand(
    {
      name: 'build',
      description: 'Build out something',
      options: {
        entry: {
          string: true,
          description: 'Specify the path to source entrypoint',
          defaultValue: './lib/index.ts',
        }
      } as const,
    },
    async (argv) => {
      const handler = await import('../handlers/build');

      return handler.run(argv);
    }
  );
}
