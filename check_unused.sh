#!/bin/bash
FILE="meowsenger/components/NewChatModal.tsx"
grep "import" $FILE | while read line; do
  if [[ $line == *"{"* ]]; then
    ids=$(echo "$line" | sed -E 's/.*\{([^}]+)\}.*/\1/' | tr ',' '\n' | sed -E 's/^\s*type\s+//' | sed -E 's/\s*as\s+\w+//' | sed -E 's/^\s+//;s/\s+$//')
    for id in $ids; do
      if [ -z "$id" ]; then continue; fi
      count=$(grep -w "$id" $FILE | grep -v "^import" | wc -l)
      if [ "$count" -eq 0 ]; then
        echo "UNUSED (bracket): $id"
      fi
    done
  else
    id=$(echo "$line" | sed -E 's/import\s+(\w+).*/\1/' | sed -E 's/^\s+//;s/\s+$//')
    if [ ! -z "$id" ] && [[ $id != "import" ]]; then
      count=$(grep -w "$id" $FILE | grep -v "^import" | wc -l)
      if [ "$count" -eq 0 ]; then
        echo "UNUSED (simple): $id"
      fi
    fi
  fi
done
