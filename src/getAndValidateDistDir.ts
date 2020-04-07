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
