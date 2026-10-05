import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, readFileSync, renameSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_PUBLIC_DIR = join(__dirname, "..", "public");
const PEM_PATH = join(SERVER_PUBLIC_DIR, "extension.pem");
const PUB_PATH = join(SERVER_PUBLIC_DIR, "extension.pub");
const CRX_PATH = join(SERVER_PUBLIC_DIR, "extension.crx");

// Mesma resolucao usada em index.ts: src (tsx) ou dist (node dist/...).
const EXTENSION_DIR_CANDIDATOS = [
  join(__dirname, "extension"),
  join(__dirname, "..", "src", "extension"),
];

function resolveExtensionDir(): string | null {
  return (
    EXTENSION_DIR_CANDIDATOS.find((dir) => existsSync(join(dir, "manifest.json"))) ||
    null
  );
}

const EXTENSION_DIR = resolveExtensionDir();

function getCurrentVersion(): string {
  if (!EXTENSION_DIR) return "0.0.0";

  try {
    const manifest = JSON.parse(
      readFileSync(join(EXTENSION_DIR, "manifest.json"), "utf-8"),
    );
    return manifest.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function chromePaths(): string[] {
  const env = process.env.CHROME_PATH;
  if (env) return [env];

  if (process.platform === "win32") {
    return [
      "chrome",
      join(
        process.env["PROGRAMFILES"] || "C:\\Program Files",
        "Google\\Chrome\\Application\\chrome.exe",
      ),
      join(
        process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
        "Google\\Chrome\\Application\\chrome.exe",
      ),
      join(
        process.env.LOCALAPPDATA || "",
        "Google\\Chrome\\Application\\chrome.exe",
      ),
    ];
  }

  return [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ];
}

function generateKeyPair(): void {
  if (existsSync(PEM_PATH)) {
    console.log("Chave privada já existe em:", PEM_PATH);
    return;
  }

  console.log("Gerando par de chaves...");

  try {
    execFileSync("openssl", ["genrsa", "-out", PEM_PATH, "2048"]);
    execFileSync("openssl", ["rsa", "-in", PEM_PATH, "-pubout", "-out", PUB_PATH]);
    console.log("Chaves geradas com sucesso!");
    console.log("  Privada:", PEM_PATH);
    console.log("  Pública:", PUB_PATH);
  } catch (error) {
    console.error("Falha ao gerar as chaves. Verifique se o openssl está instalado.");
    process.exitCode = 1;
  }
}

// O Chrome deriva o Extension ID do MD5 da chave pública (DER/SPKI),
// convertendo cada nibble em uma letra de 'a' até 'p'.
function getExtensionId(): string | null {
  try {
    const der = execFileSync(
      "openssl",
      ["rsa", "-in", PEM_PATH, "-pubout", "-outform", "DER"],
      { stdio: ["ignore", "pipe", "ignore"] },
    );

    const hash = createHash("md5").update(der).digest();

    let id = "";
    for (const byte of hash) {
      id += String.fromCharCode(97 + (byte >> 4));
      id += String.fromCharCode(97 + (byte & 0x0f));
    }
    return id;
  } catch {
    return null;
  }
}

function packageExtension(): void {
  if (!EXTENSION_DIR) {
    console.error(
      "✗ manifest.json da extensão não encontrado. Candidatos:",
      EXTENSION_DIR_CANDIDATOS.join(", "),
    );
    process.exitCode = 1;
    return;
  }

  if (!existsSync(PEM_PATH)) {
    console.log("⚠️  Gere as chaves primeiro: npm run generate-keys");
    return;
  }

  const version = getCurrentVersion();
  console.log(`Empacotando extensão versão ${version}...`);
  console.log("  Origem:", EXTENSION_DIR);

  // O Chrome acrescenta o .crx ao --pack-output.
  const packOutput = CRX_PATH.replace(/\.crx$/, "");
  const args = [
    `--pack-extension=${EXTENSION_DIR}`,
    `--pack-extension-key=${PEM_PATH}`,
    `--pack-output=${packOutput}`,
  ];

  // Sem isto, um .crx antigo em disco faz o existsSync() abaixo dar certo e
  // o script anuncia sucesso mesmo quando o Chrome nao escreveu nada.
  const crxResgatado = `${EXTENSION_DIR}.crx`;
  for (const antigo of [CRX_PATH, crxResgatado]) {
    if (existsSync(antigo)) {
      unlinkSync(antigo);
      console.log("  Removendo CRX anterior:", antigo);
    }
  }

  for (const executable of chromePaths()) {
    try {
      execFileSync(executable, args, { stdio: "inherit" });
    } catch {
      continue;
    }

    // Chrome 154 ignora --pack-output e grava em "<pasta-da-extensao>.crx".
    // Sem este resgate, o empacotamento "funciona" e o arquivo some.
    if (!existsSync(CRX_PATH) && existsSync(crxResgatado)) {
      renameSync(crxResgatado, CRX_PATH);
      console.log("  Resgatado de:", crxResgatado);
    }

    if (existsSync(CRX_PATH)) {
      console.log("✅ Extensão empacotada com sucesso!");
      console.log("   Arquivo:", CRX_PATH);
      console.log(
        "   Extension ID:",
        getExtensionId() ??
          "indisponível (openssl não encontrado no PATH)",
      );
      return;
    }
  }

  console.log("⚠️  Chrome não encontrado ou empacotamento falhou.");
  console.log("");
  console.log("Instale o Chrome ou defina CHROME_PATH com o caminho do executável.");
  console.log("Alternativa: empacote manualmente via chrome://extensions e");
  console.log(`copie o .crx gerado para: ${CRX_PATH}`);
  process.exitCode = 1;
}

function showStatus(): void {
  console.log(
    "═══════════════════════════════════════════════════════",
  );
  console.log(
    "          Status do Servidor de Updates                ",
  );
  console.log(
    "═══════════════════════════════════════════════════════",
  );
  console.log(`Versão atual:   ${getCurrentVersion()}`);
  console.log(`Diretório:      ${EXTENSION_DIR || "não encontrado"}`);
  console.log(
    `Chave privada: ${existsSync(PEM_PATH) ? "✅ OK" : "❌ Não encontrada"}`,
  );
  console.log(
    `Arquivo CRX:    ${existsSync(CRX_PATH) ? "✅ OK" : "❌ Não encontrado"}`,
  );
  console.log(`Extension ID:   ${getExtensionId() ?? "indisponível (openssl não encontrado no PATH)"}`);
  console.log(
    "═══════════════════════════════════════════════════════",
  );
}

const args = process.argv.slice(2);
const command = args[0] || "status";

switch (command) {
  case "generate-keys":
  case "keys":
    generateKeyPair();
    break;
  case "package":
    packageExtension();
    break;
  case "status":
  default:
    showStatus();
    break;
}