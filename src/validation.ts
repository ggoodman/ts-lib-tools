import * as Path from 'path';

export function getAndValidateDistDir(packageJson: any) {
  if (!packageJson['main']) {
    throw new Error('Missing "main" field in package.json');
  }

  const mainPathname = Path.resolve(process.cwd(), packageJson['main']);
  const expectedMainPathname = Path.resolve(process.cwd(), './dist/index.js');

  if (mainPathname !== expectedMainPathname) {
    throw new Error(
      `The "main" field in package.json should point to "./dist/index.js" but points to "${packageJson['main']}"`
    );
  }

  return expectedMainPathname;
}

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
