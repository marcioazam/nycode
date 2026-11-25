# Payloads reais dos eventos de hook

Capturados em 2026-11-11 por um `nycode -p --settings` com um hook que grava o stdin de cada evento (repositório
temporário, Sonnet 5.5). `../internal/core-notes.test.ts` usa dois deles, para não depender só de
payloads montados à mão. Recapturar quando o formato dos eventos da extensão hooks mudar.
