# Multi-Provider AI API Reference

This document summarizes the official APIs for **OpenAI**, **Anthropic (Claude)**, and **DeepSeek**, including request/response formats for implementing a unified provider layer.

---

# OpenAI

## Official Documentation

- Responses API  
  https://platform.openai.com/docs/api-reference/responses

- Text Generation Guide  
  https://platform.openai.com/docs/guides/text

- Models  
  https://platform.openai.com/docs/models

- Legacy Chat Completions  
  https://platform.openai.com/docs/api-reference/chat

> OpenAI recommends using the **Responses API** for new applications. :contentReference[oaicite:0]{index=0}

---

## Endpoint

```http
POST https://api.openai.com/v1/responses

Authorization: Bearer OPENAI_API_KEY
Content-Type: application/json
```

---

## Request

```json
{
  "model": "gpt-5",
  "input": "Write a haiku about testing."
}
```

---

## Response

```json
{
  "id": "resp_123",
  "object": "response",
  "model": "gpt-5",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Silent test cases..."
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 8,
    "output_tokens": 12,
    "total_tokens": 20
  }
}
```

---

## Extract Assistant Text

```ts
const text =
  response.output
    ?.flatMap(x => x.content ?? [])
    ?.find(x => x.type === "output_text")
    ?.text ?? "";
```

---

# Anthropic Claude

## Official Documentation

- Messages API  
  https://docs.anthropic.com/en/api/messages

- Getting Started  
  https://docs.anthropic.com/en/api/getting-started

- Tool Use  
  https://docs.anthropic.com/en/docs/build-with-claude/tool-use

---

## Endpoint

```http
POST https://api.anthropic.com/v1/messages

x-api-key: ANTHROPIC_API_KEY
anthropic-version: 2023-06-01
content-type: application/json
```

> Anthropic requires the `anthropic-version` header.

---

## Request

```json
{
  "model": "claude-sonnet-4",
  "max_tokens": 256,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Write a haiku about testing."
        }
      ]
    }
  ]
}
```

---

## Response

```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4",
  "content": [
    {
      "type": "text",
      "text": "Silent test cases..."
    }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 11,
    "output_tokens": 13
  }
}
```

---

## Extract Assistant Text

```ts
const text =
  response.content
    ?.filter(x => x.type === "text")
    ?.map(x => x.text)
    ?.join("") ?? "";
```

---

# DeepSeek

## Official Documentation

- Chat Completions API  
  https://api-docs.deepseek.com/api/create-chat-completion

- Quick Start  
  https://api-docs.deepseek.com/quick_start/introduction

- Models & Pricing  
  https://api-docs.deepseek.com/quick_start/pricing

- Multi-turn Conversations  
  https://api-docs.deepseek.com/guides/multi_round_chat/

DeepSeek implements an **OpenAI-compatible Chat Completions API**. :contentReference[oaicite:1]{index=1}

---

## Endpoint

```http
POST https://api.deepseek.com/chat/completions

Authorization: Bearer DEEPSEEK_API_KEY
Content-Type: application/json
```

---

## Request

```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "You are a concise assistant."
    },
    {
      "role": "user",
      "content": "Write a haiku about testing."
    }
  ],
  "stream": false
}
```

---

## Response

```json
{
  "id": "chatcmpl_123",
  "object": "chat.completion",
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "Silent test cases..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 13,
    "total_tokens": 25
  }
}
```

---

## Extract Assistant Text

```ts
const text =
  response.choices?.[0]?.message?.content ?? "";
```

---

# Request Comparison

| Provider | Endpoint | Main Prompt Field |
|-----------|----------|-------------------|
| OpenAI | `/v1/responses` | `input` |
| Claude | `/v1/messages` | `messages[].content[].text` |
| DeepSeek | `/chat/completions` | `messages[].content` |

---

# Response Comparison

| Provider | Assistant Text |
|-----------|----------------|
| OpenAI | `output[0].content[0].text` |
| Claude | `content[0].text` |
| DeepSeek | `choices[0].message.content` |

---

# Usage Comparison

| Provider | Input Tokens | Output Tokens |
|-----------|--------------|---------------|
| OpenAI | `usage.input_tokens` | `usage.output_tokens` |
| Claude | `usage.input_tokens` | `usage.output_tokens` |
| DeepSeek | `usage.prompt_tokens` | `usage.completion_tokens` |

---

# Streaming

## OpenAI

```
POST /v1/responses
stream: true
```

Uses Server-Sent Events (SSE).

---

## Claude

```
POST /v1/messages
stream: true
```

Uses Server-Sent Events (SSE).

---

## DeepSeek

```
POST /chat/completions
stream: true
```

Uses Server-Sent Events (SSE). :contentReference[oaicite:2]{index=2}

---

# Recommended Normalized Response

```ts
export interface AIResponse {
  id: string;
  provider: "openai" | "anthropic" | "deepseek";

  model: string;

  text: string;

  inputTokens?: number;
  outputTokens?: number;

  finishReason?: string;

  raw: unknown;
}
```

---

# Example Mappers

```ts
function fromOpenAI(res: any): AIResponse {
  return {
    id: res.id,
    provider: "openai",
    model: res.model,
    text: res.output?.[0]?.content?.[0]?.text ?? "",
    inputTokens: res.usage?.input_tokens,
    outputTokens: res.usage?.output_tokens,
    raw: res
  };
}

function fromClaude(res: any): AIResponse {
  return {
    id: res.id,
    provider: "anthropic",
    model: res.model,
    text: res.content?.map((x: any) => x.text ?? "").join("") ?? "",
    inputTokens: res.usage?.input_tokens,
    outputTokens: res.usage?.output_tokens,
    finishReason: res.stop_reason,
    raw: res
  };
}

function fromDeepSeek(res: any): AIResponse {
  return {
    id: res.id,
    provider: "deepseek",
    model: res.model,
    text: res.choices?.[0]?.message?.content ?? "",
    inputTokens: res.usage?.prompt_tokens,
    outputTokens: res.usage?.completion_tokens,
    finishReason: res.choices?.[0]?.finish_reason,
    raw: res
  };
}
```