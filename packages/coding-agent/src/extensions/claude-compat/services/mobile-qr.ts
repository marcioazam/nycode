/**
 * QR constante de https://claude.ai/mobile (docs oficiais do /mobile). Sem biblioteca nem rede em runtime.
 * Origem: api.qrserver.com (format=svg, ecc=M, qzone=4); as linhas abaixo são as células pretas do `<path>` do SVG
 * (viewBox 33x33 = quiet zone de 4 módulos + QR v2-M 25x25), tratado só como dado. Ver docs/specs/claude-code-parity/public-services.md.
 */
export const MOBILE_URL = "https://claude.ai/mobile";

export const MOBILE_ROWS: readonly string[] = [
	"000000000000000000000000000000000",
	"000000000000000000000000000000000",
	"000000000000000000000000000000000",
	"000000000000000000000000000000000",
	"000011111110001101000011111110000",
	"000010000010011001111010000010000",
	"000010111010111110110010111010000",
	"000010111010111111100010111010000",
	"000010111010100111001010111010000",
	"000010000010101000111010000010000",
	"000011111110101010101011111110000",
	"000000000000100110110000000000000",
	"000010111110010011110011111000000",
	"000010000000100101001001000100000",
	"000011110111100011110101110110000",
	"000011100001011010101010000010000",
	"000011110110100101100110101110000",
	"000010010001000010000001010100000",
	"000010100110111001011011110110000",
	"000010100001000010011111100010000",
	"000010111110110011111111101000000",
	"000000000000110001011000110000000",
	"000011111110011110001010101110000",
	"000010000010110100101000110010000",
	"000010111010101111111111101000000",
	"000010111010111011010110111110000",
	"000010111010111000100100011010000",
	"000010000010011000011111110010000",
	"000011111110101011100111111110000",
	"000000000000000000000000000000000",
	"000000000000000000000000000000000",
	"000000000000000000000000000000000",
	"000000000000000000000000000000000",
];

export const QR_COLS = 33;

/** Meios-blocos: 00 espaço, 10 ▀, 01 ▄, 11 █ (1 = preto). 17 linhas x 33 colunas, quiet zone preservada. */
export function qrLines(): string[] {
	const out: string[] = [];
	for (let y = 0; y < MOBILE_ROWS.length; y += 2) {
		const top = MOBILE_ROWS[y]!;
		const bottom = MOBILE_ROWS[y + 1] ?? "0".repeat(QR_COLS);
		let line = "";
		for (let x = 0; x < QR_COLS; x++)
			line += [" ", "▄", "▀", "█"][(top[x] === "1" ? 2 : 0) + (bottom[x] === "1" ? 1 : 0)];
		out.push(line);
	}
	return out;
}

/** Preto sobre branco, independente do tema do terminal. */
export const styledQrLines = (): string[] => qrLines().map((l) => `\x1b[30;47m${l}\x1b[0m`);

const chunk = (s: string, w: number): string[] => (s ? (s.match(new RegExp(`.{1,${w}}`, "gu")) ?? []) : []);

/** Texto do aviso/headless: QR + link. */
export const qrNotice = (): string => `${qrLines().join("\n")}\nApp Claude (iOS/Android): ${MOBILE_URL}`;

/**
 * Painel do overlay. Largura < 33: não corta o QR; explica e mostra o link quebrado em linhas que cabem.
 * Enter, Esc ou q fecham.
 */
export class QrPanel {
	private readonly close: () => void;
	constructor(close: () => void) {
		this.close = close;
	}
	invalidate(): void {}
	handleInput(data: string): void {
		if (data === "\r" || data === "\n" || data === "\x1b" || data === "q") this.close();
	}
	render(width: number): string[] {
		if (width < 1) return [];
		if (width < QR_COLS)
			return [
				...chunk(`Terminal estreito (${width} colunas): o QR precisa de ${QR_COLS}. Abra: ${MOBILE_URL}`, width),
				...chunk("Enter/Esc/q fecham", width),
			];
		const pad = " ".repeat(Math.floor((width - QR_COLS) / 2));
		return [
			`${pad}App Claude (iOS/Android)`,
			...styledQrLines().map((l) => `${pad}${l}`),
			`${pad}${MOBILE_URL}`,
			`${pad}Enter/Esc/q fecham`,
		];
	}
}
