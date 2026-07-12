const params = new URLSearchParams(location.search);
const isAuthorized = params.get("shop") === "ebisuya";
const isDemo = params.get("demo") === "1";

const machine = document.getElementById("machine");
const reels = [0,1,2].map(i => document.getElementById(`reel${i}`));
const stopButtons = [...document.querySelectorAll(".stop-btn")];
const leverBtn = document.getElementById("leverBtn");
const soundToggle = document.getElementById("soundToggle");
const statusEl = document.getElementById("status");
const meterFill = document.getElementById("meterFill");
const meterText = document.getElementById("meterText");
const mascot = document.getElementById("mascot");
const speech = document.getElementById("speech");
const coupon = document.getElementById("coupon");
const lose = document.getElementById("lose");
const gate = document.getElementById("gate");
const voice = document.getElementById("voice");
const blackout = document.getElementById("blackout");
const useBtn = document.getElementById("useBtn");
const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");

const normalSymbols = ["🍜","🥟","🍚","🍺","🍤","福"];
const allSymbols = [...normalSymbols,"恵","比","寿"];

let timers = [null,null,null];
let targets = ["","",""];
let results = ["","",""];
let nextStop = 0;
let spinning = false;
let premium = false;
let soundOn = true;
let audioCtx = null;
let bgmTimer = null;
let confetti = [];

function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randomCode(){ return "EBISU-" + Math.random().toString(36).slice(2,7).toUpperCase(); }

function ensureAudio(){
  if(!audioCtx){
    const A = window.AudioContext || window.webkitAudioContext;
    if(A) audioCtx = new A();
  }
  if(audioCtx?.state === "suspended") audioCtx.resume();
}
function beep(freq=440,dur=.08,vol=.04,type="square"){
  if(!soundOn) return;
  ensureAudio();
  if(!audioCtx) return;
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.value=freq; g.gain.value=vol;
  o.connect(g); g.connect(audioCtx.destination); o.start();
  g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);
  o.stop(audioCtx.currentTime+dur);
}
function startBgm(){
  stopBgm();
  if(!soundOn) return;
  const notes=[220,277,330,440,330,277,247,330];
  let i=0;
  bgmTimer=setInterval(()=>{
    beep(notes[i%notes.length],.18,.018,i%4===0?"triangle":"square");
    i++;
  },260);
}
function stopBgm(){
  clearInterval(bgmTimer);
  bgmTimer=null;
}
function playWinJingle(){
  if(!soundOn) return;
  [523,659,784,1047].forEach((n,i)=>setTimeout(()=>beep(n,.24,.05,"triangle"),i*140));
}
function updateMeter(percent,stars){
  meterFill.style.width=`${percent}%`;
  meterText.textContent=stars;
}
function mascotSay(text,hop=false){
  speech.textContent=text;
  if(hop){
    mascot.classList.remove("hop");
    requestAnimationFrame(()=>mascot.classList.add("hop"));
  }
}
function makeOutcome(){
  const n=Math.random();
  if(n<0.04){
    premium=true;
    return ["恵","比","寿"];
  }
  premium=false;
  if(n<0.13)return ["🍜","🍜","🍜"];
  if(n<0.23)return ["🥟","🥟","🥟"];
  if(n<0.35)return ["🍚","🍚","🍚"];
  if(n<0.47)return ["🍺","🍺","🍺"];
  if(n<0.58)return ["🍤","🍤","🍤"];
  if(n<0.68)return ["福","福","福"];
  let a,b,c;
  do{a=rand(allSymbols);b=rand(allSymbols);c=rand(allSymbols)}while(a===b&&b===c || (a==="恵"&&b==="比"&&c==="寿"));
  return [a,b,c];
}
function resetPanels(){
  coupon.classList.add("hidden");
  coupon.classList.remove("used");
  lose.classList.add("hidden");
  useBtn.disabled=false;
  useBtn.textContent="店員さんが使用済みにする";
}
function startSpin(){
  if(spinning) return;
  ensureAudio();
  resetPanels();
  targets=makeOutcome();
  results=["","",""];
  nextStop=0;
  spinning=true;
  leverBtn.disabled=true;
  leverBtn.classList.add("pull");
  setTimeout(()=>leverBtn.classList.remove("pull"),400);
  updateMeter(12,"★☆☆☆☆");
  mascotSay("さあ、左から止めていってね！",true);
  statusEl.textContent="リール回転中！";
  beep(150,.12,.06,"sawtooth");
  startBgm();

  reels.forEach((reel,i)=>{
    reel.classList.add("spinning");
    reel.classList.remove("ebisu");
    timers[i]=setInterval(()=>reel.textContent=rand(allSymbols),58+i*7);
  });
  stopButtons.forEach((b,i)=>b.disabled=i!==0);
}
function stopReel(i){
  if(!spinning || i!==nextStop) return;
  clearInterval(timers[i]);
  reels[i].classList.remove("spinning");
  reels[i].textContent=targets[i];
  reels[i].classList.toggle("ebisu",["恵","比","寿"].includes(targets[i]));
  results[i]=targets[i];
  stopButtons[i].disabled=true;
  beep(280+i*120,.08,.05,"square");

  nextStop++;
  if(nextStop===1){
    stopButtons[1].disabled=false;
    updateMeter(targets[0]==="恵"?46:28,targets[0]==="恵"?"★★★☆☆":"★★☆☆☆");
    mascotSay(targets[0]==="恵"?"おっ…恵が止まった！":"次は真ん中！",targets[0]==="恵");
    statusEl.textContent="真ん中をSTOP！";
  }else if(nextStop===2){
    stopButtons[2].disabled=false;
    const reach = targets[0]==="恵" && targets[1]==="比";
    updateMeter(reach?94:58,reach?"★★★★★":"★★★☆☆");
    mascotSay(reach?"あと一つ！！":"最後の右を止めて！",true);
    statusEl.textContent=reach?"恵・比…最後は寿か！？":"最後をSTOP！";
    if(reach){
      machine.classList.add("shake");
      setTimeout(()=>machine.classList.remove("shake"),500);
      navigator.vibrate?.([90,50,90]);
      beep(620,.35,.055,"sawtooth");
    }
  }else{
    finishGame();
  }
}
function finishGame(){
  spinning=false;
  stopBgm();
  if(!isDemo) localStorage.setItem("ebisuyaV2Played",todayKey());

  if(premium && results.join("")==="恵比寿"){
    premiumSequence();
    return;
  }
  const win=results[0]===results[1] && results[1]===results[2];
  if(!win){
    updateMeter(5,"☆☆☆☆☆");
    mascotSay("また明日、待ってるよ！",false);
    statusEl.textContent="今回はハズレ！";
    lose.classList.remove("hidden");
    leverBtn.disabled=!isDemo;
    return;
  }

  const rewards={
    "🍜":["200円引き","お会計から200円引き"],
    "🥟":["餃子3個サービス","餃子を3個サービス"],
    "🍚":["ライス無料","ライス1杯無料"],
    "🍺":["ドリンク無料","対象ドリンク1杯無料"],
    "🍤":["300円引き","お会計から300円引き"],
    "福":["100円引き","お会計から100円引き"]
  };
  const reward=rewards[results[0]] || ["100円引き","お会計から100円引き"];
  showCoupon(reward[0],reward[1]);
  updateMeter(100,"★★★★★");
  mascotSay("大当たり！おめでとう！",true);
  statusEl.textContent="大当たり！クーポンGET！";
  machine.classList.add("shake");
  setTimeout(()=>machine.classList.remove("shake"),600);
  playWinJingle();
  launchConfetti(90);
  navigator.vibrate?.([120,60,180]);
  leverBtn.disabled=!isDemo;
}
function showCoupon(title,text){
  document.getElementById("couponTitle").textContent=title;
  document.getElementById("couponText").textContent=text;
  document.getElementById("couponCode").textContent=randomCode();
  coupon.classList.remove("hidden");
}
function premiumSequence(){
  updateMeter(100,"★★★★★");
  mascotSay("……",false);
  statusEl.textContent="……";
  setTimeout(()=>{
    blackout.classList.add("show");
    beep(70,.12,.07,"sawtooth");
  },450);

  setTimeout(()=>{
    blackout.classList.add("reveal");
  },1250);

  setTimeout(()=>{
    if(soundOn){
      voice.currentTime=0;
      voice.play().catch(()=>{});
    }
  },1900);

  setTimeout(()=>{
    blackout.classList.remove("show","reveal");
    machine.classList.add("rainbow");
    showCoupon("500円引き","お会計から500円引き");
    statusEl.textContent="恵比寿降臨！超大当たり！";
    mascotSay("お待たせしました！恵比寿カツ丼です！",true);
    launchConfetti(220);
    playWinJingle();
    navigator.vibrate?.([150,70,150,70,300]);
  },5000);

  setTimeout(()=>machine.classList.remove("rainbow"),8500);
  leverBtn.disabled=!isDemo;
}
function resizeCanvas(){
  confettiCanvas.width=innerWidth*devicePixelRatio;
  confettiCanvas.height=innerHeight*devicePixelRatio;
  confettiCanvas.style.width=innerWidth+"px";
  confettiCanvas.style.height=innerHeight+"px";
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
function launchConfetti(count){
  const chars=["■","●","◆","★","福"];
  for(let i=0;i<count;i++){
    confetti.push({
      x:Math.random()*innerWidth,y:-20-Math.random()*innerHeight*.3,
      vx:(Math.random()-.5)*4,vy:2+Math.random()*5,
      r:Math.random()*6.28,vr:(Math.random()-.5)*.2,
      size:8+Math.random()*12,
      hue:Math.random()*360,
      char:rand(chars),
      life:180+Math.random()*100
    });
  }
}
function drawConfetti(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  confetti=confetti.filter(p=>p.life>0 && p.y<innerHeight+40);
  for(const p of confetti){
    p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;p.life--;
    ctx.save();
    ctx.translate(p.x,p.y);ctx.rotate(p.r);
    ctx.fillStyle=`hsl(${p.hue} 90% 58%)`;
    ctx.font=`900 ${p.size}px sans-serif`;
    ctx.fillText(p.char,0,0);
    ctx.restore();
  }
  requestAnimationFrame(drawConfetti);
}
soundToggle.addEventListener("click",()=>{
  soundOn=!soundOn;
  soundToggle.textContent=soundOn?"🔊 ON":"🔇 OFF";
  if(!soundOn){stopBgm();voice.pause()}
  else beep(520,.12,.04,"triangle");
});
stopButtons.forEach(btn=>btn.addEventListener("click",()=>stopReel(Number(btn.dataset.index))));
leverBtn.addEventListener("click",startSpin);
useBtn.addEventListener("click",()=>{
  coupon.classList.add("used");
  useBtn.disabled=true;
  useBtn.textContent="使用済み";
});
window.addEventListener("resize",resizeCanvas);
resizeCanvas();
drawConfetti();

if(!isAuthorized && !isDemo){
  document.querySelector(".reel-frame").classList.add("hidden");
  document.querySelector(".stop-row").classList.add("hidden");
  leverBtn.classList.add("hidden");
  statusEl.classList.add("hidden");
  gate.classList.remove("hidden");
}else if(!isDemo && localStorage.getItem("ebisuyaV2Played")===todayKey()){
  leverBtn.disabled=true;
  statusEl.textContent="今日はすでにチャレンジ済みです";
  mascotSay("また明日、待ってるよ！",false);
}
