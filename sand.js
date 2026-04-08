const canvas = document.getElementById('sand-canvas');
const ctx = canvas.getContext('2d');

const W = 480, H=320;
canvas.width = W;
canvas.height = H;

const COLORS = [
  { name: 'warm sand',   vals: ['#e8c98a','#d4a856','#c89040','#f0dba0','#b8843a'] },
  { name: 'terracotta',  vals: ['#c1603a','#e0845a','#a84830','#d4704a','#f09070'] },
  { name: 'midnight',    vals: ['#3a4a9a','#4a5aaa','#2a3a7a','#6a7aba','#1a2a6a'] },
  { name: 'sage',        vals: ['#7a9a6a','#9aba8a','#6a8a5a','#aacaa0','#5a7a4a'] },
  { name: 'blush',       vals: ['#e07a9a','#d0607a','#f09aaa','#c05060','#e8a0b8'] },
  { name: 'gold',        vals: ['#f0c040','#e0a820','#d09000','#f8d870','#c08010'] },
  { name: 'ash',         vals: ['#9a9a9a','#7a7a7a','#b8b8b8','#6a6a6a','#d0d0d0'] },
];

let currentColor = 0;
let brushSize = 16;
let flowSpeed = 3;
console.log("Script Running....")
let grid = new Uint8Array(W * H);
let colorGrid = new Uint32Array(W * H);
let imgData = ctx.createImageData(W, H);

function hexToRgba(hex) 
{
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (255 << 24) | (b << 16) | (g << 8) | r;
}

const colorRgbs = COLORS.map(c => c.vals.map(hexToRgba));
const BG_COLOR = (255 << 24) | (8 << 16) | (20 << 8) | 14;

function spawnSand( cx , cy , radius)
{
    for(let i = 0 ; i < 20 ; i++)
    {
        const angle = Math.random()* Math.PI * 2;
        const r = Math.random() * radius;
        const x = Math.round(cx + Math.cos(angle)*r);
        const y = Math.round(cy + Math.sin(angle)*r );
        if (x>=0 && x< W && y>=0 && y < H)
        {
            const idx = y * W + x;
            if (!grid[idx])
            {
                grid[idx]=1;
                const palette = colorRgbs[currentColor];
                colorGrid[idx] = palette[Math.floor(Math.random()* palette.length)];
            }
        }
    }
}

function step()
{
    for (let s = 0 ; s< flowSpeed; s++)
    {
        const leftFirst = Math.random() < 0.5;
        for ( let y = H -2 ; y>=0; y--)
        {
            for (let xi = 0; xi< W ; xi+=2)
            {
                const x = leftFirst ? xi : ( W - 1 - xi);
                const idx = y * W + x ;
                if(!grid[idx]) continue;


                const below = (y+1)*W +x;
                if (!grid[below])
                {
                    grid[below] = 1; colorGrid[below] = colorGrid[idx];
                    grid[idx] = 0; colorGrid[idx]=0;
                    continue;
                }
                const canL = x > 0 && !grid[(y+1) *W + x-1];
                const canR = x < W-1 && !grid[(y+1)*W +x+1];
                if (canL && canR)
                {
                    const nx = Math.random()<0.5 ? x-1 : x+1;
                    const ni = (y+1)*W + nx;
                    grid[ni]=1; colorGrid[ni]=colorGrid[idx];
                    grid[idx]=0; colorGrid[idx]=0;
                }
                else if (canL) {
                    const ni = (y+1)*W+x-1; grid[ni] = 1 ; colorGrid[ni]=colorGrid[idx];
                    grid[idx]=0; colorGrid[idx]=0;
                }
                else if (canR)
                {
                    const ni = (y+1)*W+x+1; grid[ni]=1; colorGrid[ni]=colorGrid[idx];
                    grid[idx]=0; colorGrid[idx]=0;
                }
            }
        }
    }
}

function render()
{
    const buf = new Uint32Array(imgData.data.buffer);
    for ( let i = 0; i < W * H; i++)
    {
        buf[i] = grid[i] ? colorGrid[i]: BG_COLOR;
    }
    ctx.putImageData(imgData , 0, 0);
}

let drawing = false, lastPos = null;

function getPos(e){
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const src = e.touches ? e.touches[0]:e;
    return { x: Math.round((src.clientX - rect.left) * sx), y: Math.round((src.clientY - rect.top) * sy)};
}
function onDown(e){
    drawing = true;
    lastPos = getPos(e);
    spawnSand(lastPos.x, lastPos.y , brushSize);
}

function onMove(e)
{
    if(!drawing) return;
    const pos = getPos(e);
    if ( lastPos)
    {
        const dx = pos.x - lastPos.x, dy = pos.y - lastPos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const steps = Math.max(1, Math.floor(dist/4));
        for( let i = 0; i<= steps; i++)
        {
            const t = i/ steps;
            spawnSand(Math.round(lastPos.x + dx*t), Math.round(lastPos.y + dy*t), brushSize);
        }
    }
    lastPos = pos;
}

function onUp()
{
    drawing = false;
    lastPos = null;
}
canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onUp);
canvas.addEventListener('mouseleave', onUp);
canvas.addEventListener('touchstart', e=> { e.preventDefault(); onDown(e);}, {passive:false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); onMove(e); }, {passive:false});
canvas.addEventListener('touchend', onUp);
document.getElementById('brush-size').addEventListener('input' , e=>{
    brushSize = +e.target.value;
    document.getElementById('brush-value').textContent = brushSize;
});
document.getElementById('flow-speed').addEventListener('input', e=>{
    flowSpeed = +e.target.value;
    document.getElementById('speed-val').textContent = flowSpeed;
});
document.getElementById('clear-btn').addEventListener('click', ()=>{
    grid.fill(0); colorGrid.fill(0);
});
document.getElementById('download-btn').addEventListener('click', ()=>{
    const link = document.createElement('a')
    link.download = 'sand-art.png';
    link.href = canvas.toDataURL();
    link.click();
});
const swatchContainer = document.getElementById('swatches');
COLORS.forEach((c,i)=>{
    const s = document.createElement('div');
    s.className = 'swatch' + ( i === 0 ? ' active' : '');
    s.style.background = `linear-gradient(135deg, ${c.vals[0]}, ${c.vals[1]})`;
    s.title = c.name;
    s.addEventListener('click' , ()=>{
        currentColor = i;
        document.querySelectorAll('.swatch').forEach((el,j) => el.classList.toggle('active', j=== i));
    });
    swatchContainer.appendChild(s);
});

function loop()
{
    step();
    render();
    requestAnimationFrame(loop);
}
loop();
