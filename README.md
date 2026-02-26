# @curzbin/mcp-huiting

HuiTing 音频转录 MCP 工具，封装上传与转录接口，供 AI 通过 Cursor 等 MCP 客户端调用。

## 安装

```bash
npm i @curzbin/mcp-huiting
```

## 配置

在 Cursor 的 `.cursor/mcp.json` 中配置：

```json
{
  "mcpServers": {
    "huiting": {
      "command": "npx",
      "args": ["-y", "@curzbin/mcp-huiting"],
      "env": {
        "HUITING_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

- `HUITING_API_URL`：Python FastAPI 服务地址，默认 `http://localhost:8000`
- 若 Python 服务部署在 Docker 或远程，需改为实际可访问的地址（如 `http://host.docker.internal:8000` 或 `http://192.168.1.100:8000`）

## 前置条件

需先部署 HuiTing Python FastAPI 服务（提供 `/upload` 与 `/transcribe` 接口），并确保 Node MCP 可访问该地址。

## MCP 工具

| 工具 | 说明 |
|------|------|
| `upload_audio` | 上传音频文件，返回 uuid。参数：`file_content_base64`、`filename` |
| `transcribe_audio` | 对已上传音频进行转录。参数：`audio_uuid`（来自 upload_audio 的返回值） |

使用流程：先调用 `upload_audio` 获取 uuid，再调用 `transcribe_audio` 传入该 uuid。
