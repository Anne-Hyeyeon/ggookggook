from __future__ import annotations

import struct
import zlib
from collections import deque
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def paeth_predictor(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png(path: Path) -> tuple[int, int, list[list[list[int]]]]:
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError(f"{path} is not a PNG")

    offset = len(PNG_SIGNATURE)
    width = height = bit_depth = color_type = interlace = None
    idat_parts: list[bytes] = []

    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        chunk_data = data[offset + 8:offset + 8 + length]
        offset += 12 + length

        if chunk_type == b"IHDR":
          width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk_data)
        elif chunk_type == b"IDAT":
          idat_parts.append(chunk_data)
        elif chunk_type == b"IEND":
          break

    if width is None or height is None or bit_depth != 8 or interlace != 0:
        raise ValueError("Unsupported PNG format")
    if color_type not in {2, 6}:
        raise ValueError(f"Unsupported color type: {color_type}")

    bytes_per_pixel = 3 if color_type == 2 else 4
    stride = width * bytes_per_pixel
    raw = zlib.decompress(b"".join(idat_parts))
    rows: list[bytes] = []
    pos = 0
    prev = bytes(stride)

    for _ in range(height):
        filter_type = raw[pos]
        pos += 1
        scanline = bytearray(raw[pos:pos + stride])
        pos += stride

        if filter_type == 1:
            for i in range(stride):
                left = scanline[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                scanline[i] = (scanline[i] + left) & 255
        elif filter_type == 2:
            for i in range(stride):
                scanline[i] = (scanline[i] + prev[i]) & 255
        elif filter_type == 3:
            for i in range(stride):
                left = scanline[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                up = prev[i]
                scanline[i] = (scanline[i] + ((left + up) // 2)) & 255
        elif filter_type == 4:
            for i in range(stride):
                left = scanline[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                up = prev[i]
                up_left = prev[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                scanline[i] = (scanline[i] + paeth_predictor(left, up, up_left)) & 255
        elif filter_type != 0:
            raise ValueError(f"Unsupported filter: {filter_type}")

        rows.append(bytes(scanline))
        prev = bytes(scanline)

    pixels: list[list[list[int]]] = []
    for row in rows:
        pixel_row: list[list[int]] = []
        for i in range(0, len(row), bytes_per_pixel):
            chunk = list(row[i:i + bytes_per_pixel])
            if bytes_per_pixel == 3:
                chunk.append(255)
            pixel_row.append(chunk)
        pixels.append(pixel_row)

    return width, height, pixels


def write_png(path: Path, width: int, height: int, pixels: list[list[list[int]]]) -> None:
    def chunk(chunk_type: bytes, chunk_data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
        return struct.pack(">I", len(chunk_data)) + chunk_type + chunk_data + struct.pack(">I", crc)

    raw_rows = []
    for row in pixels:
        raw_rows.append(b"\x00" + bytes(channel for pixel in row for channel in pixel))
    compressed = zlib.compress(b"".join(raw_rows), level=9)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    output = PNG_SIGNATURE + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    path.write_bytes(output)


def color_close(pixel: list[int], sample: tuple[int, int, int], threshold: int) -> bool:
    return (
        abs(pixel[0] - sample[0]) <= threshold
        and abs(pixel[1] - sample[1]) <= threshold
        and abs(pixel[2] - sample[2]) <= threshold
    )


def remove_edge_background(pixels: list[list[list[int]]], threshold: int) -> None:
    height = len(pixels)
    width = len(pixels[0])
    samples = {
        tuple(pixels[0][0][:3]),
        tuple(pixels[0][width - 1][:3]),
        tuple(pixels[height - 1][0][:3]),
        tuple(pixels[height - 1][width - 1][:3]),
    }

    visited = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or visited[y][x]:
            continue
        visited[y][x] = True
        pixel = pixels[y][x]
        if any(color_close(pixel, sample, threshold) for sample in samples):
            pixel[3] = 0
            queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))


def crop_bbox(pixels: list[list[list[int]]], margin: int) -> list[list[list[int]]]:
    height = len(pixels)
    width = len(pixels[0])
    xs: list[int] = []
    ys: list[int] = []

    for y in range(height):
        for x in range(width):
            if pixels[y][x][3] > 0:
                xs.append(x)
                ys.append(y)

    if not xs:
        raise ValueError("No opaque pixels found after background removal")

    x1 = max(0, min(xs) - margin)
    x2 = min(width - 1, max(xs) + margin)
    y1 = max(0, min(ys) - margin)
    y2 = min(height - 1, max(ys) + margin)

    return [[pixel[:] for pixel in row[x1:x2 + 1]] for row in pixels[y1:y2 + 1]]


def resize_nearest(pixels: list[list[list[int]]], target_width: int, target_height: int) -> list[list[list[int]]]:
    src_height = len(pixels)
    src_width = len(pixels[0])
    resized: list[list[list[int]]] = []

    for y in range(target_height):
        src_y = min(src_height - 1, int(y * src_height / target_height))
        row: list[list[int]] = []
        for x in range(target_width):
            src_x = min(src_width - 1, int(x * src_width / target_width))
            row.append(pixels[src_y][src_x][:])
        resized.append(row)

    return resized


def pack_to_canvas(
    pixels: list[list[list[int]]],
    canvas_width: int,
    canvas_height: int,
    target_x: int,
    target_y: int,
    target_width: int,
    target_height: int,
) -> list[list[list[int]]]:
    canvas = [[[0, 0, 0, 0] for _ in range(canvas_width)] for _ in range(canvas_height)]
    resized = resize_nearest(pixels, target_width, target_height)

    for y, row in enumerate(resized):
        for x, pixel in enumerate(row):
            canvas[target_y + y][target_x + x] = pixel

    return canvas


def process_image(source: Path, destination: Path, threshold: int) -> None:
    _, _, pixels = read_png(source)
    remove_edge_background(pixels, threshold=threshold)
    cropped = crop_bbox(pixels, margin=8)
    packed = pack_to_canvas(
        cropped,
        canvas_width=1000,
        canvas_height=2500,
        target_x=200,
        target_y=20,
        target_width=600,
        target_height=2035,
    )
    write_png(destination, 1000, 2500, packed)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    process_image(
        root / "public/body/body-front-chart.png",
        root / "public/body/body-front-chart-transparent.png",
        threshold=12,
    )
    process_image(
        root / "public/body/body-back-chart.png",
        root / "public/body/body-back-chart-transparent.png",
        threshold=28,
    )


if __name__ == "__main__":
    main()
