const { run } = require('node:test');
const { spec } = require('node:test/reporters');
const path = require('path');
const fs = require('fs');

const testDir = __dirname;
const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .map(f => path.join(testDir, f));

const testStream = run({ files });

testStream
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .compose(new spec())
  .pipe(process.stdout);

testStream.on('end', () => {
  setTimeout(() => {
    process.exit(process.exitCode || 0);
  }, 500);
});
