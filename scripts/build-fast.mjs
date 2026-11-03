import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=fs.existsSync(path.join(root,'dist'))?path.join(root,'dist'):root;
const data=await import(pathToFileURL(path.join(dist,'data.js')).href);
const read=name=>fs.readFileSync(path.join(dist,name),'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex').slice(0,10);
const works=JSON.parse(read('assets/works.json'));
const css=read('styles.css');
const cssName=`site.${hash(css)}.css`;
fs.writeFileSync(path.join(dist,cssName),css);
let app=read('app.js').replace(/^import .*;\n/gm,'');
if(!/^const works = await fetch.*$/m.test(app))throw Error('Catalogue declaration not found');
app=app.replace(/^const works = await fetch.*$/m,`const works = ${JSON.stringify(works)};`);
const experience=read('experience.js').replace(/^export /gm,'').replace(/\.\/styles\.css\?v=[^']+/g,`./${cssName}`);
const bundle=read('data.js').replace(/^export /gm,'')+'\n'+experience+'\n'+app;
const jsName=`site.${hash(bundle)}.js`;
fs.writeFileSync(path.join(dist,jsName),bundle);

// Render the same home/header functions used by the browser, without network requests.
const definitions=app.slice(0,app.indexOf("\ndocument.addEventListener('click'"));
const themeSource=read('experience.js');
const themeHelpers=themeSource.slice(themeSource.indexOf('const themeLabel'),themeSource.indexOf('\nfunction applyTheme')).replace(/^export /gm,'');
const header={innerHTML:''};
const context=vm.createContext({...data,URLSearchParams,root:{dataset:{theme:'light'}},document:{querySelector:s=>s==='#header'?header:{},documentElement:{}},__header:header});
vm.runInContext(themeHelpers+'\n'+definitions+'\nheader();globalThis.__rendered={header:__header.innerHTML,main:home()};',context);

let html=read('index.html');
html=html.replace(/  <link rel="preload"[^\n]+\n/g,'');
html=html.replace('  <script>','  <link rel="preload" href="assets/fonts/anton.woff2" as="font" type="font/woff2" crossorigin>\n  <script>');
const boot=`
    const initialRoute = location.hash;
    const initialHome = !initialRoute || /^#\\/ru\\/home(?:\\?|$)/.test(initialRoute);
    document.documentElement.dataset.initialView = initialHome ? 'home' : 'route';
    document.documentElement.lang = initialRoute.startsWith('#/en/') ? 'en' : 'ru';
    const bodyFont = document.createElement('link');
    bodyFont.rel = 'preload'; bodyFont.as = 'font'; bodyFont.type = 'font/woff2'; bodyFont.crossOrigin = 'anonymous';
    bodyFont.href = 'assets/fonts/' + (document.documentElement.lang === 'en' ? 'space-grotesk' : 'manrope') + '.woff2';
    document.head.append(bodyFont);`;
if(!html.includes('const initialRoute'))html=html.replace('  </script>',boot+'\n  </script>');
html=html.replace(/<link rel="stylesheet"[^>]+>|<style data-experience-style>[\s\S]*?<\/style>/,`<style data-experience-style>${css}</style>`);
html=html.replace(/<header id="header"[^>]*>[\s\S]*?<\/header>/,`<header id="header" class="header" data-prerender="ru-home">${context.__rendered.header}</header>`);
html=html.replace(/<main id="main"[^>]*>[\s\S]*?<\/main>/,`<main id="main" tabindex="-1" data-prerender="ru-home">${context.__rendered.main}</main>`);
if(!html.includes('id="site-loading"'))html=html.replace('  <dialog id="menu"','  <div id="site-loading" role="status" aria-label="UNFOLD">UNFOLD</div>\n  <dialog id="menu"');
html=html.replace(/<script type="module" src="[^"]+"><\/script>/,`<script type="module" src="${jsName}"></script>`);
fs.writeFileSync(path.join(dist,'index.html'),html);
const report={jsName,cssName,bundleBytes:Buffer.byteLength(bundle),bundleGzipBytes:zlib.gzipSync(bundle).length,htmlBytes:Buffer.byteLength(html),htmlGzipBytes:zlib.gzipSync(html).length,blockingCatalogueRequests:0,initialHomePrerendered:true};
fs.writeFileSync(path.join(root,'fast-build.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
