import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const PALS = ["oros", "copes", "espases", "bastos"];
const PAL_SIMBOL = { oros: "🪙", copes: "🏆", espases: "⚔️", bastos: "🪵" };
const PAL_COLOR  = { oros: "#c8963e", copes: "#c0392b", espases: "#2c3e50", bastos: "#27ae60" };
const NUMS_BARALLA = [1, 3, 7, 8, 9, 10, 11, 12];
const NOM_CARTA = { 1:"A", 3:"3", 7:"7", 8:"8", 9:"9", 10:"10", 11:"11", 12:"12" };

// Ordre per a seqüències de cant i per a ordenar la mà
const ORDRE_SEQ    = [7, 8, 9, 3, 10, 11, 12, 1];
// Ordre de força en joc
const ORDRE_TRIOMF = [7, 8, 11, 12, 3, 1, 9, 10];
const ORDRE_NORMAL = [7, 8, 9, 10, 11, 12, 3, 1];

// Puntuació de les cartes
const PUNTS_TRIOMF = { 10:20, 9:15, 1:11, 3:10, 12:4, 11:3, 8:0, 7:0 };
const PUNTS_NORMAL = { 1:11, 3:10, 12:4, 11:3, 10:2, 9:0, 8:0, 7:0 };

// Valor per ordenar la mà (triomf té valors especials, resta usa punts normals)
const VALOR_ORDRE_TRIOMF = { 10:20, 9:15, 1:11, 3:10, 12:4, 11:3, 8:0, 7:0 };
const VALOR_ORDRE_NORMAL = { 1:11, 3:10, 12:4, 11:3, 10:2, 9:0, 8:0, 7:0 };

const NOMS_POS = ["Nord", "Est", "Sud", "Oest"];
const PARELLES = [[0,2],[1,3]];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const barrejar = arr => {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};

// Ordenar la mà per pals i dins de cada pal per valor descendent
function ordenarMa(ma, triomf) {
  const ordrePals = triomf
    ? [triomf, ...PALS.filter(p=>p!==triomf)]
    : PALS;
  return [...ma].sort((a,b) => {
    const piA = ordrePals.indexOf(a.pal);
    const piB = ordrePals.indexOf(b.pal);
    if (piA !== piB) return piA - piB;
    const vA = a.pal===triomf ? (VALOR_ORDRE_TRIOMF[a.num]??0) : (VALOR_ORDRE_NORMAL[a.num]??0);
    const vB = b.pal===triomf ? (VALOR_ORDRE_TRIOMF[b.num]??0) : (VALOR_ORDRE_NORMAL[b.num]??0);
    return vB - vA; // descendent
  });
}

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

// ─── CANTS ───────────────────────────────────────────────────────────────────
function calcularCants(ma, triomf) {
  const cants = [];

  // Seqüències per pal (ordre 7-8-9-3-10-11-12-A)
  for (const pal of PALS) {
    const nums = ma.filter(c=>c.pal===pal).map(c=>c.num);
    let maxSeq = 0;
    for (let i=0; i<ORDRE_SEQ.length; i++) {
      let l = 0;
      while (i+l < ORDRE_SEQ.length && nums.includes(ORDRE_SEQ[i+l])) l++;
      if (l > maxSeq) maxSeq = l;
    }
    if (maxSeq === 3) cants.push({ tipus:"tercera",  pal, valor:20,  text:"Tercera"  });
    if (maxSeq === 4) cants.push({ tipus:"quarta",   pal, valor:40,  text:"Quarta"   });
    if (maxSeq >= 5)  cants.push({ tipus:"quinta",   pal, valor:50,  text:"Quinta"   });
  }

  // Quatre iguals
  const quatreIguals = [
    { num:1,  valor:100, text:"Cent (4 asos)"      },
    { num:3,  valor:100, text:"Cent (4 tresos)"     },
    { num:11, valor:100, text:"Cent (4 onzens)"     },
    { num:12, valor:100, text:"Cent (4 dotzens)"    },
    { num:9,  valor:150, text:"Cent cinquanta (4 nous)"  },
    { num:10, valor:200, text:"Dos-cents (4 deens)" },
  ];
  for (const { num, valor, text } of quatreIguals) {
    if (PALS.every(pal => ma.some(c => c.pal===pal && c.num===num)))
      cants.push({ tipus:"quatre", num, valor, text });
  }

  // Bolot: Rei(12) + Cavall(11) del pal de triomf
  if (triomf) {
    const teCavall = ma.some(c => c.pal===triomf && c.num===11);
    const teRei    = ma.some(c => c.pal===triomf && c.num===12);
    if (teCavall && teRei)
      cants.push({ tipus:"bolot", pal:triomf, valor:20, text:`Bolot (${triomf})` });
  }

  return cants;
}

// Determinar quina parella guanya els cants
// Regles:
//   - Guanya la parella amb el cant individual MÉS ALT
//   - Si guanyen, se sumen TOTS els seus cants (dels dos membres)
//   - L'altra parella no suma res
//   - Empat: guanya la que té el cant de triomf; si cap, la que ha cantat primer (ordre de torn)
function resoldreCants(cantsDeclarat, triomf) {
  // cantsDeclarat: [{ jugador, cants: [...] }] en ordre de torn
  if (!cantsDeclarat || cantsDeclarat.length === 0)
    return { pareGuanyador: -1, punts0: 0, punts1: 0 };

  // Recollir el millor cant de cada jugador que ha cantat
  const ambCants = cantsDeclarat.filter(x => x.cants && x.cants.length > 0);
  if (!ambCants.length) return { pareGuanyador: -1, punts0: 0, punts1: 0 };

  // Millor cant per jugador
  const millorPerJugador = ambCants.map(({jugador, cants}) => ({
    jugador,
    millor: Math.max(...cants.map(c=>c.valor)),
    millorCant: cants.reduce((b,c)=>c.valor>b.valor?c:b),
    total: cants.reduce((s,c)=>s+c.valor, 0),
  }));

  // Millor cant global (per determinar quina parella guanya)
  const millorValor = Math.max(...millorPerJugador.map(x=>x.millor));
  const ambMillor = millorPerJugador.filter(x=>x.millor===millorValor);

  let guanyador;
  if (ambMillor.length === 1) {
    // Un sol jugador té el millor cant → la seua parella guanya
    guanyador = ambMillor[0].jugador;
  } else {
    // Empat: prefereix el de triomf
    const deTriomf = ambMillor.filter(x=>x.millorCant.pal===triomf);
    if (deTriomf.length > 0) {
      guanyador = deTriomf[0].jugador;
    } else {
      // Cap de triomf: guanya el que ha cantat primer (primer en ordre de cantsDeclarat)
      guanyador = ambMillor[0].jugador;
    }
  }

  const pareG = PARELLES.findIndex(p=>p.includes(guanyador));
  // Suma TOTS els cants de la parella guanyadora
  const totalParella = millorPerJugador
    .filter(x=>PARELLES[pareG].includes(x.jugador))
    .reduce((s,x)=>s+x.total, 0);

  return {
    pareGuanyador: pareG,
    punts0: pareG===0 ? totalParella : 0,
    punts1: pareG===1 ? totalParella : 0,
  };
}

// ─── CARTES VÀLIDES (arrastrar + matar) ──────────────────────────────────────
function cartesValides(ma, basa, triomf) {
  if (!basa.length) return ma;

  const palLiderat = basa[0].carta.pal;
  const guanyantAra = guanyadorBasa(basa, triomf);
  const pareGuanyant = PARELLES.findIndex(p => p.includes(guanyantAra));

  // Determinem el jugador actual (l'últim de la basa + 1)
  const jugadorActual = (basa[basa.length-1].jugador + 1) % 4;
  const pareActual = PARELLES.findIndex(p => p.includes(jugadorActual));
  const companGuanya = pareActual === pareGuanyant;

  // 1. Intenta arrastrar (tirar el pal liderat)
  const delPal = ma.filter(c => c.pal === palLiderat);
  if (delPal.length) {
    // Si la basa té triomf i el pal liderat no és triomf, mira si cal matar
    const triomfABasa = basa.some(b => b.carta.pal === triomf);
    if (triomfABasa && !companGuanya) {
      // Ha de superar el triomf si pot
      const millorTriomfBasa = basa
        .filter(b => b.carta.pal === triomf)
        .reduce((b,x) => ORDRE_TRIOMF.indexOf(x.carta.num) > ORDRE_TRIOMF.indexOf(b.carta.num) ? x : b);
      const triomfsMa = ma.filter(c => c.pal === triomf);
      const superiors = triomfsMa.filter(c =>
        ORDRE_TRIOMF.indexOf(c.num) > ORDRE_TRIOMF.indexOf(millorTriomfBasa.carta.num));
      if (superiors.length) return superiors;
      if (triomfsMa.length) return triomfsMa;
    }
    return delPal;
  }

  // 2. No té el pal: si hi ha triomf a la basa, ha de matar (superar) si pot
  const triomfsMa = ma.filter(c => c.pal === triomf);
  const triomfABasa = basa.some(b => b.carta.pal === triomf);

  if (!companGuanya && triomfsMa.length) {
    if (triomfABasa) {
      const millorTriomfBasa = basa
        .filter(b => b.carta.pal === triomf)
        .reduce((b,x) => ORDRE_TRIOMF.indexOf(x.carta.num) > ORDRE_TRIOMF.indexOf(b.carta.num) ? x : b);
      const superiors = triomfsMa.filter(c =>
        ORDRE_TRIOMF.indexOf(c.num) > ORDRE_TRIOMF.indexOf(millorTriomfBasa.carta.num));
      if (superiors.length) return superiors;
      return triomfsMa; // no pot superar però ha de tirar triomf
    } else {
      return triomfsMa; // ha de matar amb triomf
    }
  }

  return ma; // no té pal ni triomf, o company guanya: qualsevol
}

// ─── IA ──────────────────────────────────────────────────────────────────────
function triarCartaIA(ma, basa, triomf) {
  const valides = cartesValides(ma, basa, triomf);
  if (!valides.length) return null;
  if (!basa.length) {
    const triomfs = valides.filter(c=>c.pal===triomf);
    if (triomfs.length)
      return triomfs.reduce((b,c)=>ORDRE_TRIOMF.indexOf(c.num)>ORDRE_TRIOMF.indexOf(b.num)?c:b);
    return valides.reduce((b,c)=>puntsCarta(c,triomf)>puntsCarta(b,triomf)?c:b);
  }
  const palLiderat = basa[0].carta.pal;
  const millorBasa = basa.reduce((b,x)=>
    forcaCarta(x.carta,triomf,palLiderat)>forcaCarta(b.carta,triomf,palLiderat)?x:b);
  const millor = valides.reduce((b,c)=>
    forcaCarta(c,triomf,palLiderat)>forcaCarta(b,triomf,palLiderat)?c:b);
  const menor  = valides.reduce((b,c)=>
    forcaCarta(c,triomf,palLiderat)<forcaCarta(b,triomf,palLiderat)?c:b);
  return forcaCarta(millor,triomf,palLiderat) > forcaCarta(millorBasa.carta,triomf,palLiderat)
    ? millor : menor;
}

function triarTriomfIA(ma) {
  const comptes = PALS.map(pal=>({pal,n:ma.filter(c=>c.pal===pal).length}));
  comptes.sort((a,b)=>b.n-a.n);
  return comptes[0].pal;
}

// ─── COMPONENT CARTA ─────────────────────────────────────────────────────────
function Carta({ carta, seleccionada, onClick, petita, dorsal, invalida }) {
  if (dorsal) return (
    <div style={{
      width:petita?34:54, height:petita?52:80,
      background:"linear-gradient(135deg,#1a3a5c,#0d2137)",
      border:"2px solid #2a5a8c", borderRadius:7,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:petita?12:18, color:"#2a5a8c", userSelect:"none", flexShrink:0,
    }}>✦</div>
  );
  const color = invalida ? "#ccc" : PAL_COLOR[carta.pal];
  const simbol = PAL_SIMBOL[carta.pal];
  const nom = NOM_CARTA[carta.num];
  return (
    <div onClick={invalida ? undefined : onClick} style={{
      width:petita?34:54, height:petita?52:80,
      background:seleccionada?"#f0f7ff": invalida?"#f8f8f8":"#fff",
      border:seleccionada?`2px solid ${PAL_COLOR[carta.pal]}`:`2px solid ${invalida?"#eee":"#ddd"}`,
      borderRadius:7, cursor:invalida?"not-allowed":onClick?"pointer":"default",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"space-between", padding:"3px 2px",
      boxShadow:seleccionada?`0 4px 12px ${PAL_COLOR[carta.pal]}55`:"0 2px 4px #0001",
      transform:seleccionada?"translateY(-8px)":"none",
      transition:"all 0.15s", userSelect:"none", flexShrink:0,
      opacity: invalida ? 0.35 : 1,
    }}>
      <span style={{fontSize:petita?8:10,color,fontWeight:700,alignSelf:"flex-start",paddingLeft:2}}>{nom}</span>
      <span style={{fontSize:petita?14:21,color}}>{simbol}</span>
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
        Toca una posició per canviar entre <strong>👤 Humà</strong> i <strong>🤖 IA</strong>
      </p>
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
function nouEstat(puntsTotal, puntsObjectiu, jugadorsHumans, nomsJugadors, repartidor) {
  const cartes = [];
  for (const pal of PALS) for (const num of NUMS_BARALLA) cartes.push({pal,num,id:`${pal}-${num}`});
  const barrejada = barrejar(cartes);
  const primerATirar = (repartidor + 3) % 4;
  const mans = [[],[],[],[]];
  let idx = 0;
  for (let r=0; r<5; r++)
    for (let j=0; j<4; j++)
      mans[(primerATirar+j)%4].push(barrejada[idx++]);
  const cartaMig = barrejada[idx++];
  const restants = barrejada.slice(idx);
  return {
    fase: "triomf",
    mans, cartaMig, restants,
    triomf: null, quiVa: null,
    repartidor,
    torn: primerATirar,
    tornActual: primerATirar,
    basa: [], ultimaBasa: null,
    basesGuanyades: [[],[]],
    puntsPartida: [0,0],
    puntsTotal: puntsTotal||[0,0],
    puntsObjectiu: puntsObjectiu||1000,
    fase2: false,
    missatge: `${(nomsJugadors||NOMS_POS)[primerATirar]} decideix el triomf`,
    historial: [],
    cants: [[],[],[],[]],
    // Cants declarats en la primera basa
    cantsDeclarat: null,   // null = encara no s'ha resolt; [] = ja resolt
    cantsAnunciats: [],    // [{ jugador, cants }] acumulant mentre es juga la 1a basa
    primeraBasa: true,     // true fins que s'acaba la 1a basa
    jugadorsHumans: jugadorsHumans||[0,1,2,3],
    nomsJugadors: nomsJugadors||["Nord","Est","Sud","Oest"],
  };
}

function repartirSegonFase(prev, quiVa) {
  const restants = barrejar([...prev.restants]);
  const novasMans = prev.mans.map(m=>[...m]);
  let idx = 0;
  for (let j=0; j<4; j++) {
    const jug = (prev.torn+j)%4;
    const n = jug===quiVa ? 2 : 3;
    for (let k=0; k<n; k++) if (idx<restants.length) novasMans[jug].push(restants[idx++]);
  }
  // Ordenar les mans
  return { ...prev, mans: novasMans, restants: [],
    cants: novasMans.map(ma => calcularCants(ma, prev.triomf)) };
}

function acceptarTriomfEstat(prev, pal) {
  const quiVa = prev.tornActual;
  const novasMans = prev.mans.map((m,i) => i===quiVa ? [...m, prev.cartaMig] : m);
  const estatAmbCarta = { ...prev, mans: novasMans, cartaMig: null, triomf: pal };
  const estatRepartit = repartirSegonFase(estatAmbCarta, quiVa);
  // Ordenar mans amb triomf definit
  const mansOrdenades = estatRepartit.mans.map(m => ordenarMa(m, pal));
  return {
    ...estatRepartit,
    mans: mansOrdenades,
    fase: "joc", quiVa,
    missatge:`Triomf: ${pal.toUpperCase()} (${prev.nomsJugadors[quiVa]}). Comença ${prev.nomsJugadors[prev.torn]}!`,
    tornActual: prev.torn,
  };
}

function rebutjarTriomfEstat(prev) {
  const seg = (prev.tornActual+1)%4;
  if (seg === prev.torn)
    return {...prev, fase2:true, tornActual:prev.torn, missatge:"Tothom ha refusat. Segones: trieu pal!"};
  return {...prev, tornActual:seg, missatge:`${prev.nomsJugadors[seg]} decideix`};
}

function processarJugada(prev, carta, cantAnunciat) {
  const jugador = prev.tornActual;
  const novasMans = prev.mans.map((m,i)=>i===jugador?m.filter(c=>c.id!==carta.id):m);
  const novaBasa = [...prev.basa, {jugador, carta}];

  // Acumular cant anunciat en la primera basa
  let cantsAnunciats = prev.cantsAnunciats || [];
  if (prev.primeraBasa && cantAnunciat !== undefined) {
    cantsAnunciats = [...cantsAnunciats, { jugador, cants: cantAnunciat ? prev.cants[jugador] : [] }];
  }

  if (novaBasa.length === 4) {
    const guanyador = guanyadorBasa(novaBasa, prev.triomf);
    const pareG = PARELLES.findIndex(p=>p.includes(guanyador));
    const punts = novaBasa.reduce((s,b)=>s+puntsCarta(b.carta,prev.triomf),0);
    const nousPunts = prev.puntsPartida.map((p,i)=>i===pareG?p+punts:p);
    const novasBases = prev.basesGuanyades.map((b,i)=>i===pareG?[...b,novaBasa]:b);

    // Si era la primera basa, ara resolem els cants
    let puntsCants = [0,0];
    let cantsDeclarat = prev.cantsDeclarat;
    if (prev.primeraBasa) {
      // Afegim el cant del jugador que ha tirat l'última carta si no s'ha afegit
      // (ja s'ha afegit dalt), ara resolem
      const resultat = resoldreCants(cantsAnunciats, prev.triomf);
      if (resultat.pareGuanyador >= 0) {
        puntsCants = [resultat.punts0, resultat.punts1];
      } else {
        puntsCants = [resultat.punts0, resultat.punts1];
      }
      cantsDeclarat = cantsAnunciats;
    }
    const nousPoints = nousPunts.map((p,i)=>p+puntsCants[i]);

    if (novasMans.every(m=>m.length===0)) {
      const finalPunts = nousPoints.map((p,i)=>i===pareG?p+10:p);
      const quiVaPare = PARELLES.findIndex(p=>p.includes(prev.quiVa));
      const total = finalPunts[0]+finalPunts[1];
      const meitat = Math.ceil(total/2)+1;
      let nouTotal = prev.puntsTotal.slice();
      if (finalPunts[quiVaPare]>=meitat) {
        nouTotal = nouTotal.map((p,i)=>p+finalPunts[i]);
      } else {
        nouTotal = nouTotal.map((p,i)=>i===quiVaPare?p:p+total);
      }
      return {...prev, mans:novasMans, basa:[], ultimaBasa:novaBasa,
        basesGuanyades:novasBases, puntsPartida:finalPunts, puntsTotal:nouTotal,
        cantsDeclarat, cantsAnunciats, primeraBasa:false,
        fase:"resultat",
        missatge:`Fi! ${prev.nomsJugadors[guanyador]} fa l'última basa.`,
      };
    }

    return {...prev, mans:novasMans, basa:[], ultimaBasa:novaBasa,
      basesGuanyades:novasBases, puntsPartida:nousPoints, tornActual:guanyador,
      cantsDeclarat, cantsAnunciats, primeraBasa:false,
      missatge:`${prev.nomsJugadors[guanyador]} guanya la basa (${punts}pts)`,
    };
  }

  return {...prev, mans:novasMans, basa:novaBasa, cantsAnunciats,
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
  const [mostrarUltimaBasa, setMostrarUltimaBasa] = useState(false);
  const [repartidor, setRepartidor] = useState(null);
  // Cant pendent de confirmar (quan el jugador humà tira la primera carta)
  const [cantPendent, setCantPendent] = useState(null); // null | true | false
  const iaRef = useRef(null);

  const verd="#2d5a3d", accent="#8b1a1a", crema="#fdf8f0", bg="#f7f5f0";

  function iniciarPartida(jugadorsHumans, nomsJugadors) {
    const rep = repartidor !== null ? (repartidor+1)%4 : Math.floor(Math.random()*4);
    setRepartidor(rep);
    const e = nouEstat(puntsTotal, puntsObjectiu, jugadorsHumans, nomsJugadors, rep);
    setEstat(e);
    setCartaSel(null);
    setMostrarUltimaBasa(false);
    setCantPendent(null);
    setPantalla("joc");
  }

  // IA joc
  useEffect(() => {
    if (!estat || estat.fase !== "joc") return;
    if (estat.jugadorsHumans.includes(estat.tornActual)) return;
    clearTimeout(iaRef.current);
    iaRef.current = setTimeout(() => {
      const carta = triarCartaIA(estat.mans[estat.tornActual], estat.basa, estat.triomf);
      if (carta) {
        // IA sempre canta si té cants en la primera basa
        const cantIA = estat.primeraBasa
          ? (estat.cants[estat.tornActual].length > 0)
          : undefined;
        setCartaSel(null);
        setEstat(prev => processarJugada(prev, carta, cantIA));
      }
    }, 800);
    return () => clearTimeout(iaRef.current);
  }, [estat?.tornActual, estat?.fase, estat?.basa?.length]);

  // IA triomf
  useEffect(() => {
    if (!estat || estat.fase !== "triomf") return;
    if (estat.jugadorsHumans.includes(estat.tornActual)) return;
    clearTimeout(iaRef.current);
    iaRef.current = setTimeout(() => {
      setEstat(prev => {
        if (!prev || prev.fase !== "triomf") return prev;
        if (prev.fase2) return acceptarTriomfEstat(prev, triarTriomfIA(prev.mans[prev.tornActual]));
        const pal = triarTriomfIA(prev.mans[prev.tornActual]);
        const n = prev.mans[prev.tornActual].filter(c=>c.pal===pal).length;
        return n >= 3 ? acceptarTriomfEstat(prev, pal) : rebutjarTriomfEstat(prev);
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
        <p style={{color:"#999",fontSize:13,marginBottom:28,lineHeight:1.6}}>El joc de cartes tradicional saguntí,<br/>derivat del belote francès.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
          <button onClick={()=>setPantalla("config")} style={{background:verd,color:"#fff",border:"none",borderRadius:10,padding:"13px 30px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}>Nova Partida</button>
          <button onClick={()=>setMostrarRegles(true)} style={{background:"transparent",color:verd,border:`2px solid ${verd}`,borderRadius:10,padding:"13px 20px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"Georgia,serif"}}>Regles</button>
        </div>
        <p style={{color:"#bbb",fontSize:12}}>1–4 jugadors · IA · Baralla espanyola</p>
      </div>
      {mostrarRegles && (
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99}} onClick={()=>setMostrarRegles(false)}>
          <div style={{background:crema,borderRadius:16,padding:28,maxWidth:500,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px #0005"}} onClick={e=>e.stopPropagation()}>
            <h2 style={{color:verd,marginTop:0}}>Regles del Bolot</h2>
            <p style={{lineHeight:1.8,color:"#333",fontSize:13}}>
              <strong>Repartiment:</strong> 5 cartes a cada jugador + 1 al mig. Qui va s'emporta la del mig i rep 2 més; els altres reben 3. Total: 8 per jugador.<br/>
              <strong>Triomf:</strong> El de la dreta del repartidor decideix primer. Si ningú vol, segones (qualsevol pal).<br/>
              <strong>Arrastrar:</strong> Obligatori tirar el pal de la mà si en tens.<br/>
              <strong>Matar:</strong> Si hi ha triomf a la basa, has de superar-lo si pots. Si no pots, pots tirar qualsevol triomf. Excepció: si guanya la teua parella, no cal.<br/>
              <strong>Ordre triomf:</strong> 7&lt;8&lt;11&lt;12&lt;3&lt;A&lt;9&lt;10<br/>
              <strong>Ordre normal:</strong> 7&lt;8&lt;9&lt;10&lt;11&lt;12&lt;3&lt;A<br/>
              <strong>Punts triomf:</strong> 10=20, 9=15, A=11, 3=10, 12=4, 11=3<br/>
              <strong>Punts normals:</strong> A=11, 3=10, 12=4, 11=3, 10=2<br/>
              <strong>Cants:</strong> Tercera(3 seguides)=20, Quarta(4)=40, Quinta(5)=50 · Quatre iguals: A/3/11/12=100, 9=150, 10=200 · Bolot(Rei+Cavall triomf)=20<br/>
              <strong>Cantar:</strong> S'anuncia quan tires la primera carta. Sols val el cant més alt per parella. No és obligatori.
            </p>
            <button onClick={()=>setMostrarRegles(false)} style={{background:verd,color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",cursor:"pointer",fontFamily:"Georgia,serif"}}>Tancar</button>
          </div>
        </div>
      )}
    </div>
  );

  if (pantalla === "config") return (
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
      <button onClick={()=>setPantalla("inici")} style={{alignSelf:"flex-start",background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:13,marginBottom:10}}>← Tornar</button>
      <PantallaConfig onIniciar={iniciarPartida} puntsObjectiu={puntsObjectiu} setPuntsObjectiu={setPuntsObjectiu}/>
    </div>
  );

  if (!estat) return null;

  const { mans, triomf, fase, tornActual, basa, puntsPartida, puntsTotal: pt,
    cants, nomsJugadors, jugadorsHumans, cartaMig, ultimaBasa, primeraBasa } = estat;

  // ─── RESULTAT ────────────────────────────────────────────────────────────────
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

  // ─── TRIOMF ──────────────────────────────────────────────────────────────────
  if (fase === "triomf") {
    const esHuma = jugadorsHumans.includes(tornActual);
    return (
      <div style={{minHeight:"100vh",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
        <div style={{background:crema,borderRadius:20,padding:26,maxWidth:500,width:"100%",boxShadow:"0 10px 40px #0002"}}>
          <h2 style={{color:verd,textAlign:"center",marginTop:0,fontSize:18}}>
            {estat.fase2 ? "🔄 Segones: Trieu el triomf" : `🃏 ${nomsJugadors[tornActual]}: vols anar?`}
          </h2>
          {cartaMig && (
            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:11,color:"#888",marginBottom:4}}>Carta destapada:</div>
              <div style={{display:"inline-block"}}><Carta carta={cartaMig}/></div>
            </div>
          )}
          {!esHuma ? (
            <div style={{textAlign:"center",padding:16,color:"#888"}}>
              <div style={{fontSize:28,marginBottom:6}}>🤖</div>
              <div style={{fontSize:13}}>{nomsJugadors[tornActual]} (IA) està pensant...</div>
            </div>
          ) : (
            <>
              <p style={{color:"#666",fontSize:12,textAlign:"center",marginBottom:6}}>Les teues 5 cartes:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",marginBottom:10}}>
                {mans[tornActual].map(c=><Carta key={c.id} carta={c}/>)}
              </div>
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

  // ─── JOC ─────────────────────────────────────────────────────────────────────
  const valides = cartesValides(mans[tornActual]||[], basa, triomf);
  const esHumaTorn = jugadorsHumans.includes(tornActual);
  const cantsJugadorActual = cants[tornActual] || [];
  // Mostra el botó de cant si és la primera basa, és torn d'humà i encara no ha anunciat
  const jaHaAnunciat = (estat.cantsAnunciats||[]).some(x=>x.jugador===tornActual);
  const mostrarBotoCant = primeraBasa && esHumaTorn && !jaHaAnunciat && cartaSel;

  function tirarCarta(ambCant) {
    if (!cartaSel) return;
    setEstat(prev => processarJugada(prev, cartaSel, ambCant));
    setCartaSel(null);
    setCantPendent(null);
  }

  const renderJugador = (idx, posicio) => {
    const esActiu = tornActual === idx;
    const esHumaJug = jugadorsHumans.includes(idx);
    const petita = posicio !== "baix";
    const vertical = posicio === "esquerra" || posicio === "dreta";
    const cartesJug = mans[idx] || [];

    return (
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:10,marginBottom:3,fontWeight:esActiu?700:400,color:esActiu?accent:"#999"}}>
          {esActiu?"▶ ":""}{nomsJugadors[idx]} {esHumaJug?"👤":"🤖"} {PARELLES[0].includes(idx)?"(A)":"(B)"}
          {idx===estat.repartidor?" 🎴":""}
        </div>
        <div style={{display:"flex",flexDirection:vertical?"column":"row",gap:3,flexWrap:"wrap",justifyContent:"center",maxWidth:vertical?"auto":460}}>
          {cartesJug.map(c => {
            const esInvalida = esActiu && esHumaJug && !valides.some(v=>v.id===c.id);
            return esHumaJug && esActiu
              ? <Carta key={c.id} carta={c} petita={petita}
                  invalida={esInvalida}
                  seleccionada={!esInvalida && cartaSel?.id===c.id}
                  onClick={esInvalida?undefined:()=>setCartaSel(cartaSel?.id===c.id?null:c)}/>
              : <Carta key={c.id} carta={c} dorsal petita={petita}/>;
          })}
        </div>

        {/* Botons d'acció per al jugador actiu humà */}
        {esActiu && esHumaJug && cartaSel && valides.some(v=>v.id===cartaSel.id) && (
          <div style={{marginTop:6,display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
            {/* Botó cant — sempre visible en la primera basa */}
            {primeraBasa && !jaHaAnunciat && (
              <>
                {cantsJugadorActual.length > 0 ? (
                  <button onClick={()=>tirarCarta(true)} style={{
                    background:"#c8963e",color:"#fff",border:"none",borderRadius:9,
                    padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
                  }}>
                    🎵 Cant! ({cantsJugadorActual.map(c=>c.text).join(", ")})
                  </button>
                ) : null}
                <button onClick={()=>tirarCarta(false)} style={{
                  background:verd,color:"#fff",border:"none",borderRadius:9,
                  padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
                }}>
                  {cantsJugadorActual.length>0 ? "Tirar sense cantar" : `Tirar ${NOM_CARTA[cartaSel.num]} ${PAL_SIMBOL[cartaSel.pal]}`}
                </button>
              </>
            )}
            {/* Fora de la primera basa: sols tirar */}
            {!primeraBasa && (
              <button onClick={()=>tirarCarta(undefined)} style={{
                background:verd,color:"#fff",border:"none",borderRadius:9,
                padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",
              }}>Tirar {NOM_CARTA[cartaSel.num]} {PAL_SIMBOL[cartaSel.pal]}</button>
            )}
          </div>
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
        <span style={{fontWeight:700,fontSize:14}}>🃏 Bolot</span>
        <div style={{display:"flex",gap:8,fontSize:11,alignItems:"center"}}>
          <span>Triomf: <strong>{triomf?`${PAL_SIMBOL[triomf]} ${triomf}`:"—"}</strong></span>
          <span>A: <strong>{pt[0]}</strong></span>
          <span>B: <strong>{pt[1]}</strong></span>
          <span style={{opacity:0.6}}>/{estat.puntsObjectiu}</span>
          {ultimaBasa && (
            <button onClick={()=>setMostrarUltimaBasa(true)} style={{
              background:"#ffffff22",color:"#fff",border:"1px solid #ffffff55",
              borderRadius:5,padding:"2px 7px",cursor:"pointer",fontSize:10
            }}>Última basa</button>
          )}
        </div>
        <button onClick={()=>{setPantalla("inici");setEstat(null);}} style={{background:"transparent",color:"#fff",border:"1px solid #ffffff44",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10}}>Menú</button>
      </div>

      {/* Modal última basa */}
      {mostrarUltimaBasa && ultimaBasa && (
        <div style={{position:"fixed",inset:0,background:"#0007",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99}} onClick={()=>setMostrarUltimaBasa(false)}>
          <div style={{background:crema,borderRadius:16,padding:24,maxWidth:340,width:"90%",boxShadow:"0 10px 40px #0005",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{color:verd,marginTop:0,fontSize:16}}>Última basa</h3>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
              {ultimaBasa.map(({jugador,carta})=>(
                <div key={carta.id} style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#666",marginBottom:3}}>{nomsJugadors[jugador]}</div>
                  <Carta carta={carta}/>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>
              Guanyada per: <strong>{nomsJugadors[guanyadorBasa(ultimaBasa,triomf)]}</strong>
            </div>
            <button onClick={()=>setMostrarUltimaBasa(false)} style={{background:verd,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:13}}>Tancar</button>
          </div>
        </div>
      )}

      {/* Taula */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 10px",gap:6}}>
        {renderJugador(0,"dalt")}
        <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
          <div style={{minWidth:52}}>{renderJugador(3,"esquerra")}</div>
          <div style={{flex:1,background:"#e8f0e8",borderRadius:12,padding:8,minHeight:140,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {basa.length > 0 ? (
              <div style={{position:"relative",width:130,height:130}}>
                {basa.map(({jugador,carta}) => {
                  const posMap = {
                    0:{top:0,   left:"50%",transform:"translateX(-50%)"},
                    1:{top:"50%",right:0,  transform:"translateY(-50%)"},
                    2:{bottom:0,left:"50%",transform:"translateX(-50%)"},
                    3:{top:"50%",left:0,  transform:"translateY(-50%)"},
                  };
                  return (
                    <div key={carta.id} style={{position:"absolute",...posMap[jugador]}}>
                      <Carta carta={carta} petita/>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{color:"#ccc",fontSize:12}}>Taula buida</div>
            )}
            <div style={{position:"absolute",bottom:4,left:0,right:0,display:"flex",gap:10,fontSize:10,color:"#666",justifyContent:"center"}}>
              <span>A: <strong>{puntsPartida[0]}</strong></span>
              <span>B: <strong>{puntsPartida[1]}</strong></span>
            </div>
            <div style={{position:"absolute",top:4,left:0,right:0,fontSize:9,color:"#888",textAlign:"center",padding:"0 4px"}}>
              {estat.missatge}
            </div>
          </div>
          <div style={{minWidth:52}}>{renderJugador(1,"dreta")}</div>
        </div>
        {renderJugador(2,"baix")}
      </div>
    </div>
  );
}
