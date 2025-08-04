#!/bin/bash
echo "=== Checking Radarr Queue Structure ==="
curl -s http://localhost:5000/api/radarr/6/test-endpoints | python3 -c "
import json, sys
data = json.load(sys.stdin)
queue = data.get('results', {}).get('queue', {})
if queue.get('success'):
    sample = queue.get('sample', {})
    if 'records' in sample and len(sample['records']) > 0:
        record = sample['records'][0]
        print('Queue record keys:', list(record.keys()))
        print('Title field:', record.get('title', 'NOT FOUND'))
        print('Movie field:', 'movie' in record)
        if 'movie' in record:
            print('Movie keys:', list(record['movie'].keys()) if record['movie'] else 'None')
"
