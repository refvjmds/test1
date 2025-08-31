import { RequestHandler } from "express";
import geoip from "geoip-lite";

// In-memory Blacklist (in Produktion ggf. DB verwenden)
let blockedCountries = new Set<string>();

// KOMPLETTE LÄNDERLISTE (ISO-Code und Name)
export const COUNTRIES = [
  { code: "AD", name: "Andorra" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "AF", name: "Afghanistan" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AI", name: "Anguilla" },
  { code: "AL", name: "Albania" },
  { code: "AM", name: "Armenia" },
  { code: "AO", name: "Angola" },
  { code: "AQ", name: "Antarctica" },
  { code: "AR", name: "Argentina" },
  { code: "AS", name: "American Samoa" },
  { code: "AT", name: "Austria" },
  { code: "AU", name: "Australia" },
  { code: "AW", name: "Aruba" },
  { code: "AX", name: "Åland Islands" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BB", name: "Barbados" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BG", name: "Bulgaria" },
  { code: "BH", name: "Bahrain" },
  { code: "BI", name: "Burundi" },
  { code: "BJ", name: "Benin" },
  { code: "BL", name: "Saint Barthélemy" },
  { code: "BM", name: "Bermuda" },
  { code: "BN", name: "Brunei Darussalam" },
  { code: "BO", name: "Bolivia" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba" },
  { code: "BR", name: "Brazil" },
  { code: "BS", name: "Bahamas" },
  { code: "BT", name: "Bhutan" },
  { code: "BV", name: "Bouvet Island" },
  { code: "BW", name: "Botswana" },
  { code: "BY", name: "Belarus" },
  { code: "BZ", name: "Belize" },
  { code: "CA", name: "Canada" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CD", name: "Congo, Democratic Republic of the" },
  { code: "CF", name: "Central African Republic" },
  { code: "CG", name: "Congo" },
  { code: "CH", name: "Switzerland" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CK", name: "Cook Islands" },
  { code: "CL", name: "Chile" },
  { code: "CM", name: "Cameroon" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CU", name: "Cuba" },
  { code: "CV", name: "Cabo Verde" },
  { code: "CW", name: "Curaçao" },
  { code: "CX", name: "Christmas Island" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DE", name: "Germany" },
  { code: "DJ", name: "Djibouti" },
  { code: "DK", name: "Denmark" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "DZ", name: "Algeria" },
  { code: "EC", name: "Ecuador" },
  { code: "EE", name: "Estonia" },
  { code: "EG", name: "Egypt" },
  { code: "EH", name: "Western Sahara" },
  { code: "ER", name: "Eritrea" },
  { code: "ES", name: "Spain" },
  { code: "ET", name: "Ethiopia" },
  { code: "FI", name: "Finland" },
  { code: "FJ", name: "Fiji" },
  { code: "FK", name: "Falkland Islands (Malvinas)" },
  { code: "FM", name: "Micronesia, Federated States of" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GB", name: "United Kingdom" },
  { code: "GD", name: "Grenada" },
  { code: "GE", name: "Georgia" },
  { code: "GF", name: "French Guiana" },
  { code: "GG", name: "Guernsey" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GL", name: "Greenland" },
  { code: "GM", name: "Gambia" },
  { code: "GN", name: "Guinea" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "GR", name: "Greece" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands" },
  { code: "GT", name: "Guatemala" },
  { code: "GU", name: "Guam" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HK", name: "Hong Kong" },
  { code: "HM", name: "Heard Island and McDonald Islands" },
  { code: "HN", name: "Honduras" },
  { code: "HR", name: "Croatia" },
  { code: "HT", name: "Haiti" },
  { code: "HU", name: "Hungary" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IM", name: "Isle of Man" },
  { code: "IN", name: "India" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "IQ", name: "Iraq" },
  { code: "IR", name: "Iran, Islamic Republic of" },
  { code: "IS", name: "Iceland" },
  { code: "IT", name: "Italy" },
  { code: "JE", name: "Jersey" },
  { code: "JM", name: "Jamaica" },
  { code: "JO", name: "Jordan" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "KH", name: "Cambodia" },
  { code: "KI", name: "Kiribati" },
  { code: "KM", name: "Comoros" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "KP", name: "Korea, Democratic People's Republic of" },
  { code: "KR", name: "Korea, Republic of" },
  { code: "KW", name: "Kuwait" },
  { code: "KY", name: "Cayman Islands" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "LA", name: "Lao People's Democratic Republic" },
  { code: "LB", name: "Lebanon" },
  { code: "LC", name: "Saint Lucia" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LK", name: "Sri Lanka" },
  { code: "LR", name: "Liberia" },
  { code: "LS", name: "Lesotho" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Latvia" },
  { code: "LY", name: "Libya" },
  { code: "MA", name: "Morocco" },
  { code: "MC", name: "Monaco" },
  { code: "MD", name: "Moldova, Republic of" },
  { code: "ME", name: "Montenegro" },
  { code: "MF", name: "Saint Martin (French part)" },
  { code: "MG", name: "Madagascar" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MK", name: "North Macedonia" },
  { code: "ML", name: "Mali" },
  { code: "MM", name: "Myanmar" },
  { code: "MN", name: "Mongolia" },
  { code: "MO", name: "Macao" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MS", name: "Montserrat" },
  { code: "MT", name: "Malta" },
  { code: "MU", name: "Mauritius" },
  { code: "MV", name: "Maldives" },
  { code: "MW", name: "Malawi" },
  { code: "MX", name: "Mexico" },
  { code: "MY", name: "Malaysia" },
  { code: "MZ", name: "Mozambique" },
  { code: "NA", name: "Namibia" },
  { code: "NC", name: "New Caledonia" },
  { code: "NE", name: "Niger" },
  { code: "NF", name: "Norfolk Island" },
  { code: "NG", name: "Nigeria" },
  { code: "NI", name: "Nicaragua" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "NP", name: "Nepal" },
  { code: "NR", name: "Nauru" },
  { code: "NU", name: "Niue" },
  { code: "NZ", name: "New Zealand" },
  { code: "OM", name: "Oman" },
  { code: "PA", name: "Panama" },
  { code: "PE", name: "Peru" },
  { code: "PF", name: "French Polynesia" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PH", name: "Philippines" },
  { code: "PK", name: "Pakistan" },
  { code: "PL", name: "Poland" },
  { code: "PM", name: "Saint Pierre and Miquelon" },
  { code: "PN", name: "Pitcairn" },
  { code: "PR", name: "Puerto Rico" },
  { code: "PS", name: "Palestine, State of" },
  { code: "PT", name: "Portugal" },
  { code: "PW", name: "Palau" },
  { code: "PY", name: "Paraguay" },
  { code: "QA", name: "Qatar" },
  { code: "RE", name: "Réunion" },
  { code: "RO", name: "Romania" },
  { code: "RS", name: "Serbia" },
  { code: "RU", name: "Russian Federation" },
  { code: "RW", name: "Rwanda" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SC", name: "Seychelles" },
  { code: "SD", name: "Sudan" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "SH", name: "Saint Helena, Ascension and Tristan da Cunha" },
  { code: "SI", name: "Slovenia" },
  { code: "SJ", name: "Svalbard and Jan Mayen" },
  { code: "SK", name: "Slovakia" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SM", name: "San Marino" },
  { code: "SN", name: "Senegal" },
  { code: "SO", name: "Somalia" },
  { code: "SR", name: "Suriname" },
  { code: "SS", name: "South Sudan" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SV", name: "El Salvador" },
  { code: "SX", name: "Sint Maarten (Dutch part)" },
  { code: "SY", name: "Syrian Arab Republic" },
  { code: "SZ", name: "Eswatini" },
  { code: "TC", name: "Turks and Caicos Islands" },
  { code: "TD", name: "Chad" },
  { code: "TF", name: "French Southern Territories" },
  { code: "TG", name: "Togo" },
  { code: "TH", name: "Thailand" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TK", name: "Tokelau" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TN", name: "Tunisia" },
  { code: "TO", name: "Tonga" },
  { code: "TR", name: "Turkey" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TV", name: "Tuvalu" },
  { code: "TW", name: "Taiwan, Province of China" },
  { code: "TZ", name: "Tanzania, United Republic of" },
  { code: "UA", name: "Ukraine" },
  { code: "UG", name: "Uganda" },
  { code: "UM", name: "United States Minor Outlying Islands" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VA", name: "Holy See (Vatican City State)" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "VE", name: "Venezuela, Bolivarian Republic of" },
  { code: "VG", name: "Virgin Islands, British" },
  { code: "VI", name: "Virgin Islands, U.S." },
  { code: "VN", name: "Viet Nam" },
  { code: "VU", name: "Vanuatu" },
  { code: "WF", name: "Wallis and Futuna" },
  { code: "WS", name: "Samoa" },
  { code: "YE", name: "Yemen" },
  { code: "YT", name: "Mayotte" },
  { code: "ZA", name: "South Africa" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" }
];

// Holt echte Client-IP, auch x-forwarded-for (wichtig bei Render!)
export function getClientIP(req: any): string {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    return (Array.isArray(xff) ? xff[0] : xff.split(',')[0]).trim();
  }
  return req.ip || req.connection?.remoteAddress || "127.0.0.1";
}

// Wandelt IP in Ländercode um, behandelt localhost speziell
export function getCountryFromIP(ip: string): string {
  if (ip === "127.0.0.1" || ip === "::1" || ip?.includes("localhost")) {
    return "DE"; // Setze hier das gewünschte Simulationsland für lokale Tests
  }
  const lookup = geoip.lookup(ip);
  return lookup?.country || "ZZ"; // "ZZ" = unbekannt
}

// Prüft, ob Land gesperrt ist (Blacklist)
export function isCountryBlocked(countryCode: string): boolean {
  return blockedCountries.has(countryCode);
}

// Middleware für API-Endpunkte (JSON-Fehler)
export const checkGeoblocking: RequestHandler = (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    const country = getCountryFromIP(clientIP);
    const blocked = isCountryBlocked(country);

    // Debug-Log
    console.log(`[GeoBlock] IP: ${clientIP} | Country: ${country} | Blocked: ${blocked}`);

    if (blocked) {
      const countryInfo = COUNTRIES.find(c => c.code === country);
      return res.status(451).json({
        success: false,
        error: "Access denied",
        message: `Access to this service is not available in your region (${countryInfo?.name || country}).`,
        countryCode: country,
        countryName: countryInfo?.name || "Unknown"
      });
    }
    next();
  } catch (error) {
    console.error("Error in geoblocking middleware:", error);
    next();
  }
};

// Middleware speziell für die Hauptseite (HTML-Fehlerseite)
export const geoblockingPageMiddleware: RequestHandler = (req, res, next) => {
  try {
    // Skip für API & Assets
    const path = req.path;
    if (path.startsWith('/api/') || path.includes('.') || path.startsWith('/client/')) {
      return next();
    }

    const clientIP = getClientIP(req);
    const country = getCountryFromIP(clientIP);
    const blocked = isCountryBlocked(country);

    // Debug-Log
    console.log(`[GeoBlockPage] IP: ${clientIP} | Country: ${country} | Blocked: ${blocked}`);

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

// --- Admin-API für Blockieren/Freigeben (z.B. vom UI) ---

// Gibt alle Länder und Status zurück
export const getGeoblockingStatus: RequestHandler = (req, res) => {
  try {
    const countries = COUNTRIES.map(country => ({
      ...country,
      blocked: blockedCountries.has(country.code)
    }));

    res.json({
      success: true,
      data: {
        countries,
        totalBlocked: blockedCountries.size,
        totalCountries: COUNTRIES.length
      }
    });
  } catch (error) {
    console.error("Error getting geoblocking status:", error);
    res.json({ success: false, error: "Failed to get geoblocking status" });
  }
};

// Blockiert oder hebt Block für ein Land auf
export const updateCountryBlocking: RequestHandler = (req, res) => {
  try {
    const { countryCode, blocked } = req.body;

    if (!countryCode || typeof blocked !== "boolean") {
      return res.json({
        success: false,
        error: "Country code and blocked status are required"
      });
    }

    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) {
      return res.json({
        success: false,
        error: "Invalid country code"
      });
    }

    if (blocked) {
      blockedCountries.add(countryCode);
      console.log(`🚫 Country ${countryCode} (${country.name}) has been blocked`);
    } else {
      blockedCountries.delete(countryCode);
      console.log(`✅ Country ${countryCode} (${country.name}) has been unblocked`);
    }

    res.json({
      success: true,
      data: {
        countryCode,
        countryName: country.name,
        blocked,
        totalBlocked: blockedCountries.size
      }
    });
  } catch (error) {
    console.error("Error updating country blocking:", error);
    res.json({ success: false, error: "Failed to update country blocking" });
  }
};

// Bulk-Update für mehrere Länder (Array von Codes)
export const bulkUpdateCountries: RequestHandler = (req, res) => {
  try {
    const { countries, blocked } = req.body;

    if (!Array.isArray(countries) || typeof blocked !== "boolean") {
      return res.json({
        success: false,
        error: "Countries array and blocked status are required"
      });
    }

    let updated = 0;
    for (const countryCode of countries) {
      const country = COUNTRIES.find(c => c.code === countryCode);
      if (country) {
        if (blocked) {
          blockedCountries.add(countryCode);
        } else {
          blockedCountries.delete(countryCode);
        }
        updated++;
      }
    }

    console.log(`${blocked ? '🚫 Blocked' : '✅ Unblocked'} ${updated} countries`);

    res.json({
      success: true,
      data: {
        updated,
        totalBlocked: blockedCountries.size,
        action: blocked ? 'blocked' : 'unblocked'
      }
    });
  } catch (error) {
    console.error("Error bulk updating countries:", error);
    res.json({ success: false, error: "Failed to bulk update countries" });
  }
};

// Gibt das Land des aktuellen Users zurück
export const getUserCountry: RequestHandler = (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const country = getCountryFromIP(clientIP);
    const countryInfo = COUNTRIES.find(c => c.code === country);
    const blocked = blockedCountries.has(country);

    res.json({
      success: true,
      data: {
        ip: clientIP,
        countryCode: country,
        countryName: countryInfo?.name || "Unknown",
        blocked,
        accessAllowed: !blocked
      }
    });
  } catch (error) {
    console.error("Error getting user country:", error);
    res.json({ success: false, error: "Failed to get user country" });
  }
};
