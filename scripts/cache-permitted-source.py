"""Explicit local-only cache import. No downloader, uploader or rights verification."""
import argparse,hashlib,json,os,tempfile,uuid
from pathlib import Path
from urllib.parse import urlsplit

def cache_source(source,root,*,rights_basis,rights_evidence,source_url,archive_item,filename,version,max_bytes):
 if rights_basis not in {'public-domain','licensed','owner-permission'} or not rights_evidence.strip():raise ValueError('Record an explicit permission basis and evidence before caching')
 u=urlsplit(source_url)
 if u.scheme!='https' or not u.hostname or u.username or u.password or not all(str(x).strip() for x in [archive_item,filename,version]):raise ValueError('Exact public HTTPS source URL/item/file/version required')
 if not isinstance(max_bytes,int) or max_bytes<=0:raise ValueError('Positive explicit byte budget required')
 source=Path(source)
 if source.is_symlink() or not source.is_file():raise ValueError('Select a regular local original, not a symlink')
 root=Path(root).resolve()
 if any((p/'.git').exists() for p in [root,*root.parents]):raise ValueError('Source caches must stay outside Git repositories')
 root.mkdir(parents=True,exist_ok=True,mode=0o700)
 if source.resolve().is_relative_to(root):raise ValueError('Select the original outside this cache')
 before=source.stat()
 if before.st_size>max_bytes:raise ValueError('File exceeds explicit cache byte budget')
 fd,temp=tempfile.mkstemp(prefix='.copy-',dir=root);h=hashlib.sha256();total=0
 try:
  with source.open('rb') as src,os.fdopen(fd,'wb') as out:
   while True:
    block=src.read(1024*1024)
    if not block:break
    total+=len(block)
    if total>max_bytes:raise ValueError('Source grew beyond cache budget')
    h.update(block);out.write(block)
   out.flush();os.fsync(out.fileno())
  after=source.stat()
  if (before.st_size,before.st_mtime_ns,before.st_ino)!=(after.st_size,after.st_mtime_ns,after.st_ino):raise ValueError('Source changed during copying')
  digest=h.hexdigest();target=root/(digest+'.source')
  if target.is_symlink():raise ValueError('Cache object must not be a symlink')
  try:os.link(temp,target)
  except FileExistsError:
   if target.is_symlink() or not target.is_file() or target.stat().st_size!=total:raise ValueError('Existing cache object must be a regular file of the expected size')
   verify=hashlib.sha256();read=0
   with target.open('rb') as f:
    for block in iter(lambda:f.read(1024*1024),b''):
     read+=len(block)
     if read>total:raise ValueError('Existing cache object grew during readback')
     verify.update(block)
   if verify.hexdigest()!=digest:raise ValueError('Existing content-addressed cache object does not match its name; held')
  # Verify actual destination after filesystem write, not only the input stream.
  verify=hashlib.sha256()
  with target.open('rb') as f:
   for block in iter(lambda:f.read(1024*1024),b''):verify.update(block)
  if verify.hexdigest()!=digest:raise ValueError('Cache readback failed')
  record={'schema':'reckoner.permitted-local-cache.v1','sha256':digest,'bytes':total,'object':target.name,'sourceUrl':source_url,'archiveItem':archive_item,'filename':filename,'version':version,'rightsBasis':rights_basis,'rightsEvidence':rights_evidence,'rightsStatus':'operator assertion, not verified legal permission','scope':'Original bytes preserved; no OCR alteration, upload or Archive ingestion'}
  receipt=root/('receipt-'+str(uuid.uuid4())+'.json')
  with os.fdopen(os.open(receipt,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as f:json.dump(record,f,indent=2)
  return record
 finally:
  Path(temp).unlink(missing_ok=True) # only this invocation's generated partial copy
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__)
 for key in ['source','cache-root','rights-basis','rights-evidence','source-url','archive-item','filename','version']:p.add_argument('--'+key,required=True)
 p.add_argument('--max-bytes',type=int,required=True);a=vars(p.parse_args());source=a.pop('source');root=a.pop('cache_root');print(json.dumps(cache_source(source,root,**a),indent=2))
