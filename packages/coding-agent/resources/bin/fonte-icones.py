"""Gera uma fonte só com os ícones Nerd Font (PUA) ampliados, para o kitty usar via symbol_map.

Uso: uv run --with fonttools python fonte-icones.py <JetBrainsMonoNLNerdFont-Regular.ttf> <saída.ttf> <fator> "<nome>"
Ex.: ... ~/.local/share/fonts/NycodeIcons/NycodeIcons.ttf caixa:0.80 "Nycode Icons" && fc-cache -f
O kitty desenha o ícone no tamanho natural e só reduz o que passa de 2 células × 1 linha; o modo caixa leva cada
ícone até essa borda, então os pequenos crescem mais que os grandes.
"""

import sys

from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

src, out, fator_arg, nome = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
# "caixa:0.9" amplia cada ícone até ocupar 90% da caixa que o kitty dá a ele (2 células × 1 linha); um número escala todos igual.
caixa = float(fator_arg.split(":")[1]) if fator_arg.startswith("caixa:") else None
f = TTFont(src)
pua = [
    cp for cp in f.getBestCmap() if 0xE000 <= cp <= 0xF8FF or 0xF0000 <= cp <= 0xFFFFD
]
opts = subset.Options()
opts.layout_features = []
opts.notdef_outline = True
opts.name_IDs = ["*"]
opts.hinting = False
s = subset.Subsetter(opts)
s.populate(unicodes=pua)
s.subset(f)
gs = f.getGlyphSet()
glyf = f["glyf"]
os2 = f["OS/2"]
cy = (os2.sTypoAscender + os2.sTypoDescender) / 2
box_w = 2 * max(
    w for w, _ in f["hmtx"].metrics.values()
)  # mono: todo glifo avança 1 célula
box_h = os2.sTypoAscender - os2.sTypoDescender
for n in f.getGlyphOrder():
    g = glyf[n]
    if g.numberOfContours == 0:
        continue
    if g.isComposite():
        g.expand(glyf)
    b = BoundsPen(gs)
    gs[n].draw(b)
    if not b.bounds:
        continue
    cx = (b.bounds[0] + b.bounds[2]) / 2
    fator = (
        min(
            caixa * box_w / max(1, b.bounds[2] - b.bounds[0]),
            caixa * box_h / max(1, b.bounds[3] - b.bounds[1]),
        )
        if caixa
        else float(fator_arg)
    )
    gy = (b.bounds[1] + b.bounds[3]) / 2 if caixa else cy
    p = TTGlyphPen(gs)
    nx = box_w / 2 if caixa else cx  # no modo caixa, centrado nas 2 células
    gs[n].draw(TransformPen(p, (fator, 0, 0, fator, nx - fator * cx, cy - fator * gy)))
    glyf[n] = p.glyph()
    glyf[n].recalcBounds(glyf)
for r in f["name"].names:
    if r.nameID in (1, 4, 16):
        r.string = nome
    elif r.nameID == 6:
        r.string = nome.replace(" ", "")
    elif r.nameID in (2, 17):
        r.string = "Regular"
f.save(out)
print(out, len(pua), "ícones")
