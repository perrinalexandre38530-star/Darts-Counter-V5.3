export function decodePayload(s: string): any {
    try {
      // base64 decode
      const bin = atob(s);
  
      // convert to Uint8Array
      const buf = Uint8Array.from(bin, c => c.charCodeAt(0));
  
      // gunzip 
      const ds = new DecompressionStream("gzip");
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      return new Response(stream).json();
    } catch {
      return null;
    }
  }
  