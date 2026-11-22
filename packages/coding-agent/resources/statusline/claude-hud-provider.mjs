// Provedor ativo do nycode para o HUD. O payload do nycode só traz model.id; o provedor vem do último `model_change`
// que o nycode grava no arquivo da sessão a cada seleção de modelo (SessionManager.appendModelChange), ou seja, antes
// de qualquer resposta. Só vale se o modelId gravado for o do payload: senão a troca está em andamento e o
// provedor fica desconhecido (nunca o antigo). Sem heurística de nome de modelo.
import fs from 'node:fs';

const MAX_BYTES = 8 * 1024 * 1024; // sessões maiores: modelo mais antigo que isso vira desconhecido

const BLOCK = 64 * 1024;

/** Último model_change {provider, modelId} dentro dos últimos maxBytes do arquivo. Lê de trás para frente em blocos
 * de 64 KB e para no primeiro achado (a troca costuma estar perto do fim: 43 ms → <1 ms em 8 MB). */
function lastModelChange(file, maxBytes) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const floor = Math.max(0, size - maxBytes); // abaixo disso: modelo mais antigo que o teto vira desconhecido
    let pos = size;
    let carry = Buffer.alloc(0); // começo (ainda sem o início) da linha que cruza a fronteira do bloco
    while (pos > floor) {
      const n = Math.min(BLOCK, pos - floor);
      pos -= n;
      const chunk = Buffer.alloc(n);
      fs.readSync(fd, chunk, 0, n, pos);
      let buf = Buffer.concat([chunk, carry]);
      const first = buf.indexOf(10);
      if (pos > floor || floor === 0) {
        // O trecho antes do 1º \n é linha parcial (resto vem no bloco anterior), salvo no começo real do arquivo.
        if (pos > floor && first !== -1) { carry = buf.subarray(0, first); buf = buf.subarray(first + 1); }
        else if (pos > floor) { carry = buf; continue; }
        else carry = Buffer.alloc(0);
      } else {
        buf = first === -1 ? Buffer.alloc(0) : buf.subarray(first + 1); // janela cortou a 1ª linha
      }
      const lines = buf.toString('utf8').split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].includes('"model_change"')) continue;
        try {
          const entry = JSON.parse(lines[i]);
          if (entry?.type === 'model_change') return entry;
        } catch {
          // linha malformada: segue para a anterior
        }
      }
    }
  } catch {
    // sem arquivo legível: provedor desconhecido
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  return undefined;
}

/** Id do provedor do modelo ativo, ou undefined quando não dá para afirmar. */
export function activeModelProvider(payload, { maxBytes = MAX_BYTES } = {}) {
  // nycode (patch pendente) pode mandar model.provider no payload: vale direto, sem ler a sessão.
  const direct = payload?.model?.provider;
  if (typeof direct === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(direct)) return direct;
  const file = payload?.transcript_path;
  const id = payload?.model?.id;
  if (typeof file !== 'string' || !file || typeof id !== 'string' || !id) return undefined;
  const entry = lastModelChange(file, maxBytes);
  if (!entry || entry.modelId !== id || typeof entry.provider !== 'string' || !entry.provider) return undefined;
  return entry.provider;
}
