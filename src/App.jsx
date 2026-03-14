import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const PALS = ["oros", "copes", "espases", "bastos"];
const PAL_SIMBOL = { oros: "🪙", copes: "🏆", espases: "⚔️", bastos: "🪵" };
const PAL_COLOR  = { oros: "#c8963e", copes: "#c0392b", espases: "#2c3e50", bastos: "#27ae60" };
const NUMS_BARALLA = [1, 3, 7, 8, 9, 10, 11, 12];
const NOM_CARTA = { 1:"As", 3:"Tres", 7:"Set", 8:"Vuit", 9:"Nou", 10:"Sota", 11:"Cavall", 12:"Rei" };
const ORDRE_TRIOMF = [7, 8, 11, 12, 3, 1, 9, 10];
const ORDRE_NORMAL = [7, 8, 9, 10, 11, 12, 3, 1];
const PUNTS_TRIOMF = { 10:20, 9:14, 1:11, 3:10, 12:4, 11:3, 8:0, 7:0 };
const PUNTS_NORMAL = { 1:11, 3:10, 12:4, 11:3, 10:2, 9:0, 8:0, 7:0 };
const NOMS_POS = ["Nord", "Est", "Sud", "Oest"];
const PARELLES = [[0,2],[1,3]];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const barrejar = arr => {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};

function forcaCarta(carta, triomf, palLiderat) {
  if (carta.pal === triomf)     return 100 + ORDRE_TRIOMF.indexOf(carta.num);
  if (carta.pal === palLiderat) return  10 + ORDRE_NORMAL.indexOf(carta.num);
  return ORDRE_NORMAL.indexOf(carta.num);
}

function guanyadorBasa(basa, triomf) {
  const pal0 = basa[0].carta.pal;
  let millor = 0;
  for (let i=1;i<basa.length;i++)
    if (forcaCarta(basa[i].carta,triomf,pal0) > forcaCarta(basa[millor].carta,triomf,pal0)) millor=i;
  return basa[millor].jugador;
}

const puntsCarta = (carta, triomf) =>
  carta.pal===triomf ? (PUNTS_TRIOMF[carta.num]??0) : (PUNTS_NORMAL[carta.num]??0);

function calcularCants(ma) {
  const cants = [];
  const seq = [7,8,9,3,10,11,12,1];
  for (const pal of PALS) {
    const nums = ma.filter(c=>c.pal===pal).map(c=>c.num);
    let maxSeq=0, posMax=-1;
    for (let i=0;i<seq.length;i++) {
      let l=0;
      while(i+l<seq.length && nums.includes(seq[i+l])) l++;
      if (l>=3 && l>maxSeq) { maxSeq=l; posMax=i; }
    }
    if (maxSeq===3) cants.push({tipus:"tercera",pal,valor:20});
    if (maxSeq>=4)  cants.push({tipus:"cinquanta",pal,valor:50});
  }
  const quarts = {
    3:{tipus:"cent",valor:100}, 11:{tipus:"cent",valor:100},
    12:{tipus:"cent",valor:100}, 1:{tipus:"cent",valor:100},
    9:{tipus:"centcinquanta",valor:150}, 10:{tipus:"doscentos",valor:200}
  };
  for (const [num,info] of Object.entries(quarts)) {
    if (PALS.every(pal=>ma.some(c=>c.pal===pal&&c.num===parseInt(num))))
      cants.push({...info,num:parseInt(num)});
  }
  return cants;
}

// ─── IA ESTRATÈGIA BÀSICA ────────────────────────────────────────────────────
function triarCartaIA(ma, basa, triomf) {
  if (!ma.length) return null;
  if (basa.length === 0) {
    const triomfs = ma.filter(c=>c.pal===triomf);
    if (triomfs.length)
      return triomfs.reduce((b,c)=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(b.num)?c:b);
    return ma.reduce((b,c)=>puntsCarta(c,triomf)>puntsCarta(b,triomf)?c:b);
  }
  const palLiderat = basa[0].carta.pal;
  const delPal = ma.filter(c=>c.pal===palLiderat);
  if (delPal.length) {
    const millorBasa = basa.reduce((b,x)=>
      forcaCarta(x.carta,triomf,palLiderat)>forcaCarta(b.carta,triomf,palLiderat)?x:b);
    const millor = delPal.reduce((b,c)=>
      forcaCarta(c,triomf,palLiderat)>forcaCarta(b,triomf,palLiderat)?c:b);
    const menor  = delPal.reduce((b,c)=>
      forcaCarta(c,triomf,palLiderat)<forcaCarta(b,triomf,palLiderat)?c:b);
    return forcaCarta(millor,triomf,palLiderat)>forcaCarta(millorBasa.carta,triomf,palLiderat)
      ? millor : menor;
  }
  const triomfs = ma.filter(c=>c.pal===triomf);
  if (triomfs.length) {
    const hiHaTriomfBasa = basa.some(b=>b.carta.pal===triomf);
    if (hiHaTriomfBasa) {
      const millorT = basa.filter(b=>b.carta.pal===triomf)
        .reduce((b,x)=>ORDRE_TRIOMF.indexOf(x.carta.num)>ORDRE_TRIOMF.indexOf(b.carta.num)?x:b);
      const superiors = triomfs.filter(c=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(millorT.carta.num));
      if (superiors.length)
        return superiors.reduce((b,c)=>ORDRE_TRIOMF.indexOf(c.num)<ORDRE_TRIOMF.indexOf(b.num)?c:b);
    } else {
      return triomfs.reduce((b,c)=>ORDRE_TRIOMF.indexOf(c.num)<ORDRE_TRIOMF.indexOf(b.num)?c:b);
    }
  }
  return ma.reduce((b,c)=>puntsCarta(c,triomf)<puntsCarta(b,triomf)?c:b);
}

function triarTriomfIA(ma) {
  const comptes = PALS.map(pal=>({pal,n:ma.filter(c=>c.pal===pal).length}));
  comptes.sort((a,b)=>b.n-a.n);
  return comptes[0].pal;
}

// ─── COMPONENT CARTA ─────────────────────────────────────────────────────────
function Carta({ carta, seleccionada, onClick, petita, dorsal }) {
  if (dorsal) return (
    <div style={{
      width:petita?36:56, height:petita?54:82,
      background:"linear-gradient(135deg,#1a3a5c,#0d2137)",
      border:"2px solid #2a5a8c", borderRadius:7,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:petita?13:19, color:"#2a5a8c", userSelect:"none", flexShrink:0,
    }}>✦</div>
  );
  const color=PAL_COLOR[carta.pal], simbol=PAL_SIMBOL[carta.pal], nom=NOM_CARTA[carta.num];
  return (
    <div onClick={onClick} style={{
      width:petita?36:56, height:petita?54:82,
      background:seleccionada?"#f0f7ff":"#fff",
      border:seleccionada?`2px solid ${color}`:"2px solid #ddd",
      borderRadius:7, cursor:onClick?"pointer":"default",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"space-between", padding:"3px 2px",
      boxShadow:seleccionada?`0 4px 12px ${color}55`:"0 2px 4px #0001",
      transform:seleccionada?"translateY(-8px)":"none",
      transition:"all 0.15s", userSelect:"none", flexShrink:0,
    }}>
      <span style={{fontSize:petita?8:10,color,fontWeight:700,alignSelf:"flex-start",paddingLeft:2}}>{nom}</span>
      <span style={{fontSize:petita?15:22,color}}>{simbol}</span>
      <span style={{fontSize:petita?8:10,color,fontWeight:700,alignSelf:"flex-end",paddingRight:2,transform:"rotate(180deg)"}}>{nom}</span>
    </div>
  );
}

// ─── PANTALLA CONFIGURACIÓ ────────────────────────────────────────────────────
function PantallaConfig({ onIniciar, puntsObjectiu, setPuntsObjectiu }) {
  const [assignacions, setAssignacions] = useState([0,1,2,3]);
  const [noms, setNoms] = useState(["","","",""]);
  const verd="#2d5a3d";

  function togglePos(idx) {
    if (assignacions.includes(idx)) {
      if (assignacions.length > 1) setAssignacions(assignacions.filter(p=>p!==idx));
    } else {
      setAssignacions([...assignacions, idx].sort((a,b)=>a-b));
    }
  }

  function handleIniciar() {
    const nomsFinals = NOMS_POS.map((nom,i)=>
      assignacions.includes(i) && noms[i].trim() ? noms[i].trim() : nom
    );
    onIniciar(assignacions, nomsFinals);
  }

  const descParelles = () => {
    const pA = PARELLES[0].map(i=>assignacions.includes(i)?(noms[i].trim()||NOMS_POS[i]):"🤖").join("+");
    const pB = PARELLES[1].map(i=>assignacions.includes(i)?(noms[i].trim()||NOMS_POS[i]):"🤖").join("+");
    return `${pA} vs ${pB}`;
  };

  return (
    <div style={{background:"#fdf8f0",borderRadius:20,padding:28,maxWidth:440,width:"100%",boxShadow:"0 10px 40px #0002"}}>
      <h2 style={{color:verd,marginTop:0,textAlign:"center",fontSize:20}}>Qui juga?</h2>
      <p style={{color:"#666",fontSize:12,textAlign:"center",marginBottom:16}}>
        Toca una posició per canviar-la entre <strong>👤 Humà</strong> i <strong>🤖 IA</strong>
      </p>

      {/* Taula visual de selecció */}
      <div style={{position:"relative",width:220,height:220,margin:"0 auto 20px"}}>
        <div style={{position:"absolute",inset:44,background:"#ddeedd",borderRadius:14,border:"2px solid #aaccaa"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:"#9ab89a",fontSize:11,fontWeight:600}}>taula</div>
        {[
          {idx:0,style:{top:0,left:"50%",transform:"translateX(-50%)"}},
          {idx:1,style:{top:"50%",right:0,transform:"translateY(-50%)"}},
          {idx:2,style:{bottom:0,left:"50%",transform:"translateX(-50%)"}},
          {idx:3,style:{top:"50%",left:0,transform:"translateY(-50%)"}},
        ].map(({idx,style})=>{
          const esHuma = assignacions.includes(idx);
          return (
            <div key={idx} onClick={()=>togglePos(idx)} style={{
              position:"absolute",...style,
              width:58,height:58,
              marginLeft:(idx===1||idx===3)?0:"-29px",
              marginTop:(idx===0||idx===2)?0:"-29px",
              background:esHuma?verd:"#bbb",
              color:"#fff",borderRadius:10,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              cursor:"pointer",fontSize:10,fontWeight:700,
              boxShadow:esHuma?"0 3px 10px #2d5a3d55":"none",
              transition:"all 0.2s",
              border:`2px solid ${esHuma?"#1a3a2a":"#999"}`,
            }}>
              <span style={{fontSize:18}}>{esHuma?"👤":"🤖"}</span>
              <span>{NOMS_POS[idx]}</span>
            </div>
          );
        })}
      </div>

      {/* Noms */}
      {assignacions.length>0 && (
        <div style={{marginBottom:16}}>
          <p style={{color:"#777",fontSize:11,textAlign:"center",marginBottom:8}}>Nom dels jugadors humans (opcional):</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
            {assignacions.map(idx=>(
              <input key={idx} placeholder={NOMS_POS[idx]} value={noms[idx]}
                onChange={e=>{const n=[...noms];n[idx]=e.target.value;setNoms(n);}}
                style={{width:88,padding:"5px 8px",borderRadius:7,border:"1.5px solid #ccc",
                  fontSize:12,fontFamily:"Georgia,serif",textAlign:"center"}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Punts objectiu */}
      <div style={{marginBottom:20,textAlign:"center"}}>
        <p style={{color:"#666",fontSize:12,marginBottom:8,fontWeight:600}}>Partida fins a:</p>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {[1000,1500,2000].map(pts=>(
            <button key={pts} onClick={()=>setPuntsObjectiu(pts)} style={{
              background:puntsObjectiu===pts?verd:"transparent",
              color:puntsObjectiu===pts?"#fff":verd,
              border:`2px solid ${verd}`,borderRadius:9,
              padding:"8px 14px",fontSize:14,fontWeight:700,
              cursor:"pointer",fontFamily:"Georgia,serif",transition:"all 0.15s",
            }}>{pts}</button>
          ))}
        </div>
      </div>

      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,color:"#999",marginBottom:10}}>
          {assignacions.length} humà{assignacions.length!==1?"ns":""} · {4-assignacions.length} IA · {descParelles()}
        </div>
        <button onClick={handleIniciar} style={{
          background:verd,color:"#fff",border:"none",borderRadius:12,
          padding:"13px 34px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
        }}>Jugar! 🃏</button>
      </div>
    </div>
  );
}

// ─── LÒGICA PARTIDA ───────────────────────────────────────────────────────────
function nouEstat(puntsTotal, puntsObjectiu, jugadorsHumans, nomsJugadors) {
  const cartes = [];
  for (const pal of PALS) for (const num of NUMS_BARALLA) cartes.push({pal,num,id:`${pal}-${num}`});
  const barrejada = barrejar(cartes);
  const mans = [[],[],[],[]];
  for (let i=0;i<32;i++) mans[i%4].push(barrejada[i]);
  return {
    fase:"triomf", mans,
    triomf:null, quiVa:null,
    torn:0, tornActual:0,
    basa:[], basesGuanyades:[[],[]],
    puntsPartida:[0,0],
    puntsTotal: puntsTotal||[0,0],
    puntsObjectiu: puntsObjectiu||1000,
    fase2:false,
    missatge:"Fase de triomf: Nord decideix primer",
    historial:[],
    cants: mans.map(ma=>calcularCants(ma)),
    jugadorsHumans: jugadorsHumans||[0,1,2,3],
    nomsJugadors: nomsJugadors||["Nord","Est","Sud","Oest"],
  };
}

function acceptarTriomfEstat(prev, pal) {
  return {
    ...prev, triomf:pal, fase:"joc", quiVa:prev.tornActual,
    missatge:`Triomf: ${pal.toUpperCase()} (${prev.nomsJugadors[prev.tornActual]}). Comença ${prev.nomsJugadors[prev.torn]}!`,
    tornActual: prev.torn,
  };
}

function rebutjarTriomfEstat(prev) {
  const seg = (prev.tornActual+1)%4;
  if (seg === prev.torn)
    return {...prev, fase2:true, tornActual:prev.torn, missatge:"Tothom ha refusat. Segones: trieu pal!"};
  return {...prev, tornActual:seg, missatge:`${prev.nomsJugadors[seg]} decideix el triomf`};
}

function processarJugada(prev, carta) {
  const jugador = prev.tornActual;
  const novasMans = prev.mans.map((m,i)=>i===jugador?m.filter(c=>c.id!==carta.id):m);
  const novaBasa = [...prev.basa, {jugador,carta}];

  if (novaBasa.length === 4) {
    const guanyador = guanyadorBasa(novaBasa, prev.triomf);
    const pareG = PARELLES.findIndex(p=>p.includes(guanyador));
    const punts = novaBasa.reduce((s,b)=>s+puntsCarta(b.carta,prev.triomf),0);
    const nousPunts = prev.puntsPartida.map((p,i)=>i===pareG?p+punts:p);
    const novasBases = prev.basesGuanyades.map((b,i)=>i===pareG?[...b,novaBasa]:b);

    if (novasMans.every(m=>m.length===0)) {
      const finalPunts = nousPunts.map((p,i)=>i===pareG?p+10:p);
      const ambCants = finalPunts.map((p,i)=>{
        const c = PARELLES[i].reduce((s,j)=>s+prev.cants[j].reduce((a,x)=>a+x.valor,0),0);
        return p+c;
      });
      const quiVaPare = PARELLES.findIndex(p=>p.includes(prev.quiVa));
      const total = ambCants[0]+ambCants[1];
      const meitat = Math.ceil(total/2)+1;
      let nouTotal = prev.puntsTotal.slice();
      if (ambCants[quiVaPare]>=meitat) {
        nouTotal = nouTotal.map((p,i)=>p+ambCants[i]);
      } else {
        nouTotal = nouTotal.map((p,i)=>i===quiVaPare?p:p+total);
      }
      return {...prev, mans:novasMans, basa:[], basesGuanyades:novasBases,
        puntsPartida:finalPunts, puntsTotal:nouTotal, fase:"resultat",
        missatge:`Fi! ${prev.nomsJugadors[guanyador]} fa l'última basa.`,
        historial:[...prev.historial,`Última basa: ${prev.nomsJugadors[guanyador]} +${punts}pts`],
      };
    }

    return {...prev, mans:novasMans, basa:[], basesGuanyades:novasBases,
      puntsPartida:nousPunts, tornActual:guanyador,
      missatge:`${prev.nomsJugadors[guanyador]} guanya la basa (${punts}pts)`,
      historial:[...prev.historial,`Basa: ${prev.nomsJugadors[guanyador]} +${punts}pts`],
    };
  }

  return {...prev, mans:novasMans, basa:novaBasa,
    tornActual:(jugador+1)%4,
    missatge:`Torn de ${prev.nomsJugadors[(jugador+1)%4]}`,
  };
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function BolotApp() {
  const [estat, setEstat]       = useState(null);
  const [cartaSel, setCartaSel] = useState(null);
  const [pantalla, setPantalla] = useState("inici");
  const [puntsObjectiu, setPuntsObjectiu] = useState(1000);
  const [puntsTotal, setPuntsTotal] = useState([0,0]);
  const [mostrarRegles, setMostrarRegles] = useState(false);
  const iaRef = useRef(null);

  const verd="#2d5a3d", accent="#8b1a1a", crema="#fdf8f0", bg="#f7f5f0";

  function iniciarPartida(jugadorsHumans, nomsJugadors) {
    const e = nouEstat(puntsTotal, puntsObjectiu, jugadorsHumans, nomsJugadors);
    setEstat(e);
    setCartaSel(null);
    setPantalla("joc");
  }

  // IA - fase de joc
  useEffect(() => {
    if (!estat || estat.fase !== "joc") return;
    if (estat.jugadorsHumans.includes(estat.tornActual)) return;
    clearTimeout(iaRef.current);
    iaRef.current = setTimeout(() => {
      const carta = triarCartaIA(estat.mans[estat.tornActual], estat.basa, estat.triomf);
      if (carta) {
        setCartaSel(null);
        setEstat(prev => processarJugada(prev, carta));
      }
    }, 800);
    return () => clearTimeout(iaRef.current);
  }, [estat?.tornActual, estat?.fase, estat?.basa?.length]);

  // IA - fase de triomf
  useEffect(() => {
    if (!estat || estat.fase !== "triomf") return;
    if (estat.jugadorsHumans.includes(estat.tornActual)) return;
    clearTimeout(iaRef.current);
    iaRef.current = setTimeout(() => {
      setEstat(prev => {
        if (!prev || prev.fase !== "triomf") return prev;
        if (prev.fase2) {
          return acceptarTriomfEstat(prev, triarTriomfIA(prev.mans[prev.tornActual]));
        }
        const pal = triarTriomfIA(prev.mans[prev.tornActual]);
        const n = prev.mans[prev.tornActual].filter(c=>c.pal===pal).length;
        return n >= 4
          ? acceptarTriomfEstat(prev, pal)
          : rebutjarTriomfEstat(prev);
      });
    }, 700);
    return () => clearTimeout(iaRef.current);
  }, [estat?.tornActual, estat?.fase, estat?.fase2]);

  const nomParella = (e, i) => i===0
    ? `${e.nomsJugadors[0]}/${e.nomsJugadors[2]}`
    : `${e.nomsJugadors[1]}/${e.nomsJugadors[3]}`;

  // ─── PANTALLA INICI ──────────────────────────────────────────────────────────
  if (pantalla === "inici") return (
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center",maxWidth:460,padding:28}}>
        <div style={{fontSize:60,marginBottom:6}}>🃏</div>
        <h1 style={{fontSize:40,fontWeight:900,color:verd,letterSpacing:-1,margin:0}}>Bolot</h1>
        <p style={{color:"#777",fontSize:13,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Sagunt · Camp de Morvedre</p>
        <p style={{color:"#999",fontSize:13,marginBottom:28,lineHeight:1.6}}>
          El joc de cartes tradicional saguntí,<br/>derivat del belote francès.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
          <button onClick={()=>setPantalla("config")} style={{
            background:verd,color:"#fff",border:"none",borderRadius:10,
            padding:"13px 30px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"
          }}>Nova Partida</button>
          <button onClick={()=>setMostrarRegles(true)} style={{
            background:"transparent",color:verd,border:`2px solid ${verd}`,borderRadius:10,
            padding:"13px 20px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"Georgia,serif"
          }}>Regles</button>
        </div>
        <p style={{color:"#bbb",fontSize:12}}>1–4 jugadors · IA · Baralla espanyola</p>
      </div>

      {mostrarRegles && (
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99}} onClick={()=>setMostrarRegles(false)}>
          <div style={{background:crema,borderRadius:16,padding:28,maxWidth:500,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px #0005"}} onClick={e=>e.stopPropagation()}>
            <h2 style={{color:verd,marginTop:0}}>Regles del Bolot</h2>
            <p style={{lineHeight:1.8,color:"#333",fontSize:13}}>
              <strong>Jugadors:</strong> 4 (2 parelles). Nord+Sud vs Est+Oest.<br/>
              <strong>Baralla:</strong> Espanyola sense 2,4,5,6 (32 cartes).<br/>
              <strong>Triomf:</strong> La mà pot acceptar un pal. Si ningú vol, segones.<br/>
              <strong>Ordre triomf:</strong> 7 &lt; 8 &lt; Cavall &lt; Rei &lt; 3 &lt; As &lt; Catorze(9) &lt; Valet(Sota)<br/>
              <strong>Ordre normal:</strong> 7 &lt; 8 &lt; 9 &lt; Sota &lt; Cavall &lt; Rei &lt; 3 &lt; As<br/>
              <strong>Punts triomf:</strong> Valet=20, Catorze=14, As=11, Tres=10, Rei=4, Cavall=3<br/>
              <strong>Punts normals:</strong> As=11, Tres=10, Rei=4, Cavall=3, Sota=2<br/>
              <strong>Cants:</strong> Tercera=20, Cinquanta=50, Cent=100, 150=4 Nous, 200=4 Sotes<br/>
              <strong>Últimes:</strong> +10 a qui fa l'última basa.<br/>
              <strong>Objectiu:</strong> La parella que va ha de superar la meitat dels punts. Si no, l'altra s'emporta tot.
            </p>
            <button onClick={()=>setMostrarRegles(false)} style={{background:verd,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",cursor:"pointer",fontFamily:"Georgia,serif"}}>Tancar</button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── PANTALLA CONFIG ─────────────────────────────────────────────────────────
  if (pantalla === "config") return (
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
      <button onClick={()=>setPantalla("inici")} style={{alignSelf:"flex-start",background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:13,marginBottom:10}}>← Tornar</button>
      <PantallaConfig onIniciar={iniciarPartida} puntsObjectiu={puntsObjectiu} setPuntsObjectiu={setPuntsObjectiu}/>
    </div>
  );

  if (!estat) return null;

  const { mans, triomf, fase, tornActual, basa, puntsPartida, puntsTotal: pt, cants, nomsJugadors, jugadorsHumans } = estat;

  // ─── PANTALLA RESULTAT ───────────────────────────────────────────────────────
  if (fase === "resultat") {
    const obj = estat.puntsObjectiu;
    const guanyadora = pt[0]>=obj ? 0 : pt[1]>=obj ? 1 : -1;
    return (
      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
        <div style={{background:crema,borderRadius:20,padding:36,maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 10px 40px #0002"}}>
          <div style={{fontSize:44}}>{guanyadora>=0?"🏆":"🃏"}</div>
          <h2 style={{color:verd,fontSize:26,margin:"8px 0"}}>Fi de Mà</h2>
          {guanyadora>=0 && <p style={{color:accent,fontWeight:700,fontSize:17}}>🎉 Guanya {nomParella(estat,guanyadora)}!</p>}
          <div style={{display:"flex",gap:14,margin:"18px 0",justifyContent:"center"}}>
            {[0,1].map(i=>(
              <div key={i} style={{background:i===guanyadora?verd:"#eee",color:i===guanyadora?"#fff":"#333",borderRadius:12,padding:"12px 18px",flex:1}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{nomParella(estat,i)}</div>
                <div style={{fontSize:28,fontWeight:900}}>{pt[i]}</div>
                <div style={{fontSize:10,opacity:0.7}}>punts acum.</div>
                <div style={{fontSize:11,marginTop:5}}>Mà: {puntsPartida[i]}pts</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:18}}>Objectiu: {obj} punts</div>
          {guanyadora>=0 ? (
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>{setPuntsTotal([0,0]);setPantalla("config");setEstat(null);}} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Nova Partida</button>
              <button onClick={()=>{setPantalla("inici");setEstat(null);setPuntsTotal([0,0]);}} style={{background:"transparent",color:"#888",border:"1px solid #ccc",borderRadius:10,padding:"11px 14px",fontSize:13,cursor:"pointer"}}>Menú</button>
            </div>
          ) : (
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>iniciarPartida(jugadorsHumans, nomsJugadors)} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Repartir de nou ↺</button>
              <button onClick={()=>{setPuntsTotal([0,0]);setPantalla("config");setEstat(null);}} style={{background:"transparent",color:"#888",border:"1px solid #ccc",borderRadius:10,padding:"11px 14px",fontSize:12,cursor:"pointer"}}>Nova Partida</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PANTALLA TRIOMF ─────────────────────────────────────────────────────────
  if (fase === "triomf") {
    const esHuma = jugadorsHumans.includes(tornActual);
    return (
      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:crema,borderRadius:20,padding:26,maxWidth:480,width:"100%",boxShadow:"0 10px 40px #0002"}}>
          <h2 style={{color:verd,textAlign:"center",marginTop:0,fontSize:18}}>
            {estat.fase2 ? "🔄 Segones: Trieu el triomf" : `🃏 ${nomsJugadors[tornActual]}: vols anar?`}
          </h2>
          {!esHuma ? (
            <div style={{textAlign:"center",padding:20,color:"#888"}}>
              <div style={{fontSize:30,marginBottom:6}}>🤖</div>
              <div style={{fontSize:13}}>{nomsJugadors[tornActual]} (IA) està pensant...</div>
            </div>
          ) : (
            <>
              <p style={{color:"#666",fontSize:12,textAlign:"center",marginBottom:6}}>Les teues cartes:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",marginBottom:10}}>
                {mans[tornActual].map(c=><Carta key={c.id} carta={c}/>)}
              </div>
              {cants[tornActual].length>0 && (
                <div style={{background:"#fffbe6",border:"1px solid #f0d060",borderRadius:7,padding:"5px 10px",marginBottom:10,fontSize:11,textAlign:"center"}}>
                  <strong>Cants:</strong> {cants[tornActual].map(c=>`${c.tipus} (${c.valor}pts)`).join(", ")}
                </div>
              )}
              {estat.fase2 ? (
                <>
                  <p style={{color:"#555",fontSize:12,textAlign:"center",marginBottom:8}}>Escolliu el pal de triomf:</p>
                  <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap"}}>
                    {PALS.map(pal=>(
                      <button key={pal} onClick={()=>setEstat(prev=>acceptarTriomfEstat(prev,pal))} style={{
                        background:PAL_COLOR[pal],color:"#fff",border:"none",borderRadius:9,
                        padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer",
                        display:"flex",alignItems:"center",gap:4,
                      }}>{PAL_SIMBOL[pal]} {pal}</button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p style={{color:"#555",fontSize:12,textAlign:"center",marginBottom:8}}>Escolliu pal per anar, o passeu:</p>
                  <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:10}}>
                    {PALS.map(pal=>(
                      <button key={pal} onClick={()=>setEstat(prev=>acceptarTriomfEstat(prev,pal))} style={{
                        background:PAL_COLOR[pal],color:"#fff",border:"none",borderRadius:9,
                        padding:"9px 13px",fontSize:13,fontWeight:700,cursor:"pointer",
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

  // ─── PANTALLA JOC ────────────────────────────────────────────────────────────
  const renderJugador = (idx, posicio) => {
    const esActiu = tornActual === idx;
    const esHumaJug = jugadorsHumans.includes(idx);
    const petita = posicio !== "baix";
    const vertical = posicio === "esquerra" || posicio === "dreta";
    return (
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:10,marginBottom:3,fontWeight:esActiu?700:400,color:esActiu?accent:"#999"}}>
          {esActiu?"▶ ":""}{nomsJugadors[idx]} {esHumaJug?"👤":"🤖"} {PARELLES[0].includes(idx)?"(A)":"(B)"}
        </div>
        <div style={{display:"flex",flexDirection:vertical?"column":"row",gap:3,flexWrap:"wrap",justifyContent:"center",maxWidth:vertical?"auto":460}}>
          {mans[idx].map(c =>
            esHumaJug && esActiu
              ? <Carta key={c.id} carta={c} petita={petita} seleccionada={cartaSel?.id===c.id} onClick={()=>setCartaSel(cartaSel?.id===c.id?null:c)}/>
              : <Carta key={c.id} carta={c} dorsal petita={petita}/>
          )}
        </div>
        {esActiu && esHumaJug && cartaSel && (
          <button onClick={()=>{setEstat(prev=>{const nou=processarJugada(prev,cartaSel);return nou;});setCartaSel(null);}} style={{
            marginTop:6,background:verd,color:"#fff",border:"none",
            borderRadius:9,padding:"7px 18px",fontSize:12,fontWeight:700,
            cursor:"pointer",fontFamily:"Georgia,serif",
          }}>Jugar {NOM_CARTA[cartaSel.num]} {PAL_SIMBOL[cartaSel.pal]}</button>
        )}
        {esActiu && !esHumaJug && (
          <div style={{fontSize:10,color:"#bbb",marginTop:3}}>🤖 pensant...</div>
        )}
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:bg,fontFamily:"Georgia,serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:verd,color:"#fff",padding:"6px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{fontWeight:700,fontSize:14}}>🃏 Bolot · Sagunt</span>
        <div style={{display:"flex",gap:10,fontSize:11}}>
          <span>Triomf: <strong>{triomf?`${PAL_SIMBOL[triomf]} ${triomf}`:"—"}</strong></span>
          <span>A: <strong>{pt[0]}</strong></span>
          <span>B: <strong>{pt[1]}</strong></span>
          <span style={{opacity:0.6}}>/{estat.puntsObjectiu}</span>
        </div>
        <button onClick={()=>{setPantalla("inici");setEstat(null);}} style={{background:"transparent",color:"#fff",border:"1px solid #ffffff44",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10}}>Menú</button>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 10px",gap:6}}>
        {renderJugador(0,"dalt")}
        <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
          <div style={{minWidth:52}}>{renderJugador(3,"esquerra")}</div>
          <div style={{flex:1,background:"#e8f0e8",borderRadius:12,padding:10,minHeight:130,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <div style={{fontSize:10,color:"#555",textAlign:"center"}}>{estat.missatge||"—"}</div>
            {basa.length>0 ? (
              <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
                {basa.map(({jugador,carta})=>(
                  <div key={carta.id} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#666",marginBottom:2}}>{nomsJugadors[jugador]}</div>
                    <Carta carta={carta}/>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{color:"#ccc",fontSize:12,marginTop:10}}>Taula buida</div>
            )}
            <div style={{display:"flex",gap:10,fontSize:10,color:"#666"}}>
              <span>A: <strong>{puntsPartida[0]}</strong>pts</span>
              <span>B: <strong>{puntsPartida[1]}</strong>pts</span>
            </div>
          </div>
          <div style={{minWidth:52}}>{renderJugador(1,"dreta")}</div>
        </div>
        {renderJugador(2,"baix")}
      </div>
    </div>
  );
}
