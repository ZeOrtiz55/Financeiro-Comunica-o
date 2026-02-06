'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
import { 
 Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
 CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
 Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Settings, Trash2, Edit3, RefreshCw, AlertCircle, Trash
} from 'lucide-react'

// --- COMPONENTE DE NOTIFICAÇÃO INVASIVA (TOAST) ---
function NotificationToast({ notif, onClose, onClick }) {
 const color = notif.tipo === 'movimento' ? '#2563eb' : (notif.isGeral ? '#0f172a' : '#8b5cf6');
 return (
   <div onClick={onClick} style={{ background: '#fff', borderLeft: `8px solid ${color}`, padding: '20px', borderRadius: '15px', boxShadow: '0 15px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '350px', maxWidth: '450px', animation: 'slideIn 0.5s ease-out forwards', position: 'relative', zIndex: 9999, fontFamily: 'Montserrat', cursor: 'pointer' }}>
     <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: color, fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>
       {notif.tipo === 'movimento' ? <RefreshCw size={16}/> : <MessageSquare size={16}/>}
       {notif.titulo.toUpperCase()}
     </div>
     <div style={{ fontSize: '15px', color: '#1e293b', lineHeight: '1.4', fontWeight: '400' }}>{notif.mensagem}</div>
     {notif.detalhes && (
       <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', fontSize: '12px', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: '400' }}>{notif.detalhes}</div>
     )}
   </div>
 );
}

function GeometricBackground() {
 return (
   <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
     <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=900" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
     <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
     <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
   </div>
 )
}

function LoadingScreen() {
 return (
   <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <h1 style={{ color: '#fff', fontFamily: 'Montserrat', letterSpacing: '4px', textAlign: 'center' }}>NOVA TRATORES <br /> <b style={{fontSize:'32px'}}>PÓS-VENDAS</b></h1>
   </div>
 )
}

// --- CHAT DO CARD ---
function ChatChamado({ chamadoId, userProfile }) {
 const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
 const idReal = chamadoId ? (String(chamadoId).includes('_p') ? parseInt(String(chamadoId).split('_p')[0]) : parseInt(String(chamadoId))) : null;
 
 useEffect(() => {
   if (!idReal || !userProfile?.id) return;
   supabase.from('mensagens_chat').select('*').eq('chamado_id', idReal).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
   const channel = supabase.channel(`chat_h_pos_${idReal}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${idReal}` }, payload => { 
     if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
   }).subscribe();
   return () => { supabase.removeChannel(channel) }
 }, [idReal, userProfile?.id]);

 const enviar = async (e) => {
   e.preventDefault(); if (!novaMsg.trim()) return;
   const texto = novaMsg; setNovaMsg('');
   setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
   await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: idReal }]);
 }

 return (
   <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
     <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '500', fontSize: '10px' }}>CONVERSA DO PROCESSO</div>
     <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
       {mensagens.map((m) => (
         <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
           <b style={{fontSize:'8px', display:'block', opacity:0.5}}>{m.usuario_nome?.toUpperCase()}</b><span>{m.texto}</span>
         </div>
       ))}
     </div>
     <form onSubmit={enviar} style={{ padding: '15px', display: 'flex', gap: '10px' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} /><button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px' }}><Send size={18} /></button></form>
   </div>
 )
}

// --- CHAT GLOBAL ---
function ChatFlutuante({ userProfile, isOpen, setIsOpen }) {
 const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
 const load = async () => { const { data } = await supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true }).limit(100); setMensagens(data || []); }
 useEffect(() => { if (!userProfile?.id) return; load(); const channel = supabase.channel('chat_g_pos').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, () => load()).subscribe(); return () => { supabase.removeChannel(channel) }; }, [userProfile?.id]);
 const enviar = async (e) => { e.preventDefault(); if (!novaMsg.trim()) return; const t = novaMsg; setNovaMsg(''); await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: null, data_hora: new Date().toISOString() }]); }
 return (
   <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000, fontFamily: 'Montserrat' }}>
     <button onClick={() => setIsOpen(!isOpen)} style={{ width: '75px', height: '75px', borderRadius: '25px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 20px rgba(0,0,0,0.2)' }}>{isOpen ? <X size={34} /> : <MessageSquare size={34} />}</button>
     {isOpen && (
       <div style={{ position: 'absolute', bottom: '95px', right: 0, width: '500px', height: '750px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '35px', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px rgba(0,0,0,0.3)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding: '25px', background: '#0f172a', color: '#fff', fontSize:'18px' }}>CENTRAL PÓS-VENDAS</div>
          <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
             {mensagens.map(m => (
               <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile.id) ? 'flex-end' : 'flex-start', maxWidth:'80%' }}>
                 <div style={{ background: String(m.usuario_id) === String(userProfile.id) ? '#0f172a' : '#fff', color: String(m.usuario_id) === String(userProfile.id) ? '#fff' : '#000', padding: '15px', borderRadius: '20px', border:'1px solid #e2e8f0' }}>
                   <b style={{fontSize:'10px', display:'block', opacity:0.6}}>{m.usuario_nome?.toUpperCase()}</b><div>{m.texto}</div>
                 </div>
               </div>
             ))}
          </div>
          <form onSubmit={enviar} style={{ padding: '25px', display: 'flex', gap: '15px', borderTop:'1px solid #e2e8f0', alignItems:'center' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{flex:1, padding:'18px', borderRadius:'15px', border:'1px solid #e2e8f0'}} /><button style={{background:'#0f172a', color:'#fff', border:'none', borderRadius:'15px', width:'60px', height:'60px'}}><Send size={24}/></button></form>
       </div>
     )}
   </div>
 );
}

export default function HomePosVendas() {
 const [userProfile, setUserProfile] = useState(null); const [loading, setLoading] = useState(true); const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [tarefaSelecionada, setTarefaSelecionada] = useState(null); const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
 const [listaBoletos, setListaBoletos] = useState([]); const [listaPagar, setListaPagar] = useState([]); const [listaReceber, setListaReceber] = useState([]);
 const [toasts, setToasts] = useState([]); const [showNovoMenu, setShowNovoMenu] = useState(false);
 const router = useRouter();

 const addToast = (notif) => {
    const id = Date.now();
    setToasts(prev => [{...notif, id}, ...prev]);
    try {
      const audio = new Audio(`/${userProfile?.som_notificacao || 'som-notificacao-1.mp3'}`);
      audio.play().catch(() => {});
    } catch (err) {}
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 10000); 
 };

 const carregarDados = async () => {
   const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false});
   let tarefasPv = [];
   (bolds || []).forEach(t => {
     if (t.status === 'enviar_cliente' || t.tarefa === 'Cobrar Cliente') {
       tarefasPv.push({ ...t, valor_exibicao: t.valor_servico });
     }
     for (let i = 1; i <= 5; i++) {
       const statusParc = t[`status_p${i}`];
       if (statusParc === 'enviar_cliente' || t[`tarefa_p${i}`] === 'Cobrar Cliente') {
         tarefasPv.push({ ...t, id_virtual: `${t.id}_p${i}`, nom_cliente: `${t.nom_cliente} (PARC ${i})`, valor_exibicao: t[`valor_parcela${i}`], status: statusParc, isParcelaReal: true });
       }
     }
   });
   setListaBoletos(tarefasPv);

   const { data: pag } = await supabase.from('finan_pagar').select('*').eq('status', 'pos_vendas');
   const { data: rec } = await supabase.from('finan_receber').select('*').eq('status', 'pos_vendas');
   setListaPagar(pag || []); setListaReceber(rec || []);
 }

 useEffect(() => {
   const carregarPerfil = async () => {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session) return router.push('/login');
     const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
     setUserProfile(prof); setLoading(false);
   }; carregarPerfil();
 }, [router]);

 useEffect(() => {
    if(userProfile) {
        carregarDados();
        const channel = supabase.channel('home_pos_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_chat' }, payload => {
            if(payload.new.usuario_id !== userProfile.id) {
                addToast({ titulo: "Nova Mensagem", mensagem: payload.new.texto, tipo: 'chat' });
                carregarDados();
            }
        }).subscribe();
        return () => { supabase.removeChannel(channel); }
    }
 }, [userProfile]);

 const handleUpdateField = async (id, table, field, value) => {
   const isChild = typeof id === 'string' && id.includes('_p');
   if (isChild) {
     const [idReal, pNum] = id.split('_p');
     await supabase.from('Chamado_NF').update({ [`${field}_p${pNum}`]: value }).eq('id', idReal);
   } else {
     await supabase.from(table).update({ [field]: value }).eq('id', id);
   }
   carregarDados(); setTarefaSelecionada(null);
 };

 if (loading) return <LoadingScreen />

 return (
   <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat' }}>
     <GeometricBackground />
     
     {/* NOTIFICAÇÕES TOAST */}
     <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '15px' }}>
       {toasts.map(t => (
         <NotificationToast key={t.id} notif={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
       ))}
     </div>

     <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/home-posvendas" router={router} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} userProfile={userProfile} />

     <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', transition: '0.4s ease' }}>
       <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
          <h1 style={{ fontWeight: '900', color: '#0f172a', margin: 0, fontSize:'32px' }}>Painel Pós-Vendas</h1>
          <div style={{ position: 'relative' }}>
             <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'20px 40px', borderRadius:'15px', fontWeight:'900', cursor:'pointer', boxShadow:'0 10px 20px rgba(0,0,0,0.1)' }}>NOVO CHAMADO</button>
             {showNovoMenu && (
               <div onMouseLeave={() => setShowNovoMenu(false)} style={{ position:'absolute', top:'85px', right: 0, background:'#fff', borderRadius:'20px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', zIndex:2000, width:'320px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                 <div onClick={() => router.push('/novo-chamado-nf')} style={{ padding:'25px', cursor:'pointer', color: '#000', borderBottom:'1px solid #f1f5f9' }}>CHAMADO DE BOLETO</div>
                 <div onClick={() => router.push('/novo-pagar-receber')} style={{ padding:'25px', cursor:'pointer', color: '#000', borderBottom:'1px solid #f1f5f9' }}>CONTAS PAGAR / RECEBER</div>
               </div>
             )}
          </div>
       </header>

       <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
           <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontSize: '24px', fontWeight:'500'}}>FATURAMENTO / COBRANÇA</div>
               {listaBoletos.map(t => (
                 <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada(t)} className="task-card" style={{transition:'0.3s', border:'1px solid #cbd5e1', background:'rgba(255,255,255,0.9)', borderRadius:'20px', cursor:'pointer', overflow:'hidden'}}>
                   <div style={{ background: t.status === 'vencido' || t.tarefa?.includes('Cobrar') ? '#ef4444' : '#1e293b', padding: '25px', color: '#fff' }}><h4 style={{ margin: 0, fontSize: '28px', fontWeight:'400' }}>{t.nom_cliente?.toUpperCase()}</h4></div>
                   <div style={{ padding: '25px' }}><div style={{ fontSize: '22px', fontWeight:'600' }}>R$ {t.valor_exibicao}</div><div style={{marginTop:'10px', fontSize:'12px', opacity:0.7}}>{t.tarefa?.toUpperCase()}</div></div>
                 </div>
               ))}
           </div>
           <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontSize: '24px', fontWeight:'500'}}>PENDÊNCIAS SETOR</div>
               {listaPagar.map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'pagar' })} className="task-card" style={{transition:'0.3s', border:'1px solid #cbd5e1', background:'rgba(255,255,255,0.9)', borderRadius:'20px', cursor:'pointer', overflow:'hidden'}}><div style={{ background: '#ef4444', padding: '25px', color: '#fff' }}><h4>{t.fornecedor?.toUpperCase()}</h4></div><div style={{padding:'25px'}}><b style={{fontSize:'22px'}}>R$ {t.valor}</b></div></div>))}
               {listaReceber.map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'receber' })} className="task-card" style={{transition:'0.3s', border:'1px solid #cbd5e1', background:'rgba(255,255,255,0.9)', borderRadius:'20px', cursor:'pointer', overflow:'hidden'}}><div style={{ background: '#3b82f6', padding: '25px', color: '#fff' }}><h4>{t.cliente?.toUpperCase()}</h4></div><div style={{padding:'25px'}}><b style={{fontSize:'22px'}}>R$ {t.valor}</b></div></div>))}
           </div>
       </div>
     </main>

     {tarefaSelecionada && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '35px', display: 'flex', overflow:'hidden', boxShadow:'0 50px 100px rgba(0,0,0,0.3)' }}>
           <div style={{ flex: '1 1 900px', padding: '60px', overflowY: 'auto' }}>
             <button onClick={() => setTarefaSelecionada(null)} className="btn-back" style={{background:'#0f172a', color:'#fff', border:'none', padding:'12px 24px', borderRadius:'12px', cursor:'pointer', fontWeight:'900', marginBottom:'30px'}}>VOLTAR</button>
             <h2 style={{fontSize:'56px', fontWeight:'400', color:'#0f172a'}}>{tarefaSelecionada.nom_cliente || tarefaSelecionada.fornecedor || tarefaSelecionada.cliente}</h2>
             <div style={{marginTop:'40px', display:'flex', gap:'20px', flexWrap:'wrap'}}>
                {tarefaSelecionada.status === 'enviar_cliente' && (
                   <button onClick={() => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'status', 'aguardando_vencimento')} style={{width:'100%', background:'#22c55e', color:'#fff', padding:'20px', borderRadius:'15px', fontWeight:'900', cursor:'pointer'}}>CONFIRMAR ENVIO AO CLIENTE</button>
                )}
                {tarefaSelecionada.tarefa?.includes('Cobrar') && (
                   <button onClick={() => alert("Cobrança registrada com sucesso!")} style={{width:'100%', background:'#ef4444', color:'#fff', padding:'20px', borderRadius:'15px', fontWeight:'900', cursor:'pointer'}}>REGISTRAR CLIENTE COBRADO</button>
                )}
             </div>
           </div>
           <div style={{ flex: '1 1 500px', padding: '40px', background: '#f8fafc', borderLeft:'1px solid #e2e8f0' }}>
             {userProfile && <ChatChamado chamadoId={tarefaSelecionada?.id_virtual || tarefaSelecionada?.id} userProfile={userProfile} />}
           </div>
         </div>
       </div>
     )}

     {userProfile && <ChatFlutuante userProfile={userProfile} isOpen={isGlobalChatOpen} setIsOpen={setIsGlobalChatOpen} />}
     
     <style jsx global>{`
       @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
       .task-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.1); }
     `}</style>
   </div>
 )
}