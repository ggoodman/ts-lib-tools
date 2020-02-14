import * as Fs from 'fs';
import * as Path from 'path';

import * as Typedoc from 'typedoc';

import { getAndValidateDistDir } from '../validation';

export async function run() {
  const packageData = await Fs.promises.readFile(
    Path.resolve(process.cwd(), './package.json'),
    'utf-8'
  );
  const packageJson = JSON.parse(packageData);
  const docsPathName = Path.resolve(process.cwd(), './docs');

  console.log(
    'Building docs for %s@%s, in: %s',
    packageJson['name'] || '<unknown>',
    packageJson['version'] || '<unknown>',
    docsPathName
  );

  const typingsPathName = getAndValidateDistDir(packageJson);
  const app = new Typedoc.Application();

  app.options.addReader(new Typedoc.TSConfigReader());

  app.bootstrap({
    mode: 'file',
    logger: console,
    // plugin: ['typedoc-plugin-markdown'],
    readme: 'none',
    excludePrivate: true,
    excludeProtected: true,
    ignoreCompilerErrors: true,
    includeDeclarations: true,
    excludeExternals: true,
  });

  const project = app.convert([typingsPathName]);

  if (!project) {
    throw new Error('Failed to produce a typedoc project from typings');
  }

  console.log('Emptying', docsPathName);
  await Fs.promises.rmdir(docsPathName, { recursive: true });

  app.generateDocs(project, docsPathName);
}
