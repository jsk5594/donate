// npm run dev: next dev를 실행하고, 서버가 준비되면 Chrome으로 로컬 주소를 엽니다.
// (VS Code 내장 브라우저 대신 외부 Chrome 사용)
// 브라우저 자동 열기를 끄려면: npm run dev:plain
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env.NO_COLOR || process.env.FORCE_COLOR ? process.env : { ...process.env, FORCE_COLOR: "1" },
});

let url = "http://localhost:3000";
let opened = false;
let readyTimer;
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

function openChrome(target) {
  if (opened) return;
  opened = true;
  const cmd =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", '""', "chrome", target]]
      : process.platform === "darwin"
        ? ["open", ["-a", "Google Chrome", target]]
        : ["google-chrome", [target]];
  const p = spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true, windowsVerbatimArguments: process.platform === "win32" });
  p.on("error", () => console.warn(`\n[dev] Chrome을 열지 못했습니다. 직접 접속하세요: ${target}\n`));
  p.unref();
}

function watch(chunk) {
  const text = strip(chunk.toString());
  const m = text.match(/Local:\s+(https?:\/\/\S+)/);
  if (m) url = m[1];
  if (/already running/i.test(text)) {
    // 이미 실행 중인 dev 서버가 있으면 새 포트 대신 그 주소를 엽니다.
    clearTimeout(readyTimer);
    openChrome(url);
  } else if (/Ready in/.test(text)) {
    // 'already running' 메시지가 뒤따를 수 있어 잠시 기다렸다가 엽니다.
    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => openChrome(url), 1500);
  }
}

child.stdout.on("data", (c) => {
  process.stdout.write(c);
  watch(c);
});
child.stderr.on("data", (c) => {
  process.stderr.write(c);
  watch(c);
});

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
