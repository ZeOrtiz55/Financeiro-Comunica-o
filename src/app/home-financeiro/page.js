'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// ÍCONES COMPLETOS
import { 
 Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
 CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
 Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Edit3, RefreshCw, AlertCircle, Trash, DollarSign, Lock, Barcode, ZoomIn, ZoomOut
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO ---
function LoadingScreen() {
 return (
  <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
    <h1 style={{ color: '#0f172a', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '32px', letterSpacing: '6px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
        Painel Financeiro <br /> 
        <span style={{ fontWeight: '400', fontSize: '40px', color: '#0ea5e9' }}>Nova Tratores</span>
    </h1>
  </div>
 )
}

// --- 2. FORMATADOR DE DATA ---
const formatarData = (dataStr) => {
 if (!dataStr || dataStr === 'null' || dataStr.trim() === '') return 'N/A';
 const apenasData = dataStr.split(' ')[0];
 const partes = apenasData.split(/[-/]/);
 if (partes.length === 3) {
  if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return `${partes[0]}/${partes[1]}/${partes[2]}`;
 }
 return dataStr;
};

function GeometricBackground() {
 return (
  <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f8fafc', pointerEvents: 'none' }}>
   <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(226, 232, 240, 0.2) 100%)' }}></div>
  </div>
 )
}

// --- 3. CHAT INTERNO ---
function ChatChamado({ registroId, tipo, userProfile }) {
 const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
 const colunaLink = tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : 'chamado_id';

 useEffect(() => {
  if (!registroId || !userProfile?.id) return;
  supabase.from('mensagens_chat').select('*').eq(colunaLink, registroId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
  const channel = supabase.channel(`chat_h_fin_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaLink}=eq.${registroId}` }, payload => { 
   if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
  }).subscribe();
  return () => { supabase.removeChannel(channel) }
 }, [registroId, userProfile?.id, colunaLink]);

 const enviar = async (e) => {
  e.preventDefault(); if (!novaMsg.trim()) return;
  const texto = novaMsg; setNovaMsg('');
  try { const a = new Audio(`/${userProfile?.som_notificacao || 'som-notificacao-1.mp3'}`); a.volume = 0.4; a.play().catch(() => {}) } catch(e) {}
  setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
  const payload = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id };
  payload[colunaLink] = registroId;
  await supabase.from('mensagens_chat').insert([payload]);
 }
 return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #4f46e5', borderRadius: '0px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 20px 50px rgba(79, 70, 229, 0.08)' }}>
   <div style={{ padding: '15px 25px', background: '#4f46e5', borderBottom: '1px solid #4338ca', fontWeight: '500', fontSize: '15px', color:'#ffffff', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
   <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
    {mensagens.map((m) => (
     <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#6366f115' : '#f8fafc', color: '#1e293b', padding: '14px 18px', borderRadius: '0px', maxWidth:'85%', border: '1px solid #e2e8f0' }}>
      <span style={{ fontSize: '15px', opacity: 0.6, display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontWeight: '700', color: '#4f46e5' }}>{m.usuario_nome?.toUpperCase()}</span>
      <span style={{ fontSize: '15px', lineHeight: '1.4' }}>{m.texto}</span>
     </div>
    ))}
   </div>
   <form onSubmit={enviar} style={{ padding: '20px', background: '#f8fafc', display: 'flex', gap: '12px', borderTop: '0.5px solid #dcdde1' }}>
     <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', outline: 'none', fontSize: '15px' }} />
     <button title="Enviar Mensagem" style={{ background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '0px', width: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
   </form>
  </div>
 )
}

// --- 4. COMPONENTE KANBAN PRINCIPAL ---
export default function HomeFinanceiro() {
 const [userProfile, setUserProfile] = useState(null); const [loading, setLoading] = useState(true); const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const [showNovoMenu, setShowNovoMenu] = useState(false);
 const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
 const [listaBoletos, setListaBoletos] = useState([]); const [listaPagar, setListaPagar] = useState([]); const [listaReceber, setListaReceber] = useState([]); const [listaRH, setListaRH] = useState([]);
 const [fileBoleto, setFileBoleto] = useState(null);
 const [zoom, setZoom] = useState(1);
 const router = useRouter();
 const searchParams = useSearchParams();

 // --- CARREGAMENTO UNIFICADO ---
 const carregarDados = async () => {
  try {
    const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').neq('status', 'pago').order('id', {ascending: false});
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    const faturamentoFormatado = (bolds || []).map(c => {
      const venc = c.vencimento_boleto ? new Date(c.vencimento_boleto) : null;
      if (venc) venc.setHours(0,0,0,0);
      
      let todosPagos = false;
      const isParceladoLocal = c.forma_pagamento?.toLowerCase().includes('parcelado');
      
      if (isParceladoLocal) {
          const qtd = c.qtd_parcelas || 1;
          let conferidos = 0;
          for (let i = 1; i <= qtd; i++) {
              if (c[`comprovante_pagamento_p${i}`]) conferidos++;
          }
          todosPagos = conferidos === parseInt(qtd);
      } else {
          todosPagos = !!(c.comprovante_pagamento || c.comprovante_pagamento_p1);
      }
      
      return {
        ...c,
        gTipo: 'boleto',
        valor_exibicao: c.valor_servico,
        isVencidoDisplay: venc && venc < hoje, 
        isTarefaPagamentoRealizado: todosPagos, 
        isPagamentoRealizado: todosPagos 
      }
    });

    setListaBoletos(faturamentoFormatado);

    const { data: pag } = await supabase.from('finan_pagar').select('*').eq('status', 'financeiro');
    const { data: rec } = await supabase.from('finan_receber').select('*').eq('status', 'financeiro');
    const { data: rhData } = await supabase.from('finan_rh').select('*').neq('status', 'concluido');
    
    setListaPagar((pag || []).map(p => ({...p, gTipo: 'pagar'}))); 
    setListaReceber((rec || []).map(r => ({...r, gTipo: 'receber'}))); 
    setListaRH((rhData || []).map(rh => ({...rh, gTipo: 'rh'})));
  } catch (err) { console.error(err); }
 }

 useEffect(() => {
    const channel = supabase
      .channel('home_financeiro_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Chamado_NF' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_pagar' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_receber' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finan_rh' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(channel) };
 }, []);

 useEffect(() => {
  const carregar = async () => {
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) return router.push('/login');
   const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
   setUserProfile(prof); setLoading(false); carregarDados();
  }; carregar();
 }, [router]);

 // Abre o card automaticamente quando chegou via notificação (?id=&tipo=)
 useEffect(() => {
  const id = searchParams.get('id');
  const tipo = searchParams.get('tipo');
  if (!id || !tipo) return;
  const listas = { boleto: listaBoletos, pagar: listaPagar, receber: listaReceber, rh: listaRH };
  const card = (listas[tipo] || []).find(t => String(t.id) === id);
  if (card) setTarefaSelecionada(card);
 }, [searchParams, listaBoletos, listaPagar, listaReceber, listaRH]);

 const handleUpdateField = async (t, field, value) => {
    const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
    await supabase.from(table).update({ [field]: value }).eq('id', t.id);
    carregarDados();
    if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: value }));
 };

 const handleUpdateFileDirect = async (t, field, file) => {
    if(!file) return;
    try {
      const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
      const path = `anexos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: linkData } = supabase.storage.from('anexos').getPublicUrl(path);
      
      await supabase.from(table).update({ [field]: linkData.publicUrl }).eq('id', t.id);
      alert("Arquivo atualizado!");
      carregarDados();
      if(tarefaSelecionada) setTarefaSelecionada(prev => ({ ...prev, [field]: linkData.publicUrl }));
    } catch (err) { alert("Erro: " + err.message); }
 };

 const handleGerarBoletoFinanceiro = async (t) => {
  if (!fileBoleto) return alert("Anexe o arquivo.");
  try {
    const path = `boletos/${Date.now()}-${fileBoleto.name}`;
    await supabase.storage.from('anexos').upload(path, fileBoleto);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    
    await supabase.from('Chamado_NF').update({ 
        status: 'enviar_cliente', 
        tarefa: 'Enviar Boleto para o Cliente', 
        setor: 'Pós-Vendas', 
        anexo_boleto: data.publicUrl 
    }).eq('id', t.id);
    
    alert("Tarefa enviada ao Pós-Vendas!"); setTarefaSelecionada(null); carregarDados();
  } catch (err) { alert("Erro: " + err.message); }
 };

 const handleMoverParaPago = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'pago', tarefa: 'Pagamento Confirmado' }).eq('id', t.id);
    alert("Pagamento confirmado e processo finalizado!"); setTarefaSelecionada(null); carregarDados();
 };

 const handleConcluirGeral = async (t) => {
    const table = t.gTipo === 'pagar' ? 'finan_pagar' : t.gTipo === 'receber' ? 'finan_receber' : t.gTipo === 'rh' ? 'finan_rh' : 'Chamado_NF';
    await supabase.from(table).update({ status: 'concluido' }).eq('id', t.id);
    alert("Processo concluído!"); setTarefaSelecionada(null);
 };

 // --- NOVAS FUNÇÕES DE VENCIMENTO ---
 const handlePedirRecobranca = async (t) => {
    if (!window.confirm("Deseja solicitar recobrança ao Pós-Vendas?")) return;
    const newVal = (t.recombrancas_qtd || 0) + 1;
    await supabase.from('Chamado_NF').update({ 
        status: 'vencido', 
        tarefa: 'Cobrar Cliente (Recobrança)', 
        setor: 'Pós-Vendas',
        recombrancas_qtd: newVal
    }).eq('id', t.id);
    alert("Recobrança solicitada ao Pós-Vendas!"); setTarefaSelecionada(null); carregarDados();
 };

 const handleSomenteVencido = async (t) => {
    await supabase.from('Chamado_NF').update({ status: 'vencido' }).eq('id', t.id);
    alert("Card movido para Vencido!"); setTarefaSelecionada(null); carregarDados();
 };

 if (loading) return <LoadingScreen />

 // --- LÓGICAS CONDICIONAIS ---
 const isBoleto30 = tarefaSelecionada?.forma_pagamento?.toLowerCase().includes('30 dias');
 const isParcelamento = tarefaSelecionada?.forma_pagamento?.toLowerCase().includes('parcelado');
 const isBoletoType = tarefaSelecionada && (tarefaSelecionada.forma_pagamento?.toLowerCase().includes('boleto'));
 const isCashOrCardType = tarefaSelecionada && ['Á Vista no Pix', 'Cartão a Vista', 'Cartão Parcelado'].includes(tarefaSelecionada.forma_pagamento);

 const valorIndividual = tarefaSelecionada ? (tarefaSelecionada.valor_servico / (tarefaSelecionada.qtd_parcelas || 1)).toFixed(2) : 0;

 return (
  <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: '#f8fafc' }}>
   <GeometricBackground />
   <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/home-financeiro" router={router} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} userProfile={userProfile} />

   <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '60px', transition: '0.4s ease' }}>
    <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
      <div><h1 style={{ fontWeight: '300', color: '#0f172a', margin: 0, fontSize:'42px', letterSpacing:'-4px' }}>Painel Financeiro</h1><div style={{ width: '80px', height: '4px', background: '#0ea5e9', marginTop: '12px' }}></div></div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
       <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #dcdde1', borderRadius: '0px', padding: '5px 15px', gap: '10px' }}>
          <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} style={zoomBtnStyle} title="Diminuir zoom"><ZoomOut size={18} /></button>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#000', minWidth: '45px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))} style={zoomBtnStyle} title="Aumentar zoom"><ZoomIn size={18} /></button>
       </div>
       <div style={{ position: 'relative' }}>
        <button title="Novo Chamado" onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#ffffff', color:'#1e293b', border:'1.5px solid #dcdde1', padding:'12px 24px', borderRadius:'0px', fontWeight:'500', cursor:'pointer', fontSize:'15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>NOVO LANÇAMENTO</button>
        {showNovoMenu && (
         <div onMouseLeave={() => setShowNovoMenu(false)} style={dropItemStyle_Container}>
          <div onClick={() => router.push('/novo-chamado-nf')} style={dropItemStyle}>Boleto</div>
          <div onClick={() => router.push('/novo-pagar-receber')} style={dropItemStyle}>Pagar/Receber</div>
          <div onClick={() => router.push('/novo-chamado-rh')} style={{ ...dropItemStyle, borderBottom:'none', color:'#0ea5e9' }}>RH</div>
         </div>
        )}
       </div>
      </div>
    </header>

    <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '30px', 
        transform: `scale(${zoom})`, 
        transformOrigin: 'top left',
        width: `${100 / zoom}%`
    }}>
      <div style={colWrapperStyle}>
       <div style={colTitleStyle}>Faturamento</div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', borderTop: '0.5px solid #dcdde1' }}>
        {listaBoletos.filter(c => c.status === 'gerar_boleto' || c.status === 'validar_pix' || (c.status === 'aguardando_vencimento' && (c.isVencidoDisplay || c.isTarefaPagamentoRealizado))).map((t, idx) => (
         <div key={`bol-${t.id}-${idx}`} onClick={() => setTarefaSelecionada(t)} className="task-card-grid">
          <div style={{ background: '#f1f5f9', padding: '24px', borderBottom: '0.5px solid #dcdde1' }}>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight:'700', color: '#1e293b' }}>{t.nom_cliente?.toUpperCase()}</h4>
            {t.isTarefaPagamentoRealizado && (
                <div style={{ marginTop: '12px', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '6px 12px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>
                    <CheckCircle size={14}/> PAGAMENTO REALIZADO - CONFERIR
                </div>
            )}
          </div>
          <div style={{ padding: '24px', background: '#ffffff' }}>
            <div style={miniTagStyle}><CreditCard size={14}/> {t.forma_pagamento?.toUpperCase()}</div>
            <div style={{fontSize:'26px', color:'#0f172a', margin: '15px 0 5px 0', fontWeight: '600'}}>R$ {t.valor_exibicao}</div>
            <div style={{fontSize:'14px', color: '#64748b', textTransform:'uppercase', letterSpacing:'1px'}}>{t.status === 'validar_pix' ? 'VALIDAÇÃO PIX' : `Venc: ${formatarData(t.vencimento_boleto)}`}</div>
            {t.anexo_boleto && (t.status === 'gerar_boleto' || t.status === 'validar_pix') && (
                <div style={{marginTop: '12px', display:'flex', alignItems:'center', gap:'8px', color: '#4f46e5', fontSize: '12px', fontWeight: '800'}} title="Boleto já foi anexado">
                  <FileText size={16} /> BOLETO ANEXADO
                </div>
            )}
            {t.isVencidoDisplay && !t.isTarefaPagamentoRealizado && (
             <div style={{marginTop: '20px', background: '#fee2e2', border: '1px solid #ef4444', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{color: '#ef4444', fontWeight: '800', fontSize: '14px'}}>VENCIDO</span>
                <button onClick={(e) => {e.stopPropagation(); alert('Vencimento conferido.')}} style={{background: '#ef4444', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '700'}}>CONFERIDO</button>
             </div>
            )}
          </div>
         </div>
        ))}
       </div>
      </div>

      <div style={colWrapperStyle}>
       <div style={colTitleStyle}>Pagar/Receber</div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', borderTop: '0.5px solid #dcdde1' }}>
        {listaPagar.map((t, idx) => (
         <div key={`pag-${t.id}-${idx}`} onClick={() => setTarefaSelecionada(t)} className="task-card-grid">
          <div style={{padding:'24px', background: '#fef2f2', borderLeft: '6px solid #ef4444', borderBottom: '0.5px solid #dcdde1'}}><h4 style={{fontSize:'13px', color:'#ef4444', fontWeight:'700'}}>A PAGAR</h4><div style={{fontSize:'20px', color:'#1e293b', marginTop:'5px', fontWeight: '700'}}>{t.fornecedor?.toUpperCase()}</div><div style={{fontSize:'22px', color:'#0f172a', marginTop:'10px', fontWeight: '600'}}>R$ {t.valor}</div></div>
          <div style={{padding:'24px', background:'#ffffff', color: '#64748b', fontSize:'14px', borderBottom: '0.5px solid #dcdde1'}}>{t.metodo || 'Registro de despesa'}</div>
         </div>
        ))}
        {listaReceber.map((t, idx) => (
         <div key={`rec-${t.id}-${idx}`} onClick={() => setTarefaSelecionada(t)} className="task-card-grid">
          <div style={{padding:'24px', background: '#eff6ff', borderLeft: '6px solid #3b82f6', borderBottom: '0.5px solid #dcdde1'}}><h4 style={{fontSize:'13px', color:'#3b82f6', fontWeight:'700'}}>A RECEBER</h4><div style={{fontSize:'20px', color:'#1e293b', marginTop:'5px', fontWeight: '700'}}>{t.cliente?.toUpperCase()}</div><div style={{fontSize:'22px', color:'#0f172a', marginTop:'10px', fontWeight: '600'}}>R$ {t.valor}</div></div>
          <div style={{padding:'24px', background:'#ffffff', color: '#64748b', fontSize:'14px', borderBottom: '0.5px solid #dcdde1'}}>{t.metodo || 'Registro de entrada'}</div>
         </div>
        ))}
       </div>
      </div>

      <div style={colWrapperStyle}>
       <div style={colTitleStyle}>RH</div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', borderTop: '0.5px solid #dcdde1' }}>
        {listaRH.map((t, idx) => (
         <div key={`rh-${t.id}-${idx}`} onClick={() => setTarefaSelecionada(t)} className="task-card-grid">
          <div style={{padding:'24px', background: '#f1f5f9', borderLeft: '6px solid #8b5cf6', borderBottom: '0.5px solid #dcdde1'}}>
            <h4 style={{fontSize:'18px', color:'#1e293b', fontWeight:'700'}}>{t.funcionario?.toUpperCase()}</h4>
            <div style={{fontSize:'14px', color:'#0ea5e9', marginTop:'10px', textTransform:'uppercase', letterSpacing:'1px', fontWeight: '500'}}>{t.setor}</div>
          </div>
          <div style={{padding:'24px', background:'#ffffff', borderBottom: '0.5px solid #dcdde1'}}>
             <div style={{fontSize:'14px', color:'#64748b', fontWeight:'500'}}>{t.titulo}</div>
          </div>
         </div>
        ))}
       </div>
      </div>
    </div>
   </main>

   {tarefaSelecionada && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
     <div style={{ background: '#ffffff', width: '1650px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '0px', display: 'flex', overflow:'hidden', boxShadow:'0 50px 100px rgba(0,0,0,0.1)', border: '1px solid #dcdde1' }}>
      
      <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto', color: '#1e293b' }}>
        <button onClick={() => setTarefaSelecionada(null)} className="btn-back-light"><ArrowLeft size={16}/> VOLTAR AO PAINEL</button>
        
        <h2 style={{fontSize:'32px', color:'#0f172a', fontWeight:'400', lineHeight:'1.1', margin:'25px 0 45px'}}>{tarefaSelecionada.nom_cliente || tarefaSelecionada.fornecedor || tarefaSelecionada.funcionario || tarefaSelecionada.cliente}</h2>
        
        <div style={{display:'flex', gap:'30px', marginBottom:'45px'}}>
          <div style={fieldBoxModal}><label style={labelMStyle}>Condição / Motivo</label><p style={pModalStyle}>{tarefaSelecionada.forma_pagamento?.toUpperCase() || tarefaSelecionada.motivo || 'N/A'}</p></div>
          
          {tarefaSelecionada.gTipo !== 'rh' && (
            <>
              <div style={fieldBoxModal}>
                <label style={labelMStyle}>VALOR TOTAL</label>
                <input 
                  type="number" 
                  style={{ ...inputStyleLight, border:'none', padding:0, fontSize:'36px', fontWeight:'700', background:'transparent' }}
                  defaultValue={tarefaSelecionada.valor_exibicao || tarefaSelecionada.valor}
                  onBlur={e => handleUpdateField(tarefaSelecionada, tarefaSelecionada.gTipo === 'boleto' ? 'valor_servico' : 'valor', e.target.value)}
                />
              </div>

              {isBoleto30 && (
                <div style={fieldBoxModal}>
                  <label style={labelMStyle}>DATA VENCIMENTO</label>
                  <input 
                    type="date" 
                    style={{ ...inputStyleLight, border:'none', padding:0, fontSize:'36px', fontWeight:'700', background:'transparent', color:'#ef4444' }}
                    defaultValue={tarefaSelecionada.vencimento_boleto}
                    onBlur={e => handleUpdateField(tarefaSelecionada, 'vencimento_boleto', e.target.value)}
                  />
                </div>
              )}

              {!isBoleto30 && (
                <div style={fieldBoxModal}><label style={labelMStyle}>VENCIMENTO BASE</label><p style={{...pModalStyle, color:'#ef4444', fontWeight: '600'}}>{formatarData(tarefaSelecionada.vencimento_boleto || tarefaSelecionada.data_vencimento)}</p></div>
              )}
            </>
          )}
        </div>

        {!isBoleto30 && isParcelamento && (
            <div style={{ display:'flex', flexDirection:'column', gap:'20px', background:'#f8fafc', padding:'40px', border:'1px solid #dcdde1', marginBottom:'45px' }}>
                <div style={{ display:'flex', gap:'40px', borderBottom:'1px solid #dcdde1', paddingBottom:'20px' }}>
                    <div>
                        <label style={labelMStyle}>QUANTIDADE</label>
                        <select 
                            style={{ ...inputStyleLight, width:'120px', padding:'10px' }}
                            value={tarefaSelecionada.qtd_parcelas || 1}
                            onChange={e => handleUpdateField(tarefaSelecionada, 'qtd_parcelas', e.target.value)}
                        >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}x</option>)}
                        </select>
                    </div>
                    <div><label style={labelMStyle}>VALOR PARCELA</label><p style={{fontSize:'22px', fontWeight:'700'}}>R$ {valorIndividual}</p></div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                    <div style={cascadeRowStyle}>
                        <span style={cascadeLabelStyle}>1ª PARCELA</span>
                        <input type="date" style={inputCascadeStyle} defaultValue={tarefaSelecionada.vencimento_boleto} onBlur={e => handleUpdateField(tarefaSelecionada, 'vencimento_boleto', e.target.value)} />
                        <span style={cascadeValueStyle}>R$ {valorIndividual}</span>
                        <AttachmentTag 
                            label="COMPROVANTE P1" 
                            fileUrl={tarefaSelecionada.comprovante_pagamento || tarefaSelecionada.comprovante_pagamento_p1} 
                            onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'comprovante_pagamento_p1', f)} 
                        />
                    </div>
                    {Array.from({ length: (tarefaSelecionada.qtd_parcelas || 1) - 1 }).map((_, i) => {
                        const pNum = i + 2;
                        const currentDates = (tarefaSelecionada.datas_parcelas || "").split(/[\s,]+/);
                        return (
                            <div key={pNum} style={cascadeRowStyle}>
                                <span style={cascadeLabelStyle}>{pNum}ª PARCELA</span>
                                <input type="date" style={inputCascadeStyle} defaultValue={currentDates[i] || ""} onBlur={e => {
                                    let arr = [...currentDates]; arr[i] = e.target.value;
                                    handleUpdateField(tarefaSelecionada, 'datas_parcelas', arr.join(', '));
                                }} />
                                <span style={cascadeValueStyle}>R$ {valorIndividual}</span>
                                <AttachmentTag 
                                    label={`COMPROVANTE P${pNum}`} 
                                    fileUrl={tarefaSelecionada[`comprovante_pagamento_p${pNum}`]} 
                                    onUpload={f => handleUpdateFileDirect(tarefaSelecionada, `comprovante_pagamento_p${pNum}`, f)} 
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'30px', border:'0.5px solid #dcdde1', padding:'45px', background:'#f8fafc' }}>
          {tarefaSelecionada.gTipo === 'rh' ? (
            <>
              <div style={fieldBoxInner}><label style={labelMStyle}>TÍTULO</label><p style={{fontSize:'15px', fontWeight: '600'}}>{tarefaSelecionada.titulo}</p></div>
              <div style={fieldBoxInner}><label style={labelMStyle}>SETOR</label><p style={{fontSize:'15px', color:'#0ea5e9', fontWeight: '600'}}>{tarefaSelecionada.setor?.toUpperCase()}</p></div>
              <div style={{...fieldBoxInner, gridColumn:'span 2'}}><label style={labelMStyle}>DESCRIÇÃO</label><p style={{fontSize:'15px', lineHeight:'1.6'}}>{tarefaSelecionada.descricao}</p></div>
            </>
          ) : (
            <>
              <div style={fieldBoxInner}><label style={labelMStyle}>MÉTODO</label><p style={{fontSize:'15px', fontWeight: '600'}}>{tarefaSelecionada.forma_pagamento || 'N/A'}</p></div>
              {tarefaSelecionada.gTipo === 'boleto' && (
                <>
                    <div style={fieldBoxInner}><label style={labelMStyle}>NF SERVIÇO</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_servico', e.target.value)} /></div>
                    <div style={fieldBoxInner}><label style={labelMStyle}>NF PEÇA</label><input style={inputStyleLight} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada, 'num_nf_peca', e.target.value)} /></div>
                </>
              )}
              <div style={{gridColumn:'span 2', ...fieldBoxInner}}>
                  <label style={labelMStyle}>OBSERVAÇÕES</label>
                  <textarea style={{...inputStyleLight, height:'80px', resize: 'none'}} defaultValue={tarefaSelecionada.obs || tarefaSelecionada.motivo} onBlur={e => handleUpdateField(tarefaSelecionada, tarefaSelecionada.gTipo === 'boleto' ? 'obs' : 'motivo', e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div style={{marginTop:'45px'}}>
            <label style={labelMStyle}>ARQUIVOS E DOCUMENTOS</label>
            <div style={{display:'flex', gap:'15px', marginTop:'15px', flexWrap: 'wrap'}}>
                {tarefaSelecionada.gTipo === 'pagar' ? (
                   <>
                     {tarefaSelecionada.anexo_nf && <AttachmentTag icon={<FileText size={18} />} label="Nota Fiscal" fileUrl={tarefaSelecionada.anexo_nf} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf', f)} />}
                     {tarefaSelecionada.anexo_boleto && <AttachmentTag icon={<Barcode size={18} />} label="Boleto" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_boleto', f)} />}
                     {tarefaSelecionada.anexo_requisicao && <AttachmentTag icon={<Paperclip size={18} />} label="Anexo" fileUrl={tarefaSelecionada.anexo_requisicao} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_requisicao', f)} />}
                   </>
                ) : tarefaSelecionada.gTipo === 'receber' ? (
                   <>
                     {tarefaSelecionada.anexo_nf_servico && <AttachmentTag icon={<FileText size={18} />} label="Anexo" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_servico', f)} />}
                     {tarefaSelecionada.anexo_nf_peca && <AttachmentTag icon={<ClipboardList size={18} />} label="Anexo" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_peca', f)} />}
                     {tarefaSelecionada.anexo_boleto && <AttachmentTag icon={<Barcode size={18} />} label="Anexo" fileUrl={tarefaSelecionada.anexo_boleto} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_boleto', f)} />}
                   </>
                ) : (
                   <>
                     <AttachmentTag icon={<FileText size={18} />} label="NF SERVIÇO" fileUrl={tarefaSelecionada.anexo_nf_servico} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_servico', f)} />
                     <AttachmentTag icon={<ClipboardList size={18} />} label="NF PEÇA" fileUrl={tarefaSelecionada.anexo_nf_peca} onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'anexo_nf_peca', f)} />
                     
                     {(isCashOrCardType || tarefaSelecionada.isTarefaPagamentoRealizado) && (
                        <div style={{ border: '1px solid #10b981', borderRadius: '12px', padding: '2px', background: 'rgba(16, 185, 129, 0.03)' }}>
                            <AttachmentTag 
                                icon={<CheckCircle size={18} />} 
                                label="COMPROVANTE GERAL" 
                                fileUrl={tarefaSelecionada.comprovante_pagamento} 
                                onUpload={f => handleUpdateFileDirect(tarefaSelecionada, 'comprovante_pagamento', f)} 
                            />
                        </div>
                     )}
                   </>
                )}
            </div>
        </div>

        <div style={{marginTop:'50px', display:'flex', gap:'20px'}}>
            {isBoletoType && tarefaSelecionada.status === 'gerar_boleto' && !isCashOrCardType && (
                <div style={{ flex: 1, background: '#f0f9ff', padding: '35px', border: '1.5px dashed #0ea5e9', borderRadius: '20px' }}>
                    <label style={{ ...labelMStyle, color: '#0ea5e9', fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '20px' }}>PROCESSAMENTO DE BOLETO FINAL</label>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                        <input type="file" id="file_boleto_input" onChange={e => setFileBoleto(e.target.files[0])} style={{ display: 'none' }} />
                        <label htmlFor="file_boleto_input" style={{
                            flex: 1,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            background: fileBoleto ? '#f0fdf4' : '#ffffff',
                            border: fileBoleto ? '2px solid #10b981' : '2px dashed #cbd5e1',
                            padding: '28px 20px', borderRadius: '16px', cursor: 'pointer',
                            transition: 'all 0.3s ease', minHeight: '110px'
                        }}>
                            {fileBoleto ? (
                                <>
                                    <div style={{ width: '44px', height: '44px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle size={24} color="#10b981" />
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>BOLETO SELECIONADO</span>
                                    <span style={{ fontSize: '11px', color: '#64748b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileBoleto.name}</span>
                                </>
                            ) : (
                                <>
                                    <div style={{ width: '44px', height: '44px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Upload size={22} color="#0ea5e9" />
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0ea5e9' }}>ANEXAR BOLETO</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Clique para escolher o arquivo</span>
                                </>
                            )}
                        </label>
                        <button
                            onClick={() => handleGerarBoletoFinanceiro(tarefaSelecionada)}
                            style={{ ...btnPrimaryBeautified, flexDirection: 'column', gap: '8px', minWidth: '150px', padding: '20px' }}
                        >
                            <Send size={22} />
                            LANÇAR TAREFA
                        </button>
                    </div>
                </div>
            )}

            {(isCashOrCardType || tarefaSelecionada.status === 'validar_pix' || (tarefaSelecionada.status === 'aguardando_vencimento' && (tarefaSelecionada.isTarefaPagamentoRealizado || isBoleto30))) && (
                <button onClick={() => handleMoverParaPago(tarefaSelecionada)} style={btnSuccessBeautified}>
                    <CheckCircle size={24}/> CONCLUÍDO-MOVER PARA PAGO
                </button>
            )}

            {/* BOTÕES DE VENCIMENTO QUANDO EM AGUARDANDO VENCIMENTO */}
            {tarefaSelecionada.gTipo === 'boleto' && tarefaSelecionada.status === 'aguardando_vencimento' && (
                <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                    <button onClick={() => handlePedirRecobranca(tarefaSelecionada)} style={{ ...btnPrimaryBeautified, flex: 1, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                        <DollarSign size={20}/> PEDIR PARA POS VENDAS RECOBRAR
                    </button>
                    <button onClick={() => handleSomenteVencido(tarefaSelecionada)} style={{ ...btnPrimaryBeautified, flex: 1, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                        <AlertCircle size={20}/> MUDAR CARD PARA VENCIDO
                    </button>
                </div>
            )}

            {tarefaSelecionada.gTipo !== 'boleto' && (
                <button onClick={() => handleConcluirGeral(tarefaSelecionada)} style={btnSuccessBeautified}>
                    <CheckCheck size={24}/> CONCLUIR PROCESSO
                </button>
            )}
        </div>
      </div>

      <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft:'0.5px solid #dcdde1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '95%', height: '92%' }}>
         {userProfile && <ChatChamado registroId={tarefaSelecionada.id} userProfile={userProfile} tipo={tarefaSelecionada.gTipo} />}
        </div>
      </div>
     </div>
    </div>
   )}

   <style jsx global>{`
    * { font-weight: 400 !important; font-family: 'Montserrat', sans-serif; box-sizing: border-box; }
    .task-card-grid { background: #ffffff; border: 0.5px solid #dcdde1; cursor: pointer; transition: 0.3s; overflow: hidden; margin-bottom: 15px; }
    .task-card-grid:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.04); border-color: #0ea5e9; }
    .btn-back-light { background: #ffffff; color: #64748b; border: 0.5px solid #dcdde1; padding: 10px 24px; border-radius: 0px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; font-size:15px; }
    ::placeholder { color: #94a3b8; }
    ::-webkit-scrollbar { width: 8px; height: 12px; }
    ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
   `}</style>
  </div>
 )
}

// --- COMPONENTE TAG DE ANEXO ---
function AttachmentTag({ icon, label, fileUrl, onUpload, disabled }) {
    const fileInputRef = useRef(null);
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth:'320px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '0 18px', color: '#64748b', background: '#f1f5f9' }}>{icon || <Paperclip size={18}/>}</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '12px 15px' }}>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '800', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ fontSize: '11px', color: fileUrl ? '#10b981' : '#f43f5e', fontWeight: '700' }}>{fileUrl ? 'ARQUIVO PRONTO' : 'PENDENTE'}</span>
            </div>
            <div style={{ display: 'flex', borderLeft: '1px solid #e2e8f0' }}>
                {fileUrl && <button onClick={() => window.open(fileUrl, '_blank')} style={miniActionBtn} title="Visualizar"><Eye size={18} color="#1e293b" /></button>}
                {!disabled && (
                    <button onClick={() => fileInputRef.current.click()} style={miniActionBtn} title="Substituir ou Anexar">
                        <RefreshCw size={18} color="#1e293b" />
                        <input type="file" ref={fileInputRef} hidden onChange={e => onUpload(e.target.files[0])} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ESTILOS GERAIS
const cascadeRowStyle = { display: 'grid', gridTemplateColumns: '140px 180px 150px 320px', gap: '25px', alignItems: 'center', background: '#ffffff', padding: '15px', borderBottom: '1px solid #f1f5f9' };
const cascadeLabelStyle = { fontSize: '11px', color: '#94a3b8', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' };
const inputCascadeStyle = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', padding: '10px', fontSize: '14px', outline: 'none', transition: '0.2s' };
const cascadeValueStyle = { fontSize: '18px', color: '#0f172a', fontWeight: '700' };
const dropItemStyle_Container = { position:'absolute', top:'60px', right: 0, background:'#ffffff', zIndex:2000, width:'250px', border:'0.5px solid #dcdde1', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' };
const dropItemStyle = { padding:'15px 20px', cursor:'pointer', color:'#1e293b', borderBottom:'0.5px solid #dcdde1', fontSize:'14px', fontWeight: '600' };
const colWrapperStyle = { padding: '20px', background: 'rgba(255, 255, 255, 0.4)', border: '0.5px solid #dcdde1' };
const colTitleStyle = { textAlign: 'center', fontSize: '18px', color:'#0f172a', fontWeight:'700', marginBottom:'30px', textTransform:'uppercase' };
const miniTagStyle = { background: '#f1f5f9', padding: '4px 10px', color: '#64748b', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '0.5px solid #dcdde1', fontWeight: '600' };
const labelMStyle = { fontSize:'14px', color:'#64748b', textTransform:'uppercase', fontWeight: '700', marginBottom: '8px' };
const pModalStyle = { fontSize:'24px', color:'#0f172a', margin: 0, fontWeight: '700' };
const fieldBoxModal = { border: '1px solid #e2e8f0', padding: '30px', background: '#ffffff', flex: 1, borderRadius: '15px' };
const fieldBoxInner = { padding: '10px' };
const inputStyleLight = { width: '100%', padding: '15px', border: '1px solid #dcdde1', outline: 'none', background:'#fff', color:'#000', fontSize: '15px' };
const miniActionBtn = { background: 'transparent', border: 'none', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s', borderRadius: '8px' };
const btnPrimaryBeautified = { background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color:'#ffffff', border:'none', padding:'18px 40px', borderRadius:'15px', cursor:'pointer', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 20px rgba(14, 165, 233, 0.2)', transition: '0.3s' };
const btnSuccessBeautified = { flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color:'#ffffff', border:'none', padding:'25px', borderRadius:'15px', cursor:'pointer', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)', transition: '0.3s' };
const zoomBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer' };