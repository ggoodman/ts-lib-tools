import * as Fs from 'fs';
import Module from 'module';
import * as Path from 'path';

import RollupPluginCommonjs from '@rollup/plugin-commonjs';
import RollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import RollupPluginTs from '@wessberg/rollup-plugin-ts';
import signalExit from 'signal-exit';
import { watch, OutputOptions, RollupWatchOptions, RollupBuild, RollupError } from 'rollup';
import { toDisposable, CancellationTokenSource, DisposableStore, Event } from 'ts-primitives';

import { getAndValidateDistDir } from './getAndValidateDistDir';

export interface WatchOptions {
  entries: string[];
}

export async function watchWithRollup(options: WatchOptions) {
  const disposer = new DisposableStore();
  const tokenSource = new CancellationTokenSource();
  const disposable = toDisposable(
    signalExit(() => {
      tokenSource.cancel();
    })
  );
  const token = tokenSource.token;
  const exitSignal = Event.toPromise(token.onCancellationRequested as Event<any>);

  disposer.add(tokenSource);
  disposer.add(disposable);

  try {
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
    const outputOptions: OutputOptions = {
      dir: distDirName,
      // file: distMainPathName,
      format: 'commonjs',
      sourcemap: true,
    };

    if (options.entries.length < 1) {
      options.entries.push('./src/index.ts');
    }

    const watchConfigs: RollupWatchOptions[] = options.entries.map((entry) => {
      return {
        input: Path.resolve(process.cwd(), entry),
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
      };
    });
    const watcher = watch(watchConfigs);
    const builds = [] as RollupBuild[];
    let buildError: RollupError | null = null;

    watcher.on('event', (e) => {
      switch (e.code) {
        case 'BUNDLE_END': {
          builds.push(e.result);
          break;
        }
        case 'BUNDLE_START': {
          break;
        }
        case 'END': {
          if (!buildError) {
            console.error('Build completed, writing assets...');
            Fs.promises
              .rmdir(distDirName, { recursive: true })
              .then(() => {
                return Promise.all(builds.map((build) => build.write(outputOptions)));
              })
              .then(
                (outputs) => {
                  for (const output of outputs) {
                    for (const asset of output.output) {
                      switch (asset.type) {
                        case 'asset':
                          console.log(
                            'Built asset: %s (%d bytes)',
                            asset.fileName,
                            asset.source.length
                          );
                          break;
                        case 'chunk':
                          console.log(
                            'Built chunk: %s (%d bytes)',
                            asset.fileName,
                            asset.code.length
                          );
                          break;
                      }
                    }
                  }
                },
                (err) => {
                  console.error('Error while handling build: %s', err);
                }
              );
          }

          break;
        }
        case 'ERROR': {
          console.error('Build error', e.error);

          buildError = e.error;
          break;
        }
        case 'START': {
          console.error('Starting build');

          builds.splice(0, builds.length);
          buildError = null;
          break;
        }
      }
    });

    token.onCancellationRequested(() => watcher.close());

    await exitSignal;
  } finally {
    disposer.dispose();
  }
}
