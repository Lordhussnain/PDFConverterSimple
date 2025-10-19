#!/usr/bin/env python3
import sys
import os
from pdf2docx import Converter

if len(sys.argv) != 3:
    print("Usage: python convert_pdf_to_docx.py <input_pdf> <output_docx>", file=sys.stderr)
    sys.exit(1)

input_pdf = sys.argv[1]
output_docx = sys.argv[2]

if not os.path.exists(input_pdf):
    print(f"Error: Input file {input_pdf} not found", file=sys.stderr)
    sys.exit(1)

try:
    cv = Converter(input_pdf)
    cv.convert(output_docx, start=0, end=None)
    cv.close()
    # 🔥 FIX: Print SUCCESS to STDERR (Node checks here!)
    print(f"Conversion successful: {output_docx}", file=sys.stderr)
    sys.exit(0)
except Exception as e:
    print(f"Error during conversion: {str(e)}", file=sys.stderr)
    sys.exit(1)
