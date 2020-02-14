import * as Path from 'path';

import * as GhPages from 'gh-pages';

export async function run() {
  const docsDir = Path.resolve(process.cwd(), './docs');

  await new Promise((resolve, reject) => {
    return GhPages.publish(docsDir, err => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

if (!module.parent) {
  run().catch(err => {
    console.error(err);
    throw err;
  });
}
