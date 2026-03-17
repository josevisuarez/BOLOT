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

// Mides depenent de configuració
const CFG_MIDES = {
  mobil:    { cW:46, cH:70, cWp:30, cHp:46, cWc:54, cHc:80, fs:11, fsp:9,  fsEt:10, gap:4  },
  ordinador:{ cW:58, cH:86, cWp:38, cHp:58, cWc:70, cHc:104,fs:13, fsp:10, fsEt:12, gap:5  },
  gran:     { cW:72, cH:108,cWp:46, cHp:70, cWc:86, cHc:128,fs:15, fsp:12, fsEt:14, gap:6  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const barrejar = arr => {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};

function ordenarMa(ma,triomf) {
  const op=triomf?[triomf,...PALS.filter(p=>p!==triomf)]:PALS;
  return [...ma].sort((a,b)=>{
    const pa=op.indexOf(a.pal),pb=op.indexOf(b.pal);
    if(pa!==pb) return pa-pb;
    const va=a.pal===triomf?(PUNTS_TRIOMF[a.num]??0):(PUNTS_NORMAL[a.num]??0);
    const vb=b.pal===triomf?(PUNTS_TRIOMF[b.num]??0):(PUNTS_NORMAL[b.num]??0);
    return vb-va;
  });
}

function forcaCarta(carta,triomf,palLiderat) {
  if(carta.pal===triomf)     return 100+ORDRE_TRIOMF.indexOf(carta.num);
  if(carta.pal===palLiderat) return  10+ORDRE_NORMAL.indexOf(carta.num);
  return ORDRE_NORMAL.indexOf(carta.num);
}

function guanyadorBasa(basa,triomf) {
  const pal0=basa[0].carta.pal; let m=0;
  for(let i=1;i<basa.length;i++)
    if(forcaCarta(basa[i].carta,triomf,pal0)>forcaCarta(basa[m].carta,triomf,pal0)) m=i;
  return basa[m].jugador;
}

const puntsCarta=(c,t)=>c.pal===t?(PUNTS_TRIOMF[c.num]??0):(PUNTS_NORMAL[c.num]??0);

// ─── CANTS ───────────────────────────────────────────────────────────────────
function calcularCants(ma,triomf) {
  const cants=[];
  for(const pal of PALS){
    const nums=ma.filter(c=>c.pal===pal).map(c=>c.num);
    let mx=0;
    for(let i=0;i<ORDRE_SEQ.length;i++){
      let l=0; while(i+l<ORDRE_SEQ.length&&nums.includes(ORDRE_SEQ[i+l]))l++;
      if(l>mx)mx=l;
    }
    if(mx===3)cants.push({tipus:"tercera",pal,valor:20,text:"Tercera"});
    if(mx===4)cants.push({tipus:"quarta",pal,valor:40,text:"Quarta"});
    if(mx>=5) cants.push({tipus:"quinta",pal,valor:50,text:"Quinta"});
  }
  const q=[{num:1,valor:100,text:"Cent (4 As)"},{num:3,valor:100,text:"Cent (4 tresos)"},
    {num:11,valor:100,text:"Cent (4 onzens)"},{num:12,valor:100,text:"Cent (4 dotzens)"},
    {num:9,valor:150,text:"150 (4 nous)"},{num:10,valor:200,text:"200 (4 deens)"}];
  for(const {num,valor,text} of q)
    if(PALS.every(pal=>ma.some(c=>c.pal===pal&&c.num===num)))
      cants.push({tipus:"quatre",num,valor,text});
  if(triomf){
    if(ma.some(c=>c.pal===triomf&&c.num===11)&&ma.some(c=>c.pal===triomf&&c.num===12))
      cants.push({tipus:"bolot",pal:triomf,valor:20,text:`Bolot`});
  }
  return cants;
}

function resoldreCants(cantsDeclarat,triomf) {
  if(!cantsDeclarat||!cantsDeclarat.length) return {pareGuanyador:-1,punts0:0,punts1:0};
  const amb=cantsDeclarat.filter(x=>x.cants&&x.cants.length>0);
  if(!amb.length) return {pareGuanyador:-1,punts0:0,punts1:0};
  const mjug=amb.map(({jugador,cants})=>({
    jugador,
    millor:Math.max(...cants.map(c=>c.valor)),
    millorCant:cants.reduce((b,c)=>c.valor>b.valor?c:b),
    total:cants.reduce((s,c)=>s+c.valor,0),
  }));
  const mv=Math.max(...mjug.map(x=>x.millor));
  const ambM=mjug.filter(x=>x.millor===mv);
  let g;
  if(ambM.length===1){g=ambM[0].jugador;}
  else{
    const dt=ambM.filter(x=>x.millorCant.pal===triomf);
    g=dt.length>0?dt[0].jugador:ambM[0].jugador;
  }
  const pareG=PARELLES.findIndex(p=>p.includes(g));
  const tot=mjug.filter(x=>PARELLES[pareG].includes(x.jugador)).reduce((s,x)=>s+x.total,0);
  return{pareGuanyador:pareG,punts0:pareG===0?tot:0,punts1:pareG===1?tot:0};
}

// ─── CARTES VÀLIDES ───────────────────────────────────────────────────────────
function cartesValides(ma,basa,triomf) {
  if(!basa.length) return ma;
  const palL=basa[0].carta.pal;
  const ganyant=guanyadorBasa(basa,triomf);
  const pareG=PARELLES.findIndex(p=>p.includes(ganyant));
  const jugAct=(basa[basa.length-1].jugador+1)%4;
  const pareAct=PARELLES.findIndex(p=>p.includes(jugAct));
  const companya=pareAct===pareG;

  // REGLA 1: Si té el pal liderat, SEMPRE ha d'arrastrar (sense excepcions)
  const delPal=ma.filter(c=>c.pal===palL);
  if(delPal.length) return delPal;

  // REGLA 2: No té el pal. Si company guanya, pot tirar qualsevol
  if(companya) return ma;

  // REGLA 3: No té el pal i company NO guanya: ha de matar amb triomf si pot
  const tMa=ma.filter(c=>c.pal===triomf);
  if(!tMa.length) return ma; // Sense triomf: qualsevol carta
  const tBasa=basa.some(b=>b.carta.pal===triomf);
  if(tBasa){
    const mTB=basa.filter(b=>b.carta.pal===triomf)
      .reduce((b,x)=>ORDRE_TRIOMF.indexOf(x.carta.num)>ORDRE_TRIOMF.indexOf(b.carta.num)?x:b);
    const sup=tMa.filter(c=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(mTB.carta.num));
    if(sup.length) return sup; // Ha de superar el triomf existent
    return tMa; // No pot superar, però ha de tirar triomf
  }
  return tMa; // No hi ha triomf a la basa, mata amb el mínim triomf
}

// ─── IA ──────────────────────────────────────────────────────────────────────
function triarCartaIA(ma,basa,triomf) {
  const v=cartesValides(ma,basa,triomf);
  if(!v.length) return null;
  if(!basa.length){
    const t=v.filter(c=>c.pal===triomf);
    if(t.length) return t.reduce((b,c)=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(b.num)?c:b);
    return v.reduce((b,c)=>puntsCarta(c,triomf)>puntsCarta(b,triomf)?c:b);
  }
  const pL=basa[0].carta.pal;
  const mB=basa.reduce((b,x)=>forcaCarta(x.carta,triomf,pL)>forcaCarta(b.carta,triomf,pL)?x:b);
  const mm=v.reduce((b,c)=>forcaCarta(c,triomf,pL)>forcaCarta(b,triomf,pL)?c:b);
  const mn=v.reduce((b,c)=>forcaCarta(c,triomf,pL)<forcaCarta(b,triomf,pL)?c:b);
  return forcaCarta(mm,triomf,pL)>forcaCarta(mB.carta,triomf,pL)?mm:mn;
}
function triarTriomfIA(ma){
  const c=PALS.map(pal=>({pal,n:ma.filter(c=>c.pal===pal).length}));
  c.sort((a,b)=>b.n-a.n); return c[0].pal;
}

// ─── COMPONENT CARTA ─────────────────────────────────────────────────────────
function Carta({carta,seleccionada,onClick,mida,dorsal,invalida}) {
  const m=mida||{cW:54,cH:80,fs:10,fsp:10};
  const w=m.cW,h=m.cH,f=m.fs||10;
  if(dorsal) return(
    <div style={{width:w,height:h,background:"linear-gradient(135deg,#1a3a5c,#0d2137)",
      border:"2px solid #2a5a8c",borderRadius:7,display:"flex",alignItems:"center",
      justifyContent:"center",fontSize:f+4,color:"#2a5a8c",userSelect:"none",flexShrink:0}}>✦</div>
  );
  const col=invalida?"#ccc":PAL_COLOR[carta.pal];
  return(
    <div onClick={invalida?undefined:onClick} style={{
      width:w,height:h,
      background:seleccionada?"#f0f7ff":invalida?"#f8f8f8":"#fff",
      border:seleccionada?`2px solid ${PAL_COLOR[carta.pal]}`:`2px solid ${invalida?"#eee":"#ddd"}`,
      borderRadius:7,cursor:invalida?"not-allowed":onClick?"pointer":"default",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",
      padding:"3px 2px",
      boxShadow:seleccionada?`0 4px 12px ${PAL_COLOR[carta.pal]}55`:"0 2px 4px #0001",
      transform:seleccionada?"translateY(-8px)":"none",
      transition:"transform 0.15s, box-shadow 0.15s",
      userSelect:"none",flexShrink:0,opacity:invalida?0.35:1,
    }}>
      <span style={{fontSize:f,color:col,fontWeight:700,alignSelf:"flex-start",paddingLeft:2}}>{NOM_CARTA[carta.num]}</span>
      <span style={{fontSize:f+8,color:col}}>{PAL_SIMBOL[carta.pal]}</span>
      <span style={{fontSize:f,color:col,fontWeight:700,alignSelf:"flex-end",paddingRight:2,transform:"rotate(180deg)"}}>{NOM_CARTA[carta.num]}</span>
    </div>
  );
}

// ─── MARCADOR ────────────────────────────────────────────────────────────────
function Marcador({nomsJugadors,puntsPartida,puntsTotal,puntsObjectiu,mida}) {
  const fs=mida?.fs||11;
  const verd="#2d5a3d";
  const nomA=`${nomsJugadors[0]}/${nomsJugadors[2]}`;
  const nomB=`${nomsJugadors[1]}/${nomsJugadors[3]}`;
  const pctA=Math.min(100,(puntsTotal[0]/puntsObjectiu)*100);
  const pctB=Math.min(100,(puntsTotal[1]/puntsObjectiu)*100);
  return(
    <div style={{background:"#1a2a1a",borderRadius:10,padding:"6px 10px",margin:"3px 0",fontFamily:"monospace"}}>
      <div style={{display:"flex",gap:4,alignItems:"stretch"}}>
        {[0,1].map(i=>{
          const nom=i===0?nomA:nomB;
          const pt=puntsTotal[i],pp=puntsPartida[i],pct=i===0?pctA:pctB;
          return(
            <div key={i} style={{flex:1,background:"#0d1f0d",borderRadius:7,padding:"5px 7px",textAlign:"center"}}>
              <div style={{fontSize:fs-3,color:"#7a9a7a",marginBottom:1,letterSpacing:1}}>{i===0?"PARELLA A":"PARELLA B"}</div>
              <div style={{fontSize:fs-2,color:"#aaccaa",marginBottom:2,fontFamily:"Georgia,serif",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nom}</div>
              <div style={{fontSize:fs+10,fontWeight:900,color:"#4dff91",letterSpacing:2,lineHeight:1}}>{pt}</div>
              <div style={{fontSize:fs-3,color:"#4a7a4a"}}>/ {puntsObjectiu}</div>
              <div style={{marginTop:3,background:"#0a150a",borderRadius:3,height:4,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,background:"#4dff91",height:"100%",borderRadius:3}}/>
              </div>
              <div style={{fontSize:fs-2,color:"#7aaa7a",marginTop:2}}>Mà: <strong style={{color:"#fff"}}>{pp}</strong></div>
            </div>
          );
        })}
        <div style={{display:"flex",alignItems:"center",color:"#3a5a3a",fontSize:fs+4,fontWeight:900,padding:"0 2px"}}>:</div>
      </div>
    </div>
  );
}

// ─── PANTALLA CONFIG JUGADORS ─────────────────────────────────────────────────
function PantallaConfig({onIniciar,puntsObjectiu,setPuntsObjectiu,midaTria,setMidaTria}) {
  const [assignacions,setAssignacions]=useState([0,1,2,3]);
  const [noms,setNoms]=useState(["","","",""]);
  const verd="#2d5a3d";
  const togglePos=idx=>{
    if(assignacions.includes(idx)){if(assignacions.length>1)setAssignacions(assignacions.filter(p=>p!==idx));}
    else setAssignacions([...assignacions,idx].sort((a,b)=>a-b));
  };
  const handleIniciar=()=>{
    const nf=NOMS_POS.map((n,i)=>assignacions.includes(i)&&noms[i].trim()?noms[i].trim():n);
    onIniciar(assignacions,nf);
  };
  const descP=()=>{
    const pA=PARELLES[0].map(i=>assignacions.includes(i)?(noms[i].trim()||NOMS_POS[i]):"🤖").join("+");
    const pB=PARELLES[1].map(i=>assignacions.includes(i)?(noms[i].trim()||NOMS_POS[i]):"🤖").join("+");
    return `${pA} vs ${pB}`;
  };
  return(
    <div style={{background:"#fdf8f0",borderRadius:20,padding:24,maxWidth:440,width:"100%",boxShadow:"0 10px 40px #0002"}}>
      <h2 style={{color:verd,marginTop:0,textAlign:"center",fontSize:20}}>Configuració</h2>
      {/* Qui juga */}
      <p style={{color:"#666",fontSize:12,textAlign:"center",marginBottom:12}}>Toca per canviar <strong>👤 Humà</strong> / <strong>🤖 IA</strong></p>
      <div style={{position:"relative",width:200,height:200,margin:"0 auto 16px"}}>
        <div style={{position:"absolute",inset:42,background:"#ddeedd",borderRadius:14,border:"2px solid #aaccaa"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:"#9ab89a",fontSize:10,fontWeight:600}}>taula</div>
        {[{idx:0,style:{top:0,left:"50%",transform:"translateX(-50%)"}},
          {idx:1,style:{top:"50%",right:0,transform:"translateY(-50%)"}},
          {idx:2,style:{bottom:0,left:"50%",transform:"translateX(-50%)"}},
          {idx:3,style:{top:"50%",left:0,transform:"translateY(-50%)"}},
        ].map(({idx,style})=>{
          const esH=assignacions.includes(idx);
          return(<div key={idx} onClick={()=>togglePos(idx)} style={{
            position:"absolute",...style,width:54,height:54,
            marginLeft:(idx===1||idx===3)?0:"-27px",marginTop:(idx===0||idx===2)?0:"-27px",
            background:esH?verd:"#bbb",color:"#fff",borderRadius:10,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            cursor:"pointer",fontSize:10,fontWeight:700,
            boxShadow:esH?"0 3px 10px #2d5a3d55":"none",transition:"all 0.2s",
            border:`2px solid ${esH?"#1a3a2a":"#999"}`,
          }}><span style={{fontSize:16}}>{esH?"👤":"🤖"}</span><span>{NOMS_POS[idx]}</span></div>);
        })}
      </div>
      {/* Noms */}
      {assignacions.length>0&&(
        <div style={{marginBottom:14}}>
          <p style={{color:"#777",fontSize:11,textAlign:"center",marginBottom:6}}>Noms (opcional):</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
            {assignacions.map(idx=>(
              <input key={idx} placeholder={NOMS_POS[idx]} value={noms[idx]}
                onChange={e=>{const n=[...noms];n[idx]=e.target.value;setNoms(n);}}
                style={{width:84,padding:"5px 8px",borderRadius:7,border:"1.5px solid #ccc",fontSize:12,fontFamily:"Georgia,serif",textAlign:"center"}}/>
            ))}
          </div>
        </div>
      )}
      {/* Mida */}
      <div style={{marginBottom:14,textAlign:"center"}}>
        <p style={{color:"#666",fontSize:12,marginBottom:6,fontWeight:600}}>Mida de les cartes:</p>
        <div style={{display:"flex",gap:6,justifyContent:"center"}}>
          {[["mobil","📱 Mòbil"],["ordinador","🖥️ Ordinador"],["gran","🔍 Gran"]].map(([k,label])=>(
            <button key={k} onClick={()=>setMidaTria(k)} style={{
              background:midaTria===k?verd:"transparent",color:midaTria===k?"#fff":verd,
              border:`2px solid ${verd}`,borderRadius:9,padding:"7px 12px",fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:"Georgia,serif",transition:"all 0.15s",
            }}>{label}</button>
          ))}
        </div>
      </div>
      {/* Punts */}
      <div style={{marginBottom:18,textAlign:"center"}}>
        <p style={{color:"#666",fontSize:12,marginBottom:6,fontWeight:600}}>Partida fins a:</p>
        <div style={{display:"flex",gap:6,justifyContent:"center"}}>
          {[1000,1500,2000].map(pts=>(
            <button key={pts} onClick={()=>setPuntsObjectiu(pts)} style={{
              background:puntsObjectiu===pts?verd:"transparent",color:puntsObjectiu===pts?"#fff":verd,
              border:`2px solid ${verd}`,borderRadius:9,padding:"7px 13px",fontSize:14,fontWeight:700,
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
    palPrimeres:cartaMig.pal,
    triomf:null,quiVa:null,repartidor,
    torn:primerATirar,tornActual:primerATirar,
    basa:[],basaCongelada:null,ultimaBasa:null,
    basesGuanyades:[[],[]],
    puntsPartida:[0,0],
    // IMPORTANT: puntsTotal es passa de fora i NO es reinicia
    puntsTotal:puntsTotal||[0,0],
    puntsObjectiu:puntsObjectiu||1000,
    fase2:false,
    missatge:`${(nomsJugadors||NOMS_POS)[primerATirar]} decideix el triomf`,
    cants:[[],[],[],[]],
    cantsDeclarat:null,cantsAnunciats:[],primeraBasa:true,
    mostrantCants:false, // per mostrar els cants al centre durant 2s
    resum_cants:null,    // text dels cants a mostrar
    jugadorsHumans:jugadorsHumans||[0,1,2,3],
    nomsJugadors:nomsJugadors||["Nord","Est","Sud","Oest"],
  };
}

function repartirSegonFase(prev,quiVa){
  const r=barrejar([...prev.restants]);
  const nm=prev.mans.map(m=>[...m]); let idx=0;
  for(let j=0;j<4;j++){
    const jug=(prev.torn+j)%4;
    const n=jug===quiVa?2:3;
    for(let k=0;k<n;k++) if(idx<r.length) nm[jug].push(r[idx++]);
  }
  return{...prev,mans:nm,restants:[],cants:nm.map(ma=>calcularCants(ma,prev.triomf))};
}

function acceptarTriomfEstat(prev,pal){
  const qv=prev.tornActual;
  const nm=prev.mans.map((m,i)=>i===qv?[...m,prev.cartaMig]:m);
  const e={...prev,mans:nm,cartaMig:null,triomf:pal};
  const e2=repartirSegonFase(e,qv);
  const mo=e2.mans.map(m=>ordenarMa(m,pal));
  return{...e2,mans:mo,fase:"joc",quiVa:qv,
    missatge:`Triomf: ${pal.toUpperCase()} (${prev.nomsJugadors[qv]}). Comença ${prev.nomsJugadors[prev.torn]}!`,
    tornActual:prev.torn};
}

function rebutjarTriomfEstat(prev){
  const seg=(prev.tornActual+1)%4;
  if(seg===prev.torn)
    return{...prev,fase2:true,tornActual:prev.torn,missatge:"Tothom ha refusat. Segones: trieu pal!"};
  return{...prev,tornActual:seg,missatge:`${prev.nomsJugadors[seg]} decideix`};
}

function processarJugada(prev,carta,cantAnunciat){
  const jugador=prev.tornActual;
  const nm=prev.mans.map((m,i)=>i===jugador?m.filter(c=>c.id!==carta.id):m);
  const novaBasa=[...prev.basa,{jugador,carta}];
  let ca=[...(prev.cantsAnunciats||[])];
  if(prev.primeraBasa&&cantAnunciat!==undefined)
    ca=[...ca,{jugador,cants:cantAnunciat?prev.cants[jugador]:[]}];

  if(novaBasa.length===4){
    const gany=guanyadorBasa(novaBasa,prev.triomf);
    const pareG=PARELLES.findIndex(p=>p.includes(gany));
    const punts=novaBasa.reduce((s,b)=>s+puntsCarta(b.carta,prev.triomf),0);
    const np=prev.puntsPartida.map((p,i)=>i===pareG?p+punts:p);
    const nb=prev.basesGuanyades.map((b,i)=>i===pareG?[...b,novaBasa]:b);
    let pc=[0,0]; let cd=prev.cantsDeclarat;
    if(prev.primeraBasa){
      const r=resoldreCants(ca,prev.triomf);
      pc=[r.punts0,r.punts1]; cd=ca;
    }
    const npts=np.map((p,i)=>p+pc[i]);

    // Text de cants per mostrar
    let resumCants=null;
    if(prev.primeraBasa&&ca.filter(x=>x.cants&&x.cants.length>0).length>0){
      const linies=ca.filter(x=>x.cants&&x.cants.length>0).map(x=>{
        const nomJug=prev.nomsJugadors[x.jugador];
        return `${nomJug}: ${x.cants.map(c=>c.text).join(", ")}`;
      });
      const res=resoldreCants(ca,prev.triomf);
      const pareNom=res.pareGuanyador>=0?`Guanya ${res.pareGuanyador===0?prev.nomsJugadors[0]+"/"+prev.nomsJugadors[2]:prev.nomsJugadors[1]+"/"+prev.nomsJugadors[3]}`:null;
      resumCants={linies,pareNom,punts:[res.punts0,res.punts1]};
    }

    if(nm.every(m=>m.length===0)){
      const fp=npts.map((p,i)=>i===pareG?p+10:p);
      const qvp=PARELLES.findIndex(p=>p.includes(prev.quiVa));
      const tot=fp[0]+fp[1];
      const meit=Math.ceil(tot/2)+1;
      // PUNT 1: sumar als puntsTotal acumulats
      let nouTotal=[...prev.puntsTotal];
      if(fp[qvp]>=meit) nouTotal=nouTotal.map((p,i)=>p+fp[i]);
      else nouTotal=nouTotal.map((p,i)=>i===qvp?p:p+tot);
      return{...prev,mans:nm,basa:[],basaCongelada:novaBasa,ultimaBasa:novaBasa,
        basesGuanyades:nb,puntsPartida:fp,puntsTotal:nouTotal,
        cantsDeclarat:cd,cantsAnunciats:ca,primeraBasa:false,
        mostrantCants:!!resumCants,resum_cants:resumCants,
        fase:"basaCongelada",faseSegüent:"resultat",
        missatge:`${prev.nomsJugadors[gany]} guanya l'última basa!`};
    }
    return{...prev,mans:nm,basa:[],basaCongelada:novaBasa,ultimaBasa:novaBasa,
      basesGuanyades:nb,puntsPartida:npts,
      cantsDeclarat:cd,cantsAnunciats:ca,primeraBasa:false,
      mostrantCants:!!resumCants,resum_cants:resumCants,
      fase:"basaCongelada",faseSegüent:"joc",tornSegüent:gany,
      missatge:`${prev.nomsJugadors[gany]} guanya la basa (${punts}pts)`};
  }
  return{...prev,mans:nm,basa:novaBasa,cantsAnunciats:ca,
    tornActual:(jugador+1)%4,
    missatge:`Torn de ${prev.nomsJugadors[(jugador+1)%4]}`};
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function BolotApp(){
  const [estat,setEstat]=useState(null);
  const [cartaSel,setCartaSel]=useState(null);
  const [pantalla,setPantalla]=useState("inici");
  const [puntsObjectiu,setPuntsObjectiu]=useState(1000);
  // PUNT 1: puntsTotal viu FORA de l'estat de la mà
  const [puntsTotal,setPuntsTotal]=useState([0,0]);
  const [jugadorsHumansGlobal,setJugadorsHumansGlobal]=useState([0,1,2,3]);
  const [nomsJugadorsGlobal,setNomsJugadorsGlobal]=useState(["Nord","Est","Sud","Oest"]);
  const [mostrarRegles,setMostrarRegles]=useState(false);
  const [mostrarUltimaBasa,setMostrarUltimaBasa]=useState(false);
  const [repartidor,setRepartidor]=useState(null);
  const [midaTria,setMidaTria]=useState("ordinador");
  const iaRef=useRef(null);
  const basaRef=useRef(null);
  const cantsRef=useRef(null);

  const verd="#2d5a3d",accent="#8b1a1a",crema="#fdf8f0",bg="#f7f5f0";
  const M=CFG_MIDES[midaTria]||CFG_MIDES.ordinador;

  function iniciarPartida(jugadorsHumans,nomsJugadors){
    const rep=repartidor!==null?(repartidor+1)%4:Math.floor(Math.random()*4);
    setRepartidor(rep);
    setJugadorsHumansGlobal(jugadorsHumans);
    setNomsJugadorsGlobal(nomsJugadors);
    // PUNT 1: passem puntsTotal actual (NO reiniciem)
    setEstat(nouEstat(puntsTotal,puntsObjectiu,jugadorsHumans,nomsJugadors,rep));
    setCartaSel(null);setMostrarUltimaBasa(false);setPantalla("joc");
  }

  function novaPartidaCompleta(){
    // Reinicia tot incloent punts
    setPuntsTotal([0,0]);
    setRepartidor(null);
    setEstat(null);
    setPantalla("config");
  }

  // Basa congelada → espera 2s
  useEffect(()=>{
    if(!estat||estat.fase!=="basaCongelada") return;
    clearTimeout(basaRef.current);
    basaRef.current=setTimeout(()=>{
      setEstat(prev=>{
        if(!prev||prev.fase!=="basaCongelada") return prev;
        if(prev.faseSegüent==="resultat")
          return{...prev,fase:"resultat",basaCongelada:null,mostrantCants:false};
        return{...prev,fase:"joc",basaCongelada:null,basa:[],tornActual:prev.tornSegüent,mostrantCants:false};
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
    },1500);
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

  // Sincronitzar puntsTotal quan canvia a resultat
  useEffect(()=>{
    if(!estat||estat.fase!=="resultat") return;
    setPuntsTotal(estat.puntsTotal);
  },[estat?.fase]);

  const nomP=(e,i)=>i===0?`${e.nomsJugadors[0]}/${e.nomsJugadors[2]}`:`${e.nomsJugadors[1]}/${e.nomsJugadors[3]}`;

  // ─── INICI ─────────────────────────────────────────────────────────────────
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
              <strong>Segones:</strong> Si ningú vol a primeres, nova ronda. Es pot triar qualsevol pal excepte el de la carta destapada. Si ningú vol tampoc, es torna a repartir.<br/>
              <strong>Arrastrar:</strong> Obligatori tirar el pal de la mà si en tens.<br/>
              <strong>Matar:</strong> Si hi ha triomf a la basa i no guanya la teua parella, has de superar-lo si pots. Si no pots superar, pots tirar qualsevol triomf.<br/>
              <strong>Cants:</strong> Tercera=20, Quarta=40, Quinta=50 · Quatre iguals: A/3/11/12=100, 9=150, 10=200 · Bolot(Rei+Cavall triomf)=20<br/>
              <strong>Cantar:</strong> Quan tires la primera carta. Sols suma la parella amb el cant individual més alt (tots els seus cants).<br/>
              <strong>Punts:</strong> S'acumulen mà a mà fins arribar a l'objectiu.
            </p>
            <button onClick={()=>setMostrarRegles(false)} style={{background:verd,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",cursor:"pointer",fontFamily:"Georgia,serif"}}>Tancar</button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  if(pantalla==="config") return(
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
      <button onClick={()=>setPantalla("inici")} style={{alignSelf:"flex-start",background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:13,marginBottom:10}}>← Tornar</button>
      <PantallaConfig onIniciar={iniciarPartida} puntsObjectiu={puntsObjectiu} setPuntsObjectiu={setPuntsObjectiu} midaTria={midaTria} setMidaTria={setMidaTria}/>
    </div>
  );

  if(!estat) return null;
  const{mans,triomf,fase,tornActual,basa,puntsPartida,puntsTotal:pt,
    cants,nomsJugadors,jugadorsHumans,cartaMig,ultimaBasa,primeraBasa,
    basaCongelada,palPrimeres,mostrantCants,resum_cants}=estat;

  // ─── RESULTAT ──────────────────────────────────────────────────────────────
  if(fase==="resultat"){
    const obj=estat.puntsObjectiu;
    const g=pt[0]>=obj?0:pt[1]>=obj?1:-1;
    return(
      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
        <div style={{background:crema,borderRadius:20,padding:32,maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 10px 40px #0002"}}>
          <div style={{fontSize:44}}>{g>=0?"🏆":"🃏"}</div>
          <h2 style={{color:verd,fontSize:26,margin:"8px 0"}}>Fi de Mà</h2>
          {g>=0&&<p style={{color:accent,fontWeight:700,fontSize:17}}>🎉 Guanya {nomP(estat,g)}!</p>}
          <Marcador nomsJugadors={nomsJugadors} puntsPartida={puntsPartida} puntsTotal={pt} puntsObjectiu={obj} mida={M}/>
          <div style={{fontSize:11,color:"#aaa",margin:"10px 0"}}>Objectiu: {obj} punts</div>
          {g>=0?(
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={novaPartidaCompleta} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Nova Partida</button>
              <button onClick={()=>{setPantalla("inici");setEstat(null);setPuntsTotal([0,0]);}} style={{background:"transparent",color:"#888",border:"1px solid #ccc",borderRadius:10,padding:"11px 14px",fontSize:13,cursor:"pointer"}}>Menú</button>
            </div>
          ):(
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>iniciarPartida(jugadorsHumans,nomsJugadors)} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Repartir de nou ↺</button>
              <button onClick={novaPartidaCompleta} style={{background:"transparent",color:"#888",border:"1px solid #ccc",borderRadius:10,padding:"11px 14px",fontSize:12,cursor:"pointer"}}>Nova Partida</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── TRIOMF ────────────────────────────────────────────────────────────────
  if(fase==="triomf"){
    const esH=jugadorsHumans.includes(tornActual);
    const palsDisp=estat.fase2?PALS.filter(p=>p!==palPrimeres):PALS;
    return(
      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:crema,borderRadius:20,padding:24,maxWidth:500,width:"100%",boxShadow:"0 10px 40px #0002"}}>
          <h2 style={{color:verd,textAlign:"center",marginTop:0,fontSize:M.fs+5}}>
            {estat.fase2?"🔄 Segones":`🃏 ${nomsJugadors[tornActual]}: vols anar?`}
          </h2>
          {cartaMig&&(
            <div style={{textAlign:"center",marginBottom:12}}>
              <div style={{fontSize:M.fs-1,color:"#888",marginBottom:4}}>
                Carta destapada{estat.fase2?` (no es pot triar ${PAL_SIMBOL[palPrimeres]} ${palPrimeres})`:""}:
              </div>
              <div style={{display:"inline-block"}}><Carta carta={cartaMig} mida={{cW:M.cW,cH:M.cH,fs:M.fs}}/></div>
            </div>
          )}
          {!esH?(
            <div style={{textAlign:"center",padding:16,color:"#888"}}>
              <div style={{fontSize:28,marginBottom:6}}>🤖</div>
              <div style={{fontSize:M.fs}}>{nomsJugadors[tornActual]} (IA) està pensant...</div>
            </div>
          ):(
            <>
              <p style={{color:"#666",fontSize:M.fs-1,textAlign:"center",marginBottom:6}}>Les teues {mans[tornActual].length} cartes:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:M.gap,justifyContent:"center",marginBottom:10}}>
                {mans[tornActual].map(c=><Carta key={c.id} carta={c} mida={{cW:M.cW,cH:M.cH,fs:M.fs}}/>)}
              </div>
              {estat.fase2?(
                <>
                  <p style={{color:"#555",fontSize:M.fs-1,textAlign:"center",marginBottom:8}}>
                    Escolliu el pal (no podeu triar {PAL_SIMBOL[palPrimeres]} {palPrimeres}), o passeu:
                  </p>
                  <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap",marginBottom:10}}>
                    {palsDisp.map(pal=>(
                      <button key={pal} onClick={()=>setEstat(prev=>acceptarTriomfEstat(prev,pal))} style={{
                        background:PAL_COLOR[pal],color:"#fff",border:"none",borderRadius:9,
                        padding:"9px 14px",fontSize:M.fs,fontWeight:700,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:4,
                      }}>{PAL_SIMBOL[pal]} {pal}</button>
                    ))}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <button onClick={()=>setEstat(prev=>rebutjarTriomfEstat(prev))} style={{background:"#888",color:"#fff",border:"none",borderRadius:9,padding:"9px 22px",fontSize:M.fs,fontWeight:600,cursor:"pointer"}}>No vaig →</button>
                  </div>
                </>
              ):(
                <>
                  <p style={{color:"#555",fontSize:M.fs-1,textAlign:"center",marginBottom:8}}>Aneu al pal de la carta destapada, o passeu:</p>
                  <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:10}}>
                    {PALS.map(pal=>(
                      <button key={pal} onClick={()=>setEstat(prev=>acceptarTriomfEstat(prev,pal))} style={{
                        background:pal===cartaMig?.pal?PAL_COLOR[pal]:"#eee",
                        color:pal===cartaMig?.pal?"#fff":"#666",
                        border:`2px solid ${pal===cartaMig?.pal?PAL_COLOR[pal]:"#ddd"}`,
                        borderRadius:9,padding:"9px 13px",fontSize:M.fs,fontWeight:700,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:4,
                      }}>{PAL_SIMBOL[pal]} {pal}</button>
                    ))}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <button onClick={()=>setEstat(prev=>rebutjarTriomfEstat(prev))} style={{background:"#888",color:"#fff",border:"none",borderRadius:9,padding:"9px 22px",fontSize:M.fs,fontWeight:600,cursor:"pointer"}}>No vaig →</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── JOC ───────────────────────────────────────────────────────────────────
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
    const esRep=idx===estat.repartidor;
    const mCarta=petita?{cW:M.cWp,cH:M.cHp,fs:M.fsp}:{cW:M.cW,cH:M.cH,fs:M.fs};
    const etiquetes=[];
    if(esActiu) etiquetes.push({text:"▶ TIRA",color:accent,bg:"#fff0f0"});
    if(esQuiVa&&triomf) etiquetes.push({text:`VA ${PAL_SIMBOL[triomf]}`,color:PAL_COLOR[triomf],bg:"#fffff0"});
    if(esRep) etiquetes.push({text:"🎴 REP",color:"#888",bg:"#f0f0f0"});
    return(
      <div style={{textAlign:"center"}}>
        <div style={{display:"flex",gap:3,justifyContent:"center",marginBottom:3,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:M.fsEt,color:"#777",fontWeight:600}}>{nomsJugadors[idx]} {esH?"👤":"🤖"} {PARELLES[0].includes(idx)?"(A)":"(B)"}</span>
          {etiquetes.map((e,i)=>(
            <span key={i} style={{fontSize:M.fsEt,fontWeight:800,color:e.color,background:e.bg,
              border:`1px solid ${e.color}55`,borderRadius:4,padding:"2px 6px",letterSpacing:0.3}}>
              {e.text}
            </span>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:vertical?"column":"row",gap:M.gap,flexWrap:"wrap",justifyContent:"center",maxWidth:vertical?"auto":520}}>
          {cartesJug.map(c=>{
            const esInv=esActiu&&esH&&!valides.some(v=>v.id===c.id);
            return esH
              ?(esActiu
                ?<Carta key={c.id} carta={c} mida={mCarta} invalida={esInv}
                    seleccionada={!esInv&&cartaSel?.id===c.id}
                    onClick={esInv?undefined:()=>setCartaSel(cartaSel?.id===c.id?null:c)}/>
                :<Carta key={c.id} carta={c} mida={mCarta}/>)
              :<Carta key={c.id} carta={c} dorsal mida={mCarta}/>;
          })}
        </div>
        {esActiu&&esH&&cartaSel&&valides.some(v=>v.id===cartaSel.id)&&(
          <div style={{marginTop:6,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
            {primeraBasa&&!jaHaAnunciat&&(
              <>
                {(cants[tornActual]||[]).length>0&&(
                  <button onClick={()=>tirarCarta(true)} style={{
                    background:"#c8963e",color:"#fff",border:"none",borderRadius:9,
                    padding:"7px 14px",fontSize:M.fs-1,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
                  }}>🎵 Cant! ({(cants[tornActual]||[]).map(c=>c.text).join(", ")})</button>
                )}
                <button onClick={()=>tirarCarta(false)} style={{
                  background:verd,color:"#fff",border:"none",borderRadius:9,
                  padding:"7px 16px",fontSize:M.fs,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
                }}>{(cants[tornActual]||[]).length>0?"Tirar sense cantar":`Tirar ${NOM_CARTA[cartaSel.num]} ${PAL_SIMBOL[cartaSel.pal]}`}</button>
              </>
            )}
            {!primeraBasa&&(
              <button onClick={()=>tirarCarta(undefined)} style={{
                background:verd,color:"#fff",border:"none",borderRadius:9,
                padding:"7px 18px",fontSize:M.fs,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
              }}>Tirar {NOM_CARTA[cartaSel.num]} {PAL_SIMBOL[cartaSel.pal]}</button>
            )}
          </div>
        )}
        {esActiu&&!esH&&<div style={{fontSize:M.fs-1,color:"#bbb",marginTop:3}}>🤖 pensant...</div>}
      </div>
    );
  };

  const mCentre={cW:M.cWc,cH:M.cHc,fs:M.fs};

  return(
    <div style={{minHeight:"100vh",background:bg,fontFamily:"Georgia,serif",display:"flex",flexDirection:"column"}}>
      {/* Barra top */}
      <div style={{background:verd,color:"#fff",padding:"6px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{fontWeight:700,fontSize:M.fs+1}}>🃏 Bolot</span>
        <div style={{display:"flex",gap:8,fontSize:M.fs-1,alignItems:"center"}}>
          <span>Triomf: <strong>{triomf?`${PAL_SIMBOL[triomf]} ${triomf}`:"—"}</strong></span>
          {ultimaBasa&&(
            <button onClick={()=>setMostrarUltimaBasa(true)} style={{
              background:"#ffffff22",color:"#fff",border:"1px solid #ffffff55",
              borderRadius:5,padding:"2px 7px",cursor:"pointer",fontSize:M.fs-2
            }}>Última basa</button>
          )}
        </div>
        <button onClick={()=>{setPantalla("inici");setEstat(null);}} style={{background:"transparent",color:"#fff",border:"1px solid #ffffff44",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:M.fs-2}}>Menú</button>
      </div>

      {/* Marcador */}
      <div style={{padding:"0 8px"}}>
        <Marcador nomsJugadors={nomsJugadors} puntsPartida={puntsPartida} puntsTotal={pt} puntsObjectiu={estat.puntsObjectiu} mida={M}/>
      </div>

      {/* Modal última basa */}
      {mostrarUltimaBasa&&ultimaBasa&&(
        <div style={{position:"fixed",inset:0,background:"#0007",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99}} onClick={()=>setMostrarUltimaBasa(false)}>
          <div style={{background:crema,borderRadius:16,padding:24,maxWidth:320,width:"92%",boxShadow:"0 10px 40px #0005",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{color:verd,marginTop:0,fontSize:M.fs+3}}>Última basa</h3>
            <div style={{position:"relative",width:180,height:180,margin:"0 auto 12px"}}>
              {ultimaBasa.map(({jugador,carta})=>{
                const posMap={
                  0:{top:0,left:"50%",transform:"translateX(-50%)"},
                  1:{top:"50%",right:0,transform:"translateY(-50%)"},
                  2:{bottom:0,left:"50%",transform:"translateX(-50%)"},
                  3:{top:"50%",left:0,transform:"translateY(-50%)"},
                };
                return(
                  <div key={carta.id} style={{position:"absolute",...posMap[jugador],textAlign:"center"}}>
                    <div style={{fontSize:M.fs-2,color:"#666",marginBottom:2}}>{nomsJugadors[jugador]}</div>
                    <Carta carta={carta} mida={{cW:M.cW,cH:M.cH,fs:M.fs}}/>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:M.fs-1,color:"#888",marginBottom:12}}>
              Guanyada per: <strong>{nomsJugadors[guanyadorBasa(ultimaBasa,triomf)]}</strong>
            </div>
            <button onClick={()=>setMostrarUltimaBasa(false)} style={{background:verd,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:M.fs}}>Tancar</button>
          </div>
        </div>
      )}

      {/* Taula */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"4px 8px",gap:4}}>
        {renderJugador(0,"dalt")}
        <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
          <div style={{minWidth:M.cWp+8}}>{renderJugador(3,"esquerra")}</div>

          {/* Centre taula */}
          <div style={{flex:1,background:fase==="basaCongelada"?"#d4e8d4":"#e8f0e8",
            borderRadius:12,padding:8,minHeight:M.cHc+30,position:"relative",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:fase==="basaCongelada"?"inset 0 0 0 2px #2d5a3d55":"none"}}>

            {/* PUNT 5: cants al centre durant la basa congelada */}
            {mostrantCants&&resum_cants?(
              <div style={{textAlign:"center",padding:"8px 12px"}}>
                <div style={{fontSize:M.fs+2,fontWeight:700,color:verd,marginBottom:6}}>🎵 Cants anunciats</div>
                {resum_cants.linies.map((l,i)=>(
                  <div key={i} style={{fontSize:M.fs,color:"#333",marginBottom:3}}>{l}</div>
                ))}
                {resum_cants.pareNom&&(
                  <div style={{marginTop:6,fontSize:M.fs,fontWeight:700,color:accent}}>
                    {resum_cants.pareNom} (+{Math.max(resum_cants.punts[0],resum_cants.punts[1])}pts)
                  </div>
                )}
              </div>
            ):(
              // PUNT 4: cartes al centre sense animació, posició fixa
              basaVisible.length>0?(
                <div style={{position:"relative",width:M.cHc+M.cWc,height:M.cHc+M.cWc}}>
                  {basaVisible.map(({jugador,carta})=>{
                    const cx=(M.cHc+M.cWc)/2, cy=(M.cHc+M.cWc)/2;
                    const cw=M.cWc, ch=M.cHc;
                    // Posicions fixes sense transició
                    const posMap={
                      0:{top:cy-ch-4,  left:cx-cw/2},
                      1:{top:cy-ch/2,  left:cx+6},
                      2:{top:cy+4,     left:cx-cw/2},
                      3:{top:cy-ch/2,  left:cx-cw-6},
                    };
                    const pos=posMap[jugador];
                    return(
                      <div key={`${jugador}-${carta.id}`} style={{position:"absolute",top:pos.top,left:pos.left}}>
                        <Carta carta={carta} mida={mCentre}/>
                      </div>
                    );
                  })}
                </div>
              ):(
                <div style={{color:"#ccc",fontSize:M.fs}}>Taula buida</div>
              )
            )}

            <div style={{position:"absolute",bottom:4,fontSize:M.fs-2,color:"#888",textAlign:"center",width:"100%",padding:"0 4px"}}>
              {estat.missatge}
            </div>
            {fase==="basaCongelada"&&!mostrantCants&&(
              <div style={{position:"absolute",top:4,fontSize:M.fs-2,color:verd,fontWeight:700,textAlign:"center",width:"100%"}}>
                ✓ Basa recollida
              </div>
            )}
          </div>

          <div style={{minWidth:M.cWp+8}}>{renderJugador(1,"dreta")}</div>
        </div>
        {renderJugador(2,"baix")}
      </div>
    </div>
  );
}
