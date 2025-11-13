import { createServer } from 'net';

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.listen(port);
  });
}



export async function findAvailablePort(startPort = 3000, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    
    if (available) {
      return port;
    }
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`);
}

