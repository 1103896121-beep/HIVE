---
name: read-word-doc
description: Reads the text content of a Microsoft Word (.docx) file.
---

# Read Word Document

This skill allows you to extracting text from `.docx` files.

## Prerequisites

This skill requires Python and the `python-docx` library.

To install dependencies, run:

```bash
pip install -r scripts/requirements.txt
```

## Usage

To read a Word document, use the `run_command` tool to execute the python script:

```bash
python skills/read-word-doc/scripts/read_docx.py "path/to/your/document.docx"
```

The script will output the text content of the document to standard output.
