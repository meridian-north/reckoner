import fs from 'node:fs/promises';
// Mirror regular dist files and its explicit, one-level public resources directory.
const entries=await fs.readdir('dist',{withFileTypes:true}),files=[];
for(const entry of entries){if(entry.isFile())files.push(entry.name);else if(entry.isDirectory()&&entry.name==='resources'){for(const file of await fs.readdir('dist/resources',{withFileTypes:true})){if(!file.isFile())throw Error('Resources must contain regular files only.');files.push('resources/'+file.name);}}else throw Error('Unexpected dist entry: '+entry.name);}
if(process.argv.includes('--check')){const differ=[];for(const file of files){const [a,b]=await Promise.all([fs.readFile('dist/'+file),fs.readFile('docs/'+file).catch(()=>null)]);if(!b||!a.equals(b))differ.push(file);}if(differ.length){console.error('docs/ differs from dist/: '+differ.join(', '));process.exitCode=1;}else console.log('docs/ mirrors dist/ ('+files.length+' files).');}
else{await fs.mkdir('docs/resources',{recursive:true});for(const file of files)await fs.copyFile('dist/'+file,'docs/'+file);await fs.writeFile('docs/.nojekyll','');}
