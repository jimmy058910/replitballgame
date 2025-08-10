#!/bin/bash

echo "Applying comprehensive parameter type fixes to all remaining files..."

# Fix all files with comprehensive sed patterns
find server -name "*.ts" -type f -exec sed -i '
  s/\.reduce((acc, transaction)/\.reduce((acc: any, transaction: any)/g
  s/\.reduce((sum, p)/\.reduce((sum: any, p: any)/g
  s/\.reduce((sum, player)/\.reduce((sum: any, player: any)/g
  s/\.reduce((sum, contract)/\.reduce((sum: any, contract: any)/g
  s/\.filter((p) =>/\.filter((p: any) =>/g
  s/\.filter((ps) =>/\.filter((ps: any) =>/g
  s/\.filter((t) =>/\.filter((t: any) =>/g
  s/\.filter((c) =>/\.filter((c: any) =>/g
  s/\.filter((m) =>/\.filter((m: any) =>/g
  s/\.filter((entry) =>/\.filter((entry: any) =>/g
  s/\.filter((listing) =>/\.filter((listing: any) =>/g
  s/\.filter((bid) =>/\.filter((bid: any) =>/g
  s/\.map((transaction) =>/\.map((transaction: any) =>/g
  s/\.map((tx) =>/\.map((tx: any) =>/g
  s/\.map((skill) =>/\.map((skill: any) =>/g
  s/\.forEach((player) =>/\.forEach((player: any) =>/g
  s/\.forEach((listing) =>/\.forEach((listing: any) =>/g
  s/\.sort((a, b)/\.sort((a: any, b: any)/g
' {} \;

echo "All parameter type fixes applied!"
