import { CommandHost } from '../command';

export function setup(commandHost: CommandHost) {
  commandHost.registerNamedCommand(
    {
      name: 'docs',
      description: 'Generate documentation from build typings',
      options: {} as const,
    },
    async () => {
      const handler = await import('../handlers/docs');

      return handler.run();
    }
  );
}
