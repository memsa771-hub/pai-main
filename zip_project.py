import os
import zipfile

def main():
    exclude_dirs = {
        '.git', '.venv', 'node_modules', '.next', 'pgsql', '__pycache__', '.vscode', '.idea'
    }
    exclude_files = {
        'postgresql-binaries.zip', 'placement_ai.db', 'placement-ai.zip', 'zip_project.py'
    }
    
    zip_filename = 'placement-ai.zip'
    print(f"Creating {zip_filename}...")
    
    count = 0
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Prune directories in-place to avoid walking into excluded folders
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files or file.endswith(('.pyc', '.pyo', '.db', '.sqlite')):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, '.')
                zipf.write(file_path, arcname)
                count += 1
                
    print(f"Successfully zipped {count} files into {zip_filename}!")

if __name__ == '__main__':
    main()
