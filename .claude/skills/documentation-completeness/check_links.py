#!/usr/bin/env python3
"""Check relative Markdown links and #anchors in the given files or folders.

Usage: python3 check_links.py [paths...]   (default: docs README.md)
Exit code 0 = all links resolve, 1 = broken links found.
Read-only: never modifies files.
"""
import os, re, sys, unicodedata

LINK = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)\)")

def slug(heading):
    # GitHub-style anchor: lowercase, drop punctuation except - and space, spaces -> -
    h = unicodedata.normalize("NFKD", heading.strip().lower())
    h = re.sub(r"[`*_~]", "", h)
    h = re.sub(r"[^\w\- ]", "", h)
    return h.replace(" ", "-")

def anchors(path, cache={}):
    if path not in cache:
        found, seen, fence = set(), {}, False
        for line in open(path, encoding="utf-8"):
            if line.lstrip().startswith("```"):
                fence = not fence
            if fence:
                continue
            m = re.match(r"^#{1,6}\s+(.*?)\s*#*\s*$", line)
            if m:
                s = slug(m.group(1)); n = seen.get(s, 0)
                found.add(s if n == 0 else f"{s}-{n}"); seen[s] = n + 1
        cache[path] = found
    return cache[path]

def md_files(paths):
    for p in paths:
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                for f in sorted(files):
                    if f.endswith(".md"):
                        yield os.path.join(root, f)
        elif p.endswith(".md") and os.path.exists(p):
            yield p

def main(argv):
    paths = argv or ["docs", "README.md"]
    broken = checked = 0
    for f in md_files(paths):
        fence = False
        for i, line in enumerate(open(f, encoding="utf-8"), 1):
            if line.lstrip().startswith("```"):
                fence = not fence
            if fence:
                continue
            for target in LINK.findall(line):
                if re.match(r"^[a-z]+:", target):
                    continue  # external URL / mailto: not checked
                checked += 1
                file_part, _, frag = target.partition("#")
                dest = os.path.normpath(os.path.join(os.path.dirname(f), file_part)) if file_part else f
                if not os.path.exists(dest):
                    print(f"BROKEN FILE   {f}:{i} -> {target}"); broken += 1
                elif frag and dest.endswith(".md") and frag not in anchors(dest):
                    print(f"BROKEN ANCHOR {f}:{i} -> {target}"); broken += 1
    print(f"Checked {checked} relative links; {broken} broken.")
    return 1 if broken else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
