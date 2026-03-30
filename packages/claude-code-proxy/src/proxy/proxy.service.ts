import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface UsageData {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly anthropicApiKey: string;
  private readonly anthropicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.anthropicApiKey = this.configService.get<string>('anthropic.apiKey', '');
    this.anthropicBaseUrl = this.configService.get<string>(
      'anthropic.baseUrl',
      'https://api.anthropic.com',
    );
  }

  /**
   * Forward a request to Anthropic. Returns the raw IncomingMessage.
   * The caller is responsible for piping/consuming the response.
   */
  forwardRequest(
    path: string,
    requestBody: Record<string, unknown>,
    incomingHeaders: Record<string, string | string[] | undefined>,
  ): Promise<http.IncomingMessage> {
    const url = new URL(path, this.anthropicBaseUrl);
    const bodyStr = JSON.stringify(requestBody);

    const forwardHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': this.anthropicApiKey,
      'content-length': Buffer.byteLength(bodyStr).toString(),
    };

    // Forward anthropic-specific headers
    for (const h of ['anthropic-version', 'anthropic-beta']) {
      const val = incomingHeaders[h];
      if (val) {
        forwardHeaders[h] = Array.isArray(val) ? val[0] : val;
      }
    }

    return new Promise((resolve, reject) => {
      const transport = url.protocol === 'https:' ? https : http;

      const proxyReq = transport.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: 'POST',
          headers: forwardHeaders,
        },
        (proxyRes) => resolve(proxyRes),
      );

      proxyReq.on('error', (err) => {
        this.logger.error(`Proxy request error: ${err.message}`);
        reject(err);
      });

      proxyReq.write(bodyStr);
      proxyReq.end();
    });
  }

  /**
   * Attach listeners to an SSE stream to extract usage data.
   * Does NOT consume the stream — multiple 'data' listeners coexist with pipe().
   * MUST be called BEFORE piping the response to the client.
   */
  extractUsageFromSSEStream(
    response: http.IncomingMessage,
    model: string,
  ): Promise<UsageData> {
    return new Promise((resolve) => {
      let inputTokens = 0;
      let outputTokens = 0;
      let buffer = '';

      response.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const event = JSON.parse(data);
            if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0;
              outputTokens = event.message.usage.output_tokens || 0;
            }
            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens || outputTokens;
            }
          } catch {
            // Not valid JSON, skip
          }
        }
      });

      response.on('end', () => {
        // Process remaining buffer
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6).trim();
          if (data !== '[DONE]') {
            try {
              const event = JSON.parse(data);
              if (event.type === 'message_delta' && event.usage) {
                outputTokens = event.usage.output_tokens || outputTokens;
              }
            } catch {
              // skip
            }
          }
        }
        resolve({ model, inputTokens, outputTokens });
      });

      response.on('error', () => {
        resolve({ model, inputTokens, outputTokens });
      });
    });
  }

  /**
   * Collect a non-streaming response body into a buffer.
   * Returns the raw body buffer and parsed usage.
   * MUST be called BEFORE any other consumer reads the stream.
   */
  collectResponseBody(
    response: http.IncomingMessage,
    model: string,
  ): Promise<{ body: Buffer; usage: UsageData }> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];

      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const body = Buffer.concat(chunks);
        let usage: UsageData = { model, inputTokens: 0, outputTokens: 0 };
        try {
          const json = JSON.parse(body.toString());
          usage = {
            model: json.model || model,
            inputTokens: json.usage?.input_tokens || 0,
            outputTokens: json.usage?.output_tokens || 0,
          };
        } catch {
          // Not JSON, that's fine
        }
        resolve({ body, usage });
      });

      response.on('error', () => {
        resolve({
          body: Buffer.concat(chunks),
          usage: { model, inputTokens: 0, outputTokens: 0 },
        });
      });
    });
  }
}
