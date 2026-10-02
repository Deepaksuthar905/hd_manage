// OneDrive turns files inside .next into cloud placeholders, which makes Next.js
// crash with "EINVAL: readlink" while cleaning it. Delete .next ourselves first.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nextDir = path.resolve(__dirname, '..', '.next');

if (fs.existsSync(nextDir)) {
  try {
    if (process.platform === 'win32') {
      execSync(`cmd /c rmdir /s /q "${nextDir}"`, { stdio: 'ignore' });
    } else {
      fs.rmSync(nextDir, { recursive: true, force: true });
    }
  } catch {
    fs.rmSync(nextDir, { recursive: true, force: true });
  }
}
