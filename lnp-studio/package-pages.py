"""Package only the generated public-site directory, including Pages metadata."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

project_root = Path(__file__).resolve().parent.parent
public_root = project_root / 'github-pages'
destination = project_root / 'LNP-calculator-GitHub-Pages.zip'
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(public_root.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(public_root).as_posix())
print(f'Created {destination.name}; {len(ZipFile(destination).namelist())} public-site files.')
