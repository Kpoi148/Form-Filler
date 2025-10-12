# -*- coding: utf-8 -*-
"""
Extract all .js, .css, and .html files into chunked .txt dumps with per-file headers.
- Adds "Địa chỉ:" (relative path) before each source file content.
- Splits output into multiple .txt files, each capped at CHUNK_LIMIT bytes.
- Skips common build/VC dirs.
Run from the repo root:  python py.py
"""

from pathlib import Path
import os
import io

# ====== CONFIG ======
EXTENSIONS = {".js", ".css", ".html"}
EXCLUDED_DIRS = {
    ".git", ".github", ".vs", ".idea", ".vscode",
    "bin", "obj", "node_modules", "packages",
    "dist", "build", "Publish", "publish", "out", "logs",
    "wwwroot"
}
OUTPUT_DIR_NAME = "_extracted_code"
OUTPUT_BASENAME = "code_dump_"
CHUNK_LIMIT = 100 * 1024  # 100 KB per txt output
ENCODING_READ = "utf-8"   # decode input as utf-8; replace errors
ENCODING_WRITE = "utf-8"  # write output as utf-8
# ====================

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / OUTPUT_DIR_NAME
OUT_DIR.mkdir(exist_ok=True)

def should_skip_dir(dir_name: str) -> bool:
    # skip hidden folders that start with '.' as well
    return dir_name in EXCLUDED_DIRS or dir_name.startswith(".") and dir_name not in {".", ".."}

def iter_source_files(root: Path):
    for base, dirs, files in os.walk(root):
        # prune excluded dirs in-place for performance
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]
        for f in files:
            p = Path(base) / f
            if p.suffix.lower() in EXTENSIONS:
                yield p

class ChunkedWriter:
    def __init__(self, out_dir: Path, base_name: str, chunk_limit: int, encoding: str):
        self.out_dir = out_dir
        self.base_name = base_name
        self.chunk_limit = chunk_limit
        self.encoding = encoding
        self.index = 0
        self.file = None
        self.bytes_written = 0
        self._open_next_file()

    def _open_next_file(self):
        if self.file:
            self.file.close()
        self.index += 1
        fname = f"{self.base_name}{self.index:04d}.txt"
        self.current_path = self.out_dir / fname
        self.file = io.open(self.current_path, "w", encoding=self.encoding, newline="\n")
        self.bytes_written = 0
        # optional header per dump file
        self._write_direct(f"### Dump file: {fname}\n\n")

    def _write_direct(self, text: str):
        self.file.write(text)
        self.bytes_written += len(text.encode(self.encoding, errors="replace"))

    def write(self, text: str):
        """Write possibly large text across chunk files without breaking flow."""
        if not text:
            return
        # We split by bytes (encoded), not chars, to respect CHUNK_LIMIT exactly.
        data = text.encode(self.encoding, errors="replace")
        pos = 0
        while pos < len(data):
            space_left = self.chunk_limit - self.bytes_written
            if space_left <= 0:
                self._open_next_file()
                space_left = self.chunk_limit
            take = min(space_left, len(data) - pos)
            # decode back the slice to write (safe because we encoded it ourselves)
            piece = data[pos:pos+take].decode(self.encoding, errors="replace")
            self._write_direct(piece)
            pos += take

    def close(self):
        if self.file:
            self.file.close()
            self.file = None

def make_header(rel_path: str, size_bytes: int) -> str:
    return (
        "===== FILE START =====\n"
        f"Địa chỉ: {rel_path}\n"
        f"Kích thước gốc: {size_bytes} bytes\n"
        "----------------------\n"
    )

def make_footer() -> str:
    return "\n===== FILE END =====\n\n"

def read_file_text(path: Path) -> str:
    # Read text robustly; replace undecodable bytes.
    with io.open(path, "r", encoding=ENCODING_READ, errors="replace") as f:
        return f.read()

def main():
    writer = ChunkedWriter(OUT_DIR, OUTPUT_BASENAME, CHUNK_LIMIT, ENCODING_WRITE)
    total_files = 0
    total_bytes = 0

    for p in iter_source_files(ROOT):
        rel = p.relative_to(ROOT).as_posix()
        try:
            text = read_file_text(p)
        except Exception as e:
            # If any file cannot be read, record the error and continue
            err_block = (
                "===== FILE START =====\n"
                f"Địa chỉ: {rel}\n"
                "!! LỖI: Không thể đọc file này !!\n"
                f"Chi tiết: {e}\n"
                "===== FILE END =====\n\n"
            )
            writer.write(err_block)
            continue

        size_bytes = len(text.encode(ENCODING_READ, errors="replace"))
        header = make_header(rel, size_bytes)
        footer = make_footer()
        writer.write(header + text + "\n" + footer)

        total_files += 1
        total_bytes += size_bytes
        print(f"[OK] {rel} ({size_bytes} bytes)")

    writer.close()
    print("\n--- DONE ---")
    print(f"Files exported: {total_files}")
    print(f"Total source bytes: {total_bytes}")
    print(f"Output directory: {OUT_DIR}")

if __name__ == "__main__":
    main()