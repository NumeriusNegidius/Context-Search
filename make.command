#!/bin/bash
cd -- "$(dirname "$0")"
zip -r contextsearch.zip * -x *.DS_Store -x *.command -x *.md -x tests.html
