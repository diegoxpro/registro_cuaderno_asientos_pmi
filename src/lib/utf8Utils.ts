/**
 * Utilidades para saneamiento y preservación estricta de cadenas en UTF-8
 */

export function fixUtf8Mojibake(text?: string | null): string {
  if (!text) return '';
  let str = String(text);

  // 1. Si la cadena contiene secuencias típicas de decodificación errónea Latin-1 -> UTF-8
  if (/[\u00C2-\u00C3][\u0080-\u00BF]/.test(str)) {
    try {
      const reDecoded = Buffer.from(str, 'latin1').toString('utf8');
      if (!reDecoded.includes('\uFFFD')) {
        str = reDecoded;
      }
    } catch {
      // Ignorar fallback
    }
  }

  // 2. Reemplazos explícitos de mojibake Windows-1252/ISO-8859-1 frecuentes en español
  str = str
    .replace(/Ã¡/g, 'á')
    .replace(/Ã/g, 'Á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã­/g, 'í')
    .replace(/Ã/g, 'Í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ');

  // 3. Reemplazos de caracteres dañados o signo de interrogación por pérdida de codificación
  str = str
    .replace(/Ejecuci[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'EJECUCIÓN' : 'Ejecución'))
    .replace(/F[\uFFFD\?]+sica/gi, (m) => (m === m.toUpperCase() ? 'FÍSICA' : 'Física'))
    .replace(/F[\uFFFD\?]+sico/gi, (m) => (m === m.toUpperCase() ? 'FÍSICO' : 'Físico'))
    .replace(/Le[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'LEÓN' : 'León'))
    .replace(/Chapo[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'CHAPOÑAN' : 'Chapoñan'))
    .replace(/Farro[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'FARROÑAN' : 'Farroñan'))
    .replace(/rchapo[\uFFFD\?]+n/gi, 'rchapoñan')
    .replace(/Sip[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'SIPÁN' : 'Sipán'))
    .replace(/Tur[\uFFFD\?]+stic/gi, (m) => (m === m.toUpperCase() ? 'TURÍSTIC' : 'Turístic'))
    .replace(/P[\uFFFD\?]+blic/gi, (m) => (m === m.toUpperCase() ? 'PÚBLIC' : 'Públic'))
    .replace(/Ampliaci[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'AMPLIACIÓN' : 'Ampliación'))
    .replace(/Arqueol[\uFFFD\?]+gic/gi, (m) => (m === m.toUpperCase() ? 'ARQUEOLÓGIC' : 'Arqueológic'))
    .replace(/Locaci[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'LOCACIÓN' : 'Locación'))
    .replace(/Gesti[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'GESTIÓN' : 'Gestión'))
    .replace(/Supervisi[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'SUPERVISIÓN' : 'Supervisión'))
    .replace(/Inversi[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'INVERSIÓN' : 'Inversión'))
    .replace(/Administraci[\uFFFD\?]+n/gi, (m) => (m === m.toUpperCase() ? 'ADMINISTRACIÓN' : 'Administración'));

  return str;
}
