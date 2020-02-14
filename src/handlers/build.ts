import * as Fs from 'fs';
import Module from 'module';
import * as Path from 'path';

import RollupPluginCommonjs from '@rollup/plugin-commonjs';
import RollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import * as Rollup from 'rollup';
import RollupPluginTs from '@wessberg/rollup-plugin-ts';

import { getAndValidateDistDir } from '../validation';

interface BuildOptions {
  entry?: string;
}

export async function run(options: BuildOptions) {
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
    dir: Path.dirname(distMainPathName),
    format: 'commonjs',
    sourcemap: true,
  };
  const rollup = await Rollup.rollup({
    input: options.entry || './src/index.ts',
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
        tsconfig: resolvedConfig => ({ ...resolvedConfig, declaration: true }),
        typescript,
      }),
    ],
  });

  console.log('Emptying', distDirName);
  await Fs.promises.rmdir(distDirName, { recursive: true });

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
  run({}).catch(err => {
    console.error(err);
    throw err;
  });
}
