import re
import sys

def find_unused(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all imports
    # This is a very simple regex and won't handle all cases
    import_regex = re.compile(r'import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+[\'"]([^\'"]+)[\'"]')
    imports = import_regex.findall(content)

    all_imported_ids = []
    for named_imports, default_import, source in imports:
        if named_imports:
            ids = [id.strip().split(' as ')[-1].replace('type ', '').strip() for id in named_imports.split(',')]
            all_imported_ids.extend(ids)
        if default_import:
            all_imported_ids.append(default_import.strip())

    # Also handle multiline imports
    multiline_import_regex = re.compile(r'import\s+\{([^}]+)\}\s+from\s+[\'"]([^\'"]+)[\'"]', re.DOTALL)
    multiline_imports = multiline_import_regex.findall(content)
    for named_imports, source in multiline_imports:
        ids = [id.strip().split(' as ')[-1].replace('type ', '').strip() for id in named_imports.split(',')]
        all_imported_ids.extend(ids)

    all_imported_ids = list(set(all_imported_ids))
    if '' in all_imported_ids: all_imported_ids.remove('')

    # For each ID, check if it's used elsewhere in the file
    unused = []
    for id in all_imported_ids:
        # We need to be careful with word boundaries
        # And we must exclude the import lines themselves
        lines = content.split('\n')
        count = 0
        for line in lines:
            if 'import' in line and id in line:
                continue
            if re.search(r'\b' + re.escape(id) + r'\b', line):
                count += 1
        if count == 0:
            unused.append(id)

    return unused

if __name__ == "__main__":
    unused = find_unused(sys.argv[1])
    print(f"Unused identifiers: {unused}")
