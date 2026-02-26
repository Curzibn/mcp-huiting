import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const require = createRequire(import.meta.url);
const VERSION = (require("../package.json") as { version: string }).version;

const API_URL = process.env.HUITING_API_URL ?? "http://localhost:8000";
const BASE = API_URL.replace(/\/$/, "");

const uploadSchema = z.object({
  file_path: z.string().describe("音频文件的绝对路径，如 /path/to/meeting.mp3 或 C:\\audio\\meeting.wav")
});

const transcribeSchema = z.object({
  audio_uuid: z.string().describe("上传接口返回的 UUID，用于定位待转录的音频文件")
});

async function main() {
  const transport = new StdioServerTransport();
  const server = new McpServer({
    name: "@curzbin/mcp-huiting",
    version: VERSION
  });

  server.registerTool(
    "upload_audio",
    {
      description: "将音频文件上传到 HuiTing 服务。传入音频文件的绝对路径，Node 端读取并上传。返回的 uuid 用于后续 transcribe_audio 调用。",
      inputSchema: uploadSchema
    },
    async (args) => {
      let buffer: Buffer;
      try {
        buffer = await readFile(args.file_path);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`读取文件失败: ${args.file_path} - ${msg}`);
      }
      const filename = basename(args.file_path);
      const formData = new FormData();
      formData.append("file", new Blob([buffer]), filename);
      const res = await fetch(`${BASE}/upload`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`上传失败: ${res.status} ${err}`);
      }
      const json = (await res.json()) as { uuid: string };
      return {
        content: [{ type: "text" as const, text: json.uuid }]
      };
    }
  );

  server.registerTool(
    "transcribe_audio",
    {
      description: "对已上传的音频进行转录，返回带说话人标签的 Markdown 文档。需先调用 upload_audio 获取 uuid，再传入此处。",
      inputSchema: transcribeSchema
    },
    async (args) => {
      const res = await fetch(`${BASE}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_uuid: args.audio_uuid })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`转录失败: ${res.status} ${err}`);
      }
      const json = (await res.json()) as { transcription: string };
      return {
        content: [{ type: "text" as const, text: json.transcription }]
      };
    }
  );

  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
