#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in environment variables"
    echo "Please create a .env file with DATABASE_URL variable"
    exit 1
fi

sea-orm-cli generate entity \
    -u "$DATABASE_URL" \
    -o src/entities