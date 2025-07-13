#!/usr/bin/env python3
import os
import re

def resolve_conflicts(file_path):
    """Resolve git conflicts by taking jules-testing-merges version"""
    print(f"Resolving conflicts in {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Use regex to remove conflict markers and take jules-testing-merges version
    # Pattern: <<<<<<< HEAD ... ======= ... >>>>>>> jules-testing-merges
    conflict_pattern = r'<<<<<<< HEAD.*?=======(.*?)>>>>>>> jules-testing-merges'
    
    # Replace with just the jules-testing-merges content
    resolved_content = re.sub(conflict_pattern, r'\1', content, flags=re.DOTALL)
    
    with open(file_path, 'w') as f:
        f.write(resolved_content)

# Find all files with conflicts
conflict_files = []
for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith(('.tsx', '.ts')) and ('client' in root or 'server' in root):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                    if '<<<<<<< HEAD' in content:
                        conflict_files.append(file_path)
            except:
                pass

print(f"Found {len(conflict_files)} files with conflicts")
for file_path in conflict_files:
    resolve_conflicts(file_path)

print("All conflicts resolved!")
