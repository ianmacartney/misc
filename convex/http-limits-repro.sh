#!/usr/bin/env bash
# Repro for convex/http.ts limit testing. Pass your deployment's .convex.site
# URL as the first arg, e.g.:
#   ./http-limits-repro.sh https://knowing-ibis-996.convex.site
set -uo pipefail

url=$1
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT

head -c 31457280 /dev/urandom > "$dir/30mb.bin"
head -c 10485760 /dev/urandom > "$dir/10mb.bin"
head -c 26214400 /dev/urandom > "$dir/25mb.bin"

echo "30MB raw upload -> storage (req.blob):"
curl -s -X POST --data-binary @"$dir/30mb.bin" "$url/upload"
echo

echo "30MB chunked transfer-encoding, no Content-Length (req.blob):"
cat "$dir/30mb.bin" | curl -s --http1.1 -X POST -H "Transfer-Encoding: chunked" --data-binary @- "$url/upload"
echo

echo "10MB echoed back in the response (should succeed, under 20MiB):"
curl -s -X POST --data-binary @"$dir/10mb.bin" "$url/echo" -o /dev/null -w "HTTP %{http_code}\n"

echo "25MB echoed back in the response (should fail, over 20MiB):"
curl -s -X POST --data-binary @"$dir/25mb.bin" "$url/echo" -o /dev/null -w "HTTP %{http_code}\n"

echo "10MB multipart/form-data (req.formData, should succeed):"
curl -s -X POST -F "file=@$dir/10mb.bin" "$url/upload-form"
echo

echo "30MB multipart/form-data (req.formData, should fail at 20MiB):"
curl -s -X POST -F "file=@$dir/30mb.bin" "$url/upload-form"
echo
