#!/bin/bash


for f in $(ls test-events | grep .json); do
  node generate-run.js ./test-events/$f > ./test-runs/$f.out 2>&1
done
