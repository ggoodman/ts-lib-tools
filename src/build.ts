import * as Fs from 'fs';
import Module from 'module';
import * as Path from 'path';

import RollupPluginCommonjs from '@rollup/plugin-commonjs';
import RollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import * as Rollup from 'rollup';
import RollupPluginTs from '@wessberg/rollup-plugin-ts';

import { getAndValidateDistDir } from './getAndValidateDistDir';

export interface BuildOptions {
  /**
   * Toggle whether to first empty the target directory
   */
  emptyDir?: boolean;
  /**
   * Entrypoint to the code base
   *
   * @default "./src/index.ts"
   */
  entry?: string;
}

/**
 * Build a project from source into a minimal (set of) bundle(s)
 *
 * @param options Build options
 */
export async function buildWithRollup(options: BuildOptions = {}) {
  const packageData = await Fs.promises.readFile(
    Path.resolve(process.cwd(), './package.json'),
    'utf-8'
  );
  const packageJson = JSON.parse(packageData);

  console.log(
    'Building package %s@%s',
    packageJson['name'] || '<unknown>',
    packageJson['version'] || '<unknown>'
  );

  const packageJsonDependencyNames = new Set(
    Object.keys({
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
      ...packageJson.dependencies,
    })
  );
  const buildInModuleNames = new Set(Module.builtinModules);
  const distMainPathName = getAndValidateDistDir(packageJson);
  const distDirName = Path.dirname(distMainPathName);
  const relativeRequire = Module.Module.createRequire(distMainPathName);
  const typescript = await import(relativeRequire.resolve('typescript'));
  const outputOptions: Rollup.OutputOptions = {
    dir: distDirName,
    // file: distMainPathName,
    format: 'commonjs',
    sourcemap: true,
  };
  const rollup = await Rollup.rollup({
    input: Path.resolve(process.cwd(), options.entry || './src/index.ts'),
    output: outputOptions,
    external(id) {
      if (id.match(/^[./]/)) {
        return false;
      }

      const match = id.match(/^((?:@[^/\s]+\/)?[^/\s]+)/);

      if (match) {
        if (packageJsonDependencyNames.has(match[1])) {
          return true;
        }

        return buildInModuleNames.has(id);
      }

      return false;
    },
    plugins: [
      RollupPluginNodeResolve(),
      RollupPluginCommonjs(),
      RollupPluginTs({
        exclude: ['node_modules'],
        cwd: process.cwd(),
        tsconfig: (resolvedConfig) => ({ ...resolvedConfig, declaration: true }),
        typescript,
      }),
    ],
  });

  if (options.emptyDir) {
    console.log('Emptying', distDirName);
    await Fs.promises.rmdir(distDirName, { recursive: true });
  }

  const output = await rollup.write(outputOptions);

  for (const asset of output.output) {
    switch (asset.type) {
      case 'asset':
        console.log('Built asset: %s (%d bytes)', asset.fileName, asset.source.length);
        break;
      case 'chunk':
        console.log('Built chunk: %s (%d bytes)', asset.fileName, asset.code.length);
        break;
    }
  }
}

if (!module.parent) {
  buildWithRollup().catch((err) => {
    console.error(err);
    throw err;
  });
}
