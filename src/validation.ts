import * as Path from 'path';
import { getAndValidateDistDir } from './getAndValidateDistDir';

export function getAndValidateDefinitionsPath(packageJson: any) {
  const typingsRelativePath = packageJson['typings'] || packageJson['types'];

  if (!typingsRelativePath) {
    throw new Error('Missing "typings" field in package.json');
  }

  const typingsPathname = Path.resolve(process.cwd(), typingsRelativePath);
  const expectedTypingsPathname = getAndValidateDistDir(packageJson).replace(/\.js$/, '.d.ts');

  if (expectedTypingsPathname !== typingsPathname) {
    throw new Error(
      `The "typings" field in package.json should point to "./dist/index.d.ts" but points to "${typingsRelativePath}"`
    );
  }

  return expectedTypingsPathname;
}
