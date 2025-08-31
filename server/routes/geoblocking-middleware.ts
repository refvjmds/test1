import { RequestHandler } from "express";
import { isCountryBlocked, getCountryFromIP } from "./geoblocking";

// Robust: Echte Client-IP finden, auch hinter Proxy
function getClientIP(req: any): string {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    return (Array.isArray(xff) ? xff[0] : xff.split(",")[0]).trim();
  }
  return req.ip || req.connection?.remoteAddress || "127.0.0.1";
}

// Middleware speziell für die Hauptseite
export const geoblockingPageMiddleware: RequestHandler = (req, res, next) => {
  try {
    // API & Assets überspringen
    const path = req.path;
    if (path.startsWith('/api/') || path.includes('.') || path.startsWith('/client/')) {
      return next();
    }

    const clientIP = getClientIP(req);
    const country = getCountryFromIP(clientIP);
    const blocked = isCountryBlocked(country);

    // Logging für Debug
    console.log(`[Geoblocking] IP: ${clientIP} | Country: ${country} | Blocked: ${blocked}`);

    if (blocked) {
      const blockedHTML = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zugriff verweigert - WorldJackpot</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            }
            .container {
              text-align: center;
              max-width: 500px;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              font-size: 2rem;
              margin-bottom: 1rem;
              font-weight: 700;
            }
            p {
              font-size: 1.1rem;
              line-height: 1.6;
              margin-bottom: 1.5rem;
              opacity: 0.9;
            }
            .country-info {
              background: rgba(0, 0, 0, 0.2);
              padding: 1rem;
              border-radius: 10px;
              margin-top: 1rem;
            }
            .ip-info {
              font-size: 0.9rem;
              opacity: 0.7;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🚫</div>
            <h1>Zugriff verweigert</h1>
            <p>
              Der Zugriff auf WorldJackpot ist in Ihrer Region derzeit nicht verfügbar.
              Diese Einschränkung wurde aus regulatorischen Gründen implementiert.
            </p>
            <div class="country-info">
              <strong>Ihr Land:</strong> ${country}<br>
              <div class="ip-info">IP: ${clientIP}</div>
            </div>
            <p style="margin-top: 2rem; font-size: 0.9rem;">
              Wenn Sie glauben, dass dies ein Fehler ist, wenden Sie sich bitte an unseren Support.
            </p>
          </div>
        </body>
        </html>
      `;
      return res.status(451).send(blockedHTML);
    }

    next();
  } catch (error) {
    console.error("Error in geoblocking page middleware:", error);
    next();
  }
};
