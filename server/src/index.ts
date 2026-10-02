import Fastify from "fastify";
import cors from "@fastify/cors";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname, relative, sep } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST"],
});

// ─── Resolução de caminhos ─────────────────────────────────────────────────
// A extensão vive em server/src/extension, mas o processo pode ser iniciado
// de src (tsx / dev) ou de dist (node dist/index.js). Testamos os dois casos
// para não servir um pacote vazio silenciosamente.
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

if (!EXTENSION_DIR) {
  fastify.log.error(
    "Diretorio da extensao nao encontrado. /download-zip retornara 500. " +
      `Candidatos: ${EXTENSION_DIR_CANDIDATOS.join(", ")}`,
  );
}

// Zip e JavaScript usam "/" como separador. Em Windows, path.relative() devolve
// "\\", o que fazia o cliente não encontrar nenhum arquivo e quebrar a extensão.
function normalizeZipPath(caminho: string): string {
  return caminho.split(sep).join("/");
}

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

// API Key simples — em produção use variável de ambiente
const API_KEY = process.env.EXTENSION_API_KEY || "codxistop123";

function validateApiKey(request: any, reply: any): boolean {
  const key = request.headers["x-api-key"];
  if (key !== API_KEY) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ─── Endpoint: versão atual ──────────────────────────────────────────────────
fastify.get("/version", async (request, reply) => {
  if (!validateApiKey(request, reply)) return;

  const baseUrl = process.env.BASE_URL || "http://localhost:3333";

  return {
    version: getCurrentVersion(),
    download_url: `${baseUrl}/download-zip`,
    updated_at: new Date().toISOString(),
  };
});

// ─── Endpoint: download ZIP dos arquivos da extensão ────────────────────────
// Gera um ZIP em memória com todos os arquivos JS/CSS que podem ser atualizados
fastify.get("/download-zip", async (request, reply) => {
  if (!validateApiKey(request, reply)) return;

  if (!EXTENSION_DIR) {
    return reply.code(500).send({
      error: "Extensao nao encontrada no servidor",
      candidates: EXTENSION_DIR_CANDIDATOS,
    });
  }

  // Pastas e arquivos a incluir no ZIP
  const includePaths = ["src/shared", "src/contents", "src/css"];

  const files: Record<string, string> = {};

  for (const dir of includePaths) {
    const fullDir = join(EXTENSION_DIR, dir);
    if (!existsSync(fullDir)) continue;

    const entries = readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isFile() &&
        (entry.name.endsWith(".js") || entry.name.endsWith(".css"))
      ) {
        const fullPath = join(fullDir, entry.name);
        const relPath = normalizeZipPath(relative(EXTENSION_DIR, fullPath));
        files[relPath] = readFileSync(fullPath, "utf-8");
      }
    }
  }

  const manifest = JSON.parse(
    readFileSync(join(EXTENSION_DIR, "manifest.json"), "utf-8"),
  );

  // Um pacote vazio sobrescreveria a extensão do cliente com um update
  // "bem-sucedido" que nao aplica nenhum arquivo. Melhor falhar alto.
  if (!Object.keys(files).length) {
    return reply.code(500).send({
      error: "Nenhum arquivo de atualizacao encontrado",
      extensionDir: EXTENSION_DIR,
    });
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  // Adiciona manifest.json para o cliente saber a versão
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
  });

  reply.header("Content-Type", "application/zip");
  reply.header(
    "Content-Disposition",
    "attachment; filename=extension-update.zip",
  );
  reply.header("X-Extension-Version", getCurrentVersion());
  return reply.send(zipBuffer);
});

// ─── Health check ────────────────────────────────────────────────────────────
fastify.get("/", async () => {
  return {
    name: "Indicador de Pintores — Update Server",
    version: getCurrentVersion(),
    extensionDirFound: Boolean(EXTENSION_DIR),
    endpoints: {
      version: "GET /version (requer x-api-key)",
      downloadZip: "GET /download-zip (requer x-api-key)",
    },
  };
});

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3333");
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Servidor rodando em http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();