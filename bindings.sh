#!/bin/bash

bindings=""

# Check if .env.local exists, otherwise use .env
env_file=".env.local"
if [ ! -f "$env_file" ]; then
  env_file=".env"
fi

if [ ! -f "$env_file" ]; then
  echo ""
  exit 0
fi

while IFS= read -r line || [ -n "$line" ]; do
  if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
    name=$(echo "$line" | cut -d '=' -f 1)
    value=$(echo "$line" | cut -d '=' -f 2-)
    value=$(echo $value | sed 's/^"\(.*\)"$/\1/')
    bindings+="--binding ${name}=${value} "
  fi
done < "$env_file"

bindings=$(echo $bindings | sed 's/[[:space:]]*$//')

echo $bindings
