#!/usr/bin/env python3
"""Gera languages.json a partir do github-linguist/linguist lib/linguist/languages.yml.

Uso: python3 gen-languages.py [languages.yml]  (sem argumento baixa a versão atual do main).
Saída: {"source", "langs": [[nome, cor|null, [candidatos de gramática]]], "tags": {etiqueta: índice}}.
Precedência das etiquetas: nome > alias > extensão primária > demais extensões (a primeira linguagem fica).
"""
import json
import os
import sys
import urllib.request

import yaml

URL = 'https://raw.githubusercontent.com/github-linguist/linguist/main/lib/linguist/languages.yml'


def main() -> None:
    raw = open(sys.argv[1], encoding='utf-8').read() if len(sys.argv) > 1 else urllib.request.urlopen(URL).read().decode()
    data = yaml.safe_load(raw)
    langs, index = [], {}
    for name, d in data.items():
        index[name] = len(langs)
        color = d.get('color') or (data.get(d['group'], {}).get('color') if d.get('group') else None)
        cands = [name.lower(), name.lower().replace(' ', '-'), *(a.lower() for a in d.get('aliases', []))]
        for k in ('ace_mode', 'codemirror_mode'):
            if d.get(k) and d[k] != 'text':
                cands.append(d[k].lower())
        if d.get('group'):
            cands.append(d['group'].lower())
        cands += [e.lstrip('.').lower() for e in d.get('extensions', [])]
        langs.append([name, color, list(dict.fromkeys(cands))])
    tags: dict[str, int] = {}

    def put(tag: str, i: int) -> None:
        tag = tag.lower()
        if tag and ' ' not in tag and tag not in tags:
            tags[tag] = i

    for name, d in data.items():
        put(name.replace(' ', '-'), index[name])
        if ' ' not in name:
            put(name, index[name])
    for name, d in data.items():
        for a in d.get('aliases', []):
            put(a, index[name])
    for name, d in data.items():
        ext = d.get('extensions', [])
        if ext:
            put(ext[0].lstrip('.'), index[name])
    for name, d in data.items():
        for e in d.get('extensions', [])[1:]:
            put(e.lstrip('.'), index[name])
        for f in d.get('interpreters', []):
            put(f, index[name])
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'languages.json')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump({'source': URL, 'langs': langs, 'tags': tags}, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write('\n')
    print(f'{len(langs)} linguagens, {sum(1 for l in langs if l[1])} com cor, {len(tags)} etiquetas -> {out}')


if __name__ == '__main__':
    main()
