/* Nina's First Adventure — Prototype Engine v1
   Phone-first, landscape, 640x360 internal canvas.
   Verb menu: LOOK / USE / TALK
   Inventory, Notebook, Objective, Ask Cas hint, Autosave+Manual save.
*/
'use strict';

const $ = (sel) => document.querySelector(sel);

const settingsDefault = {
  fontSize: 'M',          // S/M/L
  dyslexiaFont: false,
  highContrast: false,
  slowMode: true,
  ttsNarration: true,
  captionsAlwaysOn: true,
};

const verbs = ['look','use','talk'];

const Items = {
  // prototype icons are reusing UI icons for now; easy to replace with real pixel icons later
  GUEST_BOOK: { id:'GUEST_BOOK', name:'Guest Sign-in Book', icon:'assets/ico_notebook.png' },
  LIBRARY_KEY: { id:'LIBRARY_KEY', name:'Library Key', icon:'assets/ico_use.png' },
  INK_BOTTLE: { id:'INK_BOTTLE', name:'Ink Bottle', icon:'assets/ico_use.png' },
  MYSTERY_MANUAL: { id:'MYSTERY_MANUAL', name:'Mystery Manual', icon:'assets/ico_notebook.png' },
  INKED_PAGE: { id:'INKED_PAGE', name:'Inked Page', icon:'assets/ico_notebook.png' },
  SILVER_SPOON: { id:'SILVER_SPOON', name:'Silver Spoon', icon:'assets/ico_use.png' },
  CURATOR_NOTE_1: { id:'CURATOR_NOTE_1', name:'Note Fragment', icon:'assets/ico_notebook.png' },
  DUCT_TAPE: { id:'DUCT_TAPE', name:'Duct Tape', icon:'assets/ico_use.png' },
  BROKEN_KEY_PIECE: { id:'BROKEN_KEY_PIECE', name:'Broken Key Piece', icon:'assets/ico_use.png' },
  ATTIC_KEY: { id:'ATTIC_KEY', name:'Attic Key', icon:'assets/ico_use.png' },
  CANDLESTICK: { id:'CANDLESTICK', name:'Candlestick (Col. Mustard)', icon:'assets/ico_use.png' },
  PUDDING: { id:'PUDDING', name:'Pudding Cup', icon:'assets/ico_use.png' },
  WAX_TOKEN: { id:'WAX_TOKEN', name:'Wax Token', icon:'assets/ico_notebook.png' },
};

function speak(text) {
  try{
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  }catch(_){}
}

function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=>t.classList.remove('show'), 1600);
}

function setRootFontSize(size){
  const map = { S:'14px', M:'16px', L:'18px' };
  document.documentElement.style.setProperty('--fontSize', map[size] || map.M);
}

function applySettings(s){
  setRootFontSize(s.fontSize || 'M');
  if(s.dyslexiaFont){
    document.body.style.fontFamily = '"Comic Sans MS", system-ui, sans-serif'; // placeholder; swap for OpenDyslexic if you add the font file
  }else{
    document.body.style.fontFamily = '';
  }
  if(s.highContrast){
    document.documentElement.style.setProperty('--bg','#000');
    document.documentElement.style.setProperty('--panel','#000');
    document.documentElement.style.setProperty('--panel2','#000');
    document.documentElement.style.setProperty('--text','#fff');
    document.documentElement.style.setProperty('--muted','#ddd');
    document.documentElement.style.setProperty('--accent','#fff');
  }else{
    // reload to defaults by removing inline overrides (quick & safe in prototype)
    // In v2 we can store base palette and toggle properly.
    // We keep font size unaffected.
  }
}

function nowISO(){ return new Date().toISOString(); }

const GameData = {
  title: "Nina's First Adventure",
  startScene: 'lobby',
  scenes: {
    lobby: {
      id:'lobby',
      name:'Museum Lobby',
      bg:'assets/bg_lobby.png',
      objective:"Enter the Haunted Mansion exhibit to begin your first case.",
      hotspots:[
        { id:'door_mansion', name:'Haunted Mansion Wing', rect:[120,120,200,230],
          actions:{
            look: () => say('Nina', "A door labelled: “Haunted Mansion Exhibit”. It’s definitely normal. Probably."),
            use: () => {
              say('Cas', "I don’t like that door. It looks… narratively important.");
              setScene('foyer');
            },
            talk: () => say('Nina', "“Hello?” (The door says nothing. Rude.)"),
          }
        },
        { id:'clue_board', name:'Clue Board', rect:[520,90,620,170],
          actions:{
            look: () => say('Nina', "A clue board. Empty. Waiting. Judging."),
            use: () => say('Cas', "We should fill it with clues! Preferably clues that do not scream."),
            talk: () => say('Nina', "“We’ll come back to you.”"),
          }
        },
      ],
    },

    foyer: {
      id:'foyer',
      name:'Foyer',
      bg:'assets/bg_foyer.png',
      objective:"Find a way to open the Library door. Try LOOKing around.",
      hotspots:[
        { id:'library_door', name:'Library Door', rect:[40,120,110,230],
          actions:{
            look: () => say('Nina', hasFlag('foyer_library_unlocked') ? "The Library door is open." : "A locked door. The label says: LIBRARY."),
            use: () => {
              if(hasFlag('foyer_library_unlocked')) setScene('library');
              else if(hasItem('LIBRARY_KEY')){
                setFlag('foyer_library_unlocked', true);
                say('Nina', "You unlock the Library door.");
                autosave();
              } else {
                say('Cas', "Locked. Like a secret. Like a secret that hates us.");
              }
            },
            talk: () => say('Nina', "“Open up.” (It remains a door.)"),
          }
        },

        { id:'guest_book', name:'Guest Sign-in Book', rect:[410,250,470,300],
          actions:{
            look: () => say('Nina', "A guest sign-in book. Thick. Overbuilt. Like it’s bracing for impact."),
            use: () => say('Cas', "Books are peaceful. Unless you use them as a weapon. Then they’re… educational."),
            talk: () => say('Nina', "“Any ghosts sign in?”"),
          },
          onClickTakeItem:'GUEST_BOOK',
          takeText: "You take the sign-in book. It’s heavy enough to have its own gravitational pull.",
          condition: () => !hasItem('GUEST_BOOK') && !hasFlag('guest_book_taken')
        },

        { id:'candlestick', name:'Candlestick', rect:[500,252,540,300],
          actions:{
            look: () => {
              if(!hasFlag('candlestick_looked')){
                setFlag('candlestick_looked', true);
                say('Nina', "A fancy candlestick. Suspiciously portable.");
              }else{
                say('Nina', "Sticker on the base: PROPERTY OF COL. MUSTARD.");
              }
            },
            use: () => say('Cas', "It’s not doing anything. Yet."),
            talk: () => say('Nina', "“Hello, clue.”"),
          },
          onClickTakeItem:'CANDLESTICK',
          takeText: "You take the candlestick.\nNina: “Oh look… a CLUE.”\nCas: “Doesn’t look like it’s bludgeoned anyone, does it.”",
          condition: () => !hasItem('CANDLESTICK') && !hasFlag('candlestick_taken')
        },

        { id:'portrait', name:'Portrait Wall', rect:[140,90,210,150],
          actions:{
            look: () => {
              const n = (getFlag('portrait_looks')||0)+1;
              setFlag('portrait_looks', n);
              if(n === 1) say('Nina', "A family of stern rich people. None of them look like they’d share snacks.");
              else if(n === 2) say('Nina', "One portrait is tilted… like it’s hiding something.");
              else say('Nina', "The tilted portrait looks… extremely pullable.");
            },
            use: () => {
              if(!hasFlag('portrait_looks') || getFlag('portrait_looks')<2){
                say('Cas', "Maybe LOOK first? I’ve learned that mysteries love staring.");
                return;
              }
              if(!hasItem('GUEST_BOOK')){
                say('Nina', "There’s a latch behind the portrait… but I need something heavy.");
                return;
              }
              if(!hasItem('LIBRARY_KEY')){
                say('Nina', "You whack the latch with the guest book.\nBANG! Something pops.\nA key clatters to the floor.");
                addItem('LIBRARY_KEY');
                addClue("A hidden latch behind the portrait released a key.");
                autosave();
              }else{
                say('Nina', "The portrait has already surrendered its secrets.");
              }
            },
            talk: () => say('Cas', "Hello, stern paintings. Please stop watching us."),
          }
        },

        { id:'plaque', name:'Welcome Plaque', rect:[260,140,350,180],
          actions:{
            look: () => say('Nina', "WELCOME TO THE HAUNTED MANSION EXHIBIT.\nPLEASE DO NOT FEED THE GHOSTS."),
            use: () => say('Cas', "Too late. I’ve already fed my fear."),
            talk: () => say('Nina', "“Hello?”"),
          }
        },
      ],
    },

    library: {
      id:'library',
      name:'Library',
      bg:'assets/bg_library.png',
      objective:"Find how to reveal the secret lever. Combine items if you can.",
      hotspots:[
        { id:'to_foyer', name:'Back to Foyer', rect:[0,250,100,360],
          actions:{
            look: () => say('Nina', "Back to the foyer."),
            use: () => setScene('foyer'),
            talk: () => say('Cas', "I like the foyer better. It has fewer books judging me."),
          }
        },
        { id:'desk', name:'Desk', rect:[220,235,420,300],
          actions:{
            look: () => say('Nina', "A desk. A battlefield where letters go to be ignored."),
            use: () => say('Cas', "Drawers. The natural habitat of keys and disappointment."),
            talk: () => say('Nina', "“Any notes?”"),
          },
          onClickTakeItem:'INK_BOTTLE',
          takeText:"You take the ink bottle. It sloshes with menace.",
          condition: () => !hasItem('INK_BOTTLE') && !hasFlag('ink_taken')
        },
        { id:'bookstand', name:'Book Stand', rect:[460,110,540,210],
          actions:{
            look: () => say('Nina', "A book titled “How To Be A Respectable Haunted Mansion”. Page one: “Don’t.”"),
            use: () => say('Cas', "I would read it. But I fear it would read me back."),
            talk: () => say('Nina', "“Nice book.”"),
          },
          onClickTakeItem:'MYSTERY_MANUAL',
          takeText:"You take the Mystery Manual. It feels oddly smug.",
          condition: () => !hasItem('MYSTERY_MANUAL') && !hasFlag('manual_taken')
        },
        { id:'bookshelf', name:'Bookshelf', rect:[80,70,560,220],
          actions:{
            look: () => {
              if(hasItem('INKED_PAGE')){
                say('Nina', "Certain symbols on the spines match your marked page.");
              }else{
                say('Nina', "Endless books. Somewhere in there: a secret. And probably dust mites.");
              }
            },
            use: () => {
              if(!hasItem('INKED_PAGE')){
                say('Nina', "I need something that matches those odd symbols…");
                return;
              }
              if(!hasFlag('lever_revealed')){
                setFlag('lever_revealed', true);
                addClue("Used the inked page to find a hidden lever behind the bookshelf.");
                say('Nina', "You press the inked page to the shelf.\nCLICK.\nA hidden lever slides out.");
                autosave();
              }else{
                say('Nina', "The hidden lever is already revealed.");
              }
            },
            talk: () => say('Cas', "Books are just ghosts made of paper."),
          }
        },
        { id:'lever', name:'Hidden Lever', rect:[560,150,620,210],
          condition: () => hasFlag('lever_revealed'),
          actions:{
            look: () => say('Nina', "A lever. It looks extremely pullable."),
            use: () => {
              if(!hasFlag('dining_unlocked')){
                setFlag('dining_unlocked', true);
                say('Nina', "You pull the lever.\nSCREEECH.\nA passage opens back toward the dining hall.");
                addClue("A secret lever opened access toward the dining hall.");
                autosave();
              }else{
                say('Nina', "The passage is already open.");
              }
            },
            talk: () => say('Cas', "Pull it. Pull it. Pull it."),
          }
        },
      ],
    },

    dining: {
      id:'dining',
      name:'Dining Hall',
      bg:'assets/bg_dining.png',
      objective:"Investigate the dining hall. Try LOOK on suspicious props.",
      hotspots:[
        { id:'back', name:'Back to Foyer', rect:[0,250,100,360],
          actions:{ look:()=>say('Nina',"Back to the foyer."), use:()=>setScene('foyer'), talk:()=>say('Cas',"Retreat is wise. Sometimes.") }
        },
        { id:'silverware', name:'Silverware', rect:[140,200,200,250],
          condition: () => !hasItem('SILVER_SPOON'),
          actions:{
            look: ()=>say('Nina',"Enough cutlery to feed a vampire politely."),
            use: ()=>say('Cas',"Take the shiny. Humans like shiny."),
            talk: ()=>say('Nina',"“Which one of you is the spoon?”"),
          },
          onClickTakeItem:'SILVER_SPOON',
          takeText:"You take the silver spoon.",
        },
        { id:'platter', name:'Covered Platter', rect:[250,200,370,250],
          actions:{
            look: ()=>say('Nina',"A covered platter. It has ‘trap’ energy."),
            use: ()=>{
              if(!hasItem('SILVER_SPOON')){
                say('Cas',"We should open it. But maybe with a tool. Preferably not your face.");
                return;
              }
              if(!hasFlag('platter_opened')){
                setFlag('platter_opened', true);
                addItem('CURATOR_NOTE_1');
                addClue("Found a rubber mask and a note fragment. Someone is staging scares.");
                say('Nina',"You lift the platter with the spoon.\nA rubber mask stares up at you.\nA note fragment flutters out.");
                autosave();
                // comedic armour bump
                say('Cas',"That armour definitely moved. I object.");
              }else{
                say('Nina',"It’s already open. The mask continues to be rude.");
              }
            },
            talk: ()=>say('Nina',"“Hello?” (The platter remains ominous.)"),
          }
        },
        { id:'candlestick_hole', name:'Candlestick Gap', rect:[300,200,340,235],
          actions:{
            look: ()=>{
              if(hasFlag('candlestick_placed')){
                say('Nina',"The candlestick sits perfectly. The table looks smug about it.");
              }else{
                say('Nina',"There’s a candlestick-shaped gap in the décor.");
                say('Cas',"That is… aggressively specific.");
              }
            },
            use: ()=>{
              if(hasFlag('candlestick_placed')){
                say('Nina',"Already placed.");
                return;
              }
              if(!hasItem('CANDLESTICK')){
                say('Nina',"If only I had a candlestick. If only the universe wasn’t mocking me.");
                return;
              }
              setFlag('candlestick_placed', true);
              removeItem('CANDLESTICK');
              addItem('PUDDING');
              autosave();
              say('Nina',"You place the candlestick into the gap.\nCLICK.\nA small drawer pops open.\nInside: a pudding cup.");
              // PUDDING call & response
              say('Cas',"PUDDING!");
              say('??? (faint)',"...pudding??");
              say('Cas',"IT’S MY PUDDING, DEAN!");
            },
            talk: ()=>say('Cas',"I want to know who made a hole shaped like a candlestick. For science."),
          }
        },
        { id:'to_utility', name:'Service Door', rect:[420,150,500,230],
          condition: () => hasFlag('platter_opened'),
          actions:{
            look: ()=>say('Nina',"A door leading to the service corridor."),
            use: ()=>setScene('utility'),
            talk: ()=>say('Cas',"Doors that open after a scare are… suspiciously convenient."),
          }
        },
      ],
    },

    utility: {
      id:'utility',
      name:'Utility Corridor',
      bg:'assets/bg_utility.png',
      objective:"Restore power at the fuse box to get the attic key.",
      hotspots:[
        { id:'back', name:'Back to Dining', rect:[0,250,100,360],
          actions:{ look:()=>say('Nina',"Back to dining."), use:()=>setScene('dining'), talk:()=>say('Cas',"I miss the pudding.") }
        },
        { id:'cupboard', name:'Supply Cupboard', rect:[200,120,260,220],
          actions:{
            look:()=>say('Nina',"Cleaning supplies. The real horror."),
            use:()=>say('Cas',"If this cupboard contains a mop that screams, I’m leaving."),
            talk:()=>say('Nina',"“Anything useful?”"),
          },
          onClickTakeItem:'DUCT_TAPE',
          takeText:"You take duct tape. The universal language of ‘this will do’.",
          condition: () => !hasItem('DUCT_TAPE')
        },
        { id:'fuse', name:'Fuse Box', rect:[60,120,140,200],
          actions:{
            look:()=>say('Nina',"A fuse box with three labelled switches:\nSPOOK LIGHTS / DRAMA LIGHTS / VIBE LIGHTS."),
            use:()=>{
              if(hasFlag('power_restored')){
                say('Nina',"Power is already restored.");
                return;
              }
              openFusePuzzle();
            },
            talk:()=>say('Cas',"Spooks love drama. I heard it from a very reliable shadow."),
          }
        },
        { id:'dumbwaiter', name:'Dumbwaiter', rect:[470,110,590,230],
          actions:{
            look:()=>say('Nina',"A dumbwaiter. The haunted mansion’s little elevator for secrets."),
            use:()=>{
              if(!hasFlag('power_restored')){
                say('Nina',"It’s dead. Needs power.");
                return;
              }
              if(!hasItem('ATTIC_KEY')){
                addItem('ATTIC_KEY');
                addClue("Restored power; the dumbwaiter delivered an attic key tagged for the next exhibit.");
                autosave();
                say('Nina',"Ding.\nThe dumbwaiter opens.\nInside is an attic key on a tag: “NEXT EXHIBIT → RED DWARF”.");
              }else{
                say('Nina',"Already got the key.");
              }
            },
            talk:()=>say('Cas',"Ding is the sound of destiny."),
          }
        },
        { id:'to_attic', name:'Attic Hatch', rect:[300,60,380,120],
          condition: () => hasItem('ATTIC_KEY'),
          actions:{
            look:()=>say('Nina',"An attic hatch. The final scene energy is strong."),
            use:()=>setScene('attic'),
            talk:()=>say('Cas',"I would like to not go up there. But also… up there."),
          }
        },
      ],
    },

    attic: {
      id:'attic',
      name:'Attic',
      bg:'assets/bg_attic.png',
      objective:"Open the chest. The Curator should be here. Probably.",
      hotspots:[
        { id:'back', name:'Back to Utility', rect:[0,250,120,360],
          actions:{ look:()=>say('Nina',"Back down."), use:()=>setScene('utility'), talk:()=>say('Cas',"Down is safer. Usually.") }
        },
        { id:'chest', name:'Locked Chest', rect:[260,210,380,280],
          actions:{
            look:()=>say('Nina',"A chest. Locked. Waiting for a dramatic reveal. Suspiciously convenient."),
            use:()=>{
              if(!hasItem('ATTIC_KEY')){
                say('Nina',"Locked. I need a key.");
                return;
              }
              if(!hasFlag('chest_opened')){
                setFlag('chest_opened', true);
                addItem('WAX_TOKEN');
                addClue("The Curator wasn’t in the chest—only a calling card. He escaped to the next exhibit.");
                autosave();
                say('Nina',"You unlock the chest.\nPuff of stage smoke.\nIt’s empty.\nOnly a calling card and a wax token remain.");
                say('The Curator (note)', "“Bravo, Detective.\nYou’ve learned the rules.\nNow let’s see if you can follow the story.\n— The Curator”");
                // unlock next wing placeholder
                setFlag('red_dwarf_unlocked', true);
              }else{
                say('Nina',"Already opened. Still empty. Still rude.");
              }
            },
            talk:()=>say('Cas',"Hello chest. Please contain the villain this time."),
          }
        },
        { id:'exit_cutscene', name:'Exit Door', rect:[520,130,630,260],
          condition: () => hasFlag('chest_opened'),
          actions:{
            look:()=>say('Nina',"A door labelled: EXHIBIT B: RED DWARF."),
            use:()=>openCutscene(),
            talk:()=>say('Cas',"I hear laughter. That’s either good or… worse."),
          }
        },
      ],
    },
  }
};

// ---------- State ----------
const STORAGE_KEY = 'nina_adventure_save_v1';
const SETTINGS_KEY = 'nina_adventure_settings_v1';

let state = null;
let settings = null;

function defaultState(){
  return {
    version: 1,
    startedAt: nowISO(),
    updatedAt: nowISO(),
    sceneId: GameData.startScene,
    verb: 'look',
    selectedItem: null,
    inventory: [],
    flags: {},
    clues: [],
  };
}

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    settings = raw ? {...settingsDefault, ...JSON.parse(raw)} : {...settingsDefault};
  }catch(_){
    settings = {...settingsDefault};
  }
  applySettings(settings);
}

function saveSettings(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveGame(){
  state.updatedAt = nowISO();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  toast('Saved.');
}

function loadGame(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const loaded = JSON.parse(raw);
    if(!loaded || loaded.version !== 1) return null;
    return loaded;
  }catch(_){
    return null;
  }
}

function autosave(){
  // autosave after important actions
  saveGame();
}

// ---------- Helpers ----------
function hasFlag(k){ return !!state.flags[k]; }
function getFlag(k){ return state.flags[k]; }
function setFlag(k,v=true){ state.flags[k]=v; }
function hasItem(id){ return state.inventory.includes(id); }
function addItem(id){
  if(!hasItem(id)) state.inventory.push(id);
  renderInventory();
}
function removeItem(id){
  state.inventory = state.inventory.filter(x=>x!==id);
  if(state.selectedItem === id) state.selectedItem = null;
  renderInventory();
}
function addClue(text){
  if(!state.clues.includes(text)) state.clues.push(text);
}
function say(speaker, line){
  $('#speaker').textContent = speaker || '';
  $('#line').textContent = line || '';
  if(settings.ttsNarration) speak(`${speaker ? speaker + ': ' : ''}${line}`);
}

function setScene(id){
  const scene = GameData.scenes[id];
  if(!scene){ console.warn('Unknown scene', id); return; }
  state.sceneId = id;
  state.selectedItem = null;
  renderAll();
  say('Nina', scene.objective);
  autosave();
}

function currentScene(){ return GameData.scenes[state.sceneId]; }

// ---------- Rendering ----------
const canvas = $('#stage');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const assets = new Map();
function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function preload(){
  const unique = new Set();
  for(const sc of Object.values(GameData.scenes)){
    unique.add(sc.bg);
  }
  // plus icons/sprites (already cached by browser usually)
  for(const src of unique){
    const img = await loadImage(src);
    assets.set(src, img);
  }
}

function drawScene(){
  const sc = currentScene();
  const bg = assets.get(sc.bg);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(bg) ctx.drawImage(bg,0,0);

  // draw Nina & Cas as simple sprites in lower left
  const nina = assets.get('assets/spr_nina.png') || null;
  const cas  = assets.get('assets/spr_cas.png') || null;
  if(nina) ctx.drawImage(nina, 10, 285);
  if(cas)  ctx.drawImage(cas, 52, 305);

  // optional: show hotspot outlines faintly in slow mode when verb is LOOK
  if(settings.slowMode && state.verb === 'look'){
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#ffffff';
    for(const hs of sc.hotspots){
      if(hs.condition && !hs.condition()) continue;
      const [x1,y1,x2,y2] = hs.rect;
      ctx.strokeRect(x1,y1,x2-x1,y2-y1);
    }
    ctx.restore();
  }

  // selected item indicator
  if(state.selectedItem){
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#8fffc1';
    ctx.fillRect(0,0,canvas.width,4);
    ctx.restore();
  }
}

function renderInventory(){
  const wrap = $('#invSlots');
  wrap.innerHTML = '';
  for(const id of state.inventory){
    const meta = Items[id] || {name:id, icon:'assets/ico_use.png'};
    const div = document.createElement('button');
    div.className = 'invItem' + (state.selectedItem===id ? ' selected':'');
    div.setAttribute('type','button');
    div.innerHTML = `<img src="${meta.icon}" alt=""><div class="tip">${meta.name}</div>`;
    div.addEventListener('click', ()=>{
      if(state.selectedItem === id) state.selectedItem = null;
      else state.selectedItem = id;
      renderAll();
      toast(state.selectedItem ? `Selected: ${meta.name}` : 'Item deselected');
    });
    wrap.appendChild(div);
  }
}

function renderAll(){
  // set dynamic objective in UI area
  drawScene();
  renderInventory();
}

function hotspotAt(px,py){
  const sc = currentScene();
  // iterate reverse so later hotspots win
  for(let i=sc.hotspots.length-1;i>=0;i--){
    const hs = sc.hotspots[i];
    if(hs.condition && !hs.condition()) continue;
    const [x1,y1,x2,y2]=hs.rect;
    if(px>=x1 && px<=x2 && py>=y1 && py<=y2) return hs;
  }
  return null;
}

function canvasToGameCoords(evt){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  return {x: Math.floor(x), y: Math.floor(y)};
}

// ---------- Interaction ----------
function runAction(hs, verb){
  // take-item shortcut: if hotspot defines onClickTakeItem and user uses USE or LOOK, allow TAKE by using USE if item missing
  const canTake = hs.onClickTakeItem && (!hs.condition || hs.condition());
  if(canTake && verb === 'use'){
    const itemId = hs.onClickTakeItem;
    if(!hasItem(itemId)){
      addItem(itemId);
      if(itemId === 'GUEST_BOOK') setFlag('guest_book_taken', true);
      if(itemId === 'INK_BOTTLE') setFlag('ink_taken', true);
      if(itemId === 'MYSTERY_MANUAL') setFlag('manual_taken', true);
      if(itemId === 'SILVER_SPOON') {}
      if(itemId === 'CANDLESTICK') setFlag('candlestick_taken', true);
      say('Nina', hs.takeText || `You take the ${Items[itemId]?.name || itemId}.`);
      autosave();
      return;
    }
  }

  const act = hs.actions?.[verb];
  if(!act){
    say('Nina', "Nothing happens.");
    return;
  }
  act();
  renderAll();
}

function bindCanvas(){
  const handler = (evt)=>{
    evt.preventDefault();
    const {x,y} = canvasToGameCoords(evt);
    const hs = hotspotAt(x,y);
    if(!hs){
      toast('Nothing interesting there.');
      return;
    }
    toast(`${state.verb.toUpperCase()}: ${hs.name}`);
    runAction(hs, state.verb);
  };
  canvas.addEventListener('click', handler);
  canvas.addEventListener('touchstart', handler, {passive:false});
}

function bindVerbs(){
  document.querySelectorAll('.verb').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.verb = btn.dataset.verb;
      document.querySelectorAll('.verb').forEach(b=>b.classList.toggle('active', b.dataset.verb===state.verb));
      renderAll();
    });
  });
}

function openModal(title, bodyHTML){
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modal').classList.remove('hidden');
}
function closeModal(){
  $('#modal').classList.add('hidden');
  $('#modalBody').innerHTML = '';
}

function openMenu(){
  const body = `
    <div class="menuGrid">
      <button class="menuBtn" id="mContinue">Continue</button>
      <button class="menuBtn" id="mNew">New Game</button>
      <button class="menuBtn" id="mSave">Save</button>
      <button class="menuBtn" id="mLoad">Load</button>
      <button class="menuBtn" id="mNotebook">Notebook</button>
      <button class="menuBtn" id="mSettings">Settings</button>
      <button class="menuBtn" id="mQuit">Quit to Title</button>
    </div>
    <div class="small">Autosave happens after key actions (item pickup/use).</div>
  `;
  openModal('Menu', body);

  $('#mContinue').onclick = () => closeModal();
  $('#mNew').onclick = () => { if(confirm('Start a new game?')) { state = defaultState(); renderAll(); say('Nina',"New case. New door."); autosave(); closeModal(); } };
  $('#mSave').onclick = () => saveGame();
  $('#mLoad').onclick = () => {
    const loaded = loadGame();
    if(loaded){
      state = loaded;
      renderAll();
      say('Nina', currentScene().objective);
      toast('Loaded.');
      closeModal();
    }else toast('No save found.');
  };
  $('#mNotebook').onclick = () => openNotebook();
  $('#mSettings').onclick = () => openSettings();
  $('#mQuit').onclick = () => {
    if(confirm('Quit to title?')) location.reload();
  };
}

function openNotebook(){
  const clues = state.clues.length ? state.clues.map(c=>`<li>${escapeHtml(c)}</li>`).join('') : '<li>(No clues yet.)</li>';
  const body = `
    <div><strong>Clues</strong></div>
    <ul>${clues}</ul>
    <div class="small">Tip: Use ASK CAS if you forget what to do next.</div>
  `;
  openModal('Notebook', body);
}

function openObjective(){
  const sc = currentScene();
  const last = state.clues.slice(-3);
  const recent = last.length ? last.map(c=>`<li>${escapeHtml(c)}</li>`).join('') : '<li>(Nothing yet.)</li>';
  const body = `
    <div><strong>Objective</strong></div>
    <div>${escapeHtml(sc.objective)}</div>
    <hr style="border:0;border-top:1px solid #2b2740;">
    <div><strong>Recent clues</strong></div>
    <ul>${recent}</ul>
  `;
  openModal('What was I doing?', body);
}

function openSettings(){
  const s = settings;
  const body = `
    <div class="kv"><div>Font size</div>
      <div>
        <select id="setFont">
          <option value="S" ${s.fontSize==='S'?'selected':''}>Small</option>
          <option value="M" ${s.fontSize==='M'?'selected':''}>Medium</option>
          <option value="L" ${s.fontSize==='L'?'selected':''}>Large</option>
        </select>
      </div>
    </div>
    <div class="kv"><div>Dyslexia font</div><div><input id="setDys" type="checkbox" ${s.dyslexiaFont?'checked':''}> <span class="small">Prototype uses a placeholder font.</span></div></div>
    <div class="kv"><div>High contrast</div><div><input id="setHC" type="checkbox" ${s.highContrast?'checked':''}></div></div>
    <div class="kv"><div>Slow mode</div><div><input id="setSlow" type="checkbox" ${s.slowMode?'checked':''}> <span class="small">Shows faint hotspot boxes when LOOK is selected.</span></div></div>
    <div class="kv"><div>Narration</div><div><input id="setTTS" type="checkbox" ${s.ttsNarration?'checked':''}> <span class="small">Uses device Text-to-Speech if available.</span></div></div>
    <div class="row">
      <button class="menuBtn" id="setApply">Apply</button>
      <button class="menuBtn" id="setClose">Close</button>
    </div>
  `;
  openModal('Settings', body);
  $('#setApply').onclick = () => {
    settings.fontSize = $('#setFont').value;
    settings.dyslexiaFont = $('#setDys').checked;
    settings.highContrast = $('#setHC').checked;
    settings.slowMode = $('#setSlow').checked;
    settings.ttsNarration = $('#setTTS').checked;
    saveSettings();
    applySettings(settings);
    toast('Settings saved.');
  };
  $('#setClose').onclick = () => closeModal();
}

function escapeHtml(s){ return (''+s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function hintForScene(sceneId){
  switch(sceneId){
    case 'lobby': return "Use the Haunted Mansion door. The clue board can wait.";
    case 'foyer':
      if(!hasItem('GUEST_BOOK')) return "Try USE on objects that look like they can be picked up. A heavy book might help.";
      if(!hasItem('LIBRARY_KEY')) return "LOOK at the portraits until something feels… off. Then USE your heavy book.";
      return "Try the Library door.";
    case 'library':
      if(!hasItem('INK_BOTTLE')) return "The desk seems… takeable.";
      if(!hasItem('MYSTERY_MANUAL')) return "That book on the stand is basically begging for attention.";
      if(!hasItem('INKED_PAGE')){
        return "Combine the ink bottle and the manual. Yes, really.";
      }
      if(!hasFlag('lever_revealed')) return "USE the inked page on the bookshelf.";
      if(!hasFlag('dining_unlocked')) return "USE the hidden lever once it appears.";
      return "Head for the dining hall.";
    case 'dining':
      if(!hasItem('SILVER_SPOON')) return "The silverware looks useful. Try USE on it.";
      if(!hasFlag('platter_opened')) return "USE the spoon on the covered platter.";
      if(hasItem('CANDLESTICK') && !hasFlag('candlestick_placed')) return "That candlestick-shaped gap is insulting you. You could fix that.";
      return "The service door should be open now.";
    case 'utility':
      if(!hasFlag('power_restored')) return "LOOK at the fuse box. Spooks love drama.";
      if(!hasItem('ATTIC_KEY')) return "USE the dumbwaiter now that power is on.";
      return "Go up to the attic.";
    case 'attic':
      if(!hasFlag('chest_opened')) return "USE the attic key on the chest.";
      return "Take the exit door to the next exhibit.";
    default: return "Try LOOK. Mysteries love staring.";
  }
}

function askCas(){
  const h = hintForScene(state.sceneId);
  say('Cas', h);
}

// Fuse box mini-modal puzzle
function openFusePuzzle(){
  const body = `
    <div><strong>Fuse Box</strong></div>
    <div class="small">Flip the three switches in the right order.</div>
    <div class="row">
      <button class="menuBtn" id="swSpook">SPOOK LIGHTS</button>
      <button class="menuBtn" id="swDrama">DRAMA LIGHTS</button>
      <button class="menuBtn" id="swVibe">VIBE LIGHTS</button>
    </div>
    <div class="small">Hint: “Spooks love drama.”</div>
    <div class="row"><button class="menuBtn" id="swReset">Reset</button><button class="menuBtn" id="swClose">Close</button></div>
  `;
  openModal('Fuse Box', body);

  state.flags._fuseSeq = state.flags._fuseSeq || [];
  const add = (x)=>{
    state.flags._fuseSeq.push(x);
    toast(`Switch: ${x}`);
    const seq = state.flags._fuseSeq.join('-');
    if(seq === 'SPOOK-DRAMA-VIBE'){
      setFlag('power_restored', true);
      state.flags._fuseSeq = [];
      addClue("Restored power by setting the switches to SPOOK → DRAMA → VIBE.");
      autosave();
      say('Nina',"The lights flicker on.\nSomewhere, machinery hums to life.");
      closeModal();
      renderAll();
    } else if(state.flags._fuseSeq.length >= 3){
      say('Cas', "Nope. The house disliked that order.");
      state.flags._fuseSeq = [];
    }
  };
  $('#swSpook').onclick = ()=>add('SPOOK');
  $('#swDrama').onclick = ()=>add('DRAMA');
  $('#swVibe').onclick = ()=>add('VIBE');
  $('#swReset').onclick = ()=>{ state.flags._fuseSeq=[]; toast('Reset.'); };
  $('#swClose').onclick = ()=>closeModal();
}

// End cutscene placeholder
function openCutscene(){
  const body = `
    <div><strong>Cutscene (Prototype)</strong></div>
    <div>The Curator flees into the next exhibit wing.</div>
    <div class="small">In v2 we’ll add comic panels + sprite chase here (with cameos).</div>
    <div class="row">
      <button class="menuBtn" id="csOk">Continue</button>
    </div>
  `;
  openModal('EXHIBIT TRANSITION', body);
  $('#csOk').onclick = ()=>{
    closeModal();
    say('Nina', "Next exhibit unlocked: RED DWARF (coming in the next build).");
    toast('Prototype ends here.');
  };
}

// ---------- Boot ----------
async function boot(){
  loadSettings();

  // load or start new
  const loaded = loadGame();
  state = loaded || defaultState();

  // set active verb button
  document.querySelectorAll('.verb').forEach(b=>b.classList.toggle('active', b.dataset.verb===state.verb));

  // preload images
  await preload();
  // also load sprites into cache map
  for(const src of ['assets/spr_nina.png','assets/spr_cas.png','assets/spr_curator.png']){
    try{ assets.set(src, await loadImage(src)); }catch(_){}
  }

  // bindings
  bindCanvas();
  bindVerbs();

  $('#btnNotebook').onclick = openNotebook;
  $('#btnObjective').onclick = openObjective;
  $('#btnHint').onclick = askCas;
  $('#btnMenuTop').onclick = openMenu;

  $('#btnCloseModal').onclick = closeModal;
  $('#modal').addEventListener('click', (e)=>{ if(e.target.id==='modal') closeModal(); });

  // Close modal on Escape
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

  renderAll();
  // show objective on first load
  say('Nina', currentScene().objective);
}

boot();
