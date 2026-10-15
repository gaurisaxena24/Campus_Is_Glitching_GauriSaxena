#!/usr/bin/env python3
"""Extract plain text from a .docx (read-only) using only the standard library.

Usage: python3 -I extract_docx.py INPUT.docx [OUTPUT.txt]
Writes to OUTPUT (default: stdout). Never modifies the source file.
Paragraphs and table cells are emitted one per line, in document order.
"""
import sys, zipfile, re
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def text_of(p):
    return "".join(t.text or "" for t in p.iter(W + "t"))

def main(src, out=None):
    with zipfile.ZipFile(src) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    lines = [text_of(p) for p in root.iter(W + "p")]
    data = "\n".join(l for l in lines if l.strip()) + "\n"
    if out:
        open(out, "w", encoding="utf-8").write(data)
    else:
        sys.stdout.write(data)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
