#!/bin/bash

set -e

# Check if supabase schemas has been added
schema_count=$(docker exec supabase-db psql -U postgres -c '\du' | grep supabase | wc -l)
if [ $schema_count -lt 3 ]; then exit 2; fi

# TODO  - can be improved by checking endpoints (if current one causes troubles)

exit 0
