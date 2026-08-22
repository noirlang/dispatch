#!/usr/bin/env node
import fs from 'node:fs';
import { render } from 'emailmd';

async function main() {
  const input = fs.readFileSync(0, 'utf-8');
  if (!input || !input.trim()) {
    process.stdout.write('');
    return;
  }

  try {
    const result = await render(input);
    process.stdout.write(result?.html || '');
  } catch (err) {
    // If EmailMD render fails, fallback to error log on stderr
    process.stderr.write(String(err));
    process.exit(1);
  }
}

main();
