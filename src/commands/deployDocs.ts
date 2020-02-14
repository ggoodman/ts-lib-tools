import { CommandHost } from '../command';

export function setup(commandHost: CommandHost) {
  commandHost.registerNamedCommand(
    {
      name: 'deploy-docs',
      description: 'Deploy generated documentation to the gh-pages branch',
      options: {} as const,
    },
    async () => {
      const { deployDocs } = await import('../deploy');

      return deployDocs();
    }
  );
}
