#!/usr/bin/env python3
"""WCAG 2.x contrast ratio calculator.

Usage: python3 contrast.py FG BG [FG BG ...]    e.g. contrast.py 2E2A24 F3E9D2
Prints ratio and AA/AAA results for normal and large text.
Note: computes flat colours only. Textured backgrounds must be measured on the real render.
"""
import sys

def lum(hexs):
    hexs = hexs.lstrip("#")
    c = [int(hexs[i:i+2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

args = sys.argv[1:]
if not args or len(args) % 2:
    sys.exit(__doc__)
for fg, bg in zip(args[::2], args[1::2]):
    r = ratio(fg, bg)
    print(f"#{fg.lstrip('#').upper()} on #{bg.lstrip('#').upper()}: {r:.2f}:1  "
          f"AA-normal {'PASS' if r >= 4.5 else 'FAIL'}  AA-large {'PASS' if r >= 3 else 'FAIL'}  "
          f"AAA-normal {'PASS' if r >= 7 else 'FAIL'}")
