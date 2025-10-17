#!/usr/bin/env python3
"""Generate a simple animated GIF that illustrates the dev references workflow."""

from __future__ import annotations

from math import log2
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

WIDTH = 640
HEIGHT = 360
PALETTE: List[Tuple[int, int, int]] = [
    (15, 23, 42),   # 0 background
    (30, 41, 59),   # 1 window
    (51, 65, 85),   # 2 panel border
    (56, 189, 248), # 3 accent
    (248, 250, 252),# 4 text
    (250, 204, 21), # 5 warning
    (34, 197, 94),  # 6 success
    (244, 63, 94),  # 7 error
]

COLOR_BG = 0
COLOR_WINDOW = 1
COLOR_PANEL = 2
COLOR_ACCENT = 3
COLOR_TEXT = 4
COLOR_WARN = 5
COLOR_SUCCESS = 6
COLOR_ERROR = 7

CHAR_WIDTH = 5
CHAR_HEIGHT = 7
CHAR_SPACING = 6

FONT: Dict[str, Sequence[str]] = {
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "B": ("11110", "10001", "10001", "11110", "10001", "10001", "11110"),
    "C": ("01110", "10001", "10000", "10000", "10000", "10001", "01110"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "E": ("11111", "10000", "10000", "11110", "10000", "10000", "11111"),
    "F": ("11111", "10000", "10000", "11110", "10000", "10000", "10000"),
    "G": ("01110", "10001", "10000", "10111", "10001", "10001", "01111"),
    "H": ("10001", "10001", "10001", "11111", "10001", "10001", "10001"),
    "I": ("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "J": ("11111", "00010", "00010", "00010", "10010", "10010", "01100"),
    "K": ("10001", "10010", "10100", "11000", "10100", "10010", "10001"),
    "L": ("10000", "10000", "10000", "10000", "10000", "10000", "11111"),
    "M": ("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "P": ("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
    "Q": ("01110", "10001", "10001", "10001", "10101", "10010", "01101"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "S": ("01111", "10000", "10000", "01110", "00001", "00001", "11110"),
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "U": ("10001", "10001", "10001", "10001", "10001", "10001", "01110"),
    "V": ("10001", "10001", "10001", "10001", "01010", "01010", "00100"),
    "W": ("10001", "10001", "10001", "10101", "10101", "10101", "01010"),
    "X": ("10001", "01010", "00100", "00100", "00100", "01010", "10001"),
    "Y": ("10001", "01010", "00100", "00100", "00100", "00100", "00100"),
    "Z": ("11111", "00001", "00010", "00100", "01000", "10000", "11111"),
    "0": ("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
    "1": ("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
    "2": ("01110", "10001", "00001", "00110", "01000", "10000", "11111"),
    "3": ("11110", "00001", "00001", "01110", "00001", "00001", "11110"),
    "4": ("00010", "00110", "01010", "10010", "11111", "00010", "00010"),
    "5": ("11111", "10000", "11110", "00001", "00001", "10001", "01110"),
    "6": ("01110", "10000", "11110", "10001", "10001", "10001", "01110"),
    "7": ("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
    "8": ("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
    "9": ("01110", "10001", "10001", "01111", "00001", "00010", "01100"),
    "-": ("00000", "00000", "00000", "11100", "00000", "00000", "00000"),
    ".": ("00000", "00000", "00000", "00000", "00000", "01100", "01100"),
    "@": ("01110", "10001", "10111", "10101", "10111", "10000", "01110"),
    " ": ("00000", "00000", "00000", "00000", "00000", "00000", "00000"),
    "?": ("01110", "10001", "00010", "00100", "00100", "00000", "00100"),
}

def create_frame() -> List[int]:
    return [COLOR_BG] * (WIDTH * HEIGHT)


def set_pixel(frame: List[int], x: int, y: int, color: int) -> None:
    if 0 <= x < WIDTH and 0 <= y < HEIGHT:
        frame[y * WIDTH + x] = color


def draw_rect(frame: List[int], x: int, y: int, w: int, h: int, color: int) -> None:
    for py in range(y, y + h):
        for px in range(x, x + w):
            set_pixel(frame, px, py, color)


def draw_text(frame: List[int], x: int, y: int, text: str, color: int) -> None:
    cursor_x = x
    upper = text.upper()
    for ch in upper:
        if ch not in FONT:
            ch = "?"
        pattern = FONT[ch]
        for row, bits in enumerate(pattern):
            for col, bit in enumerate(bits):
                if bit == "1":
                    set_pixel(frame, cursor_x + col, y + row, color)
        cursor_x += CHAR_SPACING


def draw_window(frame: List[int]) -> None:
    draw_rect(frame, 32, 32, WIDTH - 64, HEIGHT - 64, COLOR_WINDOW)
    draw_rect(frame, 32, 32, WIDTH - 64, 46, COLOR_PANEL)
    draw_rect(frame, 48, 96, WIDTH - 96, HEIGHT - 160, COLOR_BG)


def draw_cursor(frame: List[int], x: int, y: int, height: int, color: int) -> None:
    for py in range(y, y + height):
        set_pixel(frame, x, py, color)
        set_pixel(frame, x + 1, py, color)


def draw_highlight_box(frame: List[int], x: int, y: int, w: int, h: int, color: int) -> None:
    for py in range(y, y + h):
        for px in range(x, x + w):
            if px == x or px == x + w - 1 or py == y or py == y + h - 1:
                set_pixel(frame, px, py, color)


def make_frames() -> List[List[int]]:
    frames: List[List[int]] = []

    # Frame 1: typing @Lea
    frame1 = create_frame()
    draw_window(frame1)
    draw_text(frame1, 56, 58, "STEP 1 - TYPE @LEA", COLOR_TEXT)
    draw_text(frame1, 72, 130, "SUM(@", COLOR_TEXT)
    draw_text(frame1, 72 + CHAR_SPACING * 4, 130, "LEA", COLOR_ACCENT)
    draw_cursor(frame1, 72 + CHAR_SPACING * 7, 130, CHAR_HEIGHT, COLOR_ACCENT)
    frames.append(frame1)

    # Frame 2: picking suggestion
    frame2 = create_frame()
    draw_window(frame2)
    draw_text(frame2, 56, 58, "STEP 2 - PICK LEASES.RENT", COLOR_TEXT)
    draw_text(frame2, 72, 130, "SUM(@", COLOR_TEXT)
    draw_text(frame2, 72 + CHAR_SPACING * 4, 130, "LEASES.RENT", COLOR_ACCENT)
    draw_highlight_box(frame2, 72, 170, 220, 40, COLOR_ACCENT)
    draw_text(frame2, 86, 182, "SUGGESTION · LEASES.RENT", COLOR_TEXT)
    frames.append(frame2)

    # Frame 3: translate phrase
    frame3 = create_frame()
    draw_window(frame3)
    draw_text(frame3, 56, 58, "STEP 3 - TRANSLATE HUMAN PHRASE", COLOR_TEXT)
    draw_text(frame3, 72, 126, "AVERAGE RENT IN LAKESIDE", COLOR_TEXT)
    draw_highlight_box(frame3, 72, 154, 340, 54, COLOR_ACCENT)
    draw_text(frame3, 86, 168, "AI → AVG(@LEASES.RENT", COLOR_TEXT)
    draw_text(frame3, 86 + CHAR_SPACING * 14, 168, " WHERE", COLOR_TEXT)
    draw_text(frame3, 86, 182, "@PROPERTIES.NAME = 'LAKESIDE')", COLOR_TEXT)
    frames.append(frame3)

    # Frame 4: apply quick fix
    frame4 = create_frame()
    draw_window(frame4)
    draw_text(frame4, 56, 58, "STEP 4 - APPLY QUICK FIX", COLOR_TEXT)
    draw_highlight_box(frame4, WIDTH - 260, 112, 180, 160, COLOR_WARN)
    draw_text(frame4, WIDTH - 244, 132, "DIAGNOSTIC", COLOR_TEXT)
    draw_text(frame4, WIDTH - 244, 146, "UNKNOWN_COLUMN", COLOR_ERROR)
    draw_highlight_box(frame4, WIDTH - 244, 180, 148, 34, COLOR_ACCENT)
    draw_text(frame4, WIDTH - 232, 192, "USE RENT", COLOR_TEXT)
    draw_text(frame4, 72, 140, "COUNT(@LEASES.RENT", COLOR_TEXT)
    draw_text(frame4, 72, 156, "WHERE @LEASES.STATUS = 'ACTIVE')", COLOR_TEXT)
    frames.append(frame4)

    # Frame 5: run results
    frame5 = create_frame()
    draw_window(frame5)
    draw_text(frame5, 56, 58, "STEP 5 - RUN AND REVIEW", COLOR_TEXT)
    draw_highlight_box(frame5, 72, 126, 280, 64, COLOR_SUCCESS)
    draw_text(frame5, 86, 146, "AVG RENT = 1,883", COLOR_TEXT)
    draw_text(frame5, 86, 160, "FILTERED ROWS: 2", COLOR_TEXT)
    draw_highlight_box(frame5, 72, 206, WIDTH - 208, 90, COLOR_PANEL)
    draw_text(frame5, 86, 222, "ID   STATUS   RENT", COLOR_TEXT)
    draw_text(frame5, 86, 236, "L-1001 ACTIVE 1825", COLOR_TEXT)
    draw_text(frame5, 86, 250, "L-1002 ACTIVE 1940", COLOR_TEXT)
    frames.append(frame5)

    return frames


def lzw_encode(indices: Sequence[int], width: int, height: int, min_code_size: int = 3) -> bytes:
    clear_code = 1 << min_code_size
    end_code = clear_code + 1
    dictionary: Dict[Tuple[int, ...], int] = { (i,): i for i in range(clear_code) }
    code_size = min_code_size + 1
    next_code = end_code + 1

    buffer = 0
    bits_in_buffer = 0
    output = bytearray()

    def write_code(code: int, size: int) -> None:
        nonlocal buffer, bits_in_buffer
        buffer |= code << bits_in_buffer
        bits_in_buffer += size
        while bits_in_buffer >= 8:
            output.append(buffer & 0xFF)
            buffer >>= 8
            bits_in_buffer -= 8

    write_code(clear_code, code_size)
    w: Tuple[int, ...] = ()
    for k in indices:
        if not w:
            w = (k,)
            continue
        wk = w + (k,)
        if wk in dictionary:
            w = wk
            continue
        write_code(dictionary[w], code_size)
        dictionary[wk] = next_code
        next_code += 1
        if next_code >= 1 << code_size and code_size < 12:
            code_size += 1
        if next_code >= 4096:
            write_code(clear_code, code_size)
            dictionary = { (i,): i for i in range(clear_code) }
            code_size = min_code_size + 1
            next_code = end_code + 1
            w = (k,)
        else:
            w = (k,)
    if w:
        write_code(dictionary[w], code_size)
    write_code(end_code, code_size)
    if bits_in_buffer > 0:
        output.append(buffer & 0xFF)

    blocks = bytearray()
    data = bytes(output)
    idx = 0
    while idx < len(data):
        chunk = data[idx : idx + 255]
        blocks.append(len(chunk))
        blocks.extend(chunk)
        idx += 255
    blocks.append(0)
    return bytes([min_code_size]) + bytes(blocks)


def write_gif(frames: Sequence[List[int]], path: Path, delay: int = 70) -> None:
    global_palette_size = len(PALETTE)
    gct_exp = int(log2(global_palette_size)) - 1
    if 2 ** (gct_exp + 1) != global_palette_size:
        raise ValueError("Palette size must be a power of two")

    with path.open("wb") as fh:
        fh.write(b"GIF89a")
        fh.write(WIDTH.to_bytes(2, "little"))
        fh.write(HEIGHT.to_bytes(2, "little"))
        packed = 0x80 | (7 << 4) | gct_exp
        fh.write(bytes([packed, 0, 0]))
        for r, g, b in PALETTE:
            fh.write(bytes([r, g, b]))

        for frame in frames:
            fh.write(b"\x21\xF9\x04\x04")
            fh.write(delay.to_bytes(2, "little"))
            fh.write(b"\x00\x00")
            fh.write(b"\x2C")
            fh.write(b"\x00\x00\x00\x00")
            fh.write(WIDTH.to_bytes(2, "little"))
            fh.write(HEIGHT.to_bytes(2, "little"))
            fh.write(b"\x00")
            image_data = lzw_encode(frame, WIDTH, HEIGHT, min_code_size=3)
            fh.write(image_data)
        fh.write(b"\x3B")


def main() -> None:
    frames = make_frames()
    path = Path(__file__).resolve().parent.parent / "docs" / "references" / "dev-demo.gif"
    path.parent.mkdir(parents=True, exist_ok=True)
    write_gif(frames, path)
    print(f"Wrote {path.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
