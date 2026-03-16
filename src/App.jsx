import { useState, useEffect, useRef } from "react";

const PALS = ["oros","copes","espases","bastos"];
const PAL_SIMBOL = { oros:"🪙", copes:"🏆", espases:"⚔️", bastos:"🪵" };
const PAL_COLOR  = { oros:"#c8963e", copes:"#c0392b", espases:"#2c3e50", bastos:"#27ae60" };
const NUMS_BARALLA = [1,3,7,8,9,10,11,12];
const NOM_CARTA = { 1:"A", 3:"3", 7:"7", 8:"8", 9:"9", 10:"10", 11:"11", 12:"12" };
const ORDRE_SEQ    = [7,8,9,3,10,11,12,1];
const ORDRE_TRIOMF = [7,8,11,12,3,1,9,10];
const ORDRE_NORMAL = [7,8,9,10,11,12,3,1];
const PUNTS_TRIOMF = { 10:20, 9:15, 1:11, 3:10, 12:4, 11:3, 8:0, 7:0 };
const PUNTS_NORMAL = { 1:11, 3:10, 12:4, 11:3, 10:2, 9:0, 8:0, 7:0 };
const NOMS_POS = ["Nord","Est","Sud","Oest"];
const PARELLES = [[0,2],[1,3]];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const barrejar = arr => {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};

function ordenarMa(ma, triomf) {
  const ordrePals = triomf ? [triomf,...PALS.filter(p=>p!==triomf)] : PALS;
  return [...ma].sort((a,b) => {
    const piA=ordrePals.indexOf(a.pal), piB=ordrePals.indexOf(b.pal);
    if (piA!==piB) return piA-piB;
    const vA=a.pal===triomf?(PUNTS_TRIOMF[a.num]??0):(PUNTS_NORMAL[a.num]??0);
    const vB=b.pal===triomf?(PUNTS_TRIOMF[b.num]??0):(PUNTS_NORMAL[b.num]??0);
    return vB-vA;
  });
}

function forcaCarta(carta,triomf,palLiderat) {
  if (carta.pal===triomf)     return 100+ORDRE_TRIOMF.indexOf(carta.num);
  if (carta.pal===palLiderat) return  10+ORDRE_NORMAL.indexOf(carta.num);
  return ORDRE_NORMAL.indexOf(carta.num);
}

function guanyadorBasa(basa,triomf) {
  const pal0=basa[0].carta.pal; let millor=0;
  for (let i=1;i<basa.length;i++)
    if (forcaCarta(basa[i].carta,triomf,pal0)>forcaCarta(basa[millor].carta,triomf,pal0)) millor=i;
  return basa[millor].jugador;
}

const puntsCarta=(carta,triomf)=>carta.pal===triomf?(PUNTS_TRIOMF[carta.num]??0):(PUNTS_NORMAL[carta.num]??0);

// ─── CANTS ───────────────────────────────────────────────────────────────────
function calcularCants(ma,triomf) {
  const cants=[];
  for (const pal of PALS) {
    const nums=ma.filter(c=>c.pal===pal).map(c=>c.num);
    let maxSeq=0;
    for (let i=0;i<ORDRE_SEQ.length;i++) {
      let l=0; while(i+l<ORDRE_SEQ.length&&nums.includes(ORDRE_SEQ[i+l]))l++;
      if(l>maxSeq)maxSeq=l;
    }
    if(maxSeq===3)cants.push({tipus:"tercera",pal,valor:20,text:"Tercera"});
    if(maxSeq===4)cants.push({tipus:"quarta",pal,valor:40,text:"Quarta"});
    if(maxSeq>=5) cants.push({tipus:"quinta",pal,valor:50,text:"Quinta"});
  }
  const q=[{num:1,valor:100,text:"Cent (4 As)"},{num:3,valor:100,text:"Cent (4 tresos)"},
    {num:11,valor:100,text:"Cent (4 onzens)"},{num:12,valor:100,text:"Cent (4 dotzens)"},
    {num:9,valor:150,text:"150 (4 nous)"},{num:10,valor:200,text:"200 (4 deens)"}];
  for (const {num,valor,text} of q)
    if(PALS.every(pal=>ma.some(c=>c.pal===pal&&c.num===num)))
      cants.push({tipus:"quatre",num,valor,text});
  if(triomf){
    if(ma.some(c=>c.pal===triomf&&c.num===11)&&ma.some(c=>c.pal===triomf&&c.num===12))
      cants.push({tipus:"bolot",pal:triomf,valor:20,text:`Bolot (${triomf})`});
  }
  return cants;
}

function resoldreCants(cantsDeclarat,triomf) {
  if(!cantsDeclarat||!cantsDeclarat.length) return {pareGuanyador:-1,punts0:0,punts1:0};
  const ambCants=cantsDeclarat.filter(x=>x.cants&&x.cants.length>0);
  if(!ambCants.length) return {pareGuanyador:-1,punts0:0,punts1:0};
  const millorPerJug=ambCants.map(({jugador,cants})=>({
    jugador,
    millor:Math.max(...cants.map(c=>c.valor)),
    millorCant:cants.reduce((b,c)=>c.valor>b.valor?c:b),
    total:cants.reduce((s,c)=>s+c.valor,0),
  }));
  const millorValor=Math.max(...millorPerJug.map(x=>x.millor));
  const ambMillor=millorPerJug.filter(x=>x.millor===millorValor);
  let guanyador;
  if(ambMillor.length===1){guanyador=ambMillor[0].jugador;}
  else {
    const deTriomf=ambMillor.filter(x=>x.millorCant.pal===triomf);
    guanyador=deTriomf.length>0?deTriomf[0].jugador:ambMillor[0].jugador;
  }
  const pareG=PARELLES.findIndex(p=>p.includes(guanyador));
  const total=millorPerJug.filter(x=>PARELLES[pareG].includes(x.jugador)).reduce((s,x)=>s+x.total,0);
  return {pareGuanyador:pareG,punts0:pareG===0?total:0,punts1:pareG===1?total:0};
}

// ─── CARTES VÀLIDES ───────────────────────────────────────────────────────────
function cartesValides(ma,basa,triomf) {
  if(!basa.length) return ma;
  const palLiderat=basa[0].carta.pal;
  const guanyantAra=guanyadorBasa(basa,triomf);
  const pareGuanyant=PARELLES.findIndex(p=>p.includes(guanyantAra));
  const jugadorActual=(basa[basa.length-1].jugador+1)%4;
  const pareActual=PARELLES.findIndex(p=>p.includes(jugadorActual));
  const companGuanya=pareActual===pareGuanyant;
  const delPal=ma.filter(c=>c.pal===palLiderat);
  if(delPal.length){
    const triomfABasa=basa.some(b=>b.carta.pal===triomf);
    if(triomfABasa&&!companGuanya){
      const millorTB=basa.filter(b=>b.carta.pal===triomf)
        .reduce((b,x)=>ORDRE_TRIOMF.indexOf(x.carta.num)>ORDRE_TRIOMF.indexOf(b.carta.num)?x:b);
      const triomfsMa=ma.filter(c=>c.pal===triomf);
      const superiors=triomfsMa.filter(c=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(millorTB.carta.num));
      if(superiors.length) return superiors;
      if(triomfsMa.length) return triomfsMa;
    }
    return delPal;
  }
  const triomfsMa=ma.filter(c=>c.pal===triomf);
  const triomfABasa=basa.some(b=>b.carta.pal===triomf);
  if(!companGuanya&&triomfsMa.length){
    if(triomfABasa){
      const millorTB=basa.filter(b=>b.carta.pal===triomf)
        .reduce((b,x)=>ORDRE_TRIOMF.indexOf(x.carta.num)>ORDRE_TRIOMF.indexOf(b.carta.num)?x:b);
      const superiors=triomfsMa.filter(c=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(millorTB.carta.num));
      if(superiors.length) return superiors;
      return triomfsMa;
    } else return triomfsMa;
  }
  return ma;
}

// ─── IA ──────────────────────────────────────────────────────────────────────
function triarCartaIA(ma,basa,triomf) {
  const valides=cartesValides(ma,basa,triomf);
  if(!valides.length) return null;
  if(!basa.length){
    const t=valides.filter(c=>c.pal===triomf);
    if(t.length) return t.reduce((b,c)=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(b.num)?c:b);
    return valides.reduce((b,c)=>puntsCarta(c,triomf)>puntsCarta(b,triomf)?c:b);
  }
  const palL=basa[0].carta.pal;
  const millorB=basa.reduce((b,x)=>forcaCarta(x.carta,triomf,palL)>forcaCarta(b.carta,triomf,palL)?x:b);
  const millor=valides.reduce((b,c)=>forcaCarta(c,triomf,palL)>forcaCarta(b,triomf,palL)?c:b);
  const menor =valides.reduce((b,c)=>forcaCarta(c,triomf,palL)<forcaCarta(b,triomf,palL)?c:b);
  return forcaCarta(millor,triomf,palL)>forcaCarta(millorB.carta,triomf,palL)?millor:menor;
}

function triarTriomfIA(ma) {
  const c=PALS.map(pal=>({pal,n:ma.filter(c=>c.pal===pal).length}));
  c.sort((a,b)=>b.n-a.n); return c[0].pal;
}

// ─── COMPONENT CARTA ─────────────────────────────────────────────────────────
function Carta({carta,seleccionada,onClick,petita,dorsal,invalida}) {
  if(dorsal) return(
    <div style={{width:petita?34:54,height:petita?52:80,
      background:"linear-gradient(135deg,#1a3a5c,#0d2137)",
      border:"2px solid #2a5a8c",borderRadius:7,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:petita?12:18,color:"#2a5a8c",userSelect:"none",flexShrink:0}}>✦</div>
  );
  const color=invalida?"#ccc":PAL_COLOR[carta.pal];
  return(
    <div onClick={invalida?undefined:onClick} style={{
      width:petita?34:54,height:petita?52:80,
      background:seleccionada?"#f0f7ff":invalida?"#f8f8f8":"#fff",
      border:seleccionada?`2px solid ${PAL_COLOR[carta.pal]}`:`2px solid ${invalida?"#eee":"#ddd"}`,
      borderRadius:7,cursor:invalida?"not-allowed":onClick?"pointer":"default",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",
      padding:"3px 2px",
      boxShadow:seleccionada?`0 4px 12px ${PAL_COLOR[carta.pal]}55`:"0 2px 4px #0001",
      transform:seleccionada?"translateY(-8px)":"none",
      transition:"all 0.15s",userSelect:"none",flexShrink:0,opacity:invalida?0.35:1,
    }}>
      <span style={{fontSize:petita?8:10,color,fontWeight:700,alignSelf:"flex-start",paddingLeft:2}}>{NOM_CARTA[carta.num]}</span>
      <span style={{fontSize:petita?14:21,color}}>{PAL_SIMBOL[carta.pal]}</span>
      <span style={{fontSize:petita?8:10,color,fontWeight:700,alignSelf:"flex-end",paddingRight:2,transform:"rotate(180deg)"}}>{NOM_CARTA[carta.num]}</span>
    </div>
  );
}

// ─── MARCADOR ESPORTIU ────────────────────────────────────────────────────────
function Marcador({nomsJugadors,puntsPartida,puntsTotal,puntsObjectiu}) {
  const verd="#2d5a3d";
  const nomA=`${nomsJugadors[0]}/${nomsJugadors[2]}`;
  const nomB=`${nomsJugadors[1]}/${nomsJugadors[3]}`;
  const pctA=Math.min(100,(puntsTotal[0]/puntsObjectiu)*100);
  const pctB=Math.min(100,(puntsTotal[1]/puntsObjectiu)*100);
  return(
    <div style={{background:"#1a2a1a",borderRadius:10,padding:"8px 12px",margin:"4px 0",fontFamily:"monospace"}}>
      <div style={{display:"flex",gap:4,alignItems:"stretch"}}>
        {/* Parella A */}
        <div style={{flex:1,background:"#0d1f0d",borderRadius:7,padding:"6px 8px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#7a9a7a",marginBottom:2,letterSpacing:1}}>PARELLA A</div>
          <div style={{fontSize:10,color:"#aaccaa",marginBottom:3,fontFamily:"Georgia,serif",fontWeight:700}}>{nomA}</div>
          <div style={{fontSize:22,fontWeight:900,color:"#4dff91",letterSpacing:2,lineHeight:1}}>{puntsTotal[0]}</div>
          <div style={{fontSize:9,color:"#4a7a4a",marginTop:1}}>/ {puntsObjectiu}</div>
          {/* Barra parcial partida */}
          <div style={{marginTop:4,background:"#0a150a",borderRadius:3,height:4,overflow:"hidden"}}>
            <div style={{width:`${pctA}%`,background:"#4dff91",height:"100%",transition:"width 0.5s",borderRadius:3}}/>
          </div>
          <div style={{fontSize:9,color:"#7aaa7a",marginTop:3}}>Mà: <strong style={{color:"#fff"}}>{puntsPartida[0]}</strong></div>
        </div>
        {/* Separador */}
        <div style={{display:"flex",alignItems:"center",color:"#3a5a3a",fontSize:16,fontWeight:900,padding:"0 2px"}}>:</div>
        {/* Parella B */}
        <div style={{flex:1,background:"#0d1f0d",borderRadius:7,padding:"6px 8px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#7a9a7a",marginBottom:2,letterSpacing:1}}>PARELLA B</div>
          <div style={{fontSize:10,color:"#aaccaa",marginBottom:3,fontFamily:"Georgia,serif",fontWeight:700}}>{nomB}</div>
          <div style={{fontSize:22,fontWeight:900,color:"#4dff91",letterSpacing:2,lineHeight:1}}>{puntsTotal[1]}</div>
          <div style={{fontSize:9,color:"#4a7a4a",marginTop:1}}>/ {puntsObjectiu}</div>
          <div style={{marginTop:4,background:"#0a150a",borderRadius:3,height:4,overflow:"hidden"}}>
            <div style={{width:`${pctB}%`,background:"#4dff91",height:"100%",transition:"width 0.5s",borderRadius:3}}/>
          </div>
          <div style={{fontSize:9,color:"#7aaa7a",marginTop:3}}>Mà: <strong style={{color:"#fff"}}>{puntsPartida[1]}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ─── PANTALLA CONFIGURACIÓ ────────────────────────────────────────────────────
function PantallaConfig({onIniciar,puntsObjectiu,setPuntsObjectiu}) {
  const [assignacions,setAssignacions]=useState([0,1,2,3]);
  const [noms,setNoms]=useState(["","","",""]);
  const verd="#2d5a3d";
  function togglePos(idx){
    if(assignacions.includes(idx)){if(assignacions.length>1)setAssignacions(assignacions.filter(p=>p!==idx));}
    else setAssignacions([...assignacions,idx].sort((a,b)=>a-b));
  }
  function handleIniciar(){
    const nomsFinals=NOMS_POS.map((nom,i)=>assignacions.includes(i)&&noms[i].trim()?noms[i].trim():nom);
    onIniciar(assignacions,nomsFinals);
  }
  const descP=()=>{
    const pA=PARELLES[0].map(i=>assignacions.includes(i)?(noms[i].trim()||NOMS_POS[i]):"🤖").join("+");
    const pB=PARELLES[1].map(i=>assignacions.includes(i)?(noms[i].trim()||NOMS_POS[i]):"🤖").join("+");
    return `${pA} vs ${pB}`;
  };
  return(
    <div style={{background:"#fdf8f0",borderRadius:20,padding:28,maxWidth:440,width:"100%",boxShadow:"0 10px 40px #0002"}}>
      <h2 style={{color:verd,marginTop:0,textAlign:"center",fontSize:20}}>Qui juga?</h2>
      <p style={{color:"#666",fontSize:12,textAlign:"center",marginBottom:16}}>Toca per canviar entre <strong>👤 Humà</strong> i <strong>🤖 IA</strong></p>
      <div style={{position:"relative",width:220,height:220,margin:"0 auto 20px"}}>
        <div style={{position:"absolute",inset:44,background:"#ddeedd",borderRadius:14,border:"2px solid #aaccaa"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:"#9ab89a",fontSize:11,fontWeight:600}}>taula</div>
        {[{idx:0,style:{top:0,left:"50%",transform:"translateX(-50%)"}},
          {idx:1,style:{top:"50%",right:0,transform:"translateY(-50%)"}},
          {idx:2,style:{bottom:0,left:"50%",transform:"translateX(-50%)"}},
          {idx:3,style:{top:"50%",left:0,transform:"translateY(-50%)"}},
        ].map(({idx,style})=>{
          const esH=assignacions.includes(idx);
          return(<div key={idx} onClick={()=>togglePos(idx)} style={{
            position:"absolute",...style,width:58,height:58,
            marginLeft:(idx===1||idx===3)?0:"-29px",marginTop:(idx===0||idx===2)?0:"-29px",
            background:esH?verd:"#bbb",color:"#fff",borderRadius:10,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            cursor:"pointer",fontSize:10,fontWeight:700,
            boxShadow:esH?"0 3px 10px #2d5a3d55":"none",transition:"all 0.2s",
            border:`2px solid ${esH?"#1a3a2a":"#999"}`,
          }}><span style={{fontSize:18}}>{esH?"👤":"🤖"}</span><span>{NOMS_POS[idx]}</span></div>);
        })}
      </div>
      {assignacions.length>0&&(
        <div style={{marginBottom:16}}>
          <p style={{color:"#777",fontSize:11,textAlign:"center",marginBottom:8}}>Noms (opcional):</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
            {assignacions.map(idx=>(
              <input key={idx} placeholder={NOMS_POS[idx]} value={noms[idx]}
                onChange={e=>{const n=[...noms];n[idx]=e.target.value;setNoms(n);}}
                style={{width:88,padding:"5px 8px",borderRadius:7,border:"1.5px solid #ccc",fontSize:12,fontFamily:"Georgia,serif",textAlign:"center"}}/>
            ))}
          </div>
        </div>
      )}
      <div style={{marginBottom:20,textAlign:"center"}}>
        <p style={{color:"#666",fontSize:12,marginBottom:8,fontWeight:600}}>Partida fins a:</p>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {[1000,1500,2000].map(pts=>(
            <button key={pts} onClick={()=>setPuntsObjectiu(pts)} style={{
              background:puntsObjectiu===pts?verd:"transparent",color:puntsObjectiu===pts?"#fff":verd,
              border:`2px solid ${verd}`,borderRadius:9,padding:"8px 14px",fontSize:14,fontWeight:700,
              cursor:"pointer",fontFamily:"Georgia,serif",transition:"all 0.15s",
            }}>{pts}</button>
          ))}
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,color:"#999",marginBottom:10}}>
          {assignacions.length} humà{assignacions.length!==1?"ns":""} · {4-assignacions.length} IA · {descP()}
        </div>
        <button onClick={handleIniciar} style={{background:verd,color:"#fff",border:"none",borderRadius:12,padding:"13px 34px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Jugar! 🃏</button>
      </div>
    </div>
  );
}

// ─── LÒGICA PARTIDA ───────────────────────────────────────────────────────────
function nouEstat(puntsTotal,puntsObjectiu,jugadorsHumans,nomsJugadors,repartidor) {
  const cartes=[];
  for(const pal of PALS) for(const num of NUMS_BARALLA) cartes.push({pal,num,id:`${pal}-${num}`});
  const b=barrejar(cartes);
  const primerATirar=(repartidor+3)%4;
  const mans=[[],[],[],[]]; let idx=0;
  for(let r=0;r<5;r++) for(let j=0;j<4;j++) mans[(primerATirar+j)%4].push(b[idx++]);
  const cartaMig=b[idx++];
  const restants=b.slice(idx);
  return{
    fase:"triomf",mans,cartaMig,restants,
    palPrimeres:cartaMig.pal, // el pal que no es pot triar a segons
    triomf:null,quiVa:null,repartidor,
    torn:primerATirar,tornActual:primerATirar,
    basa:[],basaCongelada:null, // basaCongelada: les 4 cartes visibles 2s
    ultimaBasa:null,
    basesGuanyades:[[],[]],
    puntsPartida:[0,0],
    puntsTotal:puntsTotal||[0,0],
    puntsObjectiu:puntsObjectiu||1000,
    fase2:false,
    missatge:`${(nomsJugadors||NOMS_POS)[primerATirar]} decideix el triomf`,
    cants:[[],[],[],[]],
    cantsDeclarat:null,cantsAnunciats:[],primeraBasa:true,
    jugadorsHumans:jugadorsHumans||[0,1,2,3],
    nomsJugadors:nomsJugadors||["Nord","Est","Sud","Oest"],
  };
}

function repartirSegonFase(prev,quiVa) {
  const restants=barrejar([...prev.restants]);
  const novasMans=prev.mans.map(m=>[...m]); let idx=0;
  for(let j=0;j<4;j++){
    const jug=(prev.torn+j)%4;
    const n=jug===quiVa?2:3;
    for(let k=0;k<n;k++) if(idx<restants.length) novasMans[jug].push(restants[idx++]);
  }
  return{...prev,mans:novasMans,restants:[],cants:novasMans.map(ma=>calcularCants(ma,prev.triomf))};
}

function acceptarTriomfEstat(prev,pal) {
  const quiVa=prev.tornActual;
  const novasMans=prev.mans.map((m,i)=>i===quiVa?[...m,prev.cartaMig]:m);
  const e={...prev,mans:novasMans,cartaMig:null,triomf:pal};
  const e2=repartirSegonFase(e,quiVa);
  const mansOrdenades=e2.mans.map(m=>ordenarMa(m,pal));
  return{...e2,mans:mansOrdenades,fase:"joc",quiVa,
    missatge:`Triomf: ${pal.toUpperCase()} (${prev.nomsJugadors[quiVa]}). Comença ${prev.nomsJugadors[prev.torn]}!`,
    tornActual:prev.torn};
}

function rebutjarTriomfEstat(prev) {
  const seg=(prev.tornActual+1)%4;
  if(seg===prev.torn)
    return{...prev,fase2:true,tornActual:prev.torn,missatge:"Tothom ha refusat. Segones: trieu pal!"};
  return{...prev,tornActual:seg,missatge:`${prev.nomsJugadors[seg]} decideix`};
}

function processarJugada(prev,carta,cantAnunciat) {
  const jugador=prev.tornActual;
  const novasMans=prev.mans.map((m,i)=>i===jugador?m.filter(c=>c.id!==carta.id):m);
  const novaBasa=[...prev.basa,{jugador,carta}];
  let cantsAnunciats=[...(prev.cantsAnunciats||[])];
  if(prev.primeraBasa&&cantAnunciat!==undefined)
    cantsAnunciats=[...cantsAnunciats,{jugador,cants:cantAnunciat?prev.cants[jugador]:[]}];

  if(novaBasa.length===4){
    const guanyador=guanyadorBasa(novaBasa,prev.triomf);
    const pareG=PARELLES.findIndex(p=>p.includes(guanyador));
    const punts=novaBasa.reduce((s,b)=>s+puntsCarta(b.carta,prev.triomf),0);
    const nousPunts=prev.puntsPartida.map((p,i)=>i===pareG?p+punts:p);
    const novasBases=prev.basesGuanyades.map((b,i)=>i===pareG?[...b,novaBasa]:b);
    let puntsCants=[0,0];
    let cantsDeclarat=prev.cantsDeclarat;
    if(prev.primeraBasa){
      const r=resoldreCants(cantsAnunciats,prev.triomf);
      puntsCants=[r.punts0,r.punts1];
      cantsDeclarat=cantsAnunciats;
    }
    const nousPoints=nousPunts.map((p,i)=>p+puntsCants[i]);
    if(novasMans.every(m=>m.length===0)){
      const finalPunts=nousPoints.map((p,i)=>i===pareG?p+10:p);
      const quiVaPare=PARELLES.findIndex(p=>p.includes(prev.quiVa));
      const total=finalPunts[0]+finalPunts[1];
      const meitat=Math.ceil(total/2)+1;
      let nouTotal=prev.puntsTotal.slice();
      if(finalPunts[quiVaPare]>=meitat) nouTotal=nouTotal.map((p,i)=>p+finalPunts[i]);
      else nouTotal=nouTotal.map((p,i)=>i===quiVaPare?p:p+total);
      // Basa congelada 2s, després resultat
      return{...prev,mans:novasMans,basa:[],basaCongelada:novaBasa,ultimaBasa:novaBasa,
        basesGuanyades:novasBases,puntsPartida:finalPunts,puntsTotal:nouTotal,
        cantsDeclarat,cantsAnunciats,primeraBasa:false,
        fase:"basaCongelada",faseSegüent:"resultat",
        missatge:`${prev.nomsJugadors[guanyador]} guanya l'última basa!`};
    }
    return{...prev,mans:novasMans,basa:[],basaCongelada:novaBasa,ultimaBasa:novaBasa,
      basesGuanyades:novasBases,puntsPartida:nousPoints,
      cantsDeclarat,cantsAnunciats,primeraBasa:false,
      fase:"basaCongelada",faseSegüent:"joc",tornSegüent:guanyador,
      missatge:`${prev.nomsJugadors[guanyador]} guanya la basa (${punts}pts)`};
  }
  return{...prev,mans:novasMans,basa:novaBasa,cantsAnunciats,
    tornActual:(jugador+1)%4,
    missatge:`Torn de ${prev.nomsJugadors[(jugador+1)%4]}`};
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function BolotApp() {
  const [estat,setEstat]=useState(null);
  const [cartaSel,setCartaSel]=useState(null);
  const [pantalla,setPantalla]=useState("inici");
  const [puntsObjectiu,setPuntsObjectiu]=useState(1000);
  const [puntsTotal,setPuntsTotal]=useState([0,0]);
  const [mostrarRegles,setMostrarRegles]=useState(false);
  const [mostrarUltimaBasa,setMostrarUltimaBasa]=useState(false);
  const [repartidor,setRepartidor]=useState(null);
  const iaRef=useRef(null);
  const basaRef=useRef(null);

  const verd="#2d5a3d",accent="#8b1a1a",crema="#fdf8f0",bg="#f7f5f0";

  function iniciarPartida(jugadorsHumans,nomsJugadors) {
    const rep=repartidor!==null?(repartidor+1)%4:Math.floor(Math.random()*4);
    setRepartidor(rep);
    setEstat(nouEstat(puntsTotal,puntsObjectiu,jugadorsHumans,nomsJugadors,rep));
    setCartaSel(null);setMostrarUltimaBasa(false);setPantalla("joc");
  }

  // Basa congelada: espera 2s i passa a la fase següent
  useEffect(()=>{
    if(!estat||estat.fase!=="basaCongelada") return;
    clearTimeout(basaRef.current);
    basaRef.current=setTimeout(()=>{
      setEstat(prev=>{
        if(!prev||prev.fase!=="basaCongelada") return prev;
        if(prev.faseSegüent==="resultat")
          return{...prev,fase:"resultat",basaCongelada:null};
        return{...prev,fase:"joc",basaCongelada:null,basa:[],tornActual:prev.tornSegüent};
      });
    },2000);
    return()=>clearTimeout(basaRef.current);
  },[estat?.fase,estat?.basaCongelada]);

  // IA joc
  useEffect(()=>{
    if(!estat||estat.fase!=="joc") return;
    if(estat.jugadorsHumans.includes(estat.tornActual)) return;
    clearTimeout(iaRef.current);
    iaRef.current=setTimeout(()=>{
      const carta=triarCartaIA(estat.mans[estat.tornActual],estat.basa,estat.triomf);
      if(carta){
        const cantIA=estat.primeraBasa?(estat.cants[estat.tornActual].length>0):undefined;
        setCartaSel(null);
        setEstat(prev=>processarJugada(prev,carta,cantIA));
      }
    },1500); // punt 7: més lent
    return()=>clearTimeout(iaRef.current);
  },[estat?.tornActual,estat?.fase,estat?.basa?.length]);

  // IA triomf
  useEffect(()=>{
    if(!estat||estat.fase!=="triomf") return;
    if(estat.jugadorsHumans.includes(estat.tornActual)) return;
    clearTimeout(iaRef.current);
    iaRef.current=setTimeout(()=>{
      setEstat(prev=>{
        if(!prev||prev.fase!=="triomf") return prev;
        if(prev.fase2) return acceptarTriomfEstat(prev,triarTriomfIA(prev.mans[prev.tornActual]));
        const pal=triarTriomfIA(prev.mans[prev.tornActual]);
        const n=prev.mans[prev.tornActual].filter(c=>c.pal===pal).length;
        return n>=3?acceptarTriomfEstat(prev,pal):rebutjarTriomfEstat(prev);
      });
    },1000);
    return()=>clearTimeout(iaRef.current);
  },[estat?.tornActual,estat?.fase,estat?.fase2]);

  const nomP=(e,i)=>i===0?`${e.nomsJugadors[0]}/${e.nomsJugadors[2]}`:`${e.nomsJugadors[1]}/${e.nomsJugadors[3]}`;

  // ─── INICI ────────────────────────────────────────────────────────────────
  if(pantalla==="inici") return(
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center",maxWidth:460,padding:28}}>
        <div style={{fontSize:60,marginBottom:6}}>🃏</div>
        <h1 style={{fontSize:40,fontWeight:900,color:verd,letterSpacing:-1,margin:0}}>Bolot</h1>
        <p style={{color:"#777",fontSize:13,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Sagunt · Camp de Morvedre</p>
        <p style={{color:"#999",fontSize:13,marginBottom:28,lineHeight:1.6}}>El joc de cartes tradicional saguntí,<br/>derivat del belote francès.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
          <button onClick={()=>setPantalla("config")} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"13px 30px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Nova Partida</button>
          <button onClick={()=>setMostrarRegles(true)} style={{background:"transparent",color:verd,border:`2px solid ${verd}`,borderRadius:10,padding:"13px 20px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"Georgia,serif"}}>Regles</button>
        </div>
        <p style={{color:"#bbb",fontSize:12}}>1–4 jugadors · IA · Baralla espanyola</p>
      </div>
      {mostrarRegles&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99}} onClick={()=>setMostrarRegles(false)}>
          <div style={{background:crema,borderRadius:16,padding:28,maxWidth:500,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px #0005"}} onClick={e=>e.stopPropagation()}>
            <h2 style={{color:verd,marginTop:0}}>Regles del Bolot</h2>
            <p style={{lineHeight:1.8,color:"#333",fontSize:13}}>
              <strong>Repartiment:</strong> 5 cartes + 1 al mig. Qui va s'emporta la del mig i rep 2 més; els altres reben 3. Total 8.<br/>
              <strong>Primeres:</strong> El de la dreta del repartidor decideix si va al pal de la carta destapada.<br/>
              <strong>Segones:</strong> Si ningú vol a primeres, nova ronda on es pot triar qualsevol pal excepte el de la carta destapada. Si ningú vol a segones tampoc, el repartiment es repeteix amb el seguent repartidor.<br/>
              <strong>Arrastrar:</strong> Obligatori tirar el pal de la mà si en tens.<br/>
              <strong>Matar:</strong> Si hi ha triomf a la basa, has de superar-lo. Si no pots, pots tirar qualsevol triomf. Excepció: si guanya la teua parella.<br/>
              <strong>Cants:</strong> Tercera=20, Quarta=40, Quinta=50 · Quatre iguals: A/3/11/12=100, 9=150, 10=200 · Bolot(Rei+Cavall triomf)=20<br/>
              <strong>Cantar:</strong> Quan tires la primera carta de la partida. Sols suma la parella amb el cant individual més alt (tots els seus cants).
            </p>
            <button onClick={()=>setMostrarRegles(false)} style={{background:verd,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",cursor:"pointer",fontFamily:"Georgia,serif"}}>Tancar</button>
          </div>
        </div>
      )}
    </div>
  );

  if(pantalla==="config") return(
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
      <button onClick={()=>setPantalla("inici")} style={{alignSelf:"flex-start",background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:13,marginBottom:10}}>← Tornar</button>
      <PantallaConfig onIniciar={iniciarPartida} puntsObjectiu={puntsObjectiu} setPuntsObjectiu={setPuntsObjectiu}/>
    </div>
  );

  if(!estat) return null;

  const{mans,triomf,fase,tornActual,basa,puntsPartida,puntsTotal:pt,
    cants,nomsJugadors,jugadorsHumans,cartaMig,ultimaBasa,primeraBasa,
    basaCongelada,palPrimeres}=estat;

  // ─── RESULTAT ─────────────────────────────────────────────────────────────
  if(fase==="resultat"){
    const obj=estat.puntsObjectiu;
    const g=pt[0]>=obj?0:pt[1]>=obj?1:-1;
    return(
      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
        <div style={{background:crema,borderRadius:20,padding:36,maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 10px 40px #0002"}}>
          <div style={{fontSize:44}}>{g>=0?"🏆":"🃏"}</div>
          <h2 style={{color:verd,fontSize:26,margin:"8px 0"}}>Fi de Mà</h2>
          {g>=0&&<p style={{color:accent,fontWeight:700,fontSize:17}}>🎉 Guanya {nomP(estat,g)}!</p>}
          <Marcador nomsJugadors={nomsJugadors} puntsPartida={puntsPartida} puntsTotal={pt} puntsObjectiu={obj}/>
          <div style={{fontSize:11,color:"#aaa",margin:"12px 0"}}>Objectiu: {obj} punts</div>
          {g>=0?(
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>{setPuntsTotal([0,0]);setPantalla("config");setEstat(null);}} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Nova Partida</button>
              <button onClick={()=>{setPantalla("inici");setEstat(null);setPuntsTotal([0,0]);}} style={{background:"transparent",color:"#888",border:"1px solid #ccc",borderRadius:10,padding:"11px 14px",fontSize:13,cursor:"pointer"}}>Menú</button>
            </div>
          ):(
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>iniciarPartida(jugadorsHumans,nomsJugadors)} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Repartir de nou ↺</button>
              <button onClick={()=>{setPuntsTotal([0,0]);setPantalla("config");setEstat(null);}} style={{background:"transparent",color:"#888",border:"1px solid #ccc",borderRadius:10,padding:"11px 14px",fontSize:12,cursor:"pointer"}}>Nova Partida</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── TRIOMF ───────────────────────────────────────────────────────────────
  if(fase==="triomf"){
    const esH=jugadorsHumans.includes(tornActual);
    // A segons: no es pot triar el pal de la carta destapada
    const palsDisponibles=estat.fase2?PALS.filter(p=>p!==palPrimeres):PALS;
    return(
      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:crema,borderRadius:20,padding:26,maxWidth:500,width:"100%",boxShadow:"0 10px 40px #0002"}}>
          <h2 style={{color:verd,textAlign:"center",marginTop:0,fontSize:18}}>
            {estat.fase2?"🔄 Segones: Trieu el triomf":`🃏 ${nomsJugadors[tornActual]}: vols anar?`}
          </h2>
          {cartaMig&&(
            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:11,color:"#888",marginBottom:4}}>Carta destapada{estat.fase2?" (no es pot triar este pal a segons)":""}:</div>
              <div style={{display:"inline-block"}}><Carta carta={cartaMig}/></div>
            </div>
          )}
          {!esH?(
            <div style={{textAlign:"center",padding:16,color:"#888"}}>
              <div style={{fontSize:28,marginBottom:6}}>🤖</div>
              <div style={{fontSize:13}}>{nomsJugadors[tornActual]} (IA) està pensant...</div>
            </div>
          ):(
            <>
              <p style={{color:"#666",fontSize:12,textAlign:"center",marginBottom:6}}>Les teues {mans[tornActual].length} cartes:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",marginBottom:10}}>
                {mans[tornActual].map(c=><Carta key={c.id} carta={c}/>)}
              </div>
              {estat.fase2?(
                <>
                  <p style={{color:"#555",fontSize:12,textAlign:"center",marginBottom:8}}>
                    Escolliu el pal de triomf (no podeu triar {PAL_SIMBOL[palPrimeres]} {palPrimeres}):
                  </p>
                  <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap",marginBottom:10}}>
                    {palsDisponibles.map(pal=>(
                      <button key={pal} onClick={()=>setEstat(prev=>acceptarTriomfEstat(prev,pal))} style={{
                        background:PAL_COLOR[pal],color:"#fff",border:"none",borderRadius:9,
                        padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:4,
                      }}>{PAL_SIMBOL[pal]} {pal}</button>
                    ))}
                  </div>
                  {/* Punt 1: opció de no anar a segons */}
                  <div style={{textAlign:"center"}}>
                    <button onClick={()=>setEstat(prev=>rebutjarTriomfEstat(prev))} style={{
                      background:"#888",color:"#fff",border:"none",borderRadius:9,
                      padding:"9px 22px",fontSize:13,fontWeight:600,cursor:"pointer"
                    }}>No vaig →</button>
                  </div>
                </>
              ):(
                <>
                  <p style={{color:"#555",fontSize:12,textAlign:"center",marginBottom:8}}>Aneu al pal de la carta destapada, o passeu:</p>
                  <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:10}}>
                    {PALS.map(pal=>(
                      <button key={pal} onClick={()=>setEstat(prev=>acceptarTriomfEstat(prev,pal))} style={{
                        background:pal===cartaMig?.pal?PAL_COLOR[pal]:"#eee",
                        color:pal===cartaMig?.pal?"#fff":"#666",
                        border:`2px solid ${pal===cartaMig?.pal?PAL_COLOR[pal]:"#ddd"}`,
                        borderRadius:9,padding:"9px 13px",fontSize:13,fontWeight:700,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:4,
                      }}>{PAL_SIMBOL[pal]} {pal}</button>
                    ))}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <button onClick={()=>setEstat(prev=>rebutjarTriomfEstat(prev))} style={{
                      background:"#888",color:"#fff",border:"none",borderRadius:9,
                      padding:"9px 22px",fontSize:13,fontWeight:600,cursor:"pointer"
                    }}>No vaig →</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── JOC + BASA CONGELADA ─────────────────────────────────────────────────
  const basaVisible=basaCongelada||basa;
  const valides=fase==="joc"?cartesValides(mans[tornActual]||[],basa,triomf):[];
  const jaHaAnunciat=(estat.cantsAnunciats||[]).some(x=>x.jugador===tornActual);

  function tirarCarta(ambCant){
    if(!cartaSel) return;
    setEstat(prev=>processarJugada(prev,cartaSel,ambCant));
    setCartaSel(null);
  }

  const renderJugador=(idx,posicio)=>{
    const esActiu=fase==="joc"&&tornActual===idx;
    const esH=jugadorsHumans.includes(idx);
    const petita=posicio!=="baix";
    const vertical=posicio==="esquerra"||posicio==="dreta";
    const cartesJug=mans[idx]||[];
    const esQuiVa=estat.quiVa===idx;
    const esRepartidor=idx===estat.repartidor;
    // Punt 5+6: marques visibles de qui ix (torn) i qui va
    const etiquetes=[];
    if(esActiu) etiquetes.push({text:"▶ TIRA",color:accent,bg:"#fff0f0"});
    if(esQuiVa&&triomf) etiquetes.push({text:`VA ${PAL_SIMBOL[triomf]}`,color:PAL_COLOR[triomf],bg:"#fffff0"});
    if(esRepartidor) etiquetes.push({text:"🎴 REP",color:"#888",bg:"#f0f0f0"});

    return(
      <div style={{textAlign:"center"}}>
        {/* Etiquetes visibles */}
        <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:3,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"#999"}}>{nomsJugadors[idx]} {esH?"👤":"🤖"} {PARELLES[0].includes(idx)?"(A)":"(B)"}</span>
          {etiquetes.map((e,i)=>(
            <span key={i} style={{fontSize:9,fontWeight:800,color:e.color,background:e.bg,
              border:`1px solid ${e.color}44`,borderRadius:4,padding:"1px 5px",letterSpacing:0.5}}>
              {e.text}
            </span>
          ))}
        </div>
        {/* Cartes */}
        <div style={{display:"flex",flexDirection:vertical?"column":"row",gap:3,flexWrap:"wrap",justifyContent:"center",maxWidth:vertical?"auto":480}}>
          {cartesJug.map(c=>{
            const esInvalida=esActiu&&esH&&!valides.some(v=>v.id===c.id);
            // Punt 8: sempre es veuen les cartes dels jugadors humans
            return esH
              ?(esActiu
                ?<Carta key={c.id} carta={c} petita={petita} invalida={esInvalida}
                    seleccionada={!esInvalida&&cartaSel?.id===c.id}
                    onClick={esInvalida?undefined:()=>setCartaSel(cartaSel?.id===c.id?null:c)}/>
                :<Carta key={c.id} carta={c} petita={petita}/>)
              :<Carta key={c.id} carta={c} dorsal petita={petita}/>;
          })}
        </div>
        {/* Botons acció */}
        {esActiu&&esH&&cartaSel&&valides.some(v=>v.id===cartaSel.id)&&(
          <div style={{marginTop:6,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
            {primeraBasa&&!jaHaAnunciat&&(
              <>
                {(cants[tornActual]||[]).length>0&&(
                  <button onClick={()=>tirarCarta(true)} style={{
                    background:"#c8963e",color:"#fff",border:"none",borderRadius:9,
                    padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
                  }}>🎵 Cant! ({(cants[tornActual]||[]).map(c=>c.text).join(", ")})</button>
                )}
                <button onClick={()=>tirarCarta(false)} style={{
                  background:verd,color:"#fff",border:"none",borderRadius:9,
                  padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
                }}>{(cants[tornActual]||[]).length>0?"Tirar sense cantar":`Tirar ${NOM_CARTA[cartaSel.num]} ${PAL_SIMBOL[cartaSel.pal]}`}</button>
              </>
            )}
            {!primeraBasa&&(
              <button onClick={()=>tirarCarta(undefined)} style={{
                background:verd,color:"#fff",border:"none",borderRadius:9,
                padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
              }}>Tirar {NOM_CARTA[cartaSel.num]} {PAL_SIMBOL[cartaSel.pal]}</button>
            )}
          </div>
        )}
        {esActiu&&!esH&&<div style={{fontSize:10,color:"#bbb",marginTop:3}}>🤖 pensant...</div>}
        {fase==="basaCongelada"&&basaCongelada&&<div style={{height:6}}/>}
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:bg,fontFamily:"Georgia,serif",display:"flex",flexDirection:"column"}}>
      {/* Barra superior */}
      <div style={{background:verd,color:"#fff",padding:"6px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{fontWeight:700,fontSize:14}}>🃏 Bolot</span>
        <div style={{display:"flex",gap:8,fontSize:11,alignItems:"center"}}>
          <span>Triomf: <strong>{triomf?`${PAL_SIMBOL[triomf]} ${triomf}`:"—"}</strong></span>
          {ultimaBasa&&(
            <button onClick={()=>setMostrarUltimaBasa(true)} style={{
              background:"#ffffff22",color:"#fff",border:"1px solid #ffffff55",
              borderRadius:5,padding:"2px 7px",cursor:"pointer",fontSize:10
            }}>Última basa</button>
          )}
        </div>
        <button onClick={()=>{setPantalla("inici");setEstat(null);}} style={{background:"transparent",color:"#fff",border:"1px solid #ffffff44",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10}}>Menú</button>
      </div>

      {/* Marcador esportiu */}
      <div style={{padding:"0 10px"}}>
        <Marcador nomsJugadors={nomsJugadors} puntsPartida={puntsPartida} puntsTotal={pt} puntsObjectiu={estat.puntsObjectiu}/>
      </div>

      {/* Modal última basa - punt 4: disposició com la taula */}
      {mostrarUltimaBasa&&ultimaBasa&&(
        <div style={{position:"fixed",inset:0,background:"#0007",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99}} onClick={()=>setMostrarUltimaBasa(false)}>
          <div style={{background:crema,borderRadius:16,padding:24,maxWidth:300,width:"90%",boxShadow:"0 10px 40px #0005",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{color:verd,marginTop:0,fontSize:16}}>Última basa</h3>
            <div style={{position:"relative",width:160,height:160,margin:"0 auto 12px"}}>
              {ultimaBasa.map(({jugador,carta})=>{
                const posMap={
                  0:{top:0,left:"50%",transform:"translateX(-50%)"},
                  1:{top:"50%",right:0,transform:"translateY(-50%)"},
                  2:{bottom:0,left:"50%",transform:"translateX(-50%)"},
                  3:{top:"50%",left:0,transform:"translateY(-50%)"},
                };
                const noms2={0:"Nord",1:"Est",2:"Sud",3:"Oest"};
                return(
                  <div key={carta.id} style={{position:"absolute",...posMap[jugador],textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#666",marginBottom:2}}>{nomsJugadors[jugador]}</div>
                    <Carta carta={carta}/>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>
              Guanyada per: <strong>{nomsJugadors[guanyadorBasa(ultimaBasa,triomf)]}</strong>
            </div>
            <button onClick={()=>setMostrarUltimaBasa(false)} style={{background:verd,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:13}}>Tancar</button>
          </div>
        </div>
      )}

      {/* Taula */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"4px 10px",gap:4}}>
        {renderJugador(0,"dalt")}
        <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
          <div style={{minWidth:52}}>{renderJugador(3,"esquerra")}</div>
          {/* Centre */}
          <div style={{flex:1,background:fase==="basaCongelada"?"#d4e8d4":"#e8f0e8",
            borderRadius:12,padding:8,minHeight:140,position:"relative",
            display:"flex",alignItems:"center",justifyContent:"center",
            transition:"background 0.3s",
            boxShadow:fase==="basaCongelada"?"inset 0 0 0 2px #2d5a3d55":"none"}}>
            {basaVisible.length>0?(
              <div style={{position:"relative",width:140,height:140}}>
                {basaVisible.map(({jugador,carta})=>{
                  const posMap={
                    0:{top:0,left:"50%",transform:"translateX(-50%)"},
                    1:{top:"50%",right:0,transform:"translateY(-50%)"},
                    2:{bottom:0,left:"50%",transform:"translateX(-50%)"},
                    3:{top:"50%",left:0,transform:"translateY(-50%)"},
                  };
                  return(<div key={carta.id} style={{position:"absolute",...posMap[jugador]}}><Carta carta={carta} petita/></div>);
                })}
              </div>
            ):(
              <div style={{color:"#ccc",fontSize:12}}>Taula buida</div>
            )}
            <div style={{position:"absolute",bottom:4,fontSize:9,color:"#888",textAlign:"center",width:"100%"}}>
              {estat.missatge}
            </div>
            {fase==="basaCongelada"&&(
              <div style={{position:"absolute",top:4,fontSize:9,color:verd,fontWeight:700,textAlign:"center",width:"100%"}}>
                ✓ Basa recollida
              </div>
            )}
          </div>
          <div style={{minWidth:52}}>{renderJugador(1,"dreta")}</div>
        </div>
        {renderJugador(2,"baix")}
      </div>
    </div>
  );
}
