/**
 * SSE Parser
 * Production-grade Server-Sent Events parser with robust chunk handling
 */

export interface SSEEvent {
  type: 'message' | 'reasoning' | 'content' | 'done' | 'error';
  data: string;
  raw?: string;
}

export interface SSEParserConfig {
  retryInterval: number;
  maxBufferSize: number;
}

const DEFAULT_CONFIG: SSEParserConfig = {
  retryInterval: 100,
  maxBufferSize: 10000,
};

/**
 * SSE Parser State Machine
 */
enum ParserState {
  IDLE = 'idle',
  READING = 'reading',
  PARSING = 'parsing',
  DONE = 'done',
  ERROR = 'error',
}

/**
 * Production-grade SSE Parser
 */
export class SSEParser {
  private state: ParserState = ParserState.IDLE;
  private buffer: string = '';
  private position: number = 0;
  private eventType: string = '';
  private eventData: string = '';
  private config: SSEParserConfig;
  private lastFlushTime: number = 0;
  private pendingEvents: SSEEvent[] = [];

  constructor(config: Partial<SSEParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.state = ParserState.IDLE;
    this.buffer = '';
    this.position = 0;
    this.eventType = '';
    this.eventData = '';
    this.pendingEvents = [];
  }

  /**
   * Feed new chunk data to parser
   */
  feed(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    this.state = ParserState.READING;

    const events: SSEEvent[] = [];

    // Process complete lines
    while (this.position < this.buffer.length) {
      const lineEnd = this.buffer.indexOf('\n', this.position);

      if (lineEnd === -1) {
        // Partial line - check buffer size
        if (this.buffer.length > this.config.maxBufferSize) {
          // Buffer overflow - reset and try recovery
          this.buffer = this.buffer.slice(this.position);
          this.position = 0;
        }
        break;
      }

      const line = this.buffer.slice(this.position, lineEnd);
      this.position = lineEnd + 1;

      // Parse line
      const event = this.parseLine(line);
      if (event) {
        events.push(event);
        this.pendingEvents.push(event);
      }
    }

    // Clean up processed buffer
    if (this.position > 0) {
      this.buffer = this.buffer.slice(this.position);
      this.position = 0;
    }

    return events;
  }

  /**
   * Parse single SSE line
   */
  private parseLine(line: string): SSEEvent | null {
    // Handle different line types
    if (line.startsWith(':')) {
      // Comment line - ignore
      return null;
    }

    // Find colon separator
    const colonIndex = line.indexOf(':');
    let field: string;
    let value: string;

    if (colonIndex === -1) {
      // No colon - entire line is field
      field = line;
      value = '';
    } else {
      field = line.slice(0, colonIndex);
      // Skip optional space after colon
      value = line.slice(colonIndex + 1).replace(/^ /, '');
    }

    // Handle event type
    if (field === 'event') {
      this.eventType = value;
      return null;
    }

    // Handle data field
    if (field === 'data') {
      // Append with newline if previous data exists
      if (this.eventData) {
        this.eventData += '\n';
      }
      this.eventData += value;
      return null;
    }

    // Handle done marker
    if (field === 'id') {
      if (value === '[DONE]') {
        this.state = ParserState.DONE;
        const event = this.createEvent('done', '');
        this.eventData = '';
        return event;
      }
      return null;
    }

    return null;
  }

  /**
   * Create event from accumulated data
   */
  private createEvent(type: string, data: string): SSEEvent {
    if (this.eventType === 'reasoning' || this.eventData.startsWith('[reasoning]')) {
      return {
        type: 'reasoning',
        data: this.eventData.replace(/^\[reasoning\]|\[\/reasoning\]$/g, ''),
        raw: this.eventData,
      };
    }

    return {
      type: type as SSEEvent['type'],
      data,
      raw: this.eventData,
    };
  }

  /**
   * Flush accumulated data as event
   */
  flush(): SSEEvent | null {
    if (!this.eventData && this.state !== ParserState.DONE) {
      return null;
    }

    if (this.state === ParserState.DONE) {
      const event = { type: 'done' as const, data: '' };
      this.reset();
      return event;
    }

    const event = this.createEvent('content', this.eventData);
    this.eventData = '';
    return event;
  }

  /**
   * Check if parser is done
   */
  isDone(): boolean {
    return this.state === ParserState.DONE;
  }

  /**
   * Check if parser has error
   */
  hasError(): boolean {
    return this.state === ParserState.ERROR;
  }

  /**
   * Get current state
   */
  getState(): ParserState {
    return this.state;
  }
}

/**
 * Create configured SSE parser
 */
export function createSSEParser(config?: Partial<SSEParserConfig>): SSEParser {
  return new SSEParser(config);
}

export default SSEParser;