/* Mall Idle is intentionally standalone. Its save key is separate from every previous prototype. */
const SAVE_KEY = 'mall-idle-save';
const TICK_MS = 250;
const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
const SHOPS = [
  {id:'cafe', name:'Corner Cafe', icon:'☕', color:'#ffba62', description:'A cozy first stop for mall visitors.', baseCost:0, baseIncome:2.5, unlockAt:0},
  {id:'boutique', name:'Neon Boutique', icon:'✦', color:'#f58ab7', description:'Trendy clothes bring in a stylish crowd.', baseCost:250, baseIncome:8, unlockAt:1},
  {id:'arcade', name:'Pixel Arcade', icon:'◎', color:'#78d5ff', description:'Bright games keep shoppers around longer.', baseCost:1200, baseIncome:35, unlockAt:2},
  {id:'food-court', name:'Food Court', icon:'♨', color:'#ff826f', description:'A busy food court makes the whole mall hum.', baseCost:7500, baseIncome:180, unlockAt:3},
  {id:'cinema', name:'Moonlight Cinema', icon:'▣', color:'#b795ff', description:'Big screens, big crowds, bigger returns.', baseCost:45000, baseIncome:900, unlockAt:4},
  {id:'market', name:'Grand Market', icon:'▤', color:'#76e2ae', description:'The anchor store your growing mall deserves.', baseCost:250000, baseIncome:4500, unlockAt:5},
  {id:'sky-lounge', name:'Sky Lounge', icon:'◇', color:'#ffd166', description:'A premium rooftop destination for VIPs.', baseCost:1500000, baseIncome:24000, unlockAt:6}
];
const DEFAULT_STATE = {version:1,money:0,totalEarned:0,lastTick:Date.now(),shops:{},activity:[{time:Date.now(),text:'Your mall is ready. Open the Corner Cafe to begin earning.'}]};
let state = loadState(); let toastTimer;
const $ = id => document.getElementById(id);
const money = value => `$${Math.floor(Math.max(0,value)).toLocaleString()}`;
const compactMoney = value => value >= 1000000 ? `$${(value/1000000).toFixed(1)}m` : value >= 1000 ? `$${(value/1000).toFixed(value>=10000?0:1)}k` : money(value);
const shopData = id => SHOPS.find(shop=>shop.id===id);
function freshShop(shop){return {owned:shop.id==='cafe',open:false,level:1,upgradeCount:0};}
function loadState(){
  try {
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    const shops={};
    for(const shop of SHOPS) shops[shop.id]={...freshShop(shop),...(saved?.shops?.[shop.id]||{})};
    if(!saved) return {...structuredClone(DEFAULT_STATE),shops};
    return {...structuredClone(DEFAULT_STATE),...saved,shops,activity:Array.isArray(saved.activity)&&saved.activity.length?saved.activity:structuredClone(DEFAULT_STATE.activity)};
  } catch { const shops={}; for(const shop of SHOPS)shops[shop.id]=freshShop(shop); return {...structuredClone(DEFAULT_STATE),shops}; }
}
function save(){state.lastTick=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));$('save-status').textContent='Saved locally';}
function openStores(){return SHOPS.filter(shop=>state.shops[shop.id].owned&&state.shops[shop.id].open);}
function incomeRate(){return openStores().reduce((total,shop)=>total+shop.baseIncome*levelMultiplier(shop),0);}
function levelMultiplier(shop){return Math.pow(1.35,state.shops[shop.id].level-1);}
function upgradeCost(shop){const data=state.shops[shop.id];return Math.ceil(20*Math.pow(1.68,data.upgradeCount)*(1+shop.baseCost/900));}
function addActivity(text){state.activity.unshift({time:Date.now(),text});state.activity=state.activity.slice(0,16);}
function grantIncome(seconds){const rate=incomeRate();if(seconds<=0||rate<=0)return 0;const earned=rate*seconds;state.money+=earned;state.totalEarned+=earned;return earned;}
function catchUp(){const elapsed=Math.min(OFFLINE_CAP_SECONDS,Math.max(0,(Date.now()-state.lastTick)/1000));const earned=grantIncome(elapsed);state.lastTick=Date.now();if(earned>0&&elapsed>3){addActivity(`Your stores earned ${money(earned)} while you were away.`);save();}}
function formatRate(rate){return rate<10?`$${rate.toFixed(1)} / sec`:money(rate)+' / sec';}
function mallStatus(){const count=openStores().length;if(!count)return ['A quiet beginning','Open your first store to bring the mall to life.'];if(count<3)return ['The doors are open','Your first shoppers are finding the mall.'];if(count<5)return ['A growing destination','The mall is becoming a real hangout.'];if(count<7)return ['A city landmark','Every corner is earning its keep.'];return ['A retail empire','You built the mall everyone talks about.'];}
function render(){
  const rate=incomeRate(),open=openStores(),owned=SHOPS.filter(shop=>state.shops[shop.id].owned),status=mallStatus();
  $('money').textContent=money(state.money);$('income-rate').textContent=formatRate(rate);$('earn-ticker').textContent=rate?`Earning ${formatRate(rate)} automatically`:'Open a store to start earning';$('mall-level').textContent=status[0];$('mall-message').textContent=status[1];$('open-count').textContent=open.length;$('total-levels').textContent=owned.reduce((sum,shop)=>sum+state.shops[shop.id].level-1,0);$('total-earned').textContent=compactMoney(state.totalEarned);
  $('shop-grid').innerHTML=SHOPS.map(shop=>renderShop(shop,owned.length)).join('');
  $('activity-log').innerHTML=state.activity.map(item=>`<div class="activity"><time>${new Date(item.time).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time><strong>${item.text}</strong></div>`).join('');
}
function renderShop(shop,ownedCount){
  const data=state.shops[shop.id],locked=!data.owned&&ownedCount<shop.unlockAt,rate=shop.baseIncome*levelMultiplier(shop),cost=shop.baseCost,upgrade=upgradeCost(shop);
  let action='';
  if(locked) action=`<button class="shop-action" disabled>Unlocks with ${shop.unlockAt} owned</button>`;
  else if(!data.owned) action=`<button class="shop-action" data-buy="${shop.id}" ${state.money<cost?'disabled':''}>Buy shop · ${money(cost)}</button>`;
  else if(!data.open) action=`<button class="shop-action" data-open="${shop.id}">${shop.id==='cafe'&&data.level===1?'Open Store':'Open store'}</button>`;
  else action=`<button class="shop-action" data-upgrade="${shop.id}" ${state.money<upgrade?'disabled':''}>Upgrade · ${money(upgrade)}</button>`;
  const stateLabel=locked?'Locked':!data.owned?'Available':data.open?'Open':'Closed';
  return `<article class="shop-card ${locked?'locked':''}" style="--card-color:${shop.color}"><div class="shop-top"><div class="shop-icon">${shop.icon}</div><span class="shop-state ${data.open?'open':''}">${stateLabel}</span></div><h3>${shop.name}</h3><p class="shop-description">${locked?`Own ${shop.unlockAt} more ${shop.unlockAt===1?'shop':'shops'} to unlock this space.`:shop.description}</p><div class="shop-income">${formatRate(rate)} <span>at level ${data.level}</span></div><div class="level-line"><span>${data.open?'Currently earning':'Ready when you are'}</span><strong>${data.owned?`Lv. ${data.level}`:'—'}</strong></div>${action}</article>`;
}
function buyShop(id){const shop=shopData(id),data=state.shops[id],ownedCount=SHOPS.filter(item=>state.shops[item.id].owned).length;if(data.owned||ownedCount<shop.unlockAt||state.money<shop.baseCost)return;state.money-=shop.baseCost;data.owned=true;addActivity(`Bought the ${shop.name} space for ${money(shop.baseCost)}.`);save();render();notify(`${shop.name} is ready to open.`);}
function openShop(id){const shop=shopData(id),data=state.shops[id];if(!data.owned||data.open)return;data.open=true;addActivity(`Opened the ${shop.name}. Income is now ${formatRate(shop.baseIncome)}.`);save();render();notify(`${shop.name} is open!`);}
function upgradeShop(id){const shop=shopData(id),data=state.shops[id],cost=upgradeCost(shop);if(!data.owned||!data.open||state.money<cost)return;state.money-=cost;data.level++;data.upgradeCount++;addActivity(`Upgraded the ${shop.name} to level ${data.level}.`);save();render();notify(`${shop.name} upgraded.`);}
function notify(text){const node=$('toast');node.textContent=text;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2400);}
function reset(){if(!confirm('Close the entire mall and start over?'))return;localStorage.removeItem(SAVE_KEY);state=loadState();render();notify('A brand-new mall is ready.');}
document.addEventListener('click',event=>{const action=event.target.closest('[data-action]');if(action?.dataset.action==='reset')reset();const buy=event.target.closest('[data-buy]');if(buy)buyShop(buy.dataset.buy);const open=event.target.closest('[data-open]');if(open)openShop(open.dataset.open);const upgrade=event.target.closest('[data-upgrade]');if(upgrade)upgradeShop(upgrade.dataset.upgrade);});
catchUp();
setInterval(()=>{const now=Date.now(),seconds=Math.min(2,(now-state.lastTick)/1000);if(seconds<=0)return;const earned=grantIncome(seconds);state.lastTick=now;if(earned>0){save();render();}},TICK_MS);
render();
