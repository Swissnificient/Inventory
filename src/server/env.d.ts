declare module 'express' {
  import { IncomingMessage, ServerResponse, Server } from 'http';

  export interface Request extends IncomingMessage {
    body: any;
    params: Record<string, string>;
    query: Record<string, string | string[] | undefined>;
  }

  export interface Response extends ServerResponse {
    status(code: number): this;
    json(body: any): this;
    send(body: any): this;
    sendFile(filePath: string): void;
  }

  export type RequestHandler = (req: Request, res: Response, next?: () => void) => any;

  export interface Application {
    use(...handlers: any[]): this;
    get(path: string, handler: RequestHandler): this;
    post(path: string, handler: RequestHandler): this;
    listen(port: number, callback?: () => void): Server;
  }

  function express(): Application;
  namespace express {
    function json(options?: { limit?: string }): any;
    function static(root: string): any;
  }

  export default express;
}

declare module 'cors' {
  function cors(options?: any): any;
  export default cors;
}
