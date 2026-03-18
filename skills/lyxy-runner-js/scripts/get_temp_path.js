import { tmpdir } from "os";
import { join } from "path";

export function getTempPath(extension) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return join(tmpdir(), `lyxy-runner-js-${timestamp}-${random}.${extension}`);
}

// CLI interface: accepts extension as first argument
if (import.meta.main) {
  const extension = process.argv[2] || "js";
  console.log(getTempPath(extension));
}
