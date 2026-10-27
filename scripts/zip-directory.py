from pathlib import Path
import sys,zipfile
source,target=map(Path,sys.argv[1:3]);target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=False) as archive:
 for p in sorted(source.rglob('*')):
  if any(part.startswith('.') for part in p.relative_to(source).parts):continue
 if p.is_symlink():raise RuntimeError('No symlinks in game packages')
  if not p.is_file():continue
  info=zipfile.ZipInfo(p.relative_to(source).as_posix(),(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  with p.open('rb') as data,archive.open(info,'w') as out:
   while chunk:=data.read(1024*1024):out.write(chunk)
