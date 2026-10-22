import importlib.util,tempfile,unittest,hashlib
from pathlib import Path
s=importlib.util.spec_from_file_location('cache',Path(__file__).parents[1]/'scripts/cache-permitted-source.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class CacheTests(unittest.TestCase):
 def test_preserve_and_fail_closed(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);source=p/'original';source.write_bytes(b'SYNTHETIC ORIGINAL\n'*100);original=source.read_bytes();args=dict(rights_basis='owner-permission',rights_evidence='Synthetic fixture created for this test',source_url='https://archive.org/details/synthetic',archive_item='synthetic',filename='fixture.txt',version='test-only-v1',max_bytes=10000)
   with self.assertRaises(ValueError):m.cache_source(source,p/'cache',**{**args,'rights_evidence':''})
   with self.assertRaises(ValueError):m.cache_source(source,p/'cache',**{**args,'max_bytes':1})
   a=m.cache_source(source,p/'cache',**args);b=m.cache_source(source,p/'cache',**args);self.assertEqual(a['sha256'],b['sha256']);self.assertEqual(source.read_bytes(),original);self.assertEqual((p/'cache'/a['object']).read_bytes(),original);self.assertEqual(len(list((p/'cache').glob('*.source'))),1)
   (p/'cache'/a['object']).write_bytes(b'corrupt');
   with self.assertRaises(ValueError):m.cache_source(source,p/'cache',**args)
 def test_git_cache_refused(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);(p/'.git').mkdir();f=p/'x';f.write_text('synthetic')
   with self.assertRaises(ValueError):m.cache_source(f,p/'cache',rights_basis='licensed',rights_evidence='fixture',source_url='https://archive.org/details/synthetic',archive_item='synthetic',filename='x',version='1',max_bytes=100)
 def test_symlinks_and_existing_corruption_are_held(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);source=p/'owned';source.write_bytes(b'OWNED SYNTHETIC SOURCE');args=dict(rights_basis='owner-permission',rights_evidence='Owned test fixture only',source_url='https://example.invalid/owned',archive_item='owned',filename='owned.txt',version='v1',max_bytes=1024)
   alias=p/'alias';alias.symlink_to(source)
   with self.assertRaises(ValueError):m.cache_source(alias,p/'cache',**args)
   root=p/'cache';root.mkdir();h=hashlib.sha256(source.read_bytes()).hexdigest();target=root/(h+'.source');target.symlink_to(source)
   with self.assertRaises(ValueError):m.cache_source(source,root,**args)
   self.assertTrue(target.is_symlink());self.assertEqual(source.read_bytes(),b'OWNED SYNTHETIC SOURCE');self.assertEqual(list(root.glob('receipt-*')),[])
 def test_permission_receipts_are_separate_private_and_additive(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);source=p/'owned';source.write_bytes(bytes(range(256))*10);args=dict(rights_basis='licensed',rights_evidence='Synthetic permission assertion, not legal verification',source_url='https://example.invalid/owned',archive_item='owned',filename='owned.bin',version='v1',max_bytes=4096)
   root=p/'cache';a=m.cache_source(source,root,**args);before={f.name:f.read_bytes() for f in root.iterdir()};m.cache_source(source,root,**args)
   for name,raw in before.items():self.assertEqual((root/name).read_bytes(),raw)
   self.assertEqual(len(list(root.glob('receipt-*'))),2);self.assertEqual(a['rightsStatus'],'operator assertion, not verified legal permission');self.assertEqual((root/a['object']).stat().st_mode&0o777,0o600)
 def test_git_worktree_marker_file_refuses_cache(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);(p/'.git').write_text('gitdir: elsewhere');source=p/'owned';source.write_bytes(b'OWNED')
   with self.assertRaises(ValueError):m.cache_source(source,p/'cache',rights_basis='licensed',rights_evidence='fixture only',source_url='https://example.invalid/source',archive_item='owned',filename='owned.txt',version='v1',max_bytes=100)
   self.assertFalse((p/'cache').exists())
if __name__=='__main__':unittest.main()
